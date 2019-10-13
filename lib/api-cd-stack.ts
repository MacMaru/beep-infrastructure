import cdk = require('@aws-cdk/core');
import ecs = require('@aws-cdk/aws-ecs');
import {EcrStack} from "./ecr-stack";
import {NginxCiPipeline} from "./nginx-ci-pipeline";
import {PhpCiPipeline} from "./php-ci-pipeline";
import {ApiCdPipeline} from "./api-cd-pipeline";

export interface ApiCdStackProps extends cdk.StackProps{
  ecr: EcrStack,
  service: ecs.FargateService
}

export class ApiCdStack extends cdk.Stack {

  static readonly apiSubdomain = 'api';

  constructor(scope: cdk.Construct, id: string, props: ApiCdStackProps) {
    super(scope, id, props);

    new NginxCiPipeline(this, 'Nginx', {
      ecr: props.ecr
    });

    new PhpCiPipeline(this, 'Php', {
      ecr: props.ecr
    });

    new ApiCdPipeline(this, 'Api', {
      ecr: props.ecr,
      service: props.service
    });


  }
}
