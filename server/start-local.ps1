# Start the existing local development services after the Windows user signs in.
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$nodePath = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
if (-not (Test-Path -LiteralPath $nodePath)) {
    $node = Get-Command node.exe -ErrorAction SilentlyContinue
    if (-not $node) { throw 'Node.js was not found; install Node.js or restore the Codex runtime.' }
    $nodePath = $node.Source
}
$logDir = Join-Path $projectRoot 'tmp\local-startup'
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
function Test-LocalPort([int]$port) {
    $client = [Net.Sockets.TcpClient]::new()
    try { $client.Connect('127.0.0.1', $port); return $true } catch { return $false } finally { $client.Dispose() }
}
function Start-LocalService([string]$name, [string[]]$arguments) {
    Start-Process -FilePath $nodePath -ArgumentList $arguments -WorkingDirectory $projectRoot -WindowStyle Hidden `
      -RedirectStandardOutput (Join-Path $logDir "$name.out.log") -RedirectStandardError (Join-Path $logDir "$name.err.log") | Out-Null
}
function Wait-LocalPort([int]$port) {
    for ($i = 0; $i -lt 60; $i++) { if (Test-LocalPort $port) { return }; Start-Sleep -Seconds 1 }
    throw "Local service on port $port did not start; inspect logs in $logDir."
}
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'data\postgres\PG_VERSION')) -or -not (Test-Path -LiteralPath (Join-Path $projectRoot 'data\postgres-password'))) {
    throw 'The existing local database or its password file is missing. It will not be recreated automatically.'
}
if (-not (Test-LocalPort 55432)) { Start-LocalService 'database' @('server/local-db.mjs'); Wait-LocalPort 55432 }
if (-not (Test-LocalPort 3001)) { Start-LocalService 'api' @('server/local-server.mjs'); Wait-LocalPort 3001 }
if (-not (Test-LocalPort 3000)) { Start-LocalService 'site' @('node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','3000','--strictPort'); Wait-LocalPort 3000 }
