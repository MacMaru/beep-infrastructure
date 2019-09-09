import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import ecs = require('@aws-cdk/aws-ecs');
import ecr = require('@aws-cdk/aws-ecr');
import logs = require('@aws-cdk/aws-logs');
import elb = require('@aws-cdk/aws-elasticloadbalancingv2');
import route53 = require('@aws-cdk/aws-route53');
import certificateManager = require('@aws-cdk/aws-certificatemanager');

export interface ApiProps {
  vpc: ec2.Vpc
  nginxProductionRepository: ecr.Repository,
  apiProductionRepository: ecr.Repository,
  hostedZone: route53.IHostedZone,
}

export class Api extends cdk.Construct {

  static readonly apiSubdomain = 'api';

  constructor(scope: cdk.Construct, id: string, props: ApiProps) {
    super(scope, id);

    const cluster = new ecs.Cluster(this, 'EcsCluster', {
      vpc: props.vpc,
      clusterName: 'BeepProduction',
    });

    const apiTask = new ecs.FargateTaskDefinition(this, 'ApiTask', {
      family: 'apiTask',
      cpu: 256,
      memoryLimitMiB: 2048,
    });

    props.nginxProductionRepository.grantPull(apiTask.taskRole);
    props.apiProductionRepository.grantPull(apiTask.taskRole);

    const apiLogs = new logs.LogGroup(this, 'NginxLogs', {
      logGroupName: 'Api/Production',
      retention: logs.RetentionDays.ONE_DAY,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    const apiContainer = apiTask.addContainer('api', {
      image: ecs.ContainerImage.fromEcrRepository(props.apiProductionRepository),
      essential: true,
      logging: ecs.LogDriver.awsLogs({
        logGroup: apiLogs,
        streamPrefix: 'php',
      })
    });

    const nginxContainer = apiTask.addContainer('nginx', {
      image: ecs.ContainerImage.fromEcrRepository(props.nginxProductionRepository),
      essential: true,
      logging: ecs.LogDriver.awsLogs({
        logGroup: apiLogs,
        streamPrefix: 'nginx',
      }),
    });

    nginxContainer.addContainerDependencies({
      container: apiContainer,
      condition: ecs.ContainerDependencyCondition.START
    });

    const apiService = new ecs.FargateService(this, 'ApiService', {
      cluster,
      vpcSubnets: {
        subnetName: 'Application'
      },
      serviceName: 'apiService',
      taskDefinition: apiTask,
      assignPublicIp: false,
      desiredCount: 1,
      // healthCheckGracePeriod: cdk.Duration.seconds(30),
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
      platformVersion: ecs.FargatePlatformVersion.LATEST,

    });

    const loadBalancerSecurityGroup = new ec2.SecurityGroup(this, 'ApiLoadBalancerSecurityGroup', {
      vpc: props.vpc,
      description: 'Elb security group',
    });

    const apiLoadBalancer = new elb.ApplicationLoadBalancer(this, 'ApiLoadBalancer', {
      vpc: props.vpc,
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

    const apiDomainName = Api.apiSubdomain + '.' + props.hostedZone.zoneName;
    const certificate = new certificateManager.DnsValidatedCertificate(this, 'Certificate', {
      domainName: apiDomainName,
      hostedZone: props.hostedZone
    });

    // We need to insert a redirect action here later, but CDK does not support this yet due to a bug:
    // https://github.com/aws/aws-cdk/issues/2563
    // For now we can add this redirect action from http to https manually through the console.
  }
}


