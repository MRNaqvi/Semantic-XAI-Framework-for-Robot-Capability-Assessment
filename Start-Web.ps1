$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Join-Path $root "web")

python -m http.server 8001
if ($LASTEXITCODE -ne 0) {
    throw "Web UI server failed to start."
}
