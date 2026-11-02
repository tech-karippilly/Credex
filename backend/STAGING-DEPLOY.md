# Staging API deploy (api.credexfin.com)

The public admin UI is deployed from the **staging** branch, but errors such as:

- `property paymentStatus should not exist`
- `Cannot GET /api/v1/employees`

mean the **Nest backend on the server was not rebuilt** after merging `develop` into `staging`. Git is updated; the running Node process is still an older build.

## Verify

```bash
curl -s https://api.credexfin.com/api/v1/health | jq .
```

After a correct deploy, `data.capabilities` includes:

```json
{
  "expensePaymentStatusFilter": true,
  "employees": true,
  "fixedExpenses": true,
  "attendance": true
}
```

These routes must **not** return 404 (401 without a token is fine):

- `/api/v1/employees`
- `/api/v1/fixed-expenses`

## Deploy steps (typical VPS / PM2)

On the host that serves `api.credexfin.com`:

```bash
cd /path/to/Credex
git fetch origin
git checkout staging
git pull origin staging
cd backend
npm ci
npm run build
# restart however you run production, e.g.:
pm2 restart credex-api
```

Ensure `NODE_ENV=production`, `MONGODB_URI`, JWT, Cloudinary, etc. match your staging `.env`.

## After deploy

1. Hit `/api/v1/health` and confirm `capabilities`.
2. Reload the admin site — the yellow “API out of date” banner should disappear.
3. HR, Fixed Expenses, and expense payment-status filters should work.
