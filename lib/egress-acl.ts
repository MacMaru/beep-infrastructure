import cdk = require('@aws-cdk/core');
import {
    CfnNetworkAcl,
    CfnNetworkAclEntry, CfnSubnet,
    CfnSubnetNetworkAclAssociation,
    SelectedSubnets,
    Vpc
} from "@aws-cdk/aws-ec2";

export interface EgressAclProps {
    vpc: Vpc,
    subnetSelection: SelectedSubnets
}

// ACL for subnets that process egress data (NAT gateway or an egress-only Internet Gateway).
export class EgressAcl extends cdk.Construct {
    constructor(scope: cdk.Construct, id: string, props: EgressAclProps) {
        super(scope, id);

        const egressAcl = new CfnNetworkAcl(this, 'EgressAcl', {
            vpcId: props.vpc.vpcId,
            tags: [{
                key: 'Name',
                value: 'egress-acl'
            }]
        });

        // Vpc -> Nat
        new CfnNetworkAclEntry(this, 'InboundSsh', {
            networkAclId: egressAcl.ref,
            egress: false,
            ruleNumber: 1,
            protocol: 6,
            portRange: {
                from: 22,
                to: 22
            },
            cidrBlock: '10.0.0.0/16',
            ruleAction: 'allow',
        });

        // Vpc -> Nat
        new CfnNetworkAclEntry(this, 'InboundHttp', {
            networkAclId: egressAcl.ref,
            egress: false,
            ruleNumber: 2,
            protocol: 6,
            portRange: {
                from: 80,
                to: 80
            },
            cidrBlock: '10.0.0.0/16',
            ruleAction: 'allow',
        });

        // Vpc -> Nat
        new CfnNetworkAclEntry(this, 'InboundHttps', {
            networkAclId: egressAcl.ref,
            egress: false,
            ruleNumber: 3,
            protocol: 6,
            portRange: {
                from: 443,
                to: 443
            },
            cidrBlock: '10.0.0.0/16',
            ruleAction: 'allow',
        });

        // Internet -> Nat (return traffic)
        new CfnNetworkAclEntry(this, 'InboundEphemeral', {
            networkAclId: egressAcl.ref,
            egress: false,
            ruleNumber: 4,
            protocol: 6,
            portRange: {
                from: 32768,
                to: 65535
            },
            cidrBlock: '0.0.0.0/0',
            ruleAction: 'allow',
        });

        // Nat -> Internet
        new CfnNetworkAclEntry(this, 'OutboundSsh', {
            networkAclId: egressAcl.ref,
            egress: true,
            ruleNumber: 1,
            protocol: 6,
            portRange: {
                from: 22,
                to: 22
            },
            cidrBlock: '0.0.0.0/0',
            ruleAction: 'allow',
        });

        // Nat -> Internet
        new CfnNetworkAclEntry(this, 'OutboundHttp', {
            networkAclId: egressAcl.ref,
            egress: true,
            ruleNumber: 2,
            protocol: 6,
            portRange: {
                from: 80,
                to: 80
            },
            cidrBlock: '0.0.0.0/0',
            ruleAction: 'allow',
        });

        // Nat -> Internet
        new CfnNetworkAclEntry(this, 'OutboundHttps', {
            networkAclId: egressAcl.ref,
            egress: true,
            ruleNumber: 3,
            protocol: 6,
            portRange: {
                from: 443,
                to: 443
            },
            cidrBlock: '0.0.0.0/0',
            ruleAction: 'allow',
        });

        // Nat -> Vpc (return traffic)
        new CfnNetworkAclEntry(this, 'OutboundEphemeral', {
            networkAclId: egressAcl.ref,
            egress: true,
            ruleNumber: 4,
            protocol: 6,
            portRange: {
                from: 32768,
                to: 65535
            },
            cidrBlock: '10.0.0.0/16',
            ruleAction: 'allow',
        });

        props.subnetSelection.subnets.forEach((subnet, index) => {
            const cfn = subnet.node.defaultChild as CfnSubnet;
            console.log(cfn.cidrBlock);
            new CfnSubnetNetworkAclAssociation(this, 'EgressAclAssoc' + index, {
                networkAclId: egressAcl.ref,
                subnetId: subnet.subnetId,
            });
        });
    }
}

