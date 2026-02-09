#!/usr/bin/env node

/**
 * Automatic Database Migration Script
 * Runs all SQL migration files in order and reports results
 * Usage: node run-migrations.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  gray: '\x1b[90m'
};

// Load environment variables from .env.local
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (key && value && !process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

// Migration files in order
const MIGRATION_FILES = [
  'supabase-schema.sql',
  'auth-schema.sql',
  'warehouse-schema.sql',
  'vessel-operations-schema.sql', // Operations tables (maintenance, crew, tasks, logs, documents, etc.)
  'inventory-usage-schema.sql', // Inventory usage tracking and vessel equipment
  'fix-rls-policies.sql',
  'sync-completed-expenses.sql',
  'auto-update-total-spent.sql',
  'add-payment-method-to-expenses.sql',
  'fix-land-scrap-sales-schema.sql',
  'update-companies-types.sql',
  'owner-equity-schema.sql', // Owner equity tracking - who paid what
  'owner-partial-payments-schema.sql' // Allow split payments between owners
];

// Read environment variables or prompt for connection
function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl) {
    console.error(`${colors.red}❌ Error: NEXT_PUBLIC_SUPABASE_URL not found in environment${colors.reset}`);
    console.log(`${colors.yellow}💡 Add to .env.local:${colors.reset}`);
    console.log('NEXT_PUBLIC_SUPABASE_URL=your_supabase_url');
    console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key');
    console.log('SUPABASE_SERVICE_KEY=your_service_key (optional, for admin operations)');
    process.exit(1);
  }

  // Prefer service key for migrations, fall back to anon key
  const key = supabaseServiceKey || supabaseKey;
  
  if (!key) {
    console.error(`${colors.red}❌ Error: Supabase key not found in environment${colors.reset}`);
    process.exit(1);
  }

  return { supabaseUrl, supabaseKey: key };
}

// Execute a SQL file
async function executeSqlFile(supabase, filename) {
  const filePath = path.join(__dirname, filename);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.log(`${colors.yellow}⚠️  Skipping ${filename} - file not found${colors.reset}`);
    return { success: true, skipped: true };
  }

  console.log(`${colors.blue}📄 Running ${filename}...${colors.reset}`);
  
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Use RPC to execute raw SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // If exec_sql doesn't exist, try direct query
      if (error.message.includes('function') || error.code === '42883') {
        console.log(`${colors.gray}   Using direct query method...${colors.reset}`);
        const { error: queryError } = await supabase.from('_').select('*').limit(0); // Dummy query to check connection
        
        if (queryError && queryError.message !== "relation \"_\" does not exist") {
          throw queryError;
        }
        
        // For SQL execution, we need to use the Postgres connection directly
        // This is a limitation - we'll provide instructions instead
        console.log(`${colors.yellow}⚠️  Cannot execute raw SQL via REST API${colors.reset}`);
        console.log(`${colors.gray}   Please run this file manually in Supabase SQL Editor${colors.reset}`);
        return { success: true, manual: true };
      }
      throw error;
    }
    
    console.log(`${colors.green}✅ ${filename} completed successfully${colors.reset}`);
    return { success: true };
    
  } catch (error) {
    console.error(`${colors.red}❌ Error in ${filename}:${colors.reset}`);
    console.error(`${colors.red}   ${error.message}${colors.reset}`);
    
    // Provide helpful error messages
    if (error.message.includes('relation') && error.message.includes('does not exist')) {
      console.log(`${colors.yellow}💡 Tip: This might be a dependency issue. Make sure previous migrations ran successfully.${colors.reset}`);
    }
    
    if (error.message.includes('constraint')) {
      console.log(`${colors.yellow}💡 Tip: Constraint violation. Check if data matches the constraint requirements.${colors.reset}`);
    }
    
    return { success: false, error: error.message };
  }
}

// Main migration runner
async function runMigrations() {
  console.log(`${colors.blue}╔════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║   OSS Database Migration Runner            ║${colors.reset}`);
  console.log(`${colors.blue}╚════════════════════════════════════════════╝${colors.reset}\n`);

  // Get Supabase config
  const { supabaseUrl, supabaseKey } = getSupabaseConfig();
  console.log(`${colors.gray}🔗 Connecting to: ${supabaseUrl}${colors.reset}\n`);

  const supabase = createClient(supabaseUrl, supabaseKey);

  const results = {
    total: MIGRATION_FILES.length,
    successful: 0,
    failed: 0,
    skipped: 0,
    manual: 0,
    errors: []
  };

  // Run each migration
  for (const filename of MIGRATION_FILES) {
    const result = await executeSqlFile(supabase, filename);
    
    if (result.success) {
      if (result.skipped) {
        results.skipped++;
      } else if (result.manual) {
        results.manual++;
      } else {
        results.successful++;
      }
    } else {
      results.failed++;
      results.errors.push({ filename, error: result.error });
    }
    
    // Small delay between migrations
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Print summary
  console.log(`\n${colors.blue}╔════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║   Migration Summary                        ║${colors.reset}`);
  console.log(`${colors.blue}╚════════════════════════════════════════════╝${colors.reset}\n`);
  
  console.log(`Total migrations: ${results.total}`);
  console.log(`${colors.green}✅ Successful: ${results.successful}${colors.reset}`);
  
  if (results.manual > 0) {
    console.log(`${colors.yellow}⚠️  Manual execution needed: ${results.manual}${colors.reset}`);
    console.log(`${colors.gray}   (These files need to be run in Supabase SQL Editor)${colors.reset}`);
  }
  
  if (results.skipped > 0) {
    console.log(`${colors.yellow}⏭️  Skipped: ${results.skipped}${colors.reset}`);
  }
  
  if (results.failed > 0) {
    console.log(`${colors.red}❌ Failed: ${results.failed}${colors.reset}\n`);
    console.log(`${colors.red}Failed migrations:${colors.reset}`);
    results.errors.forEach(({ filename, error }) => {
      console.log(`${colors.red}  • ${filename}: ${error}${colors.reset}`);
    });
  }

  console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  
  if (results.manual > 0) {
    console.log(`\n${colors.yellow}📝 Next Steps:${colors.reset}`);
    console.log('1. Go to: https://app.supabase.com/project/_/sql');
    console.log('2. Run the migration files listed above manually');
    console.log('3. Copy and paste the SQL content into the SQL Editor');
    console.log('4. Click "Run" for each file\n');
  }

  if (results.failed === 0 && results.manual === 0) {
    console.log(`${colors.green}\n🎉 All migrations completed successfully!${colors.reset}\n`);
  }

  process.exit(results.failed > 0 ? 1 : 0);
}

// Run migrations
runMigrations().catch(error => {
  console.error(`${colors.red}❌ Fatal error:${colors.reset}`, error);
  process.exit(1);
});
