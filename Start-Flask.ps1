$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Join-Path $root "App")

$requirements = Join-Path (Get-Location) "requirements.txt"
$dependencyCheck = Join-Path (Get-Location) "check_dependencies.py"

$missing = python $dependencyCheck
if ($LASTEXITCODE -ne 0) {
    throw "Python dependency check failed."
}

if (-not [string]::IsNullOrWhiteSpace($missing)) {
    Write-Host "Installing missing Flask API dependencies: $missing"
    python -m pip install -r $requirements
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to install Flask API dependencies."
    }
}

python app.py
if ($LASTEXITCODE -ne 0) {
    throw "Flask model API failed to start."
}
