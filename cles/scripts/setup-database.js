#!/usr/bin/env node

/**
 * Database setup script for CLES Phase 2
 * This script helps set up the database schema and seed data
 */

const fs = require('fs')
const path = require('path')

async function setupDatabase() {
  console.log('🚀 Setting up CLES Phase 2 Database...')
  
  // Check if environment variables are set
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ]
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:')
    missingVars.forEach(varName => console.error(`   - ${varName}`))
    console.error('\nPlease set these in your .env.local file')
    process.exit(1)
  }
  
  try {
    // Read schema and seed files
    const schemaPath = path.join(__dirname, '../database/schema.sql')
    const seedPath = path.join(__dirname, '../database/seed.sql')
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found: ${schemaPath}`)
    }
    
    if (!fs.existsSync(seedPath)) {
      throw new Error(`Seed file not found: ${seedPath}`)
    }
    
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8')
    const seedSQL = fs.readFileSync(seedPath, 'utf8')
    
    console.log('📋 Database schema and seed files found')
    console.log('📝 Next steps:')
    console.log('   1. Go to your Supabase dashboard')
    console.log('   2. Navigate to SQL Editor')
    console.log('   3. Run the schema.sql file first')
    console.log('   4. Then run the seed.sql file')
    console.log('   5. Verify the tables and data are created correctly')
    
    console.log('\n📁 Files to run in Supabase SQL Editor:')
    console.log(`   - Schema: ${schemaPath}`)
    console.log(`   - Seed: ${seedPath}`)
    
    console.log('\n✅ Database setup instructions complete!')
    
  } catch (error) {
    console.error('❌ Error setting up database:', error.message)
    process.exit(1)
  }
}

// Run the setup
setupDatabase()

