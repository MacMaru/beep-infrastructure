# beep-infrastructure
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

Deploy the changes:
```
cdk deploy
```

Always consult with your local AWS specialist if you are unsure of what you are doing.
