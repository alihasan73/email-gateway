# Email Gateway

Simple Node.js email gateway that supports SMTP sending, SendGrid integration, scheduled sending, and a webhook receiver for SendGrid events.

## Features
- Send email via SMTP or SendGrid
- Bulk send and scheduling (persistent in `data/`)
- Receive and persist SendGrid event webhooks
- Basic auth routes (register/login/refresh/logout)
- Interactive API docs (Swagger)

## Quickstart
Requirements: Node.js (16+), npm

1. Install dependencies

```bash
npm install
```

2. Configure environment variables (example)
Copy `.env.example` to `.env` and edit values as needed:

```bash
cp .env.example .env
# then edit .env
```

3. Start server

```bash
npm start
```

Open Swagger UI: http://localhost:3000/api-docs

## Tests
Run unit tests with Jest:

```bash
npm test
```

Run coverage report:

```bash
npm test -- --coverage
```

Test files live under `test/services/` and `tests/services/`.

## Important endpoints
- `POST /api/v1/email` — send email
- `POST /api/v1/email/sendgrid` — send via SendGrid
- `POST /api/v1/email/schedule` — schedule email
- `POST /api/v1/email/bulk` — bulk send
- `POST /api/v1/email/events-sendgrid` — SendGrid webhook receiver
- `POST /api/v1/email/webhook-sendgrid` — register webhook via SendGrid API
- `GET /api/v1/email/webhook-info` — webhook setup info
- `POST /api/v1/auth/*` — auth routes (register/login/refresh/logout)

## Data files
Persistent test data is stored in `data/` (e.g. `scheduled_emails.json`, `sent_messages.json`, `email_events.json`).

## Next steps / suggestions
- Add proper API auth and role checks
- Harden validation and error handling
- Add E2E/integration tests for webhook flows
- Expose Postman collection or enhance OpenAPI spec

If you want, I can: add a `docs/` script to serve Swagger, generate a Postman collection, or expand the OpenAPI spec with full response examples.
