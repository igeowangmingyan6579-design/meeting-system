# ============================================================
#  极简会议系统 · 一键启动 / 重启脚本
#  用途：机器重启后或服务挂掉时，双击本脚本即可恢复会议服务
#  作者：不言（阿布）  最后更新：2026-07-10
# ============================================================
#  说明：
#   - 自动停掉旧的 8080 监听进程，再用最新代码重启
#   - 自动把用户数据目录指向可写工作区（避开 deploy 源码目录的写入限制）
#   - 日志输出到工作区 tmp-peerjs，方便排查
# ============================================================

$ErrorActionPreference = "Continue"

# —— 路径配置（如目录搬家，改这里）——
$Deploy  = "C:\Users\igeowang\WorkBuddy\2026-07-07-00-00-56\meeting-system-app\deploy"
$Node    = "C:\Users\igeowang\.workbuddy\binaries\node\versions\22.22.2\node.exe"
$DataDir = "C:\Users\igeowang\WorkBuddy\2026-06-17-14-06-08\meeting-data"
$LogDir  = "C:\Users\igeowang\WorkBuddy\2026-06-17-14-06-08\tmp-peerjs"
$Port    = 8080

Write-Host "==== 极简会议系统 · 启动中 ====" -ForegroundColor Cyan

# 1) 数据目录（用户账号存这里，重启不丢）
$env:MEETING_DATA_DIR = $DataDir
if (!(Test-Path $DataDir)) { New-Item -ItemType Directory -Path $DataDir -Force | Out-Null }
if (!(Test-Path $LogDir))  { New-Item -ItemType Directory -Path $LogDir  -Force | Out-Null }
Write-Host "数据目录: $DataDir"

# 2) 停掉旧的 8080 监听进程
$conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
$pids  = $conns | Select-Object -ExpandProperty OwningProcess -Unique
if ($pids) {
  foreach ($p in $pids) {
    try { Stop-Process -Id $p -Force -ErrorAction Stop; Write-Host "已停止旧进程 PID $p" -ForegroundColor Yellow }
    catch { Write-Host "停止 PID $p 失败: $($_.Exception.Message)" -ForegroundColor Red }
  }
  Start-Sleep -Seconds 1
} else {
  Write-Host "未发现占用 $Port 的旧进程（首次启动）"
}

# 3) 启动新服务（后台、隐藏窗口）
$outLog = Join-Path $LogDir "server.out.log"
$errLog = Join-Path $LogDir "server.err.log"
$proc = Start-Process -FilePath $Node -ArgumentList "server.js" -WorkingDirectory $Deploy `
          -WindowStyle Hidden -RedirectStandardOutput $outLog -RedirectStandardError $errLog -PassThru
Write-Host "新服务已启动 PID $($proc.Id)" -ForegroundColor Green
Start-Sleep -Seconds 3

# 4) 健康检查
$listening = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($listening) {
  Write-Host "✅ 服务已就绪：http://localhost:$Port" -ForegroundColor Green
  Write-Host "   信令: http://localhost:$Port/peerjs  |  API: /api/login /api/register" -ForegroundColor Gray
} else {
  Write-Host "❌ 启动失败，请查看日志: $errLog" -ForegroundColor Red
  if (Test-Path $errLog) { Get-Content $errLog -Tail 10 }
}

Write-Host "==== 完成 ====" -ForegroundColor Cyan
Write-Host "提示：对外访问还需 Cloudflare 隧道在跑。永久稳定域名方案见「运维手册.md」。" -ForegroundColor DarkGray
