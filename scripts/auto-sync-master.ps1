param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [string]$Remote = 'origin',
  [string]$Branch = 'master',
  [switch]$VerboseLog
)

$ErrorActionPreference = 'Stop'

function Write-Log {
  param([string]$Message)
  $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  $line = "[$timestamp] $Message"
  Write-Output $line
  try {
    Add-Content -Path $script:LogPath -Value $line
  } catch {
    Write-Output "[$timestamp] WARN: Failed to write log: $($_.Exception.Message)"
  }
}

function Invoke-Git {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Args,
    [switch]$IgnoreExitCode
  )

  $rawOutput = & git @Args 2>&1
  $exitCode = $LASTEXITCODE
  $output = @($rawOutput | ForEach-Object { "$_" })

  if ($VerboseLog -and $output) {
    foreach ($line in $output) {
      Write-Log "git $($Args -join ' ') :: $line"
    }
  }

  if (-not $IgnoreExitCode -and $exitCode -ne 0) {
    $text = ($output | Out-String).Trim()
    throw "git $($Args -join ' ') failed ($exitCode): $text"
  }

  return [pscustomobject]@{
    ExitCode = $exitCode
    Output = $output
  }
}

function Get-FirstOutputText {
  param($Result)
  $values = @($Result.Output | ForEach-Object { "$_" })
  return ($values | Out-String).Trim().Split([Environment]::NewLine)[0].Trim()
}

Push-Location $RepoRoot
try {
  $gitDir = Get-FirstOutputText (Invoke-Git -Args @('rev-parse', '--git-dir'))
  if (-not [System.IO.Path]::IsPathRooted($gitDir)) {
    $gitDir = Join-Path $RepoRoot $gitDir
  }

  $logDir = Join-Path $gitDir 'autoupdate'
  New-Item -ItemType Directory -Force -Path $logDir | Out-Null
  $script:LogPath = Join-Path $logDir 'auto-sync-master.log'

  Write-Log "Starting auto-sync for $RepoRoot"

  $fetch = Invoke-Git -Args @('fetch', '--prune', $Remote)
  Write-Log "Fetched $Remote"

  $currentBranch = Get-FirstOutputText (Invoke-Git -Args @('branch', '--show-current'))
  $trackedDirty = $false
  $stagedDirty = $false

  & git diff --quiet
  if ($LASTEXITCODE -ne 0) { $trackedDirty = $true }

  & git diff --cached --quiet
  if ($LASTEXITCODE -ne 0) { $stagedDirty = $true }

  $trackedDirtyState = $trackedDirty -or $stagedDirty

  if ($currentBranch -eq $Branch) {
    if ($trackedDirtyState) {
      Write-Log "Skipped fast-forward: checked-out branch '$Branch' has tracked changes."
      exit 0
    }

    $pull = Invoke-Git -Args @('pull', '--ff-only', $Remote, $Branch)
    Write-Log "Fast-forwarded checked-out '$Branch' to $Remote/$Branch"
    exit 0
  }

  $remoteRef = "refs/remotes/$Remote/$Branch"
  $localRef = "refs/heads/$Branch"
  $remoteSha = Get-FirstOutputText (Invoke-Git -Args @('rev-parse', $remoteRef))

  $localExists = (Invoke-Git -Args @('show-ref', '--verify', '--quiet', $localRef) -IgnoreExitCode).ExitCode -eq 0
  if ($localExists) {
    $localSha = Get-FirstOutputText (Invoke-Git -Args @('rev-parse', $localRef))
    if ($localSha -eq $remoteSha) {
      Write-Log "Local '$Branch' already matches $Remote/$Branch while on '$currentBranch'."
      exit 0
    }
  }

  Invoke-Git -Args @('update-ref', $localRef, $remoteSha)
  Write-Log "Updated local '$Branch' ref to $remoteSha while staying on '$currentBranch'."
  exit 0
}
catch {
  $message = $_.Exception.Message
  if (-not $script:LogPath) {
    Write-Output "ERROR: $message"
  } else {
    Write-Log "ERROR: $message"
  }
  exit 1
}
finally {
  Pop-Location
}
