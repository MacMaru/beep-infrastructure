#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/core');
import {BeepPlatform} from "../lib/beep-platform";

const app = new cdk.App();

new BeepPlatform(app, 'Beep', {
  env: {
    account: '038855593698',
    region: 'eu-west-1'
  },
  domainName: 'stichtingbeep.nl',
})

