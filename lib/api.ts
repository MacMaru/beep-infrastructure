import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import ecs = require('@aws-cdk/aws-ecs');
import ecr = require('@aws-cdk/aws-ecr');
import logs = require('@aws-cdk/aws-logs');
import elb = require('@aws-cdk/aws-elasticloadbalancingv2');
import route53 = require('@aws-cdk/aws-route53');
import route53Targets = require('@aws-cdk/aws-route53-targets');
import certificateManager = require('@aws-cdk/aws-certificatemanager');

export interface ApiProps {
  vpc: ec2.Vpc,
  nginxProductionRepository: ecr.Repository,
  apiProductionRepository: ecr.Repository,
  hostedZone: route53.IHostedZone,
}

export class Api extends cdk.Construct {

  readonly service: ecs.FargateService;

  static readonly apiSubdomain = 'api';

  constructor(scope: cdk.Construct, id: string, props: ApiProps) {
    super(scope, id);

    const apiDomainName = Api.apiSubdomain + '.' + props.hostedZone.zoneName;
    const certificate = new certificateManager.DnsValidatedCertificate(this, 'Certificate', {
      domainName: apiDomainName,
      hostedZone: props.hostedZone
    });

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

    const apiLogs = new logs.LogGroup(this, 'ApiLogs', {
      logGroupName: 'Api/Production',
      retention: logs.RetentionDays.ONE_DAY,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    const nginxContainer = apiTask.addContainer('nginx', {
      image: ecs.ContainerImage.fromEcrRepository(props.nginxProductionRepository),
      essential: true,
      logging: ecs.LogDriver.awsLogs({
        logGroup: apiLogs,
        streamPrefix: 'nginx',
      }),
    });

    nginxContainer.addPortMappings({
      containerPort: 80,
      hostPort: 80,
      protocol: ecs.Protocol.TCP
    });

    const apiContainer = apiTask.addContainer('api', {
      image: ecs.ContainerImage.fromEcrRepository(props.apiProductionRepository),
      essential: true,
      logging: ecs.LogDriver.awsLogs({
        logGroup: apiLogs,
        streamPrefix: 'php',
      })
    });

    nginxContainer.addContainerDependencies({
      container: apiContainer,
      condition: ecs.ContainerDependencyCondition.START
    });

    const service = new ecs.FargateService(this, 'ApiService', {
      cluster,
      vpcSubnets: {
        subnetName: 'Application'
      },
      serviceName: 'apiService',
      taskDefinition: apiTask,
      assignPublicIp: false,
      desiredCount: 0,
      // healthCheckGracePeriod: cdk.Duration.seconds(30),
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
      platformVersion: ecs.FargatePlatformVersion.LATEST,
    });
    this.service = service;

    const loadBalancer = new elb.ApplicationLoadBalancer(this, 'LoadBalancer', {
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
    });

    new route53.ARecord(this, 'Alias', {
      target: route53.RecordTarget.fromAlias(new route53Targets.LoadBalancerTarget(loadBalancer)),
      zone: props.hostedZone,
      recordName: apiDomainName,
      comment: 'Domain for Beep API.',
      ttl: cdk.Duration.seconds(300)
    });

    const listener = loadBalancer.addListener('HttpsListener', {
      protocol: elb.ApplicationProtocol.HTTPS,
      port: 443,
      open: true,
      sslPolicy: elb.SslPolicy.RECOMMENDED,
      certificateArns: [certificate.certificateArn]
    });

    const targetGroup = listener.addTargets('ECS', {
      port: 80,
      protocol: elb.ApplicationProtocol.HTTP,
      targets: [service],
      healthCheck: {
        path: '/ping'
      },
      deregistrationDelay: cdk.Duration.seconds(60),
      targetGroupName: 'ApiProduction',
    });

    const scaling = service.autoScaleTaskCount({
      minCapacity: 1,
      maxCapacity: 2
    });
    scaling.scaleOnRequestCount('Scaling', {
      targetGroup: targetGroup,
      requestsPerTarget: 100,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60)
    });

    // We need to insert a redirect action here later, but CDK does not support this yet due to a bug:
    // https://github.com/aws/aws-cdk/issues/2563
    // For now we can add this redirect action from http to https manually through the console.
  }
}


