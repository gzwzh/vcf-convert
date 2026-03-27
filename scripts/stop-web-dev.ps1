$projectRoot = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $projectRoot '.vite-dev.pid'

if (Test-Path $pidFile) {
  $savedPid = Get-Content $pidFile | Select-Object -First 1
  if ($savedPid) {
    Stop-Process -Id $savedPid -Force -ErrorAction SilentlyContinue
  }
  Remove-Item $pidFile -ErrorAction SilentlyContinue
}

Get-NetTCPConnection -LocalPort 5180 -State Listen -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique |
  ForEach-Object {
    Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
  }
