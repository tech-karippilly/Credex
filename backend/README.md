# Credex Backend

Production-ready NestJS REST API foundation with MongoDB, JWT authentication, Cloudinary uploads, Resend email, and Google Gemini AI integration.

## Tech stack

- **NestJS** + **TypeScript**
- **MongoDB** + **Mongoose**
- **JWT** (`@nestjs/jwt`, Passport)
- **Cloudinary** (file/image uploads)
- **Resend** (transactional email)
- **Google Gemini** (`@google/generative-ai`)
- **@nestjs/config** + **Joi** validation

## Requirements

- Node.js 20+
- npm
- MongoDB instance (local or Atlas)
- Cloudinary account
- Resend account
- Google AI Studio / Gemini API key

## Installation

```bash
cd backend
npm install
cp .env.example .env
```

Fill in all values in `.env` before starting the app.

## Environment variables

| Variable | Description |
| --- | --- |
| `NODE_ENV` | `development`, `production`, or `test` |
| `PORT` | HTTP port (default `3000`) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for signing JWTs (min 8 characters) |
| `JWT_EXPIRES_IN` | JWT expiry (e.g. `7d`) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `RESEND_API_KEY` | Resend API key |
| `RESEND_FROM_EMAIL` | Verified sender email in Resend |
| `GEMINI_API_KEY` | Google Gemini API key |
| `GEMINI_MODEL` | Gemini model name (e.g. `gemini-2.0-flash`) |

See `.env.example` for a copy-paste template.

## MongoDB setup

1. Run MongoDB locally or create a cluster on [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Set `MONGODB_URI` in `.env`, for example:
   - Local: `mongodb://127.0.0.1:27017/credex_backend`
   - Atlas: `mongodb+srv://<user>:<password>@<cluster>/<db>?retryWrites=true&w=majority`

The app connects on startup and logs connection status.

## Cloudinary setup

1. Create an account at [cloudinary.com](https://cloudinary.com).
2. Copy **Cloud name**, **API Key**, and **API Secret** into `.env`.
3. Use `CloudinaryService` from `src/cloudinary` for uploads and deletions.

## Resend setup

1. Create an account at [resend.com](https://resend.com).
2. Add and verify your sending domain (or use Resend’s test sender in development).
3. Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in `.env`.
4. Use `EmailService.sendEmail()` from `src/email`.

## WhatsApp Cloud API setup (voucher sharing)

Voucher WhatsApp delivery uses the [WhatsApp Business Platform](https://developers.facebook.com/docs/whatsapp/cloud-api/) (Cloud API). Configure these optional variables in `.env`:

| Variable | Description |
| --- | --- |
| `WHATSAPP_ACCESS_TOKEN` | Permanent or system user access token from Meta |
| `WHATSAPP_PHONE_NUMBER_ID` | Phone number ID from WhatsApp Manager |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | Optional; used for setup reference |
| `WHATSAPP_API_VERSION` | Graph API version (default `v21.0`) |
| `WHATSAPP_VOUCHER_TEMPLATE_NAME` | Optional approved template name for business-initiated messages |
| `WHATSAPP_VOUCHER_TEMPLATE_LANGUAGE` | Template language code (default `en`) |

Without `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID`, `POST /api/v1/vouchers/:id/send-whatsapp` returns `503` with a configuration message.

For recipients outside the 24-hour messaging window, create and approve a utility template in Meta Business Manager and set `WHATSAPP_VOUCHER_TEMPLATE_NAME` (body should include a `{{1}}` placeholder for the voucher summary text).

Admin endpoints:

- `POST /api/v1/vouchers/:id/send-email` — body: `{ "email", "message?" }`
- `POST /api/v1/vouchers/:id/send-whatsapp` — body: `{ "phone", "message?" }`

## Gemini setup

1. Create an API key in [Google AI Studio](https://aistudio.google.com/).
2. Set `GEMINI_API_KEY` and `GEMINI_MODEL` in `.env`.
3. Use `AiService.generateText()` from `src/ai` (server-side only).

## Development

```bash
npm run start:dev
```

## Production build

```bash
npm run build
npm run start:prod
```

## API prefix

All routes are under:

```text
/api/v1
```

Examples:

- `GET /api/v1/health`
- `/api/v1/auth` (foundation module)
- `/api/v1/users` (foundation module)

## Project structure

```text
backend/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── config/
│   ├── common/
│   ├── database/
│   ├── auth/
│   ├── users/
│   ├── cloudinary/
│   ├── email/
│   ├── ai/
│   └── health/
├── .env.example
├── package.json
└── README.md
```

## Authentication foundation

- User schema with hashed passwords (`bcrypt`)
- JWT strategy and `JwtAuthGuard` for protected routes
- `AuthService` helpers: `hashPassword`, `comparePassword`, `signAccessToken`

Protect a route:

```ts
@UseGuards(JwtAuthGuard)
```

## Health check

```bash
curl http://localhost:3000/api/v1/health
```

Example response:

```json
{
  "success": true,
  "message": "Backend is running",
  "data": {
    "mongodb": "connected"
  }
}
```

## License

UNLICENSED — private project.
