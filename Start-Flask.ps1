$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Join-Path $root "App")

$requirements = Join-Path (Get-Location) "requirements.txt"
$dependencyCheck = @"
import importlib.util
missing = [
    package for package in ["flask", "tensorflow", "lime"]
    if importlib.util.find_spec(package) is None
]
print(",".join(missing))
"@

$missing = python -c $dependencyCheck
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
