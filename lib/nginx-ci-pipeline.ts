import cdk = require('@aws-cdk/core');
import ecr = require('@aws-cdk/aws-ecr');
import codePipeline = require('@aws-cdk/aws-codepipeline');
import codePipelineActions = require('@aws-cdk/aws-codepipeline-actions');
import codeBuild = require('@aws-cdk/aws-codebuild');

export class NginxCiPipeline extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);

    const nginxDevRepository = new ecr.Repository(this, 'NginxDevRepository', {
      repositoryName: 'beep-nginx-dev',
      lifecycleRules: [
        {
          description: 'Retain only the last 10 images',
          maxImageCount: 10
        }
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const buildNginxDevelopmentImage = new codeBuild.PipelineProject(this, 'BuildNginxDevelopmentImage', {
      projectName: 'beep-build-nginx-development-image',
      buildSpec: codeBuild.BuildSpec.fromSourceFilename('buildspecs/build-development-image.yml'),
      description: 'Build a development image of Nginx',
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
            value: nginxDevRepository.repositoryName
          }
        }
      },
    });

    nginxDevRepository.grantPullPush(buildNginxDevelopmentImage);

    const nginxPipeline = new codePipeline.Pipeline(this, 'NginxPipeline', {
      pipelineName: 'Nginx',
      restartExecutionOnUpdate: true,
    });

    const sourceStage = nginxPipeline.addStage({
      stageName: 'Source',
    });

    const githubToken = cdk.SecretValue.secretsManager('Beep/Production/GithubToken', {
      jsonField: 'token'
    });

    const sourceOutput = new codePipeline.Artifact();
    const sourceAction = new codePipelineActions.GitHubSourceAction({
      actionName: 'DownloadSource',
      trigger: codePipelineActions.GitHubTrigger.WEBHOOK,
      oauthToken: githubToken,
      owner: 'beepnl',
      repo: 'beep-nginx',
      branch: 'master',
      output: sourceOutput
    });
    sourceStage.addAction(sourceAction);

    const buildStage = nginxPipeline.addStage({
      stageName: 'Build',
    });

    const nginxDevelopmentImageDetails = new codePipeline.Artifact();
    const buildAction = new codePipelineActions.CodeBuildAction({
      actionName: 'Build',
      input: sourceOutput,
      project: buildNginxDevelopmentImage,
      outputs: [nginxDevelopmentImageDetails],
      type: codePipelineActions.CodeBuildActionType.BUILD,
    });
    buildStage.addAction(buildAction);
  }
}



