import cdk = require('@aws-cdk/core');
import s3 = require('@aws-cdk/aws-s3');

export class S3Registry extends cdk.Construct {

  readonly uiBucket: s3.Bucket;

  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);

    const uiBucket = new s3.Bucket(this, 'UiBucket', {
      websiteIndexDocument: 'index.html',
      publicReadAccess: true
    })
    this.uiBucket = uiBucket;

  }
}
