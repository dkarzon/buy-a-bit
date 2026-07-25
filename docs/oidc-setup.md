# Connect GitHub Actions to your AWS account (OIDC)

The generated workflow does **not** use long‑lived AWS access keys in the repository. It uses **OpenID Connect (OIDC)** so each job can **assume a short‑lived role** in your account. You add two **GitHub repository secrets** so the workflow knows **which role** and **which region** to use.

## What you put in GitHub (repository secrets)

Add these under **Repository → Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Example value | Purpose |
|--------|----------------|---------|
| `AWS_DEPLOY_ROLE_ARN` | `arn:aws:iam::123456789012:role/scalebop-github-oidc-…-DeployRole-…` | IAM role ARN that trusts GitHub OIDC and can run CDK deploy |
| `AWS_REGION` | `us-east-1` | Region for the deploy; must match where you ran **cdk bootstrap** |

The workflow step **Configure AWS credentials** reads `AWS_DEPLOY_ROLE_ARN` and `AWS_REGION` and exchanges the GitHub OIDC token for AWS credentials for that job only. It requests audience **`sts.amazonaws.com`** (required by AWS STS).

**You do not** create `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` secrets for this OIDC setup.

## Create the IAM OIDC provider and role

### Option 0 — ScaleBop (recommended when AWS + GitHub are connected)

If you connected **GitHub** and **AWS** under ScaleBop **Account → Integrations**, use **Set up GitHub OIDC** there. ScaleBop creates the account-level `ScaleBop-GitHubOidc-*` stack in your AWS account (provider audience `sts.amazonaws.com` + a shared deploy role trusted to your GitHub owner) and syncs `AWS_DEPLOY_ROLE_ARN` / `AWS_REGION` to GitHub Actions secrets for your projects when possible.

### Critical: audience / Client ID

The IAM identity provider **Audience** (also called **Client ID list**) **must** include exactly:

```text
sts.amazonaws.com
```

If the provider is missing, or the audience is set to a GitHub URL / org name instead, Configure AWS credentials fails with:

```text
Could not assume role with OIDC: The web identity token provided could not be validated.
```

That message is **token validation** (provider URL / audience / thumbprint), not a `sub` mismatch. `sub` mismatches usually say **AccessDenied** / **Not authorized to perform sts:AssumeRoleWithWebIdentity**.

### Critical: immutable `sub` claims (repos created on/after 2026-07-15)

GitHub now includes numeric owner/repo IDs in the OIDC subject for new repositories, for example:

```text
repo:YOUR_ORG@12345678/YOUR_REPO@87654321:ref:refs/heads/main
```

A trust policy that only allows the legacy form `repo:YOUR_ORG/YOUR_REPO:…` will fail with **Not authorized to perform sts:AssumeRoleWithWebIdentity**. Your deploy workflow is fine — update the IAM role trust policy (or redeploy `docs/github-oidc-role.yaml`) so `sub` allows both formats.

Check this repo’s prefix:

```bash
gh api repos/OWNER/REPO/actions/oidc/customization/sub
```

### Option A — Console

1. **IAM → Identity providers → Add provider → OpenID Connect**
   - **Provider URL:** `https://token.actions.githubusercontent.com` (include `https://`, no trailing slash)
   - **Audience:** `sts.amazonaws.com`
2. **IAM → Roles → Create role → Web identity**
   - Identity provider: the GitHub provider above
   - Audience: `sts.amazonaws.com`
   - Then edit the trust policy so `sub` matches your repo (example below)
3. Attach permissions sufficient for CloudFormation / CDK (often AdministratorAccess during bring‑up; tighten later).
4. Copy the role **ARN** → `AWS_DEPLOY_ROLE_ARN`.

### Option B — CloudFormation (recommended)

Save the template below as `docs/github-oidc-role.yaml` (also included as a separate file in the Pipeline export ZIP), then deploy:

```bash
aws cloudformation deploy \
  --template-file docs/github-oidc-role.yaml \
  --stack-name scalebop-github-oidc-YOUR_REPO \
  --parameter-overrides GitHubOrg=YOUR_ORG GitHubRepo=YOUR_REPO \
  --capabilities CAPABILITY_IAM
```

Use a **per-repository** stack name so a second project in the same AWS account gets its own deploy role and does not collide with or overwrite the first role's trust policy.

If this account already has a GitHub OIDC provider, add `CreateOidcProvider=false` to `--parameter-overrides`, and still confirm that provider's Client ID list includes `sts.amazonaws.com`.

Then set `AWS_DEPLOY_ROLE_ARN` to the stack output `DeployRoleArn`.

#### Template (`docs/github-oidc-role.yaml`)

