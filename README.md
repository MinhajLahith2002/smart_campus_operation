# Smart Campus Operations Hub

Smart Campus Operations Hub is a full-stack web application for managing campus resources, bookings, maintenance incidents, and user access in one system.

The project is organized around four main functional areas:

- Module A: Facilities and Assets Catalogue
- Module B: Booking Management
- Module C: Maintenance and Incident Ticketing
- Modules D and E: Authentication, Authorization, and Notifications

## Tech Stack

- Frontend: React, Vite, Tailwind CSS
- Backend: Spring Boot, Spring Security, Spring Data JPA
- Database: PostgreSQL as the main database, with H2 available for local testing and development
- Authentication: session-based auth with optional Google OAuth

## Project Structure

```text
smart_campus_operation/
|- Backend/   Spring Boot API
|- Frontend/  React client
```

## Features

- Browse and manage campus resources
- Create and review booking requests
- Report and track maintenance or incident tickets
- Assign technicians and update incident workflow
- Role-based access for student, admin, and technician users
- Notifications for booking, resource, and incident events

## Prerequisites

Make sure these are installed before running the project:

- Java 21
- Node.js 18 or newer
- npm
- Maven Wrapper is already included in the backend

## Default Local Ports

- Backend: `http://localhost:8082`
- Frontend: `http://localhost:5173`

## Quick Start

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd smart_campus_operation
```

### 2. Start the backend

Open a terminal in the `Backend` folder.

Windows PowerShell:

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

macOS/Linux:

```bash
cd Backend
export BOOTSTRAP_ADMIN_EMAIL="admin@campus.edu"
export BOOTSTRAP_ADMIN_PASSWORD="Admin@123!"
export AUTH_SAMPLE_USERS_ENABLED="true"
export AUTH_SAMPLE_STUDENT_EMAIL="student@campus.edu"
export AUTH_SAMPLE_STUDENT_PASSWORD="Student@123"
export AUTH_SAMPLE_TECHNICIAN_EMAIL="technician@campus.edu"
export AUTH_SAMPLE_TECHNICIAN_PASSWORD="Technician@123"
./mvnw spring-boot:run
```

### 3. Start the frontend

Open another terminal in the `Frontend` folder.

Windows PowerShell:

```powershell
cd Frontend
Copy-Item .env.example .env.local -Force
npm install
npm run dev
```

macOS/Linux:

```bash
cd Frontend
cp .env.example .env.local
npm install
npm run dev
```

### 4. Open the application

Go to:

`http://localhost:5173`

## Sample Login Accounts

When `AUTH_SAMPLE_USERS_ENABLED=true`, these local accounts are available:

- Admin: `admin@campus.edu` / `Admin@123!`
- Student: `student@campus.edu` / `Student@123`
- Technician: `technician@campus.edu` / `Technician@123`

## Database Setup

### Local testing database

For quick local testing and development, the backend can use a local H2 database:

- database URL fallback: `jdbc:h2:file:./data/smart_campus_module_c`
- H2 console: `http://localhost:8082/h2-console`

### Main PostgreSQL database setup

PostgreSQL is the main database option for the project. To run with PostgreSQL, set these environment variables before starting the backend:

- `DB_URL`
- `DB_USERNAME`
- `DB_PASSWORD`

Example:

```powershell
cd Backend
$env:SPRING_PROFILES_ACTIVE="postgres"
$env:DB_URL="jdbc:postgresql://localhost:5432/smart_campus_operation_hub"
$env:DB_USERNAME="postgres"
$env:DB_PASSWORD="your-password"
.\mvnw.cmd spring-boot:run
```

## Environment Variables

### Backend

Main backend variables:

- `SERVER_PORT`
- `FRONTEND_BASE_URL`
- `DB_URL`
- `DB_USERNAME`
- `DB_PASSWORD`
- `BOOTSTRAP_ADMIN_EMAIL`
- `BOOTSTRAP_ADMIN_PASSWORD`
- `AUTH_SAMPLE_USERS_ENABLED`
- `AUTH_SAMPLE_STUDENT_EMAIL`
- `AUTH_SAMPLE_STUDENT_PASSWORD`
- `AUTH_SAMPLE_TECHNICIAN_EMAIL`
- `AUTH_SAMPLE_TECHNICIAN_PASSWORD`

Optional integrations:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `MAIL_HOST`
- `MAIL_PORT`
- `MAIL_USERNAME`
- `MAIL_PASSWORD`

### Frontend

Frontend variables in `Frontend/.env.local`:

- `VITE_BACKEND_BASE_URL=http://localhost:8082`
- `VITE_MODULE_C_API_URL` optional if ticket APIs are hosted separately

## API Overview

Main backend API prefixes:

- `/api/module-a/resources`
- `/api/bookings`
- `/api/module-c/tickets`
- `/api/auth`
- `/api/notifications`

## Build Commands

### Backend

```bash
cd Backend
./mvnw test
./mvnw spring-boot:run
```

### Frontend

```bash
cd Frontend
npm install
npm run dev
npm run build
```

## Notes

- The frontend expects the backend to be running on port `8082` unless overridden.
- The backend uses session authentication, so frontend and backend should be started together for full functionality.
- Google OAuth works only when Google client credentials are configured in the backend environment.
- The project supports H2 for local testing, but PostgreSQL should be presented as the primary database in deployment or final project documentation.

## Repository Readmes

Additional module-specific notes are available in:

- [Backend/README.md](./Backend/README.md)
- [Frontend/README.md](./Frontend/README.md)
