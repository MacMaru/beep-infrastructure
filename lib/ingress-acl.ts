import cdk = require('@aws-cdk/core');
import {
    CfnNetworkAcl,
    CfnNetworkAclEntry, CfnSubnet,
    CfnSubnetNetworkAclAssociation,
    SelectedSubnets,
    Vpc
} from "@aws-cdk/aws-ec2";

export interface IngressAclProps {
    vpc: Vpc,
    subnetSelection: SelectedSubnets
}

// ACL for subnets that process ingress data (Application Load Balancer).
export class IngressAcl extends cdk.Construct {
    constructor(scope: cdk.Construct, id: string, props: IngressAclProps) {
        super(scope, id);

        const acl = new CfnNetworkAcl(this, 'IngressAcl', {
            vpcId: props.vpc.vpcId,
            tags: [{
                key: 'Name',
                value: 'ingress-acl'
            }]
        });

        // Api client -> Load balancer (redirect to https)
        new CfnNetworkAclEntry(this, 'InboundHttp', {
            networkAclId: acl.ref,
            egress: false,
            ruleNumber: 1,
            protocol: 6,
            portRange: {
                from: 80,
                to: 80
            },
            cidrBlock: '0.0.0.0/0',
            ruleAction: 'allow',
        });

        // Api client -> Load balancer
        new CfnNetworkAclEntry(this, 'InboundHttps', {
            networkAclId: acl.ref,
            egress: false,
            ruleNumber: 2,
            protocol: 6,
            portRange: {
                from: 443,
                to: 443
            },
            cidrBlock: '0.0.0.0/0',
            ruleAction: 'allow',
        });

        // Api test client -> Load balancer (for blue/green deployments)
        new CfnNetworkAclEntry(this, 'InboundHttpsTest', {
            networkAclId: acl.ref,
            egress: false,
            ruleNumber: 3,
            protocol: 6,
            portRange: {
                from: 4433,
                to: 4433
            },
            cidrBlock: '0.0.0.0/0',
            ruleAction: 'allow',
        });

        // Application -> Load balancer (return traffic)
        new CfnNetworkAclEntry(this, 'InboundEphemeral', {
            networkAclId: acl.ref,
            egress: false,
            ruleNumber: 4,
            protocol: 6,
            portRange: {
                from: 1024,
                to: 65535
            },
            cidrBlock: '10.0.0.0/16',
            ruleAction: 'allow',
        });

        // Load balancer -> Application
        new CfnNetworkAclEntry(this, 'OutboundHttp', {
            networkAclId: acl.ref,
            egress: true,
            ruleNumber: 1,
            protocol: 6,
            portRange: {
                from: 80,
                to: 80
            },
            cidrBlock: '0.0.0.0/0',
            ruleAction: 'allow',
        });

        // Load balancer -> Api client
        new CfnNetworkAclEntry(this, 'OutboundEphemeral', {
            networkAclId: acl.ref,
            egress: true,
            ruleNumber: 2,
            protocol: 6,
            portRange: {
                from: 1024,
                to: 65535
            },
            cidrBlock: '0.0.0.0/0',
            ruleAction: 'allow',
        });

        props.subnetSelection.subnets.forEach((subnet, index) => {
            new CfnSubnetNetworkAclAssociation(this, 'IngressAclAssoc' + index, {
                networkAclId: acl.ref,
                subnetId: subnet.subnetId,
            });
        });
    }
}

