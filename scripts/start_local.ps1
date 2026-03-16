# ── wa-dino-bot Local Startup Script ──
# Starts all services in separate PowerShell windows

Write-Host "Starting wa-dino-bot locally..." -ForegroundColor Cyan
Write-Host ""

# ── 0. Kill any stale processes on our ports ──
$ports = @(3000, 8001, 8002, 5173)
foreach ($port in $ports) {
    $connections = netstat -ano | Select-String ":$port\s" | ForEach-Object {
        ($_ -split '\s+')[-1]
    } | Sort-Object -Unique | Where-Object { $_ -match '^\d+$' -and $_ -ne '0' }

    foreach ($pid in $connections) {
        Write-Host "  Killing stale process $pid on port $port..." -ForegroundColor DarkYellow
        taskkill /PID $pid /F 2>$null | Out-Null
    }
}
Write-Host "Ports cleared." -ForegroundColor Green
Write-Host ""

# ── 1. Classifier Service (port 8002) ──
Write-Host "Starting Classifier Service (port 8002)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "Set-Location 'd:\oneforall\classifier_service'; & '.\.venv\Scripts\python.exe' app.py"
)

# ── 2. LLM Service (port 8001) ──
Write-Host "Starting LLM Service (port 8001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "Set-Location 'd:\oneforall\llm_service'; & '.\.venv\Scripts\python.exe' app.py"
)

# ── 3. Backend (port 3000) ──
Write-Host "Starting Backend (port 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "Set-Location 'd:\oneforall\backend'; npm run dev"
)

# ── 4. Admin UI (port 5173) ──
Write-Host "Starting Admin UI (port 5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "Set-Location 'd:\oneforall\admin-ui'; npm run dev"
)

Write-Host ""
Write-Host "All services started!" -ForegroundColor Green
Write-Host ""
Write-Host "Service URLs:" -ForegroundColor Cyan
Write-Host "   Backend:    http://localhost:3000"
Write-Host "   LLM:        http://localhost:8001"
Write-Host "   Classifier:  http://localhost:8002"
Write-Host "   Admin UI:    http://localhost:5173"
Write-Host ""
Write-Host "Scan the QR code in the Backend terminal to connect WhatsApp" -ForegroundColor Magenta
