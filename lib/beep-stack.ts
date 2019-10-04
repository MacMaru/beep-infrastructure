import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import route53 = require('@aws-cdk/aws-route53');

import {EgressAcl} from "./egress-acl";
import {IngressAcl} from "./ingress-acl";
import {ApplicationAcl} from "./application-acl";
import {NginxCiPipeline} from "./nginx-ci-pipeline";
import {PhpCiPipeline} from "./php-ci-pipeline";
import {ApiCdPipeline} from "./api-cd-pipeline";
import {Api} from "./api";
import {StackProps} from "@aws-cdk/core";
import {Storage} from "./storage";
import {Cognito} from "./cognito";

export interface BeepStackProps extends StackProps{
  domainName: string,
}

export class BeepStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: BeepStackProps) {
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

    const storage = new Storage(this, 'Storage', {
      vpc
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

    const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName: props.domainName,
    });

    const api = new Api(this, 'Api', {
      vpc,
      storage,
      hostedZone
    });

    const nginxPipeline = new NginxCiPipeline(this, 'NginxCiPipeline', {
      storage
    });

    const phpPipeline = new PhpCiPipeline(this, 'PhpCiPipeline', {
      storage
    });

    const apiPipeline = new ApiCdPipeline(this, 'ApiCdPipeline', {
      storage,
      service: api.service
    });

    const cognito = new Cognito(this, 'Cognito')
  }
}
