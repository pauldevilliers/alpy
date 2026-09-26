param([string]$Url = "")
$ErrorActionPreference = "Stop"
$installDir = Join-Path $env:LOCALAPPDATA "Alpy"
$desktop = [Environment]::GetFolderPath("Desktop")
$startMenu = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs"
if (-not $Url) { $Url = Read-Host "Enter your Alpy URL (for example https://alpy.example.com)" }
if (-not ($Url -match '^https?://')) { throw "URL must start with http:// or https://" }
New-Item -ItemType Directory -Force -Path $installDir | Out-Null
$launcher = @'
@echo off
setlocal
set "ALPY_URL=__URL__"
where msedge.exe >nul 2>nul
if %errorlevel%==0 (
  start "" msedge.exe --app="%ALPY_URL%" --start-maximized
  exit /b 0
)
start "" "%ALPY_URL%"
'@.Replace("__URL__", $Url)
$cmdPath = Join-Path $installDir "Alpy.cmd"
Set-Content -Path $cmdPath -Value $launcher -Encoding ASCII
$ws = New-Object -ComObject WScript.Shell
foreach ($path in @((Join-Path $desktop "Alpy.lnk"), (Join-Path $startMenu "Alpy.lnk"))) {
  $shortcut = $ws.CreateShortcut($path)
  $shortcut.TargetPath = $cmdPath
  $shortcut.WorkingDirectory = $installDir
  $shortcut.Description = "Open Alpy"
  $shortcut.Save()
}
Write-Host ""
Write-Host "Alpy installed."
Write-Host "Use the Alpy shortcut on your Desktop or Start Menu."
Start-Process $cmdPath
