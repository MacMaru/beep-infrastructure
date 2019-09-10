import cdk = require('@aws-cdk/core');
import ecr = require('@aws-cdk/aws-ecr');

export class EcrRegistry extends cdk.Construct {

  readonly phpProductionRepository: ecr.Repository;
  readonly phpDevelopmentRepository: ecr.Repository;
  readonly nginxDevelopmentRepository: ecr.Repository;
  readonly nginxProductionRepository: ecr.Repository;
  readonly apiTestRepository: ecr.Repository;
  readonly apiProductionRepository: ecr.Repository;

  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);

    this.nginxDevelopmentRepository = new ecr.Repository(this, 'NginxDevelopmentRepository', {
      repositoryName: 'beep-nginx-dev',
      lifecycleRules: [
        {
          description: 'Retain only the last 10 images',
          maxImageCount: 10
        }
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.nginxProductionRepository = new ecr.Repository(this, 'NginxProductionRepository', {
      repositoryName: 'beep-nginx-prod',
      lifecycleRules: [
        {
          description: 'Retain only the last 10 images',
          maxImageCount: 10
        }
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.phpDevelopmentRepository = new ecr.Repository(this, 'PhpDevelopmentRepository', {
      repositoryName: 'beep-php-dev',
      lifecycleRules: [
        {
          description: 'Retain only the last 10 images',
          maxImageCount: 10
        }
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.phpProductionRepository = new ecr.Repository(this, 'PhpProductionRepository', {
      repositoryName: 'beep-php-prod',
      lifecycleRules: [
        {
          description: 'Retain only the last 10 images',
          maxImageCount: 10
        }
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.apiTestRepository = new ecr.Repository(this, 'ApiTestRepository', {
      repositoryName: 'beep-api-test',
      lifecycleRules: [
        {
          description: 'Retain only the last 10 images',
          maxImageCount: 10
        }
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.apiProductionRepository = new ecr.Repository(this, 'ApiProductionRepository', {
      repositoryName: 'beep-api-prod',
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
