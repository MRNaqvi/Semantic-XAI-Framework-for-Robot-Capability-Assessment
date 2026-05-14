$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$rdfoxExe = Join-Path $root "tools\RDFox-win64-x86_64-7.5b\RDFox.exe"
$serverDir = Join-Path $root "rdfox-server"
$projectLicense = Join-Path $root "license\RDFox.lic"
$downloadLicense = Join-Path $env:USERPROFILE "Downloads\RDFox.lic"

if (!(Test-Path -LiteralPath $rdfoxExe)) {
    throw "RDFox.exe was not found at $rdfoxExe"
}

if ($env:RDFOX_LICENSE_FILE -and (Test-Path -LiteralPath $env:RDFOX_LICENSE_FILE)) {
    $licenseFile = $env:RDFOX_LICENSE_FILE
} elseif (Test-Path -LiteralPath $projectLicense) {
    $licenseFile = $projectLicense
} elseif (Test-Path -LiteralPath $downloadLicense) {
    $licenseFile = $downloadLicense
} else {
    throw "No RDFox license found. Put a valid license at $projectLicense"
}

if (!(Test-Path -LiteralPath $serverDir)) {
    New-Item -ItemType Directory -Path $serverDir | Out-Null
}

$env:RDFOX_LICENSE_FILE = $licenseFile

$serverParams = @(
    "-server-directory", $serverDir,
    "-persistence", "file",
    "-channel", "TCP",
    "-port", "12110",
    "-role", "guest",
    "-password", "guest"
)

$serverParamsFile = Join-Path $serverDir "server.params"
if (!(Test-Path -LiteralPath $serverParamsFile)) {
    & $rdfoxExe @serverParams init
    if ($LASTEXITCODE -ne 0) {
        throw "RDFox initialization failed. Check that $licenseFile is valid and not expired."
    }
}

& $rdfoxExe -server-directory $serverDir -role guest -password guest daemon
if ($LASTEXITCODE -ne 0) {
    throw "RDFox daemon failed to start."
}
