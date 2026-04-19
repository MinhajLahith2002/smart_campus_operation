# Smart Campus Operations Hub Backend

Spring Boot backend for the Smart Campus Operations Hub. It now includes:
- Module C maintenance and incident ticketing APIs
- session-based authentication and authorization
- student registration with verification and reset flows
- admin bootstrap and technician invite onboarding
- optional Google OAuth account linking when Google client credentials are configured

## Database behavior
- If `DB_URL` is not provided, the app falls back to the local in-memory H2 database.
- If `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD` are provided, the app uses that database directly and Hibernate creates/updates tables with `ddl-auto=update`.
- The optional `postgres` profile is still available for explicit PostgreSQL runs.

## Run locally with H2
`./mvnw spring-boot:run`

## Run with Neon or PostgreSQL
1. Set `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD`
2. Optional for Neon SSL: include `?sslmode=require` in `DB_URL`

### Windows PowerShell quick start
```powershell
cd Backend
$env:BOOTSTRAP_ADMIN_EMAIL="admin@campus.edu"
$env:BOOTSTRAP_ADMIN_PASSWORD="Admin@123!"
$env:AUTH_SAMPLE_USERS_ENABLED="true"
$env:AUTH_SAMPLE_STUDENT_EMAIL="student@campus.edu"
$env:AUTH_SAMPLE_STUDENT_PASSWORD="Student@123"
$env:AUTH_SAMPLE_TECHNICIAN_EMAIL="technician@campus.edu"
$env:AUTH_SAMPLE_TECHNICIAN_PASSWORD="Technician@123"
.\mvnw.cmd spring-boot:run
```

## Run with PostgreSQL
1. Create a PostgreSQL database named `smart_campus_operation_hub`
2. Set `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD` if needed
3. Run:
   `./mvnw spring-boot:run`

Example Neon URL:
`jdbc:postgresql://ep-xxxx.region.aws.neon.tech/neondb?sslmode=require`

### Windows PowerShell with PostgreSQL and sample accounts
```powershell
cd Backend
$env:SPRING_PROFILES_ACTIVE="postgres"
$env:DB_URL="jdbc:postgresql://localhost:5432/smart_campus_operation_hub"
$env:DB_USERNAME="postgres"
$env:DB_PASSWORD="your-password"
$env:FRONTEND_BASE_URL="http://127.0.0.1:3000"
$env:BOOTSTRAP_ADMIN_EMAIL="admin@campus.edu"
$env:BOOTSTRAP_ADMIN_PASSWORD="Admin@123!"
$env:AUTH_SAMPLE_USERS_ENABLED="true"
$env:AUTH_SAMPLE_STUDENT_EMAIL="student@campus.edu"
$env:AUTH_SAMPLE_STUDENT_PASSWORD="Student@123"
$env:AUTH_SAMPLE_TECHNICIAN_EMAIL="technician@campus.edu"
$env:AUTH_SAMPLE_TECHNICIAN_PASSWORD="Technician@123"
.\mvnw.cmd spring-boot:run
```

## Auth configuration
Set these as environment variables when needed:
- `BOOTSTRAP_ADMIN_EMAIL`
- `BOOTSTRAP_ADMIN_PASSWORD`
- `BOOTSTRAP_ADMIN_FULL_NAME` optional
- `FRONTEND_BASE_URL` for email links and OAuth redirects
- `AUTH_SAMPLE_USERS_ENABLED=true` to seed sample local login accounts
- `AUTH_SAMPLE_STUDENT_EMAIL`
- `AUTH_SAMPLE_STUDENT_PASSWORD`
- `AUTH_SAMPLE_STUDENT_FULL_NAME` optional
- `AUTH_SAMPLE_STUDENT_ID` optional
- `AUTH_SAMPLE_STUDENT_FACULTY` optional
- `AUTH_SAMPLE_STUDENT_BATCH` optional
- `AUTH_SAMPLE_STUDENT_CAMPUS` optional
- `AUTH_SAMPLE_STUDENT_PHONE` optional
- `AUTH_SAMPLE_TECHNICIAN_EMAIL`
- `AUTH_SAMPLE_TECHNICIAN_PASSWORD`
- `AUTH_SAMPLE_TECHNICIAN_FULL_NAME` optional

Optional integrations:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `MAIL_HOST`
- `MAIL_PORT`
- `MAIL_USERNAME`
- `MAIL_PASSWORD`

Without SMTP configuration the auth mail service stays safe but only logs that an auth email was prepared; it does not expose tokens.

## Sample login accounts
When `AUTH_SAMPLE_USERS_ENABLED=true`, the backend keeps these local login accounts available and idempotent:
- Admin: `admin@campus.edu` / `Admin@123!` via bootstrap config
- Student: `student@campus.edu` / `Student@123`
- Technician: `technician@campus.edu` / `Technician@123`

The student sample is seeded as `ACTIVE`, `LOCAL`, and `emailVerified=true`.
The technician sample is seeded as `ACTIVE`, `LOCAL`, and `emailVerified=true`.
The admin bootstrap remains `ACTIVE`, `LOCAL`, and backend-controlled.

## Main API prefixes
- `/api/auth`
- `/api/auth/admin`
- `/api/module-c/tickets`
## Booking Module (Member 2 - Aran)

### Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/bookings | Get all bookings |
| GET | /api/bookings/{id} | Get booking by ID |
| GET | /api/bookings/upcoming | Get upcoming bookings |
| GET | /api/bookings/check-availability | Check time slot availability |
| POST | /api/bookings | Create new booking |
| PUT | /api/bookings/{id} | Update pending booking |
| PATCH | /api/bookings/{id}/approve | Approve booking |
| PATCH | /api/bookings/{id}/reject | Reject booking |
| PATCH | /api/bookings/{id}/cancel | Cancel booking |
| PATCH | /api/bookings/{id}/request-cancel | Request cancellation |

### Key Features
- Conflict detection for overlapping bookings
- Status workflow: PENDING → APPROVED/REJECTED → CANCELLED
- Admin reason required for rejection
- Cancellation request workflow