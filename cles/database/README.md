# CLES Database Setup

This directory contains the database schema and seed data for CLES Phase 2.

## Files

- `schema.sql` - Complete database schema with tables, indexes, and RLS policies
- `seed.sql` - Initial data including subtopics and sample questions
- `README.md` - This file

## Setup Instructions

### 1. Create Supabase Project

1. Go to [Supabase](https://supabase.com) and create a new project
2. Note down your project URL and API keys

### 2. Configure Environment Variables

Create a `.env.local` file in the project root with:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

### 3. Run Database Schema

1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `schema.sql`
4. Click **Run** to execute the schema

### 4. Seed Initial Data

1. In the same SQL Editor
2. Copy and paste the contents of `seed.sql`
3. Click **Run** to insert initial data

### 5. Verify Setup

Check that the following tables were created:
- `users`
- `subtopics` (6 subtopics: 3 enabled, 3 locked)
- `questions` (15 questions: 5 per enabled subtopic)
- `sessions`
- `responses`
- `events`
- `hr_beats`
- `nasa_tlx_blocks`

## Database Schema Overview

### Core Tables

- **users**: User profiles and settings
- **subtopics**: Available topics (Array, Linked List, Stack, Queue, Tree, Sorting)
- **questions**: Question bank with difficulty levels (E/M/H)
- **sessions**: User sessions with 5 questions each
- **responses**: Individual question responses with metrics
- **events**: Session timeline events
- **hr_beats**: Heart rate data points
- **nasa_tlx_blocks**: NASA-TLX survey responses

### Key Features

- **Row Level Security (RLS)**: Users can only access their own data
- **Structured Profiles**: All profile data uses enums, no free text
- **5-Question Sessions**: Fixed difficulty progression (E→M→M→H→H)
- **High/Low Metrics**: Attention and HRV stored as binary classifications
- **NASA-TLX Integration**: 3 blocks per session (after Q1, Q3, Q5)

## Phase 2 Business Rules

### Subtopics
- **Enabled**: Array, Linked List, Stack
- **Locked**: Queue, Tree, Sorting (redirect to Home)

### Sessions
- **5 questions** per session
- **Fixed order**: E(30s, 1.0pt) → M(50s, 2.0pt) → M(50s, 2.0pt) → H(60s, 2.5pt) → H(60s, 2.5pt)
- **Total**: 10 points maximum

### Question Selection
- **1 Easy, 2 Medium, 2 Hard** per session
- **Random within difficulty pools** only
- **Disabled questions** never served

### Metrics
- **Attention**: High/Low based on face presence + offscreen detection
- **HRV**: High/Low based on RMSSD vs 10s baseline comparison

## Troubleshooting

### Common Issues

1. **RLS Policies**: Make sure RLS is enabled and policies are created
2. **Foreign Keys**: Ensure all foreign key relationships are properly set up
3. **Data Types**: Check that JSONB fields are properly formatted
4. **Indexes**: Verify indexes are created for performance

### Verification Queries

```sql
-- Check subtopics
SELECT * FROM subtopics ORDER BY name;

-- Check questions by subtopic
SELECT s.name, q.difficulty, COUNT(*) 
FROM questions q 
JOIN subtopics s ON q.subtopic_id = s.id 
WHERE q.enabled = true 
GROUP BY s.name, q.difficulty 
ORDER BY s.name, q.difficulty;

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';
```


