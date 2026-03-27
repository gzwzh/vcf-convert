$projectRoot = Split-Path -Parent $PSScriptRoot
$nodeExe = 'C:\Program Files\nodejs\node.exe'
$viteScript = Join-Path $projectRoot 'node_modules\vite\bin\vite.js'
$pidFile = Join-Path $projectRoot '.vite-dev.pid'

if (-not (Test-Path $nodeExe)) {
  throw "Node executable not found: $nodeExe"
}

if (-not (Test-Path $viteScript)) {
  throw "Vite script not found: $viteScript"
}

$command = "Set-Location '$projectRoot'; & '$nodeExe' '$viteScript' --host 0.0.0.0 --port 5180 --strictPort"
Start-Process -FilePath 'powershell.exe' -WindowStyle Minimized -ArgumentList '-NoExit', '-Command', $command | Out-Null

Start-Sleep -Seconds 3
$conn = Get-NetTCPConnection -LocalPort 5180 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($conn) {
  Set-Content -Path $pidFile -Value $conn.OwningProcess
  Write-Output "started: $($conn.OwningProcess)"
} else {
  Write-Output 'failed'
}
