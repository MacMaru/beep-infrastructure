#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/core');
import { BeepStack } from '../lib/beep-stack';

const app = new cdk.App();

new BeepStack(app, 'Beep', {
  env: {
    account: '038855593698',
    region: 'eu-west-1'
  },
  domainName: 'stichtingbeep.nl',
});

