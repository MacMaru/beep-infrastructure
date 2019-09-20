import cdk = require('@aws-cdk/core');
import cognito = require('@aws-cdk/aws-cognito');

export class Cognito extends cdk.Construct {

  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);

    const userPool = new cognito.UserPool(this, 'BeepProduction', {
      userPoolName: 'BeepProduction',
      autoVerifiedAttributes: [
        cognito.UserPoolAttribute.EMAIL
      ],
      signInType: cognito.SignInType.EMAIL,
    });

    const cfnUserPool = userPool.node.defaultChild as cognito.CfnUserPool
    cfnUserPool.emailConfiguration = {
      emailSendingAccount: 'DEVELOPER',
      sourceArn: 'arn:aws:ses:eu-west-1:038855593698:identity/noreply@stichtingbeep.nl'
    }

    const userPoolClient = new cognito.UserPoolClient(this, 'BeepUiClient', {
      userPool,
      userPoolClientName: 'BeepUi',
      generateSecret: false,
    });

    const cfnUserPoolClient = userPoolClient.node.defaultChild as cognito.CfnUserPoolClient
    cfnUserPoolClient.allowedOAuthFlowsUserPoolClient = true
    cfnUserPoolClient.allowedOAuthFlows = [
      'code', 'implicit'
    ];
    cfnUserPoolClient.callbackUrLs = ['localhost:8080']
    cfnUserPoolClient.logoutUrLs = ['localhost:8080']
    cfnUserPoolClient.allowedOAuthScopes = ['email', 'openid', 'profile']
    cfnUserPoolClient.supportedIdentityProviders = ['COGNITO']
  }

}
