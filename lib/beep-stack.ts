import cdk = require('@aws-cdk/core');
import {SubnetType, Vpc} from "@aws-cdk/aws-ec2";
import {EgressAcl} from "./egress-acl";
import {IngressAcl} from "./ingress-acl";
import {ApplicationAcl} from "./application-acl";
import {
  Cluster,
} from "@aws-cdk/aws-ecs";
import {Repository} from "@aws-cdk/aws-ecr";
const uuid = require('uuid/v4');

export class BeepStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new Vpc(this, 'Production', {
      cidr: '10.0.0.0/16',
      subnetConfiguration: [
        {
          name: 'Egress',
          cidrMask: 24,
          subnetType: SubnetType.PUBLIC
        },
        {
          name: 'Ingress',
          cidrMask: 24,
          subnetType: SubnetType.PUBLIC,
        },
        {
          name: 'Application',
          cidrMask: 24,
          subnetType: SubnetType.PRIVATE,
        },
        {
          name: 'Database',
          cidrMask: 24,
          subnetType: SubnetType.ISOLATED,
          reserved: true
        },
        {
          name: 'Bastion',
          cidrMask: 24,
          subnetType: SubnetType.PRIVATE,
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

    const cluster = new Cluster(this, 'EcsCluster', {
      vpc: vpc,
      clusterName: 'BeepProduction',
    });

    const phpDev = new Repository(this, 'PhpDevRepository', {
      repositoryName: 'beep-php-dev',
      lifecycleRules: [
        {
          description: 'Retain only the last 10 images',
          maxImageCount: 10
        }
      ],
    });

    const phpProd = new Repository(this, 'PhpProdRepository', {
      repositoryName: 'beep-php-prod',
      lifecycleRules: [
        {
          description: 'Retain only the last 10 images',
          maxImageCount: 10
        }
      ],
    });

    const nginxDev = new Repository(this, 'NginxDevRepository', {
      repositoryName: 'beep-nginx-dev',
      lifecycleRules: [
        {
          description: 'Retain only the last 10 images',
          maxImageCount: 10
        }
      ],
    });

    const nginxProd = new Repository(this, 'NginxProdRepository', {
      repositoryName: 'beep-nginx-prod',
      lifecycleRules: [
        {
          description: 'Retain only the last 10 images',
          maxImageCount: 10
        }
      ],
    });

    const apiDev = new Repository(this, 'ApiDevRepository', {
      repositoryName: 'beep-api-dev',
      lifecycleRules: [
        {
          description: 'Retain only the last 10 images',
          maxImageCount: 10
        }
      ],
    });

    const apiProd = new Repository(this, 'ApiProdRepository', {
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
