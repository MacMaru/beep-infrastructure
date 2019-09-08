import cdk = require('@aws-cdk/core');
import ecr = require('@aws-cdk/aws-ecr');
import codePipeline = require('@aws-cdk/aws-codepipeline');
import codePipelineActions = require('@aws-cdk/aws-codepipeline-actions');
import codeBuild = require('@aws-cdk/aws-codebuild');

export class ApiCdPipeline extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);

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
            value: apiTestRepository.repositoryName
          }
        }
      },
    });

    apiProdRepository.grantPullPush(buildApiProductionImage);

    const nginxProdRepository = new ecr.Repository(this, 'NginxProdRepository', {
      repositoryName: 'beep-nginx-prod',
      lifecycleRules: [
        {
          description: 'Retain only the last 10 images',
          maxImageCount: 10
        }
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

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
            value: apiTestRepository.repositoryName
          }
        }
      },
    });

    nginxProdRepository.grantPullPush(buildNginxProductionImage);

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
      project: buildApiProductionImage,
      outputs: [apiTestImageDetails],
      type: codePipelineActions.CodeBuildActionType.BUILD,
      runOrder: 2
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
