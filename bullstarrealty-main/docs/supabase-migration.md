# Supabase Migration (Lovable Cloud -> Your Own Project)

This project already uses Supabase. To migrate all data from the current Lovable-linked Supabase project to your own Supabase project, follow the steps below.

## 1) Prerequisites

- Supabase CLI installed and authenticated (`supabase login`)
- PostgreSQL client tools installed (`pg_dump`, `pg_restore`, `psql`)
- Source project DB connection string and target project DB connection string

## 2) Identify source and target

- Source: your current Lovable-linked Supabase project
- Target: your own Supabase project

Get DB URLs from each Supabase project dashboard:

- `Project Settings -> Database -> Connection string`

Use the direct connection string in this format:

```text
postgresql://postgres:<PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres
```

## 3) Export schema + data from source

Run from your terminal:

```bash
pg_dump --dbname "<SOURCE_DB_URL>" --format=custom --no-owner --no-privileges --file supabase-backup.dump
```

Or use the project script:

```bash
$env:SOURCE_DB_URL="postgresql://postgres:<SOURCE_PASSWORD>@db.<SOURCE_REF>.supabase.co:5432/postgres"
$env:TARGET_DB_URL="postgresql://postgres:<TARGET_PASSWORD>@db.<TARGET_REF>.supabase.co:5432/postgres"
npm run migrate:supabase
```

## 4) Import into your target project

```bash
pg_restore --dbname "<TARGET_DB_URL>" --clean --if-exists --no-owner --no-privileges supabase-backup.dump
```

If you prefer plain SQL:

```bash
pg_dump --dbname "<SOURCE_DB_URL>" --no-owner --no-privileges --file supabase-backup.sql
psql "<TARGET_DB_URL>" -f supabase-backup.sql
```

Script equivalent:

```bash
npm run migrate:supabase:sql
```

## 5) Migrate storage objects

Database restore migrates bucket metadata, but files must also be copied.

Recommended approach:

- Download files from source buckets (via Supabase dashboard or script using service role + Storage API)
- Upload files to the same bucket names in your target project

Verify:

- `storage.buckets` rows exist in target
- files are accessible at expected paths

## 6) Recreate secrets and integration settings

Project secrets are not copied automatically. Recreate in target:

- Edge Function secrets
- Auth providers and redirect URLs
- SMTP settings
- Webhooks
- Any third-party API keys

## 7) Point this app to your new Supabase

Update local `.env` values:

```env
VITE_SUPABASE_URL="https://<YOUR_NEW_PROJECT_REF>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<YOUR_NEW_ANON_KEY>"
VITE_SUPABASE_PROJECT_ID="<YOUR_NEW_PROJECT_REF>"
```

Then restart the app:

```bash
npm run dev
```

## 8) Validate after cutover

- Sign in/sign up flow works
- Existing records load correctly
- Inserts/updates succeed
- Edge functions run in target project
- Storage uploads/downloads work

## Notes

- Run the migration during a maintenance window if production is active.
- For minimal downtime, do one full migration + one final delta migration before cutover.
- Keep the source project read-only during final sync to avoid drift.
