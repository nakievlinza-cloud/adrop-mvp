# ADROP on Render

This project is ready to run on a single Render Web Service:

- Vite builds the frontend into `dist/`
- Express serves both the SPA and `/api` from the same process
- Health checks are available at `/health`

## What to expect from Render Free

Render Free is good for sharing a working link, but it is not true production hosting:

- the service spins down after 15 minutes without traffic
- the next request wakes it up in about a minute
- the filesystem is ephemeral

Official docs:

- https://render.com/docs/free
- https://render.com/docs/your-first-deploy
- https://render.com/docs/blueprint-spec
- https://render.com/docs/node-version

## Best setup for this repo

Use a **Web Service**, not a Static Site and not a Docker service.

Why:

- the app needs the Node/Express server for `/api`
- Firebase Admin runs on the server
- the frontend already works from the same origin, so no separate API host is required

## Before you start

Render deploys from GitHub / GitLab / Bitbucket or from a public Git repo URL.

This local folder is not a git repo right now, so the easiest path is:

1. create a new GitHub repo
2. upload this project there
3. connect that repo to Render

## Option A: easiest manual deploy in the Render UI

### 1. Push the project to GitHub

From the project root:

```bash
git init
git add .
git commit -m "Prepare ADROP for Render"
git branch -M main
git remote add origin <YOUR_GITHUB_REPO_URL>
git push -u origin main
```

### 2. Create the service in Render

In Render:

1. New
2. Web Service
3. Connect your GitHub repo
4. Choose the repo with this project

Use these settings:

- Name: `adrop`
- Region: `Frankfurt`
- Branch: `main`
- Root Directory: leave empty
- Runtime: `Node`
- Build Command: `npm install && npm run build`
- Start Command: `npm run start`
- Instance Type: `Free`
- Health Check Path: `/health`

### 3. Add environment variables

Required:

- `FIREBASE_SERVICE_ACCOUNT_JSON`

Recommended if payments should work immediately:

- `PAYMENTS_WALLET_TRC20`
- `PAYMENTS_WALLET_ERC20`
- `PAYMENTS_WALLET_BEP20`
- `PAYMENTS_ETH_RPC_URL`
- `PAYMENTS_BSC_RPC_URL`
- `TRONGRID_API_KEY`

Optional:

- `PAYMENT_MIN_AMOUNT=10`
- `PAYMENT_EXPIRY_MINUTES=45`
- `VITE_API_BASE_URL=` (leave empty to use the same domain)

Do not add Telegram env vars if you do not need Telegram login yet.

### 4. Finish deploy

After the deploy succeeds, Render will give you a URL like:

```text
https://adrop-xxxx.onrender.com
```

Check:

- `/`
- `/auth`
- `/health`

## Option B: deploy from Blueprint

This repo includes a ready `render.yaml`:

- `/Users/username/Downloads/ue22-сope/render.yaml`

If you use Render Blueprints, Render will read:

- build command
- start command
- free plan
- health check path
- required secret placeholders

You will still need to fill all `sync: false` secrets in the dashboard.

## Firebase step after deploy

After Render gives you the final domain, add it in Firebase:

1. Firebase Console
2. Authentication
3. Settings
4. Authorized domains
5. Add your `onrender.com` domain

Without this, auth redirects and email verification can break on the deployed site.

## Quick smoke test after deploy

1. Open `/`
2. Open `/auth`
3. Register a creator
4. Confirm the email
5. Log in
6. Open creator offers
7. Create a brand account in a separate browser profile
8. Create an offer
9. Check chat and order flow

## Notes specific to this project

- `tsx` is now a runtime dependency, because Render uses it in `npm run start`
- Node is pinned in `package.json` with:

```json
"engines": {
  "node": ">=20 <21"
}
```

This avoids drifting onto a newer major Node version unexpectedly.
