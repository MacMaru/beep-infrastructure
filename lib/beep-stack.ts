import cdk = require('@aws-cdk/core');
import ec2 =  require('@aws-cdk/aws-ec2');
import ecs = require('@aws-cdk/aws-ecs');
import ecr = require('@aws-cdk/aws-ecr');
import ssm = require('@aws-cdk/aws-ssm');
import iam = require('@aws-cdk/aws-iam');
import {EgressAcl} from "./egress-acl";
import {IngressAcl} from "./ingress-acl";
import {ApplicationAcl} from "./application-acl";

export class BeepStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'Production', {
      cidr: '10.0.0.0/16',
      subnetConfiguration: [
        {
          name: 'Egress',
          cidrMask: 24,
          subnetType: ec2.SubnetType.PUBLIC
        },
        {
          name: 'Ingress',
          cidrMask: 24,
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          name: 'Application',
          cidrMask: 24,
          subnetType: ec2.SubnetType.PRIVATE,
        },
        {
          name: 'Database',
          cidrMask: 24,
          subnetType: ec2.SubnetType.ISOLATED,
          reserved: true
        },
        {
          name: 'Bastion',
          cidrMask: 24,
          subnetType: ec2.SubnetType.PRIVATE,
          reserved: true
        }
      ],
      natGateways: 1,
      natGatewaySubnets: {
        subnetName: 'Egress'
      }
    });

    new EgressAcl(this, 'EgressAcl', {
      vpc: vpc,
      subnetSelection: vpc.selectSubnets({
        subnetName: 'Egress'
      })
    });

    new IngressAcl(this, 'IngressAcl', {
      vpc: vpc,
      subnetSelection: vpc.selectSubnets({
        subnetName: 'Ingress'
      })
    });

    new ApplicationAcl(this, 'ApplicationAcl', {
      vpc: vpc,
      subnetSelection: vpc.selectSubnets({
        subnetName: 'Application'
      })
    });

    const cluster = new ecs.Cluster(this, 'EcsCluster', {
      vpc: vpc,
      clusterName: 'BeepProduction',
    });

    const phpDev = new ecr.Repository(this, 'PhpDevRepository', {
      repositoryName: 'beep-php-dev',
      lifecycleRules: [
        {
          description: 'Retain only the last 10 images',
          maxImageCount: 10
        }
      ],
    });

    const phpProd = new ecr.Repository(this, 'PhpProdRepository', {
      repositoryName: 'beep-php-prod',
      lifecycleRules: [
        {
          description: 'Retain only the last 10 images',
          maxImageCount: 10
        }
      ],
    });

    const nginxDev = new ecr.Repository(this, 'NginxDevRepository', {
      repositoryName: 'beep-nginx-dev',
      lifecycleRules: [
        {
          description: 'Retain only the last 10 images',
          maxImageCount: 10
        }
      ],
    });

    const nginxProd = new ecr.Repository(this, 'NginxProdRepository', {
      repositoryName: 'beep-nginx-prod',
      lifecycleRules: [
        {
          description: 'Retain only the last 10 images',
          maxImageCount: 10
        }
      ],
    });

    const apiDev = new ecr.Repository(this, 'ApiDevRepository', {
      repositoryName: 'beep-api-dev',
      lifecycleRules: [
        {
          description: 'Retain only the last 10 images',
          maxImageCount: 10
        }
      ],
    });

    const apiProd = new ecr.Repository(this, 'ApiProdRepository', {
      repositoryName: 'beep-api-prod',
      lifecycleRules: [
        {
          description: 'Retain only the last 10 images',
          maxImageCount: 10
        }
      ],
    });




  }
}
