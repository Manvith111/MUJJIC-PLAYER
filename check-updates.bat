@echo off
setlocal enabledelayedexpansion
title Terminal Music — Dependency Checker

:: ── Usage ──────────────────────────────────────────────────────────────────
::   check-updates.bat            check only (default)
::   check-updates.bat --update   check + update everything
:: ───────────────────────────────────────────────────────────────────────────

set "ROOT=%~dp0"
set "DO_UPDATE=0"
if "%~1"=="--update" set "DO_UPDATE=1"

echo.
echo ============================================================
echo   TERMINAL MUSIC — Dependency Checker
echo ============================================================

:: ── Live versions from running backend ─────────────────────────────────────
echo.
echo   Checking backend at http://127.0.0.1:8000 ...
curl -s --max-time 2 http://127.0.0.1:8000/versions >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo   Backend is running. Live versions:
    curl -s --max-time 2 http://127.0.0.1:8000/versions
    echo.
) else (
    echo   Backend not running (skipped).
)

:: ── Python packages ────────────────────────────────────────────────────────
echo.
echo ============================================================
echo   PYTHON PACKAGES (server/requirements.txt)
echo ============================================================

if not exist "%ROOT%.venv\Scripts\python.exe" (
    echo   [!!] No .venv found. Run start.bat first to create it.
    goto :node_check
)

echo.
echo   Package                Installed          Latest             Status
echo   -------                ---------          ------             ------

set "OUTDATED_COUNT=0"

:: Read requirements.txt line by line
for /f "usebackq tokens=*" %%L in ("%ROOT%server\requirements.txt") do (
    set "LINE=%%L"
    set "LINE=!LINE: =!"

    :: Skip empty lines and comments
    if not "!LINE!"=="" if not "!LINE:~0,1!"=="#" (
        :: Extract package name (everything before >=, ==, etc.)
        for /f "tokens=1 delims>=<!~" %%A in ("!LINE!") do set "PKG_NAME=%%A"
        :: Strip trailing bracket parts like [standard]
        for /f "tokens=1 delims=[" %%B in ("!PKG_NAME!") do set "PKG_NAME=%%B"

        :: Get installed version
        for /f "tokens=*" %%V in ('"%ROOT%.venv\Scripts\python.exe" -c "import importlib.metadata; print(importlib.metadata.version('!PKG_NAME!'))" 2^>nul') do set "INSTALLED=%%V"
        if "!INSTALLED!"=="" set "INSTALLED=not installed"

        :: Get latest version from PyPI
        for /f "tokens=*" %%W in ('curl -s --max-time 5 https://pypi.org/pypi/!PKG_NAME!/json 2^>nul ^| "%ROOT%.venv\Scripts\python.exe" -c "import sys,json; print(json.load(sys.stdin)[\"info\"][\"version\"])"" 2^>nul') do set "LATEST=%%W"
        if "!LATEST!"=="" set "LATEST=?"

        :: Compare versions
        set "STATUS=outdated"
        if "!INSTALLED!"=="!LATEST!" set "STATUS=ok"
        if "!INSTALLED!"=="not installed" set "STATUS=missing"
        if "!LATEST!"=="?" set "STATUS=unknown"

        :: Format output
        set "LABEL=  !PKG_NAME!                "
        set "LABEL=!LABEL:~0,23!"
        set "INST_PAD=!INSTALLED!                    "
        set "INST_PAD=!INST_PAD:~0,19!"
        set "LAT_PAD=!LATEST!                    "
        set "LAT_PAD=!LAT_PAD:~0,19!"

        if "!STATUS!"=="ok" (
            echo   [ok] !LABEL!!INST_PAD!!LAT_PAD!up to date
        ) else if "!STATUS!"=="missing" (
            echo   [!!] !LABEL!not installed             !LAT_PAD!MISSING
            set /a OUTDATED_COUNT+=1
        ) else if "!STATUS!"=="unknown" (
            echo   [??] !LABEL!!INST_PAD!cannot check
        ) else (
            echo   [!!] !LABEL!!INST_PAD!!LAT_PAD!UPDATE AVAILABLE
            set /a OUTDATED_COUNT+=1
            :: Store for update
            set "OUTDATED=!OUTDATED! !PKG_NAME!"
        )
    )
)

echo.

if %DO_UPDATE% EQU 1 (
    if !OUTDATED_COUNT! GTR 0 (
        echo   Updating !OUTDATED_COUNT! Python package(s^)...
        for %%P in (!OUTDATED!) do (
            echo     pip install --upgrade %%P
            "%ROOT%.venv\Scripts\python.exe" -m pip install --upgrade %%P -q 2>nul
        )
        echo   Done.
    ) else (
        echo   All Python packages are up to date.
    )
) else (
    if !OUTDATED_COUNT! GTR 0 (
        echo   !OUTDATED_COUNT! package(s^) have updates. Run with --update to upgrade.
    ) else (
        echo   All Python packages are up to date.
    )
)

:: ── Node packages ──────────────────────────────────────────────────────────
:node_check
echo.
echo ============================================================
echo   NODE PACKAGES (app/package.json)
echo ============================================================

if not exist "%ROOT%app\node_modules" (
    echo   [!!] node_modules not found. Run npm install first.
    goto :done
)

echo.
cd /d "%ROOT%app"
npm outdated 2>nul
set "NPM_EXIT=%ERRORLEVEL%"
cd /d "%ROOT%"

if %NPM_EXIT% EQU 0 (
    echo.
    echo   All Node packages are up to date.
) else (
    echo.
    if %DO_UPDATE% EQU 1 (
        echo   Updating all Node packages...
        cd /d "%ROOT%app"
        npm update
        cd /d "%ROOT%"
        echo   Done.
    ) else (
        echo   Some packages have updates. Run with --update to upgrade.
    )
)

:done
echo.
echo ============================================================
echo.
pause
