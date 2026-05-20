# LIT Iowa Application - silent keepalive
# Run by Windows Task Scheduler on user login. No UI, logs to lit-keepalive.log
# next to this script. Idempotent: if everything is already up, exits clean.

$ErrorActionPreference = 'Continue'
$logPath = Join-Path $PSScriptRoot 'lit-keepalive.log'

function Write-Log {
    param([string]$msg)
    $stamp = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
    "$stamp  $msg" | Out-File -FilePath $logPath -Append -Encoding utf8
}

Write-Log '=== lit-keepalive.ps1 starting ==='

# 1. Docker Desktop
try {
    & docker info *> $null
    $dockerOk = $?
} catch { $dockerOk = $false }

if (-not $dockerOk) {
    Write-Log 'Docker engine offline. Launching Docker Desktop...'
    $dockerPath = 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
    if (Test-Path $dockerPath) {
        Start-Process -FilePath $dockerPath -WindowStyle Hidden
        # Wait up to 120s for engine
        for ($i = 0; $i -lt 40; $i++) {
            Start-Sleep -Seconds 3
            & docker info *> $null
            if ($?) { Write-Log "Docker engine ready after $($i * 3 + 3)s"; break }
        }
    } else {
        Write-Log "ERROR: Docker Desktop not found at $dockerPath"
        exit 1
    }
} else {
    Write-Log 'Docker engine already running.'
}

# 2. Omeka stack
Set-Location $PSScriptRoot
Write-Log 'Bringing Omeka S containers up...'
& docker compose up -d *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Log "ERROR: docker compose up failed (exit $LASTEXITCODE)"
    exit 1
}
Write-Log 'Containers up.'

# 3. Wait for Omeka to respond
$omekaUp = $false
for ($i = 0; $i -lt 30; $i++) {
    try {
        $r = Invoke-WebRequest -Uri 'http://localhost:8090/' -UseBasicParsing -TimeoutSec 2 -MaximumRedirection 5
        if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) {
            $omekaUp = $true
            Write-Log "Omeka responding on 8090 (HTTP $($r.StatusCode))"
            break
        }
    } catch { Start-Sleep -Seconds 2 }
}
if (-not $omekaUp) { Write-Log 'WARNING: Omeka not responding after 60s. Continuing.' }

# 4. ngrok
$ngrokRunning = Get-Process -Name 'ngrok' -ErrorAction SilentlyContinue
if (-not $ngrokRunning) {
    Write-Log 'Starting ngrok tunnel...'
    Start-Process -FilePath 'ngrok' -ArgumentList 'http','--domain=iowa.dev.01.ngrok.dev','8090','--log=stdout' -WindowStyle Hidden
    Start-Sleep -Seconds 5
    Write-Log 'ngrok process launched (hidden window).'
} else {
    Write-Log "ngrok already running (PID $($ngrokRunning.Id))"
}

# 5. Verify public URL
try {
    $r = Invoke-WebRequest -Uri 'https://iowa.dev.01.ngrok.dev/s/iowa-letters' -UseBasicParsing -TimeoutSec 8 -MaximumRedirection 5
    Write-Log "Live URL verified. HTTP $($r.StatusCode)"
} catch {
    Write-Log "WARNING: live URL check failed: $($_.Exception.Message)"
}

Write-Log '=== lit-keepalive.ps1 done ==='
