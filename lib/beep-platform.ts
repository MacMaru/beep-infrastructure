import cdk = require('@aws-cdk/core');
import {VpcStack} from "./vpc-stack";
import {EcrStack} from "./ecr-stack";
import {RdsStack} from "./rds-stack";
import {ApiStack} from "./api-stack";
import {ApiCdStack} from "./api-cd-stack";
import {UiCdStack} from "./ui-cd-stack";
import {UiStack} from "./ui-stack";

export interface BeepPlatformProps {
  env: cdk.Environment,
  domainName: string
}

export class BeepPlatform extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: BeepPlatformProps) {
    super(scope, id);

    const vpcStack = new VpcStack(this, 'Vpc', {
      env: props.env,
    })

    const ecrStack = new EcrStack(this, 'Ecr', {
      env: props.env
    })

    const rdsStack = new RdsStack(this, 'Rds', {
      env: props.env,
      vpc: vpcStack
    })
    rdsStack.addDependency(vpcStack)

    const apiStack = new ApiStack(this, 'Api', {
      env: props.env,
      vpc: vpcStack.vpc,
      ecr: ecrStack,
      domainName: props.domainName,
      rds: rdsStack
    });
    apiStack.addDependency(vpcStack)
    apiStack.addDependency(ecrStack)

    const apiCdStack = new ApiCdStack(this, 'ApiPipelines', {
      env: props.env,
      ecr: ecrStack,
      service: apiStack.service
    })
    apiCdStack.addDependency(apiStack)

    const uiStack = new UiStack(this, 'Ui', {
      env: props.env,
      rootDomain: props.domainName
    })

    new UiCdStack(this, 'UiCd', {
      env: props.env,
      sourceBucket: uiStack.sourceBucket,
      distribution: uiStack.distribution
    })
  }
}
