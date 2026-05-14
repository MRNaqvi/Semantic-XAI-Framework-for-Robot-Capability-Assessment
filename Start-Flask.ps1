$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Join-Path $root "App")

python app.py
if ($LASTEXITCODE -ne 0) {
    throw "Flask model API failed to start."
}
