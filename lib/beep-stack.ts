import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import ecs = require('@aws-cdk/aws-ecs');
import ecr = require('@aws-cdk/aws-ecr');
import rds = require('@aws-cdk/aws-rds');
import ssm = require('@aws-cdk/aws-ssm');
import secretsmanager = require('@aws-cdk/aws-secretsmanager');
import {EgressAcl} from "./egress-acl";
import {IngressAcl} from "./ingress-acl";
import {ApplicationAcl} from "./application-acl";
import {StorageType} from "@aws-cdk/aws-rds";
import {RemovalPolicy} from "@aws-cdk/core";
import {data} from "aws-cdk/lib/logging";

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

    const dbMasterCredentials = new secretsmanager.Secret(this, 'DbMasterCredentials', {
      secretName: 'Beep/Production/DbMasterCredentials',
      description: 'Password for the RDS master user.',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'QueenBee'}),
        generateStringKey: 'password',
        passwordLength: 32,
        excludeCharacters: '"@/\\',
      }
    });

    // Performance insights and encrypted storage are not supported for this instance.
    // Activate these when upgrading DB.
    const database = new rds.DatabaseInstance(this, 'Database', {
      vpc,
      vpcPlacement: {
        subnetName: 'Database'
      },
      databaseName: 'beepproduction',
      engine: rds.DatabaseInstanceEngine.MYSQL,
      engineVersion: '5.7',
      instanceClass: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE2, ec2.InstanceSize.MICRO),
      multiAz: false,
      deletionProtection: true,
      masterUsername: dbMasterCredentials.secretValueFromJson('username').toString(),
      masterUserPassword: dbMasterCredentials.secretValueFromJson('password'),
      storageType: StorageType.GP2,
      storageEncrypted: false,
      allocatedStorage: 20,
      enablePerformanceInsights: false,
      deleteAutomatedBackups: false,
      preferredBackupWindow: '01:00-02:00',
      backupRetention: cdk.Duration.days(30),
      preferredMaintenanceWindow: 'Sun:02:00-Sun:03:00',
      autoMinorVersionUpgrade: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const databaseEndpoint = new ssm.StringParameter(this, 'DatabaseEndpoint', {
      parameterName: '/Beep/Production/DbEndpoint',
      description: 'Combination of HOSTNAME:PORT for the database endpoint.',
      stringValue: database.instanceEndpoint.socketAddress
    });

    const secretTargetAttachment = new secretsmanager.SecretTargetAttachment(this, 'DbCredentialsAttachment', {
      secret: dbMasterCredentials,
      target: database
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







    const ecsCluster = new ecs.Cluster(this, 'EcsCluster', {
      vpc: vpc,
      clusterName: 'BeepProduction',
    });





  }
}
