# PowerShell script to run ShopMaster Backend in different environments
# Usage: .\run-env.ps1 [development|production]

param(
    [Parameter(Position=0)]
    [ValidateSet("development", "production", "dev", "prod")]
    [string]$Environment = "development"
)

# Normalize environment parameter
if ($Environment -eq "dev") { $Environment = "development" }
if ($Environment -eq "prod") { $Environment = "production" }

Write-Host "🚀 Starting ShopMaster Backend in $Environment mode..." -ForegroundColor Green

if ($Environment -eq "development") {
    Write-Host "📍 Environment: Local Development" -ForegroundColor Yellow
    Write-Host "🗄️  Database: Local PostgreSQL (shopmaster)" -ForegroundColor Yellow  
    Write-Host "🔴 Redis: Disabled" -ForegroundColor Red
    Write-Host "📝 Config: .env.development" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Make sure you have:" -ForegroundColor Cyan
    Write-Host "✓ PostgreSQL running locally" -ForegroundColor White
    Write-Host "✓ Database 'shopmaster' created" -ForegroundColor White
    Write-Host "✓ User 'postgres' with password 'postgres'" -ForegroundColor White
    Write-Host ""
    
    # Set environment and run with development config
    $env:NODE_ENV = "development"
    npm run dev:local
} else {
    Write-Host "📍 Environment: Production" -ForegroundColor Yellow
    Write-Host "🗄️  Database: Supabase" -ForegroundColor Yellow
    Write-Host "🟢 Redis: Enabled" -ForegroundColor Green  
    Write-Host "📝 Config: .env" -ForegroundColor Yellow
    Write-Host ""
    
    # Set environment and run with production config
    $env:NODE_ENV = "production"
    npm run dev:prod
}
