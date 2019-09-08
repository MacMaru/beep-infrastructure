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
  }
}
