import cdk = require('@aws-cdk/core');
import cognito = require('@aws-cdk/aws-cognito');
import {UserPoolAttribute} from "@aws-cdk/aws-cognito";

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

    const userPoolClient = new cognito.UserPoolClient(this, 'BeepUiClient', {
      userPool,
      userPoolClientName: 'BeepUi',
      generateSecret: false,
      enabledAuthFlows: [

      ]
    })

  }

}
