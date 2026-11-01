param([switch]$Apply,[switch]$ValidateOnly)
# Explicit local activation only; never contacts a remote host.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$node = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$cluster = Join-Path $root 'data\postgres'
$marker = Join-Path $root 'data\crm-work-enabled'
$pgCtl = Join-Path $root 'server\node_modules\.pnpm\@embedded-postgres+windows-x64@18.4.0-beta.17\node_modules\@embedded-postgres\windows-x64\native\bin\pg_ctl.exe'
if ($Apply -eq $ValidateOnly) { throw 'Choose exactly one of -Apply or -ValidateOnly.' }
if (-not (Test-Path -LiteralPath $node) -or -not (Test-Path -LiteralPath $pgCtl) -or -not (Test-Path -LiteralPath (Join-Path $cluster 'PG_VERSION'))) { throw 'Required local runtime or database is missing.' }
if (Test-Path -LiteralPath $marker) { throw 'CRM marker already exists; activation will not overwrite it.' }
function Get-VerifiedListener([int]$port,[string]$pattern) {
  $connections = @(Get-NetTCPConnection -LocalAddress '127.0.0.1' -LocalPort $port -State Listen -ErrorAction Stop)
  if ($connections.Count -ne 1) { throw "Expected one local listener on $port." }
  $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$($connections[0].OwningProcess)"
  if (-not $proc -or $proc.CommandLine -notmatch $pattern) { throw "Unexpected process listening on $port." }
  return $proc
}
function Test-Port([int]$port) {
  $client=[Net.Sockets.TcpClient]::new()
  try { $client.Connect('127.0.0.1',$port); return $true } catch { return $false } finally { $client.Dispose() }
}
function Wait-Port([int]$port) { for($i=0;$i -lt 90;$i++){if(Test-Port $port){return};Start-Sleep -Milliseconds 500};throw "Local port $port did not start." }
function Start-Local([string]$name,[string[]]$arguments) {
  Start-Process -FilePath $node -ArgumentList $arguments -WorkingDirectory $root -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput (Join-Path $logDir "$name.out.log") -RedirectStandardError (Join-Path $logDir "$name.err.log")
}
function Ensure-OriginalServices {
  if (-not (Test-Port 55432)) { $null=Start-Local 'rollback-database' @('server/local-db.mjs'); Wait-Port 55432 }
  if (-not (Test-Port 3001)) { $null=Start-Local 'rollback-api' @('server/local-server.mjs'); Wait-Port 3001 }
  if (-not (Test-Port 3000)) { $null=Start-Local 'rollback-site' @('node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','3000','--strictPort'); Wait-Port 3000 }
}
$api=Get-VerifiedListener 3001 'server[\\/]local-server\.mjs'
$site=Get-VerifiedListener 3000 'vite[\\/]bin[\\/]vite\.js'
$postgres=Get-VerifiedListener 55432 'postgres\.exe'
if ($postgres.CommandLine -notlike "*$cluster*") { throw 'Database listener is not the intended project cluster.' }
$dbParent=Get-CimInstance Win32_Process -Filter "ProcessId=$($postgres.ParentProcessId)"
if (-not $dbParent -or $dbParent.CommandLine -notmatch 'server[\\/]local-db\.mjs') { throw 'Database parent is not the expected local service.' }
$beforeText=& $node (Join-Path $root 'server\crm-readiness-check.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Baseline check failed.' }
$before=$beforeText | ConvertFrom-Json
if ($before.version -ne 88 -or $before.crm_table) { throw 'Unexpected database schema; activation stopped.' }
if ($ValidateOnly) { Write-Output 'CRM_LOCAL_PREFLIGHT_OK'; return }
$runId=[guid]::NewGuid().ToString('N')
$logDir=Join-Path $root "tmp\crm-activation-$runId"
New-Item -ItemType Directory -Path $logDir -ErrorAction Stop | Out-Null
$createdMarker=$false
try {
  Stop-Process -Id $api.ProcessId -ErrorAction Stop
  Stop-Process -Id $site.ProcessId -ErrorAction Stop
  & $pgCtl stop -D $cluster -m fast -w
  if ($LASTEXITCODE -ne 0 -or (Test-Port 55432) -or (Test-Path -LiteralPath (Join-Path $cluster 'postmaster.pid'))) { throw 'Database did not stop cleanly.' }
  $remaining=Get-CimInstance Win32_Process -Filter "ProcessId=$($dbParent.ProcessId)"
  if ($remaining -and $remaining.CommandLine -match 'server[\\/]local-db\.mjs') { Stop-Process -Id $remaining.ProcessId -ErrorAction Stop }
  & $node (Join-Path $root 'server\backup-local.mjs')
  if ($LASTEXITCODE -ne 0) { throw 'Verified backup failed.' }
  $null=Start-Local 'database' @('server/local-db.mjs'); Wait-Port 55432
  New-Item -ItemType File -Path $marker -ErrorAction Stop | Out-Null
  $createdMarker=$true
  $null=Start-Local 'api' @('server/local-server.mjs'); Wait-Port 3001
  $null=Start-Local 'site' @('node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','3000','--strictPort'); Wait-Port 3000
  $health=Invoke-WebRequest -Uri 'http://127.0.0.1:3001/health' -UseBasicParsing -TimeoutSec 10
  $catalog=Invoke-WebRequest -Uri 'http://127.0.0.1:3000/api/catalog' -UseBasicParsing -TimeoutSec 10
  if ($health.StatusCode -ne 200 -or $catalog.StatusCode -ne 200) { throw 'Local health or catalog check failed.' }
  $afterText=& $node (Join-Path $root 'server\crm-readiness-check.mjs')
  if ($LASTEXITCODE -ne 0) { throw 'Post-update database check failed.' }
  $after=$afterText | ConvertFrom-Json
  if ($after.version -ne 97 -or $after.crm_table -ne 'crm_work_boards' -or $after.users -ne $before.users -or $after.organizations -ne $before.organizations -or $after.requests -ne $before.requests) { throw 'Post-update database verification did not match.' }
  Write-Output 'CRM_LOCAL_ACTIVATION_OK'
} catch {
  if ($createdMarker -and (Test-Path -LiteralPath $marker)) { Remove-Item -LiteralPath $marker -ErrorAction Stop }
  try {
    if (Test-Port 3001) { $current=Get-VerifiedListener 3001 'server[\\/]local-server\.mjs'; Stop-Process -Id $current.ProcessId -ErrorAction Stop }
    if (Test-Port 3000) { $current=Get-VerifiedListener 3000 'vite[\\/]bin[\\/]vite\.js'; Stop-Process -Id $current.ProcessId -ErrorAction Stop }
    Ensure-OriginalServices
  } catch { Write-Error "Automatic service recovery failed: $($_.Exception.Message)" -ErrorAction Continue }
  throw
}
