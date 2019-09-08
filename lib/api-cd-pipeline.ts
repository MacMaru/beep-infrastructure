import cdk = require('@aws-cdk/core');
import ecr = require('@aws-cdk/aws-ecr');
import codePipeline = require('@aws-cdk/aws-codepipeline');
import codePipelineActions = require('@aws-cdk/aws-codepipeline-actions');
import codeBuild = require('@aws-cdk/aws-codebuild');
import {SelectedSubnets, Vpc} from "@aws-cdk/aws-ec2";

export interface ApiCdPipelineProps {
  phpProductionRepository: ecr.Repository,
  phpDevelopmentRepository: ecr.Repository,
  nginxProdRepository: ecr.Repository,
}

export class ApiCdPipeline extends cdk.Construct {
  readonly testRepository: ecr.Repository;
  readonly productionRepository: ecr.Repository;

  constructor(scope: cdk.Construct, id: string, props: ApiCdPipelineProps) {
    super(scope, id);

    /* Define repositories */

    const apiTestRepository = new ecr.Repository(this, 'ApiTestRepository', {
      repositoryName: 'beep-api-test',
      lifecycleRules: [
        {
          description: 'Retain only the last 10 images',
          maxImageCount: 10
        }
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    this.testRepository = apiTestRepository;

    const apiProdRepository = new ecr.Repository(this, 'ApiProdRepository', {
      repositoryName: 'beep-api-prod',
      lifecycleRules: [
        {
          description: 'Retain only the last 10 images',
          maxImageCount: 10
        }
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    this.productionRepository = apiProdRepository;

    /* Define build steps */

    const buildApiTestImage = new codeBuild.PipelineProject(this, 'BuildApiTestImage', {
      projectName: 'beep-build-api-test-image',
      buildSpec: codeBuild.BuildSpec.fromSourceFilename('buildspecs/build-test-image.yml'),
      description: 'Build a test image of the Beep API.',
      environment: {
        buildImage: codeBuild.LinuxBuildImage.STANDARD_2_0,
        computeType: codeBuild.ComputeType.SMALL,
        privileged: true,
        environmentVariables: {
          AWS_ACCOUNT_ID: {
            type: codeBuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: cdk.Stack.of(this).account
          },
          AWS_DEFAULT_REGION: {
            type: codeBuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: cdk.Stack.of(this).region
          },
          IMAGE_REPO_NAME: {
            type: codeBuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: apiTestRepository.repositoryName
          }
        }
      },
    });
    apiTestRepository.grantPullPush(buildApiTestImage);
    props.phpDevelopmentRepository.grantPullPush(buildApiTestImage);
    props.phpProductionRepository.grantPullPush(buildApiTestImage);

    const buildApiProductionImage = new codeBuild.PipelineProject(this, 'BuildApiProductionImage', {
      projectName: 'beep-build-api-production-image',
      buildSpec: codeBuild.BuildSpec.fromSourceFilename('buildspecs/build-production-image.yml'),
      description: 'Build a production image of the Beep API',
      environment: {
        buildImage: codeBuild.LinuxBuildImage.STANDARD_2_0,
        computeType: codeBuild.ComputeType.SMALL,
        privileged: true,
        environmentVariables: {
          AWS_ACCOUNT_ID: {
            type: codeBuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: cdk.Stack.of(this).account
          },
          AWS_DEFAULT_REGION: {
            type: codeBuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: cdk.Stack.of(this).region
          },
          IMAGE_REPO_NAME: {
            type: codeBuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: apiProdRepository.repositoryName
          }
        }
      },
    });
    apiProdRepository.grantPullPush(buildApiProductionImage);
    props.phpDevelopmentRepository.grantPullPush(buildApiProductionImage);
    props.phpProductionRepository.grantPullPush(buildApiProductionImage);

    const buildNginxProductionImage = new codeBuild.PipelineProject(this, 'BuildNginxProductionImage', {
      projectName: 'beep-build-nginx-production-image',
      buildSpec: codeBuild.BuildSpec.fromSourceFilename('buildspecs/build-production-image.yml'),
      description: 'Build a production image of Nginx',
      environment: {
        buildImage: codeBuild.LinuxBuildImage.STANDARD_2_0,
        computeType: codeBuild.ComputeType.SMALL,
        privileged: true,
        environmentVariables: {
          AWS_ACCOUNT_ID: {
            type: codeBuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: cdk.Stack.of(this).account
          },
          AWS_DEFAULT_REGION: {
            type: codeBuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: cdk.Stack.of(this).region
          },
          IMAGE_REPO_NAME: {
            type: codeBuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: props.nginxProdRepository.repositoryName
          }
        }
      },
    });
    props.nginxProdRepository.grantPullPush(buildNginxProductionImage);

    /* Define pipeline */

    const apiPipeline = new codePipeline.Pipeline(this, 'ApiPipeline', {
      pipelineName: 'Api',
      restartExecutionOnUpdate: true,
    });

    const sourceStage = apiPipeline.addStage({
      stageName: 'Source',
    });

    const githubToken = cdk.SecretValue.secretsManager('Beep/Production/GithubToken', {
      jsonField: 'token'
    });

    const apiSourceOutput = new codePipeline.Artifact();
    const apiSourceAction = new codePipelineActions.GitHubSourceAction({
      actionName: 'DownloadApiSource',
      trigger: codePipelineActions.GitHubTrigger.WEBHOOK,
      oauthToken: githubToken,
      owner: 'beepnl',
      repo: 'beep-api',
      branch: 'master',
      output: apiSourceOutput,
    });
    sourceStage.addAction(apiSourceAction);

    const nginxSourceOutput = new codePipeline.Artifact();
    const nginxSourceAction = new codePipelineActions.GitHubSourceAction({
      actionName: 'DownloadNginxSource',
      trigger: codePipelineActions.GitHubTrigger.WEBHOOK,
      oauthToken: githubToken,
      owner: 'beepnl',
      repo: 'beep-nginx',
      branch: 'master',
      output: nginxSourceOutput,
    });
    sourceStage.addAction(nginxSourceAction);

    const buildTestImageStage = apiPipeline.addStage({
      stageName: 'BuildTestImage',
    });

    const apiTestImageDetails = new codePipeline.Artifact();
    const buildApiTestImageAction = new codePipelineActions.CodeBuildAction({
      actionName: 'BuildApiTestImage',
      input: apiSourceOutput,
      project: buildApiTestImage,
      outputs: [apiTestImageDetails],
      type: codePipelineActions.CodeBuildActionType.BUILD,
    });
    buildTestImageStage.addAction(buildApiTestImageAction);

    const buildProductionImagesStage = apiPipeline.addStage({
      stageName: 'BuildProductionImages',
    });

    const apiProductionImageDetails = new codePipeline.Artifact();
    const buildApiProductionImageAction = new codePipelineActions.CodeBuildAction({
      actionName: 'BuildApiProductionImage',
      input: apiSourceOutput,
      project: buildApiProductionImage,
      outputs: [apiProductionImageDetails],
      type: codePipelineActions.CodeBuildActionType.BUILD,
      runOrder: 1
    });
    buildProductionImagesStage.addAction(buildApiProductionImageAction);

    const nginxProductionImageDetails = new codePipeline.Artifact();
    const buildNginxProductionImageAction = new codePipelineActions.CodeBuildAction({
      actionName: 'BuildNginxProductionImage',
      input: nginxSourceOutput,
      project: buildNginxProductionImage,
      outputs: [nginxProductionImageDetails],
      type: codePipelineActions.CodeBuildActionType.BUILD,
      runOrder: 2
    });
    buildProductionImagesStage.addAction(buildNginxProductionImageAction);
  }
}
