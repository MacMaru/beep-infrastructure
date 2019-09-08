import cdk = require('@aws-cdk/core');
import ecr = require('@aws-cdk/aws-ecr');
import codePipeline = require('@aws-cdk/aws-codepipeline');
import codePipelineActions = require('@aws-cdk/aws-codepipeline-actions');
import codeBuild = require('@aws-cdk/aws-codebuild');

export class PhpCiPipeline extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);

    const phpDevRepository = new ecr.Repository(this, 'PhpDevRepository', {
      repositoryName: 'beep-php-dev',
      lifecycleRules: [
        {
          description: 'Retain only the last 10 images',
          maxImageCount: 10
        }
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const buildPhpDevelopmentImage = new codeBuild.PipelineProject(this, 'BuildPhpDevelopmentImage', {
      projectName: 'beep-build-php-development-image',
      buildSpec: codeBuild.BuildSpec.fromSourceFilename('buildspecs/build-development-image.yml'),
      description: 'Build a development image of PHP',
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
            value: phpDevRepository.repositoryName
          }
        }
      },
    });

    phpDevRepository.grantPullPush(buildPhpDevelopmentImage);

    const phpProdRepository = new ecr.Repository(this, 'PhpProdRepository', {
      repositoryName: 'beep-php-prod',
      lifecycleRules: [
        {
          description: 'Retain only the last 10 images',
          maxImageCount: 10
        }
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const buildPhpProductionImage = new codeBuild.PipelineProject(this, 'BuildPhpProductionImage', {
      projectName: 'beep-build-php-production-image',
      buildSpec: codeBuild.BuildSpec.fromSourceFilename('buildspecs/build-production-image.yml'),
      description: 'Build a production image of PHP',
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
            value: phpProdRepository.repositoryName
          }
        }
      },
    });

    phpProdRepository.grantPullPush(buildPhpProductionImage);

    const phpPipeline = new codePipeline.Pipeline(this, 'PhpPipeline', {
      pipelineName: 'Php',
      restartExecutionOnUpdate: true,
    });

    const sourceStage = phpPipeline.addStage({
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
      repo: 'beep-php',
      branch: 'master',
      output: sourceOutput
    });
    sourceStage.addAction(sourceAction);

    const buildStage = phpPipeline.addStage({
      stageName: 'Build',
    });

    const phpDevelopmentImageDetails = new codePipeline.Artifact();
    const buildDevelopmentImageAction = new codePipelineActions.CodeBuildAction({
      actionName: 'BuildDevelopmentImage',
      input: sourceOutput,
      project: buildPhpDevelopmentImage,
      outputs: [phpDevelopmentImageDetails],
      type: codePipelineActions.CodeBuildActionType.BUILD,
    });
    buildStage.addAction(buildDevelopmentImageAction);

    const phpProductionImageDetails = new codePipeline.Artifact();
    const buildProductionImageAction = new codePipelineActions.CodeBuildAction({
      actionName: 'BuildProductionImage',
      input: sourceOutput,
      project: buildPhpProductionImage,
      outputs: [phpProductionImageDetails],
      type: codePipelineActions.CodeBuildActionType.BUILD,
    });
    buildStage.addAction(buildProductionImageAction);
  }
}




