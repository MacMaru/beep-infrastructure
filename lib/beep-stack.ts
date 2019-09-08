import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import elb = require('@aws-cdk/aws-elasticloadbalancingv2');
import ecs = require('@aws-cdk/aws-ecs');
import route53 = require('@aws-cdk/aws-route53');
import certificateManager = require('@aws-cdk/aws-certificatemanager');
import rds = require('@aws-cdk/aws-rds');
import ssm = require('@aws-cdk/aws-ssm');
import secretsmanager = require('@aws-cdk/aws-secretsmanager');
import {EgressAcl} from "./egress-acl";
import {IngressAcl} from "./ingress-acl";
import {ApplicationAcl} from "./application-acl";
import {NginxCiPipeline} from "./nginx-ci-pipeline";
import {PhpCiPipeline} from "./php-ci-pipeline";
import {ApiCdPipeline} from "./api-cd-pipeline";
import {Api} from "./api";

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
          name: 'Codebuild',
          cidrMask: 24,
          subnetType: ec2.SubnetType.PRIVATE,
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

    const nginxPipeline = new NginxCiPipeline(this, 'NginxCiPipeline');
    const phpPipeline = new PhpCiPipeline(this, 'PhpCiPipeline');
    const apiPipeline = new ApiCdPipeline(this, 'ApiCdPipeline', {
      phpDevelopmentRepository: phpPipeline.developmentRepository,
      phpProductionRepository: phpPipeline.productionRepository,
      nginxProdRepository: nginxPipeline.productionRepository,
    });

    const loadBalancerSecurityGroup = new ec2.SecurityGroup(this, 'ApiLoadBalancerSecurityGroup', {
      vpc,
      description: 'Elb security group',
    });

    const apiLoadBalancer = new elb.ApplicationLoadBalancer(this, 'ApiLoadBalancer', {
      vpc,
      vpcSubnets: {
        subnetName: 'Ingress'
      },
      internetFacing: true,
      deletionProtection: false,
      http2Enabled: false,
      loadBalancerName: 'beep-api',
      idleTimeout: cdk.Duration.seconds(20),
      ipAddressType: elb.IpAddressType.IPV4,
      securityGroup: loadBalancerSecurityGroup
    });

    // const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
    //   domainName: 'stichtingbeep.nl',
    //   privateZone: false
    // });
    //
    // const certificate = new certificateManager.DnsValidatedCertificate(this, 'Certificate', {
    //   domainName: 'api.stichtingbeep.nl',
    //   hostedZone
    // });

    // We need to insert a redirect action here later, but CDK does not support this yet due to a bug:
    // https://github.com/aws/aws-cdk/issues/2563
    // For now we can add this redirect action from http to https manually through the console.





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
      storageType: rds.StorageType.GP2,
      storageEncrypted: false,
      allocatedStorage: 20,
      enablePerformanceInsights: false,
      deleteAutomatedBackups: false,
      preferredBackupWindow: '01:00-02:00',
      backupRetention: cdk.Duration.days(30),
      preferredMaintenanceWindow: 'Sun:02:00-Sun:03:00',
      autoMinorVersionUpgrade: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
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

    const api = new Api(this, 'Api', {
      vpc,
      nginxProductionRepository: nginxPipeline.productionRepository,
      apiProductionRepository: apiPipeline.productionRepository,
    });



  }
}
