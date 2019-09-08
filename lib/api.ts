import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import ecs = require('@aws-cdk/aws-ecs');
import ecr = require('@aws-cdk/aws-ecr');

export interface ApiProps {
  vpc: ec2.Vpc
  nginxProductionRepository: ecr.Repository,
  apiProductionRepository: ecr.Repository,
}

export class Api extends cdk.Construct {
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

    apiTask.addContainer('nginx', {
      image: ecs.ContainerImage.fromEcrRepository(props.nginxProductionRepository),
      essential: true,
      // logging: ecs.LogDriver.awsLogs({
      //   logGroup: ,
      //   streamPrefix: 'ecs',
      //   logRetention:
      // })
    });

    apiTask.addContainer('api', {
      image: ecs.ContainerImage.fromEcrRepository(props.apiProductionRepository),
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
  }
}


