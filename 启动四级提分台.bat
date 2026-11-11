@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p = Get-NetTCPConnection -LocalPort 8790 -State Listen -ErrorAction SilentlyContinue; if (-not $p) { Start-Process python -ArgumentList '-m','http.server','8790','--bind','0.0.0.0' -WorkingDirectory '%~dp0' -WindowStyle Hidden; Start-Sleep -Milliseconds 1000 }; Start-Process 'http://127.0.0.1:8790/?v=5.12.0'"
endlocal
