@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 傩 · 梵净入梦

echo.
echo ============================================================
echo   傩 · 梵净入梦
echo   每次启动使用新端口 + 禁止缓存
echo ============================================================
echo.

where python >nul 2>nul
if %errorlevel%==0 (
    python server.py
    goto :eof
)

where py >nul 2>nul
if %errorlevel%==0 (
    py server.py
    goto :eof
)

for /f "delims=" %%P in ('dir /b /s "%LocalAppData%\Programs\Python\python.exe" 2^>nul') do (
    "%%P" server.py
    goto :eof
)

echo [警告] 没找到 Python。
echo 将直接打开 index.html，但推荐安装 Python 后再运行 start.bat。
start "" "%~dp0index.html?build=20260828-offline-file-v5"
