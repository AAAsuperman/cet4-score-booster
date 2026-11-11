[CmdletBinding()]
param(
    [int]$Port = 8790,
    [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) { $python = Get-Command py -ErrorAction SilentlyContinue }
if (-not $python) {
    Write-Host '没有找到 Python。请安装 Python 3，或直接双击 index.html 使用桌面版。' -ForegroundColor Yellow
    exit 1
}

try {
    $check = & $python.Source --version 2>&1
    Write-Host "使用 $check" -ForegroundColor DarkGray
} catch {
    Write-Host 'Python 无法运行。' -ForegroundColor Yellow
    exit 1
}

$lan = @()
try {
    $lan = Get-NetIPConfiguration -ErrorAction SilentlyContinue |
        Where-Object { $_.IPv4DefaultGateway -ne $null -and $_.NetAdapter.Status -eq 'Up' } |
        ForEach-Object { $_.IPv4Address.IPAddress } |
        Where-Object { $_ -and $_ -notmatch '^127\.' } |
        Select-Object -Unique
} catch {}

Write-Host ''
Write-Host '四级提分台 · 本地服务' -ForegroundColor Green
Write-Host "桌面：http://127.0.0.1:$Port/" -ForegroundColor Cyan
if ($lan) {
    foreach ($ip in $lan) {
        Write-Host "手机（同一 Wi-Fi）：http://${ip}:$Port/" -ForegroundColor Cyan
    }
} else {
    Write-Host '没有检测到局域网 IPv4 地址；手机访问前请确认电脑已联网。' -ForegroundColor DarkGray
}
Write-Host ''
Write-Host '首次从手机访问时，Windows 防火墙可能弹窗，请允许“专用网络”。'
Write-Host '按 Ctrl+C 停止服务。'
Write-Host ''

if (-not $NoBrowser) {
    Start-Process "http://127.0.0.1:$Port/"
}

& $python.Source -m http.server $Port --bind 0.0.0.0
