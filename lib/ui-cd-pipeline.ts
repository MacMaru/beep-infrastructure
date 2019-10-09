import cdk = require('@aws-cdk/core');
import codeBuild = require('@aws-cdk/aws-codebuild');
import codePipeline = require('@aws-cdk/aws-codepipeline');
import codePipelineActions = require('@aws-cdk/aws-codepipeline-actions');
import {Storage} from "./storage";

export interface UiCdPipelineProps {
  storage: Storage
}

export class UiCdPipeline extends cdk.Construct {

  constructor(scope: cdk.Construct, id: string, props: UiCdPipelineProps) {
    super(scope, id);

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
          IMAGE_REPO_NAME: {
            type: codeBuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: props.storage.ecr.apiTestRepository.repositoryName
          }
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
      bucket: props.storage.s3.uiBucket
    })
    deployStage.addAction(uiDeployAction)
  }

}
