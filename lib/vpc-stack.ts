import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import {EgressAcl} from "./egress-acl";
import {IngressAcl} from "./ingress-acl";
import {ApplicationAcl} from "./application-acl";
import {BastionHostLinux} from "@aws-cdk/aws-ec2";
import {BastionAcl} from "./bastion-acl";

export class VpcStack extends cdk.Stack {
  readonly vpc: ec2.Vpc

  constructor(scope: cdk.Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, 'Production', {
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
        }
      ],
      natGateways: 1,
      natGatewaySubnets: {
        subnetName: 'Egress'
      }
    });

    new EgressAcl(this, 'EgressAcl', {
      vpc: this.vpc,
      subnetSelection: this.vpc.selectSubnets({
        subnetName: 'Egress'
      })
    });

    new IngressAcl(this, 'IngressAcl', {
      vpc: this.vpc,
      subnetSelection: this.vpc.selectSubnets({
        subnetName: 'Ingress'
      })
    });

    new ApplicationAcl(this, 'ApplicationAcl', {
      vpc: this.vpc,
      subnetSelection: this.vpc.selectSubnets({
        subnetName: 'Application'
      })
    });

    new BastionAcl(this, 'BastionAcl', {
      vpc: this.vpc,
      subnetSelection: this.vpc.selectSubnets({
        subnetName: 'Bastion'
      })
    });

    new BastionHostLinux(this, 'Bastion', {
      vpc: this.vpc,
      subnetSelection: {
        subnetGroupName: 'Bastion',
      },
    })
  }
}
