import cdk = require('@aws-cdk/core');
import {
  CfnNetworkAcl,
  CfnNetworkAclEntry, CfnSubnet,
  CfnSubnetNetworkAclAssociation,
  SelectedSubnets,
  Vpc
} from "@aws-cdk/aws-ec2";

export interface BastionAclProps {
  vpc: Vpc,
  subnetSelection: SelectedSubnets
}

// ACL for subnets that process egress data (NAT gateway or an egress-only Internet Gateway).
export class BastionAcl extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: BastionAclProps) {
    super(scope, id);

    const acl = new CfnNetworkAcl(this, 'BastionAcl', {
      vpcId: props.vpc.vpcId,
      tags: [{
        key: 'Name',
        value: 'bastion-acl'
      }]
    });

    new CfnNetworkAclEntry(this, 'outboundMysql', {
      networkAclId: acl.ref,
      egress: true,
      ruleNumber: 1,
      protocol: 6,
      portRange: {
        from: 3306,
        to: 3306
      },
      cidrBlock: '10.0.0.0/16',
      ruleAction: 'allow',
    });

    new CfnNetworkAclEntry(this, 'inboundEphemeral', {
      networkAclId: acl.ref,
      egress: false,
      ruleNumber: 1,
      protocol: 6,
      portRange: {
        from: 32768,
        to: 61000
      },
      cidrBlock: '10.0.0.0/16',
      ruleAction: 'allow',
    });

    props.subnetSelection.subnets.forEach((subnet, index) => {
      new CfnSubnetNetworkAclAssociation(this, 'BastionAclAssoc' + index, {
        networkAclId: acl.ref,
        subnetId: subnet.subnetId,
      });
    });

  }
}