```yaml
AWSTemplateFormatVersion: "2010-09-09"
Description: >-
  GitHub Actions OIDC provider + deploy role for ScaleBop-generated workflows.
  The provider Audience (ClientId) MUST be sts.amazonaws.com — otherwise STS
  returns "The web identity token provided could not be validated."

Parameters:
  GitHubOrg:
    Type: String
    Description: GitHub organization or user that owns the repository
  GitHubRepo:
    Type: String
    Description: Repository name (without org prefix)
  CreateOidcProvider:
    Type: String
    Default: "true"
    AllowedValues: ["true", "false"]
    Description: >-
      Set to false if this account already has an IAM OIDC provider for
      token.actions.githubusercontent.com (only one provider URL per account).

Conditions:
  ShouldCreateProvider: !Equals [!Ref CreateOidcProvider, "true"]

Resources:
  GitHubOidcProvider:
    Type: AWS::IAM::OIDCProvider
    Condition: ShouldCreateProvider
    Properties:
      Url: https://token.actions.githubusercontent.com
      ClientIdList:
        - sts.amazonaws.com
      # Required by CloudFormation; AWS also validates tokens via GitHub JWKS.
      ThumbprintList:
        - 6938fd4d98bab03faadb97b93489cec4f5c6fdfd
        - 1c58a3a8518e8759bf075b76b750d4f2df264fcd

  DeployRole:
    Type: AWS::IAM::Role
    Properties:
      # Omit RoleName so CloudFormation assigns a unique physical name (IAM limit 64 chars).
      # Account-level ScaleBop setup passes GitHubRepo=* for shared repo:OWNER/* trust.
      Description: Assumed by GitHub Actions via OIDC for ScaleBop CDK deploy
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Effect: Allow
            Principal:
              Federated: !If
                - ShouldCreateProvider
                - !GetAtt GitHubOidcProvider.Arn
                - !Sub arn:aws:iam::${AWS::AccountId}:oidc-provider/token.actions.githubusercontent.com
            Action: sts:AssumeRoleWithWebIdentity
            Condition:
              StringEquals:
                token.actions.githubusercontent.com:aud: sts.amazonaws.com
              StringLike:
                token.actions.githubusercontent.com:sub:
                  - !Sub repo:${GitHubOrg}/${GitHubRepo}:ref:refs/heads/*
                  - !Sub repo:${GitHubOrg}@*/${GitHubRepo}@*:ref:refs/heads/*
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/AdministratorAccess

Outputs:
  DeployRoleArn:
    Description: Set this value as the GitHub Actions secret AWS_DEPLOY_ROLE_ARN
    Value: !GetAtt DeployRole.Arn
  OidcProviderArn:
    Description: IAM OIDC provider ARN used by the deploy role trust policy
    Value: !If
      - ShouldCreateProvider
      - !GetAtt GitHubOidcProvider.Arn
      - !Sub arn:aws:iam::${AWS::AccountId}:oidc-provider/token.actions.githubusercontent.com
```

### Example trust policy

Replace `ACCOUNT_ID`, `YOUR_ORG`, and `YOUR_REPO`. `StringLike` on `sub` covers **push**, **workflow_dispatch**, and ScaleBop **repository_dispatch** (`scalebop-deploy`) on any branch ref, plus both legacy and immutable (post–2026-07-15) subject formats:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": [
            "repo:YOUR_ORG/YOUR_REPO:ref:refs/heads/*",
            "repo:YOUR_ORG@*/YOUR_REPO@*:ref:refs/heads/*"
          ]
        }
      }
    }
  ]
}
```

For this repository specifically, the emitted prefix is `repo:dkarzon@214449/buy-a-bit@1311512368`, so the second pattern must be present (or use that exact prefix).

To allow only `main`, change each `sub` value’s trailing segment to `ref:refs/heads/main`.

## If assumption still fails

| Error text | Likely cause | Fix |
|------------|--------------|-----|
| **web identity token provided could not be validated** | Wrong/missing OIDC provider audience, bad provider URL, or stale thumbprint | Provider URL `https://token.actions.githubusercontent.com`; Client ID list includes `sts.amazonaws.com`; recreate provider if needed |
| **AccessDenied** / **Not authorized** … **AssumeRoleWithWebIdentity** | Trust `sub` does not match this run (wrong org/repo/branch, or missing immutable `@id` form for new repos) | Align `sub` with org/repo/branch; allow both `repo:ORG/REPO:…` and `repo:ORG@*/REPO@*:…`; use `StringLike` `…:ref:refs/heads/*` for dispatch triggers |
| Missing OIDC token / credential step cannot mint token | Workflow lacks `id-token: write` | Keep the generated `permissions` block |

Also confirm `AWS_DEPLOY_ROLE_ARN` is this **GitHub OIDC** role (not a ScaleBop cross-account or unrelated role).

## Local development (optional, separate from CI)

To run `cdk synth` or `cdk deploy` **on your laptop**, use your normal AWS CLI setup: `aws configure`, environment variables, or SSO. That is independent of the GitHub secrets above.

## Blueprint context (from analysis)

- **Backend:** none
- **Frontend:** CloudFront + S3
- **Database:** none

## Manual and ScaleBop triggers

- **GitHub UI:** **Actions → Deploy Generated App → Run workflow** (`workflow_dispatch`).
- **ScaleBop:** On your project **Pipeline** page, use **Run deploy** after the workflow is merged. ScaleBop calls GitHub's repository dispatch API with event type `scalebop-deploy` (same as this workflow's `repository_dispatch` trigger).

## MVP note

This workflow targets a single environment. Add staging/production roles, environments, and promotion rules when you are ready.
