# Beep Infrastructure
Beep infrastructure is defined and managed using the [AWS CDK](https://docs.aws.amazon.com/cdk/latest/guide/home.html).

## Prerequisites

* Install the [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-install.html#install-tool-bundled)
* Specify your AWS CLI [credentials and region](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html#getting_started_credentials)
* Install [Node.js](https://nodejs.org/en/download/)

## Installation

```
npm install -g aws-cdk
npm install
```

## Deployment

Before you deploy the updated app, evaluate the difference between the AWS CDK app and the deployed app:
```
cdk diff
```
**Always consult with your local AWS specialist before deployment, if you are unsure of what you are doing.**

Deploy the changes:
```
cdk deploy
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
