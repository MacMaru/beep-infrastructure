import cdk = require('@aws-cdk/core');
import codePipeline = require('@aws-cdk/aws-codepipeline');
import codePipelineActions = require('@aws-cdk/aws-codepipeline-actions');
import codeBuild = require('@aws-cdk/aws-codebuild');
import {Storage} from "./storage";

export interface ApiCdPipelineProps {
  storage: Storage,
}

export class ApiCdPipeline extends cdk.Construct {

  constructor(scope: cdk.Construct, id: string, props: ApiCdPipelineProps) {
    super(scope, id);

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
            value: props.storage.ecr.apiTestRepository.repositoryName
          }
        }
      },
    });
    props.storage.ecr.apiTestRepository.grantPullPush(buildApiTestImage);
    props.storage.ecr.phpDevelopmentRepository.grantPullPush(buildApiTestImage);
    props.storage.ecr.phpProductionRepository.grantPullPush(buildApiTestImage);

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
            value: props.storage.ecr.apiProductionRepository.repositoryName
          }
        }
      },
    });
    props.storage.ecr.apiProductionRepository.grantPullPush(buildApiProductionImage);
    props.storage.ecr.phpDevelopmentRepository.grantPullPush(buildApiProductionImage);
    props.storage.ecr.phpProductionRepository.grantPullPush(buildApiProductionImage);

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
            value: props.storage.ecr.nginxProductionRepository.repositoryName
          }
        }
      },
    });
    props.storage.ecr.nginxProductionRepository.grantPullPush(buildNginxProductionImage);
    props.storage.ecr.apiProductionRepository.grantPull(buildNginxProductionImage);

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

    const apiProductionImageDetails = new codePipeline.Artifact('ApiProductionImageDetails');
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
      extraInputs: [
        apiProductionImageDetails
      ],
      project: buildNginxProductionImage,
      outputs: [nginxProductionImageDetails],
      type: codePipelineActions.CodeBuildActionType.BUILD,
      runOrder: 2
    });
    buildProductionImagesStage.addAction(buildNginxProductionImageAction);

    // const deployToProduction = apiPipeline.addStage({
    //   stageName: 'DeployToProduction'
    // })
    //
    // const deployToProductionAction = new codePipelineActions.EcsDeployAction({
    //
    // })
  }
}
