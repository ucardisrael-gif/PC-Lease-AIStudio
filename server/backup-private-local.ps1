# Offline backup of the existing local cluster. Never creates or resets a database.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$node = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$cluster = Join-Path $root 'data\postgres'
$backupRoot = Join-Path $root 'data\private-backups'
$pgCtl = Join-Path $root 'server\node_modules\.pnpm\@embedded-postgres+windows-x64@18.4.0-beta.17\node_modules\@embedded-postgres\windows-x64\native\bin\pg_ctl.exe'
if (-not (Test-Path $node) -or -not (Test-Path $pgCtl) -or -not (Test-Path (Join-Path $cluster 'PG_VERSION'))) { throw 'Local runtime or existing database is missing.' }
$security = [System.Security.AccessControl.DirectorySecurity]::new()
$security.SetAccessRuleProtection($true, $false)
$inherit = [System.Security.AccessControl.InheritanceFlags]'ContainerInherit, ObjectInherit'
foreach ($sid in @([System.Security.Principal.WindowsIdentity]::GetCurrent().User, [System.Security.Principal.SecurityIdentifier]::new('S-1-5-18'), [System.Security.Principal.SecurityIdentifier]::new('S-1-5-32-544'))) {
  $rule = [System.Security.AccessControl.FileSystemAccessRule]::new($sid, 'FullControl', $inherit, 'None', 'Allow')
  $security.AddAccessRule($rule)
}
if (-not (Test-Path -LiteralPath $backupRoot)) { [System.IO.Directory]::CreateDirectory($backupRoot, $security) | Out-Null }
$actual = Get-Acl -LiteralPath $backupRoot
$allowed = @([System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value, 'S-1-5-18', 'S-1-5-32-544')
if (-not $actual.AreAccessRulesProtected) { throw 'Private backup permissions inherit from parent; refusing to continue.' }
foreach ($rule in $actual.GetAccessRules($true, $true, [System.Security.Principal.SecurityIdentifier])) {
  if ($rule.AccessControlType -eq 'Allow' -and $rule.IdentityReference.Value -notin $allowed) { throw 'Unexpected access to private backup folder.' }
}
function Listener([int]$port, [string]$pattern) {
  $conn = @(Get-NetTCPConnection -LocalAddress '127.0.0.1' -LocalPort $port -State Listen -ErrorAction Stop)
  if ($conn.Count -ne 1) { throw "Unexpected listener on $port" }
  $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$($conn[0].OwningProcess)"
  if (-not $proc -or $proc.CommandLine -notmatch $pattern) { throw "Unexpected process on $port" }
  return $proc
}
$api = Listener 3001 'server[\\/]local-server\.mjs'
$site = Listener 3000 'vite[\\/]bin[\\/]vite\.js'
$pg = Listener 55432 'postgres\.exe'
if ($pg.CommandLine -notlike "*$cluster*") { throw 'Unexpected PostgreSQL cluster.' }
$parent = Get-CimInstance Win32_Process -Filter "ProcessId=$($pg.ParentProcessId)"
if (-not $parent -or $parent.CommandLine -notmatch 'server[\\/]local-db\.mjs') { throw 'Unexpected database parent process.' }
try {
  Stop-Process -Id $api.ProcessId -ErrorAction Stop
  Stop-Process -Id $site.ProcessId -ErrorAction Stop
  & $pgCtl stop -D $cluster -m fast -w
  if ($LASTEXITCODE -ne 0 -or (Test-Path (Join-Path $cluster 'postmaster.pid'))) { throw 'PostgreSQL did not stop cleanly.' }
  if (Get-Process -Id $parent.ProcessId -ErrorAction SilentlyContinue) { Stop-Process -Id $parent.ProcessId -ErrorAction Stop }
  & $node (Join-Path $root 'server\backup-private-local.mjs')
  if ($LASTEXITCODE -ne 0) { throw 'Backup verification failed.' }
} finally {
  & (Join-Path $root 'server\start-local.ps1')
}
