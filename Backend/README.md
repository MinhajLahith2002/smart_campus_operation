# Module C Backend

Spring Boot backend for the Smart Campus Operations Hub maintenance and incident ticketing module.

## Profiles
- `dev`: embedded H2 database for local development and default local startup
- `postgres`: PostgreSQL for the intended project database setup

## Run locally
`./mvnw spring-boot:run`

## Run with PostgreSQL
1. Create a PostgreSQL database named `smart_campus_module_c`
2. Set `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD` if needed
3. Run:
   `./mvnw spring-boot:run -Dspring-boot.run.profiles=postgres`

## Main API Prefix
`/api/module-c/tickets`
