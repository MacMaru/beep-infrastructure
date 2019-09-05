import cdk = require('@aws-cdk/core');
import {
  SubnetType,
  Vpc
} from "@aws-cdk/aws-ec2";
import {EgressAcl} from "./egress-acl";
import {IngressAcl} from "./ingress-acl";

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
          subnetType: SubnetType.PUBLIC,
          reserved: true
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
  }
}
