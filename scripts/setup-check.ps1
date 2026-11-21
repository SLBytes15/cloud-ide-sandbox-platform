# ========================================================
# Zaalima Cloud IDE - Windows Setup Verification Script
# ========================================================

Write-Host "Running Zaalima Cloud IDE Setup Verification (Windows PowerShell)..."
Write-Host "----------------------------------------------------"

# 1. Check Node.js
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCmd) {
    $nodeVer = node -v
    Write-Host "[OK] Node.js installed: $nodeVer"
} else {
    Write-Host "[ERROR] Node.js is NOT installed. Required: version 20.0.0 or higher."
    exit 1
}

# 2. Check npm
$npmCmd = Get-Command npm -ErrorAction SilentlyContinue
if ($npmCmd) {
    $npmVer = npm -v
    Write-Host "[OK] npm installed: $npmVer"
} else {
    Write-Host "[ERROR] npm is NOT installed. Required: version 10.0.0 or higher."
    exit 1
}

# 3. Check MongoDB
$mongoCmd = Get-Command mongod -ErrorAction SilentlyContinue
if ($mongoCmd) {
    $mongoVer = (mongod --version | Select-Object -First 1)
    Write-Host "[OK] MongoDB daemon installed: $mongoVer"
} else {
    Write-Host "[WARN] MongoDB daemon (mongod) not found in PATH (Local or remote URI can still be used via MONGODB_URI in .env)"
}

# 4. Check Docker
$dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
if ($dockerCmd) {
    $dockerVer = docker --version
    Write-Host "[INFO] Docker found: $dockerVer (Reserved for future execution service)"
} else {
    Write-Host "[INFO] Docker is not installed or not in PATH (Not required for initial setup phase)"
}

# 5. Check .env file
if (Test-Path .env) {
    Write-Host "[OK] .env file exists"
} else {
    Write-Host "[WARN] .env file not found. Creating from .env.example..."
    Copy-Item .env.example .env
    Write-Host "[OK] Created .env from .env.example"
}

Write-Host "----------------------------------------------------"
Write-Host "Prerequisite check complete! Run 'npm install' to initialize packages."
