@echo off
REM ===========================================================
REM  极简会议系统 一键启动（双击此文件即可）
REM  实际逻辑在 start-meeting.ps1
REM ===========================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-meeting.ps1"
echo.
echo 按任意键关闭本窗口（服务已在后台运行）...
pause >nul
