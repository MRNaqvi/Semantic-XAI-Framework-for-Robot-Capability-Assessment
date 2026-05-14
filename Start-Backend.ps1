$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$config = Join-Path $root "config.local.ps1"
$project = Join-Path $root "RdfoxWebApi\RdfoxWebApi\RdfoxWebApi.csproj"
$nugetConfig = Join-Path $root "NuGet.Config"

if (Test-Path -LiteralPath $config) {
    . $config
}

$env:APPDATA = Join-Path $root "appdata"
$env:DOTNET_CLI_HOME = $root
$env:DOTNET_SKIP_FIRST_TIME_EXPERIENCE = "1"
$env:DOTNET_CLI_TELEMETRY_OPTOUT = "1"
$env:NUGET_PACKAGES = Join-Path $root ".nuget-packages"
$env:RDFOX_URL = "http://localhost:12110/"
$env:RDFOX_ROLE = "guest"
$env:RDFOX_PASSWORD = "guest"

dotnet restore $project --configfile $nugetConfig /p:BaseIntermediateOutputPath=".\build-obj\" /p:RestoreIgnoreFailedSources=true
if ($LASTEXITCODE -ne 0) {
    throw ".NET restore failed."
}

dotnet run --project $project --no-restore --urls "http://localhost:11191" /p:BaseIntermediateOutputPath=".\build-obj\"
if ($LASTEXITCODE -ne 0) {
    throw ".NET API failed to start."
}
