import cdk = require('@aws-cdk/core');
import {EcrStack} from "./ecr-stack";
import {NginxCiPipeline} from "./nginx-ci-pipeline";
import {PhpCiPipeline} from "./php-ci-pipeline";
import {ApiCdPipeline} from "./api-cd-pipeline";
import {ApiStack} from "./api-stack";

export interface ApiCdStackProps extends cdk.StackProps{
  ecr: EcrStack,
  api: ApiStack
}

export class ApiCdStack extends cdk.Stack {

  readonly phpPipeline: PhpCiPipeline;
  readonly nginxPipeline: NginxCiPipeline;
  readonly apiPipeline: ApiCdPipeline;

  constructor(scope: cdk.Construct, id: string, props: ApiCdStackProps) {
    super(scope, id, props);

    this.nginxPipeline = new NginxCiPipeline(this, 'NginxCiPipeline', {
      ecr: props.ecr
    });

    this.phpPipeline = new PhpCiPipeline(this, 'PhpCiPipeline', {
      ecr: props.ecr
    });

    this.apiPipeline = new ApiCdPipeline(this, 'ApiCdPipeline', {
      ecr: props.ecr,
      service: props.api.service
    });
  }
}

