import cdk = require('@aws-cdk/core');
import s3 = require('@aws-cdk/aws-s3');
import iam = require('@aws-cdk/aws-iam');
import codeBuild = require('@aws-cdk/aws-codebuild');
import codePipeline = require('@aws-cdk/aws-codepipeline');
import codePipelineActions = require('@aws-cdk/aws-codepipeline-actions');
import cloudfront = require('@aws-cdk/aws-cloudfront');
import lambda = require('@aws-cdk/aws-lambda');
import path = require('path');

export interface UiCdStackProps extends cdk.StackProps{
  sourceBucket: s3.Bucket,
  distribution: cloudfront.CloudFrontWebDistribution,
}

export class UiCdStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: UiCdStackProps) {
    super(scope, id, props);

    const buildUiProductionDistribution = new codeBuild.PipelineProject(this, 'BuildUiProductionDistribution', {
      projectName: 'beep-build-ui-production-distribution',
      buildSpec: codeBuild.BuildSpec.fromSourceFilename('buildspecs/build-ui-production-distribution.yml'),
      description: 'Build a production distribution of the Beep UI.',
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
        }
      },
    });

    const uiPipeline = new codePipeline.Pipeline(this, 'UiPipeline', {
      pipelineName: 'Ui',
      restartExecutionOnUpdate: true,
    });



    const sourceStage = uiPipeline.addStage({
      stageName: 'Source',
    });

    const githubToken = cdk.SecretValue.secretsManager('Beep/Production/GithubToken', {
      jsonField: 'token'
    });

    const uiSourceOutput = new codePipeline.Artifact();
    const uiSourceAction = new codePipelineActions.GitHubSourceAction({
      actionName: 'DownloadUiSource',
      trigger: codePipelineActions.GitHubTrigger.WEBHOOK,
      oauthToken: githubToken,
      owner: 'beepnl',
      repo: 'beep-ui',
      branch: 'master',
      output: uiSourceOutput,
    });
    sourceStage.addAction(uiSourceAction);

    const buildProductionDistributionStage = uiPipeline.addStage({
      stageName: 'BuildProductionDistribution',
    });

    const uiProductionDistribution = new codePipeline.Artifact('UiProductionDistribution');
    const buildApiProductionImageAction = new codePipelineActions.CodeBuildAction({
      actionName: 'BuildUiProduction',
      input: uiSourceOutput,
      project: buildUiProductionDistribution,
      outputs: [uiProductionDistribution],
      type: codePipelineActions.CodeBuildActionType.BUILD,
      runOrder: 1
    });
    buildProductionDistributionStage.addAction(buildApiProductionImageAction);

    const deployStage = uiPipeline.addStage({
      stageName: 'Deploy',
    });

    const uiDeployAction = new codePipelineActions.S3DeployAction({
      actionName: 'DeployUiProduction',
      input: uiProductionDistribution,
      extract: true,
      bucket: props.sourceBucket,
      runOrder: 1
    })
    deployStage.addAction(uiDeployAction)

    const invalidationLambda = new lambda.Function(this, 'InvalidateDistribution', {
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: 'invalidate-distribution.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, 'lambda/invalidate-ui-distribution'))
    });

    const distributionArn = 'arn:aws:cloudfront::038855593698:distribution/' + props.distribution.distributionId;
    const invalidationPolicy = new iam.PolicyStatement();
    invalidationPolicy.addResources(distributionArn);
    invalidationPolicy.addActions('cloudfront:CreateInvalidation');
    invalidationLambda.addToRolePolicy(invalidationPolicy);

    const invalidateDistribution = new codePipelineActions.LambdaInvokeAction({
      actionName: 'InvalidateDistribution',
      runOrder: 2,
      lambda: invalidationLambda,
      userParameters: {
        'distributionId': props.distribution.distributionId
      }
    })
    deployStage.addAction(invalidateDistribution);
  }
}
