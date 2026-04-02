#Requires -Version 5.1
<#
.SYNOPSIS
    redstone-code installer for Windows
.DESCRIPTION
    Installs redstone-code on native Windows.
    Usage: irm https://raw.githubusercontent.com/veedy-dev/redstone-code/main/install.ps1 | iex
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Repo       = 'https://github.com/veedy-dev/redstone-code.git'
$InstallDir = Join-Path $env:USERPROFILE 'redstone-code'
$BinDir     = Join-Path $env:USERPROFILE '.local\bin'
$BunMinVer  = [version]'1.3.11'

# --- Helpers ---------------------------------------------------------------

function Write-Info  { param([string]$Msg) Write-Host "[*] $Msg" -ForegroundColor Cyan }
function Write-Ok    { param([string]$Msg) Write-Host "[+] $Msg" -ForegroundColor Green }
function Write-Warn  { param([string]$Msg) Write-Host "[!] $Msg" -ForegroundColor Yellow }
function Write-Fail  { param([string]$Msg) Write-Host "[x] $Msg" -ForegroundColor Red; exit 1 }

function Show-Header {
    Write-Host ''
    Write-Host '                _     _                                      _'             -ForegroundColor Cyan
    Write-Host '  _ __ ___  __| |___| |_ ___  _ __   ___        ___ ___   __| | ___'        -ForegroundColor Cyan
    Write-Host ' | ''__/ _ \/ _` / __| __/ _ \| ''_ \ / _ \_____ / __/ _ \ / _` |/ _ \'     -ForegroundColor Cyan
    Write-Host ' | | |  __/ (_| \__ \ || (_) | | | |  __/_____| (_| (_) | (_| |  __/'       -ForegroundColor Cyan
    Write-Host ' |_|  \___|\__,_|___/\__\___/|_| |_|\___|      \___\___/ \__,_|\___|'       -ForegroundColor Cyan
    Write-Host ''
    Write-Host '  A cleaner Claude Code' -ForegroundColor DarkGray
    Write-Host ''
}

# --- System checks ---------------------------------------------------------

function Test-Git {
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        Write-Fail 'git is not installed. Install Git for Windows: https://git-scm.com/downloads/win'
    }
    $v = git --version 2>&1
    Write-Ok "git: $v"
}

function Test-Bun {
    $bun = Get-Command bun -ErrorAction SilentlyContinue
    if ($bun) {
        $raw = (bun --version 2>&1).ToString().Trim()
        try {
            $ver = [version]$raw
            if ($ver -ge $BunMinVer) {
                Write-Ok "bun: v$raw"
                return
            }
            Write-Warn "bun v$raw found but v$BunMinVer+ required. Upgrading..."
        } catch {
            Write-Warn "Could not parse bun version '$raw'. Reinstalling..."
        }
    } else {
        Write-Info 'bun not found. Installing...'
    }
    Install-Bun
}

