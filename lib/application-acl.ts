import cdk = require('@aws-cdk/core');
import {
    CfnNetworkAcl,
    CfnNetworkAclEntry, CfnSubnet,
    CfnSubnetNetworkAclAssociation,
    SelectedSubnets,
    Vpc
} from "@aws-cdk/aws-ec2";

export interface ApplicationAclProps {
    vpc: Vpc,
    subnetSelection: SelectedSubnets
}

// ACL for subnets that process egress data (NAT gateway or an egress-only Internet Gateway).
export class ApplicationAcl extends cdk.Construct {
    constructor(scope: cdk.Construct, id: string, props: ApplicationAclProps) {
        super(scope, id);

        const applicationAcl = new CfnNetworkAcl(this, 'ApplicationAcl', {
            vpcId: props.vpc.vpcId,
            tags: [{
                key: 'Name',
                value: 'application-acl'
            }]
        });

        // Elb -> Fargate
        new CfnNetworkAclEntry(this, 'InboundHttp', {
            networkAclId: applicationAcl.ref,
            egress: false,
            ruleNumber: 1,
            protocol: 6,
            portRange: {
                from: 80,
                to: 80
            },
            cidrBlock: '10.0.0.0/16',
            ruleAction: 'allow',
        });

        // Fargate -> Elb (return traffic)
        new CfnNetworkAclEntry(this, 'OutboundEphemeral', {
            networkAclId: applicationAcl.ref,
            egress: true,
            ruleNumber: 1,
            protocol: 6,
            portRange: {
                from: 1024,
                to: 65535
            },
            cidrBlock: '10.0.0.0/16',
            ruleAction: 'allow',
        });

        // Fargate -> Internet (through Nat)
        new CfnNetworkAclEntry(this, 'OutboundHttp', {
            networkAclId: applicationAcl.ref,
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

        // Fargate -> Internet (through Nat)
        new CfnNetworkAclEntry(this, 'OutboundHttps', {
            networkAclId: applicationAcl.ref,
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

        // Internet -> Fargate (return traffic, through Nat)
        // Rds -> Fargate
        new CfnNetworkAclEntry(this, 'InboundEphemeral', {
            networkAclId: applicationAcl.ref,
            egress: false,
            ruleNumber: 2,
            protocol: 6,
            portRange: {
                from: 1024,
                to: 65535
            },
            cidrBlock: '0.0.0.0/0',
            ruleAction: 'allow',
        });

        // Fargate -> Rds
        new CfnNetworkAclEntry(this, 'OutboundMySql', {
            networkAclId: applicationAcl.ref,
            egress: false,
            ruleNumber: 3,
            protocol: 6,
            portRange: {
                from: 3306,
                to: 3306
            },
            cidrBlock: '10.0.0.0/16',
            ruleAction: 'allow',
        });

        props.subnetSelection.subnets.forEach((subnet, index) => {
            new CfnSubnetNetworkAclAssociation(this, 'ApplicationAclAssoc' + index, {
                networkAclId: applicationAcl.ref,
                subnetId: subnet.subnetId,
            });
        });
    }
}

