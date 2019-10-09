import cdk = require('@aws-cdk/core');
import rds = require('@aws-cdk/aws-rds');
import ec2 = require('@aws-cdk/aws-ec2');
import secretsManager = require('@aws-cdk/aws-secretsmanager');
import ssm = require('@aws-cdk/aws-ssm');

export interface RdsStackProperties extends cdk.StackProps{
  vpc: ec2.Vpc
}

export class RdsStack extends cdk.Stack {

  readonly apiDatabase: rds.DatabaseInstance;
  readonly apiDatabaseMasterCredentials: secretsManager.Secret;

  constructor(scope: cdk.Construct, id: string, props: RdsStackProperties) {
    super(scope, id, props);

    const dbMasterCredentials = new secretsManager.Secret(this, 'DatabaseMasterCredentials', {
      secretName: 'Beep/Production/Api/DatabaseMasterCredentials',
      description: 'Password for the RDS master user.',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'QueenBee'}),
        generateStringKey: 'password',
        passwordLength: 32,
        excludeCharacters: '"@/\\',
      }
    });
    this.apiDatabaseMasterCredentials = dbMasterCredentials;

    // Performance insights and encrypted storage are not supported for this instance.
    // Activate these when upgrading DB.
    const database = new rds.DatabaseInstance(this, 'Database', {
      vpc: props.vpc,
      vpcPlacement: {
        subnetName: 'Database'
      },
      databaseName: 'beepproduction',
      engine: rds.DatabaseInstanceEngine.MYSQL,
      engineVersion: '5.7',
      instanceClass: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE2, ec2.InstanceSize.MICRO),
      multiAz: false,
      masterUsername: dbMasterCredentials.secretValueFromJson('username').toString(),
      masterUserPassword: dbMasterCredentials.secretValueFromJson('password'),
      storageType: rds.StorageType.GP2,
      storageEncrypted: false,
      allocatedStorage: 20,
      enablePerformanceInsights: false,
      deleteAutomatedBackups: false,
      preferredBackupWindow: '01:00-02:00',
      backupRetention: cdk.Duration.days(30),
      preferredMaintenanceWindow: 'Sun:02:00-Sun:03:00',
      autoMinorVersionUpgrade: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      // Add deletion protection in prod
      deletionProtection: false,
    });
    this.apiDatabase = database;

    const databaseEndpoint = new ssm.StringParameter(this, 'DatabaseEndpoint', {
      parameterName: '/Beep/Production/DbEndpoint',
      description: 'Combination of HOSTNAME:PORT for the database endpoint.',
      stringValue: database.instanceEndpoint.socketAddress
    });

    const secretTargetAttachment = new secretsManager.SecretTargetAttachment(this, 'DbCredentialsAttachment', {
      secret: dbMasterCredentials,
      target: database
    });
  }
}
