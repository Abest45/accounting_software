# Database Setup Guide for FinAnalytics Backend

This guide shows exactly how to provision and connect the PostgreSQL database for the project using your existing schema.

## 1. Prerequisites
- Node.js 18+
- PostgreSQL 12+
- npm
- (Optional) Supabase, RDS, Cloud SQL, or other managed Postgres instance

## 2. Prepare backend project
1. Open terminal and go to backend folder:

   ```bash
   cd c:\Users\HP\Desktop\finance\backend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env` and set values:

   ```bash
   cp .env.example .env
   ```

4. Edit `.env` for local development:

   - `NODE_ENV=development`
   - `DB_HOST=localhost`
   - `DB_PORT=5432`
   - `DB_NAME=finanalytics_db`
   - `DB_USER=postgres` (or your DB username)
   - `DB_PASSWORD=<your_password>`
   - `JWT_SECRET=<strong_secret>`
   - `REFRESH_TOKEN_SECRET=<strong_refresh_secret>`
   - `REFRESH_TOKEN_EXPIRE_MS=604800000` (7 days)
   - `FRONTEND_URL=http://localhost:3000`
   - `SMTP_HOST=smtp.example.com`
   - `SMTP_PORT=587`
   - `SMTP_SECURE=false`
   - `SMTP_USER=<smtp_user>`
   - `SMTP_PASSWORD=<smtp_password>`
   - `SMTP_FROM_EMAIL=noreply@example.com`
   - `SUPER_ADMIN_EMAILS=admin@example.com`
   - `CORS_ORIGIN=http://localhost:3000`

## 3. Create Postgres database

### Local Postgres
1. (On Windows) Open `psql` and create database:

   ```sql
   CREATE DATABASE finanalytics_db;
   \c finanalytics_db
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   ```

2. Alternatively from shell:

   ```bash
   createdb -h localhost -p 5432 -U postgres finanalytics_db
   psql -h localhost -p 5432 -U postgres -d finanalytics_db -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
   ```

### Supabase / Managed Postgres
1. Create a project and database in Supabase.
2. In SQL Editor run:

   ```sql
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   ```

3. Copy `backend/DATABASE_SCHEMA.sql` content and run in the SQL Editor.

## 4. Apply schema with Sequelize migration (recommended)

From backend folder:

```bash
npm run migrate
```

If you prefer direct SQL:

```bash
psql -h localhost -p 5432 -U postgres -d finanalytics_db -f DATABASE_SCHEMA.sql
```

(For Supabase instance, use equivalent command with host, port, user, password.)

## 5. Validate schema
1. Connect with `psql` or GUI (pgAdmin, DBeaver).
2. Confirm tables exist:
   - users
   - invoices
   - receipts
   - inventories
   - purchases
   - expenses
   - payrolls
   - audit_logs

3. Confirm indexes and FK relationships are in place.

## 6. Run backend

```bash
npm run dev
```

Check server logs for database connection success.

## 7. Optional: Supabase-specific notes
- RLS may be enabled by default. Add appropriate policies for auth (or disable RLS while developing).
- Use schema-aware access keys and limit service role keys to backend.

## 8. Production Hardening
- Use SSL (`DB_SSL=true` for Supabase and `database.js` production config uses SSL by default)
- Use secure secret storage (environment variables, Vaults)
- Migrate with `sequelize-cli` (avoid `sync({ alter: true })` in production)
- Back up frequently

---

### Quick commands summary

```bash
# create db
createdb finanalytics_db
# create extension
psql -d finanalytics_db -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
# run schema file
psql -d finanalytics_db -f backend/DATABASE_SCHEMA.sql
# run migrations
cd backend && npm run migrate
# run server
npm run dev
```
