$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$config = Join-Path $root "config.local.ps1"

if (Test-Path -LiteralPath $config) {
    . $config
}

$licenseFile = if ($env:RDFOX_LICENSE_FILE) {
    $env:RDFOX_LICENSE_FILE
} else {
    Join-Path $root "license\RDFox.lic"
}

if (!(Test-Path -LiteralPath $licenseFile)) {
    throw "RDFox license not found. Put RDFox.lic in .\license or set RDFOX_LICENSE_FILE in config.local.ps1."
}

if ([string]::IsNullOrWhiteSpace($env:OPENAI_API_KEY)) {
    Write-Host "OPENAI_API_KEY is not set. Natural language explanations will ask the user to add their key."
}

function Start-ProjectWindow {
    param(
        [string]$Title,
        [string]$Script
    )

    $scriptPath = Join-Path $root $Script
    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-ExecutionPolicy", "Bypass",
        "-Command",
        "`$Host.UI.RawUI.WindowTitle='$Title'; & '$scriptPath'"
    )
}

Start-ProjectWindow -Title "RDFox 7.5b" -Script "Start-RDFox.ps1"
Start-Sleep -Seconds 4
Start-ProjectWindow -Title ".NET RDFox API" -Script "Start-Backend.ps1"
Start-ProjectWindow -Title "Flask Model API" -Script "Start-Flask.ps1"
Start-ProjectWindow -Title "Web UI" -Script "Start-Web.ps1"

Write-Host ""
Write-Host "Project services are starting."
Write-Host "Open the app at: http://127.0.0.1:8001"
Write-Host "RDFox REST endpoint: http://localhost:12110"
Write-Host ".NET API endpoint: http://localhost:11191"
