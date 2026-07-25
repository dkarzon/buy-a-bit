# Generated CDK bundle

This folder is a **standalone AWS CDK application** (`iac/cdk`) created from your repository’s detected stack. It defines **infrastructure** (S3, CloudFront, Lambda, API Gateway, ECS, etc.). It does **not** fully build or migrate your application—that part remains **your** deployable code.

**Lambda (Node):** When analysis infers an entry file from `package.json`, `NodejsFunction` points at that path. Otherwise this bundle includes `lib/handler.ts`, a tiny JSON response you should replace or re-point. In both cases, the bundled Lambda must speak **API Gateway HTTP API v2** (or you change the integration).

## Rough AWS cost pointers

These are **order-of-magnitude hints** for a single Region (e.g. US East) at **low or dev traffic**. Actual spend depends on usage, data transfer, and whether free tier applies. Always use the [AWS Pricing Calculator](https://calculator.aws/) before committing.

### Resources in this generated stack

| AWS service | What the template creates | Rough monthly (idle/low traffic) | More info |
|-------------|----------------------------|-----------------------------------|-----------|
| Amazon S3 | Private bucket for static site assets | ~$0–5 | [Pricing](https://aws.amazon.com/s3/pricing/) |
| Amazon CloudFront | CDN in front of the bucket | ~$1–20 | [Pricing](https://aws.amazon.com/cloudfront/pricing/) |

- **Amazon S3:** Storage + minimal requests at low volume; scales with traffic.
- **Amazon CloudFront:** Mostly data transfer and request charges; first 1 TB/mo from CloudFront has tiered pricing.

## Quick start (from repository root)

```bash
cd iac/cdk
npm install
npx cdk synth    # optional: verify CloudFormation templates
npx cdk deploy   # deploys stack "GeneratedAppStack" (IAM changes may require approval)
```

**First time in an account/region:** run CDK bootstrap once (replace account and region):

```bash
npx cdk bootstrap aws://ACCOUNT_ID/us-east-1
```

Use the same region you intend for `cdk deploy` (default follows your AWS CLI configuration).

## Prerequisites

- **Node.js** 20+ and npm
- **AWS permissions** to create the resources in this stack (S3, Lambda, IAM, CloudFront, API Gateway, ECS, etc., depending on framework)
- **AWS CDK CLI** is invoked via `npx` from local `devDependencies`—no global install required

### AWS credentials: where they come from

| You are running… | What to configure |
|------------------|-------------------|
| **GitHub Actions** (generated `.github/workflows/deploy.yml`) | Use **OIDC**: add repository secrets `AWS_DEPLOY_ROLE_ARN` and `AWS_REGION`; the job assumes a role — **do not** commit access keys. See `docs/oidc-setup.md` in the pipeline bundle. |
| **Your machine** (`cdk synth` / `cdk deploy`) | Configure the AWS CLI (`aws configure`), SSO, or environment variables so local commands can call AWS APIs. |

Long‑lived IAM user access keys work for local CLI use but are a poor fit for CI; prefer the OIDC role flow above for GitHub.

## Infrastructure vs deployable app

| | What you get from this generator | What you must supply |
|---|-----------------------------------|----------------------|
| **Infra** | CDK stacks, sensible defaults; optional DynamoDB or **RDS Postgres** when the profile and framework include server compute (static SPA bundles never include RDS) | AWS account, bootstrap, approvals |
| **App** | Inferred Node `entry` from analysis when possible; else stub `lib/handler.ts`; Flask/FastAPI use `iac/cdk/app/` samples when the bundle ships them | Export `handler` (Node), wire Express/WSGI, upload static build (SPA), or replace Docker assets |

This bundle was generated with a **nested deployable** at `apps/api`. Constants named `deployablePath` in `lib/generated-app-stack.ts` point at that directory relative to the repository root—update Lambda `entry` (or Python asset paths) to your real build output under that path.

## Framework-specific: placeholders and next steps

### React SPA (static hosting)

- **Infrastructure in this bundle:** S3 bucket + CloudFront distribution for static files.
- **What is not automated:** Uploading your production build. After `cdk deploy`, copy the **BucketName** output and sync your build folder (e.g. `build/` or `dist/`):

  ```bash
  aws s3 sync ./path/to/your/build s3://YOUR_BUCKET_NAME --delete
  ```

  Optionally extend the stack with `aws-cdk-lib/aws-s3-deployment` (`BucketDeployment`) to publish from CI.

- **Placeholder vs production:** There is no placeholder page in the bucket until you upload real assets; the URL from **WebsiteUrl** will serve your app once the bucket contains `index.html` and assets.

## Database

No database was inferred for this profile; add data stores in CDK or connect to external services as needed.

## Deployment blueprint (from analysis)

- **Frontend:** CloudFront + S3
- **Backend:** none
- **Database:** none
- **Auth:** JWT / session auth
- **CI/CD:** GitHub Actions + OIDC

## Troubleshooting

- **Synth fails:** Run `npm install` inside `iac/cdk`, ensure Node 20+, and that `lib/generated-app-stack.ts` has no local edits that break TypeScript `strict` mode.
- **Deploy fails on assets:** For **FastAPI**, Docker must build successfully locally from the asset directory. For **Lambda** assets, ensure paths in the stack match files on disk.
- **Empty website (React SPA):** Deploy static files to the S3 bucket (see above); CloudFront serves from the bucket.

---
*Generated by ScaleBop. Replace placeholders before relying on this stack in production.*
