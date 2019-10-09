import cdk = require('@aws-cdk/core');
import s3 = require('@aws-cdk/aws-s3');

export class S3Stack extends cdk.Stack {

  readonly uiBucket: s3.Bucket;

  constructor(scope: cdk.Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    this.uiBucket = new s3.Bucket(this, 'UiBucket', {
      websiteIndexDocument: 'index.html',
      publicReadAccess: true,
      blockPublicAccess: {
        blockPublicAcls: false,
        blockPublicPolicy: false,
        restrictPublicBuckets: false,
        ignorePublicAcls: false
      }
    })
  }
}
