$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
$host.UI.RawUI.WindowTitle = "傩 · 梵净入梦"

$python = Get-Command python -ErrorAction SilentlyContinue
if ($python) {
    & $python.Source server.py
    exit
}
$launcher = Get-Command py -ErrorAction SilentlyContinue
if ($launcher) {
    & $launcher.Source server.py
    exit
}
$localPython = Get-ChildItem "$env:LOCALAPPDATA\Programs\Python" -Filter python.exe -Recurse -ErrorAction SilentlyContinue |
    Select-Object -First 1 -ExpandProperty FullName
if ($localPython) {
    & $localPython server.py
    exit
}
Start-Process "$PSScriptRoot\index.html"
