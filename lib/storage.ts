import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import {EcrRegistry} from "./ecr-registry";
import {RdsRegistry} from "./rds-registry";
import {S3Registry} from "./s3-registry";

export interface StorageProps {
  vpc: ec2.Vpc
}

export class Storage extends cdk.Construct {

  readonly ecr: EcrRegistry;
  readonly rds: RdsRegistry;
  readonly s3: S3Registry;

  constructor(scope: cdk.Construct, id: string, props: StorageProps) {
    super(scope, id);

    this.ecr = new EcrRegistry(this, 'Ecr');
    this.rds = new RdsRegistry(this, 'Rds', {
      vpc: props.vpc,
    });
    this.s3 = new S3Registry(this, 'S3');


  }
}
