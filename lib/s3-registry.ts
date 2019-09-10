import cdk = require('@aws-cdk/core');

export class S3Registry extends cdk.Construct {

  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);
  }
}
