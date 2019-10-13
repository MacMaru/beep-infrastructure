import cdk = require('@aws-cdk/core');
import s3 = require('@aws-cdk/aws-s3');
import iam = require('@aws-cdk/aws-iam');
import cloudfront = require('@aws-cdk/aws-cloudfront');
import {S3Stack} from "./s3-stack";

export class UiStack extends cdk.Stack {

  readonly sourceBucket: s3.Bucket

  constructor(scope: cdk.Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    this.sourceBucket = new s3.Bucket(this, 'UiBucket');

    const originAccessIdentity = new cloudfront.CfnCloudFrontOriginAccessIdentity(this, 'oid', {
      cloudFrontOriginAccessIdentityConfig: {
        comment: 'OAI for ui origin bucket'
      }
    });

    const policyStatement = new iam.PolicyStatement();
    policyStatement.addActions('s3:GetBucket*');
    policyStatement.addActions('s3:GetObject*');
    policyStatement.addActions('s3:List*');
    policyStatement.addResources(this.sourceBucket.bucketArn);
    policyStatement.addResources(`${this.sourceBucket.bucketArn}/*`);
    policyStatement.addCanonicalUserPrincipal(originAccessIdentity.attrS3CanonicalUserId);
    this.sourceBucket.addToResourcePolicy(policyStatement);

    new cloudfront.CloudFrontWebDistribution(this, 'UiDistribution', {
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: this.sourceBucket,
            originAccessIdentityId: originAccessIdentity.ref
          },
          behaviors: [{
            isDefaultBehavior: true
          }],
        },
      ],
      defaultRootObject: 'index.html',
      errorConfigurations: [
        {
          errorCode: 404,
          responseCode: 200,
          responsePagePath: '/index.html'
        }
      ],

    })

  }
}
