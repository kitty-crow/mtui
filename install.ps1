param(
    [switch]$NoLaunch
)

$ErrorActionPreference = 'Stop'
$repo = 'https://github.com/kitty-crow/mtui.git'
$sourcePath = Join-Path $HOME 'mtui-src'
$destination = Join-Path $HOME 'mTUI'
$minimumBun = [version]'1.4.4'
$tempSource = $null

function Find-Executable([string[]]$Names) {
    foreach ($name in $Names) {
        $command = Get-Command $name -ErrorAction SilentlyContinue
        if ($null -ne $command) { return $command.Source }
    }
    return $null
}

function Find-SupportedBun {
    $candidates = @(
        (Join-Path $HOME '.bun\bin\bun.exe'),
        (Join-Path $env:APPDATA 'npm\bun.cmd'),
        (Find-Executable @('bun.exe', 'bun.cmd', 'bun'))
    )
    foreach ($candidate in $candidates) {
        if (-not $candidate -or -not (Test-Path -LiteralPath $candidate)) { continue }
        try {
            $reported = & $candidate --version 2>$null
            if ($LASTEXITCODE -ne 0) { continue }
            if ($reported -match '^(\d+\.\d+\.\d+)') {
                if ([version]$Matches[1] -ge $minimumBun) { return $candidate }
            }
        } catch {
            continue
        }
    }
    return $null
}

function Is-MtuiSource([string]$Directory) {
    if (-not $Directory) { return $false }
    $manifest = Join-Path $Directory 'package.json'
    if (-not (Test-Path -LiteralPath $manifest)) { return $false }
    try { return (Get-Content -LiteralPath $manifest -Raw | ConvertFrom-Json).name -eq '@kitty-crow/mtui' }
    catch { return $false }
}

function Install-Dependencies([string]$Bun, [string]$Npm) {
    $compiler = Join-Path (Get-Location).Path 'node_modules\typescript\lib\tsc.js'

    Write-Host 'Installing dependencies with Bun...'
    & $Bun install --frozen-lockfile
    if ($LASTEXITCODE -eq 0 -and (Test-Path -LiteralPath $compiler)) { return }

    Write-Warning 'Incomplete Bun installation. Retrying without hardlinks and forcing package refresh.'
    Remove-Item node_modules -Recurse -Force -ErrorAction SilentlyContinue
    & $Bun install --frozen-lockfile --backend copy --force
    if ($LASTEXITCODE -eq 0 -and (Test-Path -LiteralPath $compiler)) { return }

    if ($Npm) {
        Write-Warning 'Bun installation is still incomplete. Falling back to npm.'
        Remove-Item node_modules -Recurse -Force -ErrorAction SilentlyContinue
        & $Npm install --no-save --package-lock=false --include=dev
        if ($LASTEXITCODE -eq 0 -and (Test-Path -LiteralPath $compiler)) { return }
    }

    throw 'Dependencies could not be installed or TypeScript is incomplete.'
}

try {
    $git = Find-Executable @('git.exe', 'git')
    $npm = Find-Executable @('npm.cmd', 'npm.exe', 'npm')
    $source = $null

    # A locally checked-out installer may run directly from any checkout location.
    if (Is-MtuiSource $PSScriptRoot) {
        $source = $PSScriptRoot
    } elseif (Is-MtuiSource $sourcePath) {
        $source = $sourcePath
    }

    if ($source -and $git -and (Test-Path (Join-Path $source '.git'))) {
        Write-Host "Updating $source..."
        & $git -C $source pull --ff-only
        if ($LASTEXITCODE -ne 0) { throw 'Git update failed. Local changes were left intact.' }
    } elseif (-not $source -and $git -and -not (Test-Path $sourcePath)) {
        Write-Host "Cloning mTUI to $sourcePath..."
        & $git clone $repo $sourcePath
        if ($LASTEXITCODE -ne 0) { throw 'Git clone failed.' }
        $source = $sourcePath
    }

    # A source archive also supports machines without Git.
    if (-not $source -or ($source -eq $sourcePath -and -not $git -and (Test-Path (Join-Path $source '.git')))) {
        Write-Host 'Downloading mTUI source archive...'
        $tempSource = Join-Path ([IO.Path]::GetTempPath()) ("mtui-install-" + [guid]::NewGuid().ToString('N'))
        New-Item -ItemType Directory -Path $tempSource | Out-Null
        $archive = Join-Path $tempSource 'source.zip'
        Invoke-WebRequest -Uri 'https://github.com/kitty-crow/mtui/archive/refs/heads/main.zip' -OutFile $archive
        Expand-Archive -LiteralPath $archive -DestinationPath $tempSource
        $source = Join-Path $tempSource 'mtui-main'
    }

    if (-not (Is-MtuiSource $source)) { throw 'mTUI source was not found.' }
    Set-Location $source

    $bun = Find-SupportedBun
    if (-not $bun -and $npm) {
        Write-Host 'Installing a supported Bun version with npm...'
        & $npm install --global bun
        if ($LASTEXITCODE -ne 0) { Write-Warning 'npm could not install Bun; trying the official installer.' }
        $bun = Find-SupportedBun
    }
    if (-not $bun) {
        Write-Host 'Installing Bun using the official installer...'
        Invoke-Expression (Invoke-RestMethod -Uri 'https://bun.sh/install.ps1')
        $bun = Find-SupportedBun
    }
    if (-not $bun) { throw 'A supported Bun executable could not be installed (requires 1.4.4 or newer).' }

    Write-Host "Using Bun $(& $bun --version)"
    Install-Dependencies $bun $npm

    # The standard build validates, prepares host sensors and verifies the executable.
    Write-Host 'Building mTUI and setting up hardware sensors...'
    & $bun run build
    if ($LASTEXITCODE -ne 0) { throw 'mTUI build failed.' }

    $binary = Join-Path $source 'dist\mtui.exe'
    if (-not (Test-Path -LiteralPath $binary)) { throw 'Built executable not found.' }
    New-Item -ItemType Directory -Path $destination -Force | Out-Null
    $installed = Join-Path $destination 'mtui.exe'
    Copy-Item -LiteralPath $binary -Destination $installed -Force
    Write-Host "Installed mTUI: $installed"

    if (-not $NoLaunch) {
        Set-Location $destination
        & $installed
        if ($LASTEXITCODE -ne 0) { throw 'mTUI exited with an error.' }
    }
}
finally {
    if ($tempSource -and (Test-Path -LiteralPath $tempSource)) {
        Set-Location $HOME
        Remove-Item -LiteralPath $tempSource -Recurse -Force -ErrorAction SilentlyContinue
    }
}
