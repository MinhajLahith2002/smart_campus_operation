# Smart Campus Operations Hub Backend

Spring Boot backend for the Smart Campus Operations Hub.

## Database behavior
- If `DB_URL` is not provided, the app falls back to the local in-memory H2 database.
- If `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD` are provided, the app uses that database directly and Hibernate creates/updates tables with `ddl-auto=update`.
- The optional `postgres` profile is still available for explicit PostgreSQL runs.

## Run locally with H2
`./mvnw spring-boot:run`

## Run with Neon or PostgreSQL
1. Set `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD`
2. Optional for Neon SSL: include `?sslmode=require` in `DB_URL`
3. Run:
   `./mvnw spring-boot:run`

Example Neon URL:
`jdbc:postgresql://ep-xxxx.region.aws.neon.tech/neondb?sslmode=require`

## Main API Prefix
`/api/module-c/tickets`
