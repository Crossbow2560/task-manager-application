param(
    [switch]$ResetDemo,
    [string]$DemoPassword,
    [int]$Port = 3100
)
$ErrorActionPreference = 'Stop'
$demoRepo = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $demoRepo

if (Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue) {
    throw "Port $Port already has a server. Use the running app or stop that server before launching again."
}
if (!(Test-Path -LiteralPath 'node_modules')) {
    & npm.cmd ci
    if ($LASTEXITCODE -ne 0) { throw 'npm ci failed' }
}
& docker info --format '{{.ServerVersion}}' 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Open Docker Desktop, wait until its engine is running, then try again.' }
foreach ($demoContainer in @('tm-submission-pg','tm-submission-mail')) {
    & docker container inspect $demoContainer 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        & docker start $demoContainer | Out-Null
    } elseif ($demoContainer -eq 'tm-submission-pg') {
        & docker run -d --name tm-submission-pg -e POSTGRES_PASSWORD=submission-local-only -e POSTGRES_DB=taskmanager -p 127.0.0.1:55433:5432 postgres:16 | Out-Null
    } else {
        & docker run -d --name tm-submission-mail -p 127.0.0.1:1026:1025 -p 127.0.0.1:8026:8025 axllent/mailpit:latest | Out-Null
    }
    if ($LASTEXITCODE -ne 0) { throw "Could not start $demoContainer" }
}
$demoReady = $false
for ($attempt = 0; $attempt -lt 60; $attempt++) {
    & docker exec tm-submission-pg pg_isready -U postgres 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { $demoReady = $true; break }
    Start-Sleep -Seconds 1
}
if (!$demoReady) { throw 'PostgreSQL did not become ready.' }
$demoDatabase = & docker exec tm-submission-pg psql -U postgres -tAc "SELECT datname FROM pg_database WHERE datname='taskmanager_demo'"
if (!"$demoDatabase".Trim()) {
    & docker exec tm-submission-pg psql -U postgres -c 'CREATE DATABASE taskmanager_demo;' | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Could not create demo database.' }
}
$env:DATABASE_URL = 'postgres://postgres:submission-local-only@127.0.0.1:55433/taskmanager_demo'
if (!$DemoPassword) {
    $demoSecurePassword = Read-Host 'Demo-only password (existing accounts keep theirs unless -ResetDemo)' -AsSecureString
    $DemoPassword = [System.Net.NetworkCredential]::new('', $demoSecurePassword).Password
}
$env:DEMO_PASSWORD = $DemoPassword
$env:DEMO_RESET = if ($ResetDemo) { '1' } else { '0' }
& node scripts/seed-demo-workspace.js
$demoSeedExit = $LASTEXITCODE
Remove-Item Env:DEMO_PASSWORD,Env:DEMO_RESET -ErrorAction SilentlyContinue
if ($demoSeedExit -ne 0) { throw 'Demo workspace initialization failed.' }

$demoRandom = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$demoSecretBytes = New-Object byte[] 32
$demoRandom.GetBytes($demoSecretBytes)
$demoRandom.Dispose()
$env:JWT_SECRET = [BitConverter]::ToString($demoSecretBytes).Replace('-','')
$env:PORT = "$Port"
$env:SMTP_HOST = '127.0.0.1'
$env:SMTP_PORT = '1026'
$env:REMINDER_SCAN_MS = '5000'
$env:LOCAL_DEMO_LOGIN = '1'
$env:LOCAL_DEMO_PASSWORD = $DemoPassword
$env:HOST = '127.0.0.1'
Write-Host "Open http://localhost:$Port/login.html"
Write-Host 'Main demo login: admin@demo.test; teammate: member@demo.test'
Write-Host 'Local captured email: http://localhost:8026'
Write-Host 'Keep this terminal open. Ctrl+C stops the application.'
& node src/server.js
