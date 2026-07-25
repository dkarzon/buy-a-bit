import * as cdk from "aws-cdk-lib";
import { GeneratedAppStack } from "../lib/generated-app-stack";

const app = new cdk.App();

new GeneratedAppStack(app, "GeneratedAppStack", {
  description: "Generated deployable infrastructure for React SPA"
});