function Install-Bun {
    Write-Info 'Installing bun via powershell...'
    irm bun.sh/install.ps1 | iex

    # Refresh PATH for this session
    $bunInstall = if ($env:BUN_INSTALL) { $env:BUN_INSTALL } else { Join-Path $env:USERPROFILE '.bun' }
    $bunBin = Join-Path $bunInstall 'bin'
    if ($env:PATH -notlike "*$bunBin*") {
        $env:PATH = "$bunBin;$env:PATH"
    }

    if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
        Write-Fail @"
bun installation succeeded but binary not found on PATH.
Add this to your environment: `$env:PATH += ";$bunBin"
Or restart your terminal.
"@
    }
    $v = (bun --version 2>&1).ToString().Trim()
    Write-Ok "bun: v$v (just installed)"
}

# --- Clone & build ---------------------------------------------------------

function Install-Repo {
    if (Test-Path $InstallDir) {
        Write-Warn "$InstallDir already exists"
        if (Test-Path (Join-Path $InstallDir '.git')) {
            Write-Info 'Pulling latest changes...'
            try {
                git -C $InstallDir pull --ff-only origin main 2>$null
            } catch {
                Write-Warn 'Pull failed, continuing with existing copy'
            }
        }
    } else {
        Write-Info 'Cloning repository...'
        git clone --depth 1 $Repo $InstallDir
        if (-not (Test-Path $InstallDir)) {
            Write-Fail "Clone failed. Check that the repository is accessible: $Repo"
        }
    }
    Write-Ok "Source: $InstallDir"
}

function Install-Deps {
    Write-Info 'Installing dependencies...'
    Push-Location $InstallDir
    try {
        try {
            bun install --frozen-lockfile 2>$null
        } catch {
            bun install
        }
        Write-Ok 'Dependencies installed'
    } finally {
        Pop-Location
    }
}

function Build-Binary {
    Write-Info 'Building redstone-code (all experimental features enabled)...'
    Push-Location $InstallDir
    try {
        bun run build:dev:full
        Write-Ok "Binary built: $InstallDir\cli-dev.exe"
    } finally {
        Pop-Location
    }
}

function Install-Binary {
    if (-not (Test-Path $BinDir)) {
        New-Item -ItemType Directory -Path $BinDir -Force | Out-Null
    }

    # Create a .cmd wrapper instead of a symlink (no elevation required)
    $wrapperPath = Join-Path $BinDir 'redstone-code.cmd'
    $binaryPath  = Join-Path $InstallDir 'cli-dev.exe'

    @"
@echo off
"$binaryPath" %*
"@ | Set-Content -Path $wrapperPath -Encoding ASCII

    Write-Ok "Wrapper: $wrapperPath"

    # Check PATH
    $userPath = [Environment]::GetEnvironmentVariable('PATH', 'User')
    if ($userPath -and $userPath.Split(';') -contains $BinDir) {
        Write-Ok "$BinDir is on your PATH"
    } else {
        Write-Warn "$BinDir is not on your PATH"
        Write-Host ''
        Write-Host '  To add it permanently, run:' -ForegroundColor Yellow
        Write-Host "    [Environment]::SetEnvironmentVariable('PATH', `"`$env:PATH;$BinDir`", 'User')" -ForegroundColor White
        Write-Host ''
        Write-Host '  Or add it via: Settings > System > About > Advanced system settings > Environment Variables' -ForegroundColor DarkGray
        Write-Host ''

        # Add to current session so the user can test immediately
        if ($env:PATH -notlike "*$BinDir*") {
            $env:PATH = "$env:PATH;$BinDir"
        }
    }
}

# --- Main ------------------------------------------------------------------

Show-Header
Write-Info 'Starting installation...'
Write-Host ''

Test-Git
Test-Bun
Write-Host ''

Install-Repo
Install-Deps
Build-Binary
Install-Binary

Write-Host ''
Write-Host '  Installation complete!' -ForegroundColor Green
Write-Host ''
Write-Host '  Run it:' -ForegroundColor White
Write-Host '    redstone-code                              # interactive REPL' -ForegroundColor Cyan
Write-Host '    redstone-code -p "your prompt"             # one-shot mode' -ForegroundColor Cyan
Write-Host ''
Write-Host '  Set your API key:' -ForegroundColor White
Write-Host '    $env:ANTHROPIC_API_KEY = "sk-ant-..."' -ForegroundColor Cyan
Write-Host ''
Write-Host '  Or log in with Claude.ai:' -ForegroundColor White
Write-Host '    redstone-code /login' -ForegroundColor Cyan
Write-Host ''
Write-Host "  Source: $InstallDir" -ForegroundColor DarkGray
Write-Host "  Binary: $InstallDir\cli-dev.exe" -ForegroundColor DarkGray
Write-Host "  Wrapper: $BinDir\redstone-code.cmd" -ForegroundColor DarkGray
Write-Host ''
