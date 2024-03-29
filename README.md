# Beep Infrastructure
Beep infrastructure is defined and managed using the [AWS CDK](https://docs.aws.amazon.com/cdk/latest/guide/home.html).

## Installation

### Prerequisites

* Install the [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-install.html#install-tool-bundled)
* Specify your AWS CLI [credentials and region](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html#getting_started_credentials)
* Install [Node.js](https://nodejs.org/en/download/)

### CDK

```
npm install -g aws-cdk
npm install
```

## Deployment

**Always consult with your local AWS specialist before deployment, if you are unsure of what you are doing.**

### Prerequisites

Before deploying the stack for the first time, there must be a hosted zone present in route 53. This hosted zone must manage the domain name that you pass to the BeepStack constructor in `beep-infrastructure.ts`:

```
new BeepStack(app, 'Beep', {
  env: {
    account: 'xxxxxxxxxxxx',
    region: 'eu-west-1'
  },
  domainName: 'stichtingbeep.nl',
});
```

If you have recently created this hosted zone, you should wait 24-48 hours for the DNS records to properly propagate, before you deploy the stack for the first time (or change the domain name).
If you do not do this, the certificate generation process will fail, because this process uses DNS validation to automatically validate requested certificates.

For email sending, you must have an active SES configuration. In the cognito file you must add the correct ARN for the from address. 

### Initial deployment

When you deploy the stack for the first time, make sure to set the desired service count to 0, because the images do not yet exist.

### Production

Before you deploy the updated app, evaluate the difference between the AWS CDK app and the deployed app:
```
cdk diff
```

Deploy the changes:
```
cdk deploy Beep*
```

## Development

Use the [reference documentation](https://docs.aws.amazon.com/cdk/api/latest/) to get an understanding of the concepts.

## Debugging

In order to debug, add a Run/debug configuration in WebStorm:

```
Run > Edit Configurations...
```

Under `Javascript file` add the path to your CDK binary e.g. `~/.nvm/versions/node/v12.7.0/bin/cdk`.

Under `Application parameters` add the CDK command you want to debug for, e.g. `diff`

Name the command after the CDK command you want to debug e.g. `cdk diff`.

If you are using a specific profile, do not forget to add the `--profile` argument with the profile name.

Set a breakpoint and click debug next to the run configuration in the top right.

## Connecting to the database (RDS)

1. Install the [Session Manager Plugin](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html) Plugin for AWS CLI
2. Log into the bastion instance: `aws ssm start-session --target i-096eca4a81f445b75`
3. Assume the `ec2-user`: 
    ```
    $ sudo -i
    # su ec2-user
    ```
4. Add your own public key to the authorized_keys file of the ec2-user
5. Add the following to your ssh config
    ```
    Host i-* mi-*
      ProxyCommand sh -c "PATH=$PATH:/usr/local/bin /usr/local/bin/aws ssm start-session --target %h --document-name AWS-StartSSHSession --parameters 'portNumber=%p'"
    ```
    **Note** If you are using a different profile in aws, make sure to include the --profile <PROFILE> argument 
    
The `PATH=$PATH:/usr/local/bin` in front of the command is necessary if you use Sequel Pro (Mac). For some reason it doesn't respect the user paths and fails to find aws cli and session plugin 
