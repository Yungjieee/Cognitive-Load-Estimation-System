# Database Migrations

This folder contains SQL migration scripts for the CLES database schema.

## Available Migrations

### 001_nasa_tlx_implementation.sql
Implements NASA-TLX cognitive load measurement system.

**Changes:**
- Drops old `nasa_tlx_blocks` table (from previous design)
- Adds `profile_math_grade` and `profile_programming_grade` columns to `users` table
- Adds `environment_noise` column to `sessions` table
- Creates `nasa_tlx_system` table (per-question system calculations, 5 rows per session)
- Creates `nasa_tlx_user` table (user subjective survey, 1 row per session)
- Creates `cognitive_load_summary` table (weighted session aggregates, 1 row per session)
- Enables Row Level Security (RLS) for all 3 new tables
- Creates user policies (SELECT and INSERT only on own data)
- Creates service role policies (full access for admin)

**Rollback:** Use `001_nasa_tlx_implementation_rollback.sql`

## Running Migrations

### Method 1: Using Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of the migration file
4. Click **Run** to execute

### Method 2: Using Supabase CLI
```bash
# Apply migration
supabase db push

# Or execute specific migration
psql $DATABASE_URL < migrations/001_nasa_tlx_implementation.sql
```

### Method 3: Using psql directly
```bash
# Connect to your database
psql -h <host> -U <user> -d <database> -f migrations/001_nasa_tlx_implementation.sql

# For rollback
psql -h <host> -U <user> -d <database> -f migrations/001_nasa_tlx_implementation_rollback.sql
```

### Method 4: Using Node.js script (if database connection available)
```javascript
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const sql = fs.readFileSync('migrations/001_nasa_tlx_implementation.sql', 'utf8');

// Execute migration
// Note: Supabase JS client doesn't support raw SQL execution directly
// Use Supabase dashboard or CLI instead
```

## Migration Order

Migrations should be run in numerical order:
1. `001_nasa_tlx_implementation.sql`
2. (Future migrations go here)

## Verification

After running a migration, verify it succeeded:

```sql
-- Check tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('nasa_tlx_system', 'nasa_tlx_user', 'cognitive_load_summary');

-- Check columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('profile_math_grade', 'profile_programming_grade');

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'sessions'
  AND column_name = 'environment_noise';
```

## Rollback

To rollback a migration:

```bash
psql $DATABASE_URL < migrations/001_nasa_tlx_implementation_rollback.sql
```

## Notes

- Always backup your database before running migrations
- Test migrations on a development database first
- Migrations use `IF NOT EXISTS` and `IF EXISTS` clauses for idempotency
- All foreign keys use `ON DELETE CASCADE` for referential integrity
- Decimal fields use DECIMAL(5,2) for NASA-TLX scales (0.00 to 21.00)
