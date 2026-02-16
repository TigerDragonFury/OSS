# OSS Database Migration PowerShell Script
# Runs SQL migrations using psql command
# Requires PostgreSQL client tools installed

param(
    [string]$Host = $env:SUPABASE_DB_HOST,
    [string]$Database = "postgres",
    [string]$User = "postgres",
    [string]$Password = $env:SUPABASE_DB_PASSWORD,
    [int]$Port = 5432
)

# ANSI color codes
$colors = @{
    Reset = "`e[0m"
    Green = "`e[32m"
    Red = "`e[31m"
    Yellow = "`e[33m"
    Blue = "`e[36m"
    Gray = "`e[90m"
}

# Migration files in order
$migrationFiles = @(
    "supabase-schema.sql",
    "auth-schema.sql",
    "warehouse-schema.sql",
    "inventory-usage-schema.sql",
    "inventory-ledger.sql",
    "vessel-operations-schema.sql",
    "fix-rls-policies.sql",
    "sync-completed-expenses.sql",
    "auto-update-total-spent.sql",
    "add-payment-method-to-expenses.sql",
    "fix-land-scrap-sales-schema.sql",
    "update-companies-types.sql"
)

Write-Host "$($colors.Blue)╔════════════════════════════════════════════╗$($colors.Reset)"
Write-Host "$($colors.Blue)║   OSS Database Migration Runner            ║$($colors.Reset)"
Write-Host "$($colors.Blue)╚════════════════════════════════════════════╝$($colors.Reset)`n"

# Check if psql is available
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlPath) {
    Write-Host "$($colors.Red)❌ Error: psql command not found$($colors.Reset)"
    Write-Host "$($colors.Yellow)💡 Install PostgreSQL client tools or use the Node.js script instead:$($colors.Reset)"
    Write-Host "   node run-migrations.js`n"
    Write-Host "$($colors.Yellow)Or run migrations manually in Supabase SQL Editor:$($colors.Reset)"
    Write-Host "   https://app.supabase.com/project/_/sql`n"
    exit 1
}

# Check for connection details
if (-not $Host -or -not $Password) {
    Write-Host "$($colors.Red)❌ Error: Database connection details not configured$($colors.Reset)"
    Write-Host "$($colors.Yellow)💡 Set environment variables:$($colors.Reset)"
    Write-Host "   `$env:SUPABASE_DB_HOST = 'your-project.supabase.co'"
    Write-Host "   `$env:SUPABASE_DB_PASSWORD = 'your-password'"
    Write-Host "`nOr run with parameters:"
    Write-Host "   .\run-migrations.ps1 -Host 'your-host' -Password 'your-password'`n"
    Write-Host "$($colors.Yellow)Or use the browser-based method:$($colors.Reset)"
    Write-Host "   node run-migrations.js`n"
    exit 1
}

Write-Host "$($colors.Gray)🔗 Connecting to: $Host$($colors.Reset)`n"

$results = @{
    Total = $migrationFiles.Count
    Successful = 0
    Failed = 0
    Skipped = 0
    Errors = @()
}

# Run each migration
foreach ($filename in $migrationFiles) {
    $filePath = Join-Path $PSScriptRoot $filename
    
    if (-not (Test-Path $filePath)) {
        Write-Host "$($colors.Yellow)⚠️  Skipping $filename - file not found$($colors.Reset)"
        $results.Skipped++
        continue
    }
    
    Write-Host "$($colors.Blue)📄 Running $filename...$($colors.Reset)"
    
    # Build connection string
    $env:PGPASSWORD = $Password
    
    try {
        # Execute SQL file
        $output = & psql -h $Host -p $Port -U $User -d $Database -f $filePath 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "$($colors.Green)✅ $filename completed successfully$($colors.Reset)"
            $results.Successful++
        } else {
            Write-Host "$($colors.Red)❌ Error in $filename$($colors.Reset)"
            Write-Host "$($colors.Red)   $output$($colors.Reset)"
            $results.Failed++
            $results.Errors += @{ Filename = $filename; Error = $output }
        }
    } catch {
        Write-Host "$($colors.Red)❌ Error in $filename$($colors.Reset)"
        Write-Host "$($colors.Red)   $($_.Exception.Message)$($colors.Reset)"
        $results.Failed++
        $results.Errors += @{ Filename = $filename; Error = $_.Exception.Message }
    }
    
    # Small delay between migrations
    Start-Sleep -Milliseconds 500
}

# Clear password from environment
Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue

# Print summary
Write-Host "`n$($colors.Blue)╔════════════════════════════════════════════╗$($colors.Reset)"
Write-Host "$($colors.Blue)║   Migration Summary                        ║$($colors.Reset)"
Write-Host "$($colors.Blue)╚════════════════════════════════════════════╝$($colors.Reset)`n"

Write-Host "Total migrations: $($results.Total)"
Write-Host "$($colors.Green)✅ Successful: $($results.Successful)$($colors.Reset)"

if ($results.Skipped -gt 0) {
    Write-Host "$($colors.Yellow)⏭️  Skipped: $($results.Skipped)$($colors.Reset)"
}

if ($results.Failed -gt 0) {
    Write-Host "$($colors.Red)❌ Failed: $($results.Failed)$($colors.Reset)`n"
    Write-Host "$($colors.Red)Failed migrations:$($colors.Reset)"
    foreach ($error in $results.Errors) {
        Write-Host "$($colors.Red)  • $($error.Filename)$($colors.Reset)"
    }
}

Write-Host "`n$($colors.Blue)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$($colors.Reset)"

if ($results.Failed -eq 0) {
    Write-Host "`n$($colors.Green)🎉 All migrations completed successfully!$($colors.Reset)`n"
    exit 0
} else {
    Write-Host "`n$($colors.Red)⚠️  Some migrations failed. Please check errors above.$($colors.Reset)`n"
    exit 1
}
