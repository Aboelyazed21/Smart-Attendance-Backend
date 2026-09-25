# Smart Attendance Backend

Node.js + Express + MySQL backend for the Smart Attendance platform.

## Requirements
- Node.js 18+
- MySQL 8+
- Database: `smart_attendance_db`

## Run

```bash
npm install
copy .env.example .env
npm run dev
```

Windows CMD uses `copy`; PowerShell can use `Copy-Item .env.example .env`.

Default API:
`http://localhost:5000/api`

## API Documentation (Swagger)

Interactive docs for every live endpoint:

- Swagger UI: `http://localhost:5000/api-docs`
- Raw OpenAPI JSON: `http://localhost:5000/api-docs.json`

To test protected endpoints: `POST /api/login` → Authorize →
paste `Bearer <token>`. The spec is verified by
`node scripts/verify-swagger.js` (every live route documented,
no secrets in the spec).

## Important
The React frontend must call this API. It must NOT connect directly to MySQL.

## Main API groups
- `/api/auth`
- `/api/users`
- `/api/students`
- `/api/staff`
- `/api/courses`
- `/api/sections`
- `/api/enrollments`
- `/api/rooms`
- `/api/timetable`
- `/api/sessions`
- `/api/attendance`
- `/api/corrections`
- `/api/reports`
- `/api/audit`
- `/api/notifications`

## Authentication
Login returns a JWT. Send it on protected requests:

`Authorization: Bearer YOUR_TOKEN`

## QR
A lecturer creates/opens a session. The backend generates a short-lived signed QR token. The frontend can display the returned QR data or `qrDataUrl`.

The token does not contain the student's identity.
