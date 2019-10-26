import cdk = require('@aws-cdk/core');
import s3 = require('@aws-cdk/aws-s3');
import certificateManager = require('@aws-cdk/aws-certificatemanager');
import route53 = require('@aws-cdk/aws-route53');
import route53Targets = require('@aws-cdk/aws-route53-targets');
import iam = require('@aws-cdk/aws-iam');
import cloudfront = require('@aws-cdk/aws-cloudfront');
import cognito = require('@aws-cdk/aws-cognito');

export interface UiStackProps extends cdk.StackProps {
  rootDomain: string
}

export class UiStack extends cdk.Stack {

  readonly sourceBucket: s3.Bucket;
  readonly baseUrl: string;
  readonly distribution: cloudfront.CloudFrontWebDistribution;

  static readonly sourceEmailArn = 'arn:aws:ses:eu-west-1:038855593698:identity/noreply@stichtingbeep.nl';
  static readonly developmentBaseUrl = 'localhost:8080';
  static readonly callbackPath = '/callback';
  static readonly logoutPath = '/logout';

  static readonly domainPrefix = 'app';

  constructor(scope: cdk.Construct, id: string, props: UiStackProps) {
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

    const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName: props.rootDomain,
    })

    const domainName = UiStack.domainPrefix + '.' + hostedZone.zoneName;
    this.baseUrl = 'https://' + domainName;

    const certificate = new certificateManager.DnsValidatedCertificate(this, 'Certificate', {
      domainName,
      hostedZone: hostedZone,
      region: 'us-east-1'
    });

    this.distribution = new cloudfront.CloudFrontWebDistribution(this, 'UiDistribution', {
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
      aliasConfiguration: {
        acmCertRef: certificate.certificateArn,
        names: [domainName],
      }
    });

    new route53.ARecord(this, 'Alias', {
      target: route53.RecordTarget.fromAlias(new route53Targets.CloudFrontTarget(this.distribution)),
      zone: hostedZone,
      recordName: domainName,
      comment: 'Domain for Beep API.',
      ttl: cdk.Duration.seconds(300)
    });

    this.createProductionPoolAndClient(this.baseUrl);
    this.createDevelopmentPoolAndClient();
  }

  createProductionPoolAndClient(clientBaseUrl: string) {
    const userPool = this.createUserPool('BeepProduction');
    this.createClient(userPool, 'BeepUiProduction', this.baseUrl);
  }

  createDevelopmentPoolAndClient() {
    const userPool = this.createUserPool('BeepDevelopment');
    this.createClient(userPool, 'BeepUiDevelopment', UiStack.developmentBaseUrl);
    
  }

  createUserPool(name: string) {
    const userPool = new cognito.UserPool(this, name, {
      userPoolName: name,
      autoVerifiedAttributes: [
        cognito.UserPoolAttribute.EMAIL
      ],
      signInType: cognito.SignInType.EMAIL,
    });

    const cfnUserPool = userPool.node.defaultChild as cognito.CfnUserPool
    cfnUserPool.emailConfiguration = {
      emailSendingAccount: 'DEVELOPER',
      sourceArn: UiStack.sourceEmailArn
    }

    return userPool;
  }

  createClient(userPool: cognito.UserPool, name: string, clientBaseUrl: string) {
    const callbackUrls = [clientBaseUrl + UiStack.callbackPath];
    const logoutUrls = [clientBaseUrl + UiStack.logoutPath];
    const userPoolClient = new cognito.UserPoolClient(this, name, {
      userPool,
      userPoolClientName: name,
      generateSecret: false,
    });

    const cfnUserPoolClient = userPoolClient.node.defaultChild as cognito.CfnUserPoolClient
    cfnUserPoolClient.allowedOAuthFlowsUserPoolClient = true
    cfnUserPoolClient.allowedOAuthFlows = [
      'code', 'implicit'
    ];
    cfnUserPoolClient.callbackUrLs = callbackUrls
    cfnUserPoolClient.logoutUrLs = logoutUrls
    cfnUserPoolClient.allowedOAuthScopes = ['email', 'openid', 'profile']
    cfnUserPoolClient.supportedIdentityProviders = ['COGNITO']
  }


}
