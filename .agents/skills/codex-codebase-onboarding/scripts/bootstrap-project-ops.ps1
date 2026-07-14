param(
  [string]$TargetProjectRoot = (Get-Location).Path,
  [switch]$Preview,
  [ValidateRange(0, 300)]
  [int]$LockTimeoutSeconds = 30
)

$ErrorActionPreference = "Stop"

$skillRoot = Split-Path -Parent $PSScriptRoot
$assetsRoot = Join-Path $skillRoot "assets\project-ops"
$manifestFile = Join-Path $assetsRoot "dong-skills.manifest.json"
$siblingSkillsRoot = Split-Path -Parent $skillRoot
$installedDongSkillsSourceMarker = Join-Path $siblingSkillsRoot ".dong-skills-source.json"
$defaultDongSkillsSourceMarker = Join-Path ([Environment]::GetFolderPath("UserProfile")) ".agents\skills\.dong-skills-source.json"
$sourceContext = Join-Path $assetsRoot ".codex-context"
$sourceCodex = Join-Path $assetsRoot ".codex"
$sourceCodexScripts = Join-Path $sourceCodex "scripts"
$sourceScripts = Join-Path $assetsRoot "scripts"
$sourceAgentsSnippet = Join-Path $assetsRoot "AGENTS.project-ops.snippet.md"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$utf8Strict = New-Object System.Text.UTF8Encoding($false, $true)

function Read-Utf8Text {
  param(
    [string]$File
  )

  return [System.IO.File]::ReadAllText($File, $utf8Strict)
}

function Get-Sha256 {
  param([string]$File)
  $stream = [System.IO.File]::OpenRead($File)
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    return (($sha.ComputeHash($stream) | ForEach-Object { $_.ToString("x2") }) -join "")
  } finally {
    $sha.Dispose()
    $stream.Dispose()
  }
}

function Get-TreeSha256 {
  param([string]$Directory)

  $root = ([System.IO.Path]::GetFullPath($Directory)).TrimEnd($trimChars)
  $entries = New-Object "System.Collections.Generic.List[string]"
  Get-ChildItem -LiteralPath $root -Recurse -File | ForEach-Object {
    $relative = $_.FullName.Substring($root.Length).TrimStart($trimChars).Replace('\', '/')
    $entries.Add("$relative`t$(Get-Sha256 -File $_.FullName)")
  }

  $sorted = $entries.ToArray()
  [Array]::Sort($sorted, [System.StringComparer]::Ordinal)
  $payload = if ($sorted.Count -gt 0) { ($sorted -join "`n") + "`n" } else { "" }
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    return (($sha.ComputeHash($utf8NoBom.GetBytes($payload)) | ForEach-Object { $_.ToString("x2") }) -join "")
  } finally {
    $sha.Dispose()
  }
}

function Assert-SourceMarkerReceipt {
  param(
    [object]$Marker,
    [string]$MarkerFile,
    [object]$Manifest
  )

  if ($Marker.schema -ne "dong-skills.source-install.v2") {
    throw "Dong Skills source marker schema is unsupported; reinstall Dong Skills globally: $MarkerFile"
  }
  if ($Marker.managed_by -ne "Dong Skills" -or !$Marker.source_repo -or
      [string]$Marker.distribution_id -notmatch "^[a-f0-9]{64}$" -or
      !$Marker.project_skill_trees) {
    throw "Dong Skills source marker is invalid: $MarkerFile"
  }

  $markerRoot = Resolve-PhysicalPath -PathValue (Split-Path -Parent $MarkerFile)
  if (!$Marker.global_skill_trees) {
    throw "Dong Skills source marker has no global skill receipt: $MarkerFile"
  }

  foreach ($name in @($Marker.global_skills)) {
    $property = $Marker.global_skill_trees.PSObject.Properties[$name]
    $skillDirectory = Join-Path $markerRoot $name
    if (!$property -or !(Test-Path -LiteralPath $skillDirectory) -or
        $property.Value -ne (Get-TreeSha256 -Directory $skillDirectory)) {
      throw "Dong Skills global entry skill differs from install receipt: $name"
    }
  }

  $sourceRepo = [string]$Marker.source_repo
  if (Test-Path -LiteralPath $sourceRepo) {
    $sourceManifest = Join-Path $sourceRepo "dong-skills.manifest.json"
    if (!(Test-Path -LiteralPath $sourceManifest) -or
        $Marker.source_manifest_sha256 -ne (Get-Sha256 -File $sourceManifest)) {
      throw "Dong Skills source marker manifest fingerprint is stale: $MarkerFile"
    }

    $sourceSkillsRoot = Join-Path $sourceRepo ".agents\skills"
    foreach ($name in @($Manifest.project_skills)) {
      $property = $Marker.project_skill_trees.PSObject.Properties[$name]
      $skillDirectory = Join-Path $sourceSkillsRoot $name
      if (!$property -or !(Test-Path -LiteralPath $skillDirectory) -or
          $property.Value -ne (Get-TreeSha256 -Directory $skillDirectory)) {
        throw "Dong Skills source project skill changed after global install: $name"
      }
    }

    $currentDistributionId = Get-DistributionId -RepositoryRoot $sourceRepo -Manifest $Manifest
    if ($currentDistributionId -ne [string]$Marker.distribution_id) {
      throw "Dong Skills source distribution changed after global install. Re-run install-windows.ps1 before bootstrapping projects."
    }
  }
}

function Write-Utf8Text {
  param(
    [string]$File,
    [string]$Content
  )

  [System.IO.File]::WriteAllText($File, $Content, $utf8NoBom)
}

if (!(Test-Path -LiteralPath $TargetProjectRoot)) {
  throw "Target project root not found: $TargetProjectRoot"
}

foreach ($required in @($manifestFile, $sourceContext, $sourceCodex, $sourceCodexScripts, $sourceScripts, $sourceAgentsSnippet)) {
  if (!(Test-Path -LiteralPath $required)) {
    throw "Missing bootstrap resource: $required"
  }
}

$trimChars = [char[]]@([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)

function Resolve-PhysicalPath {
  param([string]$PathValue)

  $full = [System.IO.Path]::GetFullPath($PathValue)
  $root = [System.IO.Path]::GetPathRoot($full)
  $current = $root.TrimEnd($trimChars)
  if (!$current) {
    $current = $root
  }
  $relative = $full.Substring($root.Length)
  foreach ($segment in @($relative -split '[\\/]' | Where-Object { $_ })) {
    $candidate = Join-Path $current $segment
    if (Test-Path -LiteralPath $candidate) {
      $item = Get-Item -LiteralPath $candidate -Force
      $target = @($item.Target | Where-Object { $_ }) | Select-Object -First 1
      if ($target) {
        if (![System.IO.Path]::IsPathRooted([string]$target)) {
          $target = Join-Path (Split-Path -Parent $candidate) ([string]$target)
        }
        $current = [System.IO.Path]::GetFullPath([string]$target).TrimEnd($trimChars)
      } else {
        $current = [System.IO.Path]::GetFullPath($candidate).TrimEnd($trimChars)
      }
    } else {
      $current = [System.IO.Path]::GetFullPath($candidate).TrimEnd($trimChars)
    }
  }
  return $current
}

function Get-DistributionId {
  param(
    [string]$RepositoryRoot,
    [object]$Manifest
  )

  $repoRoot = Resolve-PhysicalPath -PathValue $RepositoryRoot
  $repoManifest = Join-Path $repoRoot "dong-skills.manifest.json"
  $repoSkills = Join-Path $repoRoot ".agents\skills"
  $repoProjectOps = Join-Path $repoSkills "codex-codebase-onboarding\assets\project-ops"
  foreach ($required in @($repoManifest, $repoSkills, $repoProjectOps)) {
    if (!(Test-Path -LiteralPath $required)) {
      throw "Cannot compute Dong Skills distribution; missing source: $required"
    }
  }

  $entries = New-Object "System.Collections.Generic.List[string]"
  $entries.Add("manifest`t$(Get-Sha256 -File $repoManifest)")
  $entries.Add("project-ops`t$(Get-TreeSha256 -Directory $repoProjectOps)")
  foreach ($name in @($Manifest.project_skills | Sort-Object)) {
    $skillDirectory = Join-Path $repoSkills $name
    if (!(Test-Path -LiteralPath $skillDirectory)) {
      throw "Cannot compute Dong Skills distribution; missing project skill: $skillDirectory"
    }
    $entries.Add("project-skill/$name`t$(Get-TreeSha256 -Directory $skillDirectory)")
  }

  $payload = ($entries.ToArray() -join "`n") + "`n"
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    return (($sha.ComputeHash($utf8NoBom.GetBytes($payload)) | ForEach-Object { $_.ToString("x2") }) -join "")
  } finally {
    $sha.Dispose()
  }
}

function Assert-PathInside {
  param(
    [string]$Parent,
    [string]$Child
  )

  $parentFull = ([System.IO.Path]::GetFullPath($Parent)).TrimEnd($trimChars)
  $childFull = [System.IO.Path]::GetFullPath($Child)
  if (-not ($childFull.StartsWith($parentFull + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase) -or
      [System.String]::Equals($childFull.TrimEnd($trimChars), $parentFull, [System.StringComparison]::OrdinalIgnoreCase))) {
    throw "Refusing to modify path outside target root. Parent: $Parent Child: $Child"
  }
}

function Test-PathInsideAny {
  param(
    [string[]]$Parents,
    [string]$Child
  )

  $childFull = [System.IO.Path]::GetFullPath($Child)
  foreach ($parent in $Parents) {
    $parentFull = ([System.IO.Path]::GetFullPath($parent)).TrimEnd($trimChars)
    if ($childFull.StartsWith($parentFull + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase) -or
        [System.String]::Equals($childFull.TrimEnd($trimChars), $parentFull, [System.StringComparison]::OrdinalIgnoreCase)) {
      return $true
    }
  }
  return $false
}

function Get-NormalizedInstallResourcePaths {
  param([string[]]$ResourcePaths)

  return @($ResourcePaths | ForEach-Object {
    (Resolve-PhysicalPath -PathValue $_).Replace('\', '/').ToLowerInvariant()
  } | Sort-Object -Unique)
}

function Get-InstallLockPath {
  param([string]$ResourcePath)

  $normalized = (Resolve-PhysicalPath -PathValue $ResourcePath).Replace('\', '/').ToLowerInvariant()
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    $digest = (($sha.ComputeHash($utf8NoBom.GetBytes($normalized)) | ForEach-Object { $_.ToString("x2") }) -join "")
  } finally {
    $sha.Dispose()
  }
  return Join-Path ([System.IO.Path]::GetTempPath()) "dong-skills-install-locks\$digest.lock"
}

function Get-InstallTransactionJournalPath {
  param([string[]]$ResourcePaths)

  $normalized = Get-NormalizedInstallResourcePaths -ResourcePaths $ResourcePaths
  $payload = $normalized -join "`n"
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    $digest = (($sha.ComputeHash($utf8NoBom.GetBytes($payload)) | ForEach-Object { $_.ToString("x2") }) -join "")
  } finally {
    $sha.Dispose()
  }
  return Join-Path ([System.IO.Path]::GetTempPath()) "dong-skills-install-transactions\$digest.json"
}

function Enter-InstallLock {
  param(
    [string]$ResourcePath,
    [int]$TimeoutSeconds
  )

  $lockPath = Get-InstallLockPath -ResourcePath $ResourcePath
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $lockPath) | Out-Null
  $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
  while ($true) {
    try {
      $stream = [System.IO.File]::Open(
        $lockPath,
        [System.IO.FileMode]::OpenOrCreate,
        [System.IO.FileAccess]::ReadWrite,
        [System.IO.FileShare]::None
      )
      return [pscustomobject]@{ Path = $lockPath; Stream = $stream }
    } catch [System.IO.IOException] {
      if ([DateTime]::UtcNow -ge $deadline) {
        throw "Another Dong Skills install is already modifying this target. Lock: $lockPath"
      }
      Start-Sleep -Milliseconds 100
    }
  }
}

function Exit-InstallLock {
  param([object]$Lock)

  if (-not $Lock) {
    return
  }
  try {
    $Lock.Stream.Dispose()
  } finally {
    try {
      Remove-Item -LiteralPath $Lock.Path -Force -ErrorAction SilentlyContinue
    } catch {}
  }
}

function Write-InstallTransactionJournal {
  param([object]$Transaction)

  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Transaction.JournalFile) | Out-Null
  $payload = [ordered]@{
    schema = "dong-skills.install-transaction.v1"
    status = if ($Transaction.Status) { $Transaction.Status } else { "active" }
    backup_root = $Transaction.BackupRoot
    resource_paths = @($Transaction.ResourcePaths)
    entries = @($Transaction.Entries | ForEach-Object {
      [ordered]@{
        path = $_.Path
        existed = [bool]$_.Existed
        kind = $_.Kind
        backup = $_.Backup
      }
    })
  }
  Write-Utf8Text -File $Transaction.JournalFile -Content (($payload | ConvertTo-Json -Depth 10) + [Environment]::NewLine)
}

function New-InstallTransaction {
  param([string[]]$ResourcePaths)

  $journalFile = Get-InstallTransactionJournalPath -ResourcePaths $ResourcePaths
  if (Test-Path -LiteralPath $journalFile) {
    throw "A pending Dong Skills install transaction must be recovered first: $journalFile"
  }
  $transactionRoot = Split-Path -Parent $journalFile
  $backupRoot = Join-Path $transactionRoot ("backup-" + [guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
  $transaction = [pscustomobject]@{
    Status = "active"
    BackupRoot = $backupRoot
    JournalFile = $journalFile
    ResourcePaths = Get-NormalizedInstallResourcePaths -ResourcePaths $ResourcePaths
    Entries = New-Object "System.Collections.Generic.List[object]"
  }
  Write-InstallTransactionJournal -Transaction $transaction
  return $transaction
}

function Add-InstallTransactionPath {
  param(
    [object]$Transaction,
    [string]$Path
  )

  $fullPath = [System.IO.Path]::GetFullPath($Path)
  foreach ($entry in $Transaction.Entries) {
    if ([System.String]::Equals($entry.Path, $fullPath, [System.StringComparison]::OrdinalIgnoreCase)) {
      return
    }
  }

  $exists = Test-Path -LiteralPath $fullPath
  $kind = "missing"
  $backup = Join-Path $Transaction.BackupRoot ([string]$Transaction.Entries.Count)
  if ($exists) {
    $item = Get-Item -LiteralPath $fullPath -Force
    $kind = if ($item.PSIsContainer) { "directory" } else { "file" }
    Copy-Item -LiteralPath $fullPath -Destination $backup -Recurse -Force
  }
  $Transaction.Entries.Add([pscustomobject]@{
    Path = $fullPath
    Existed = $exists
    Kind = $kind
    Backup = $backup
  })
  Write-InstallTransactionJournal -Transaction $Transaction
}

function Read-InstallTransactionJournal {
  param([string[]]$ResourcePaths)

  $journalFile = Get-InstallTransactionJournalPath -ResourcePaths $ResourcePaths
  if (!(Test-Path -LiteralPath $journalFile)) {
    return $null
  }
  try {
    $data = Read-Utf8Text -File $journalFile | ConvertFrom-Json
  } catch {
    throw "Pending Dong Skills install journal is unreadable; preserve it for manual recovery: $journalFile"
  }
  if ($data.schema -ne "dong-skills.install-transaction.v1") {
    throw "Pending Dong Skills install journal has an unsupported schema: $journalFile"
  }
  $status = if ($data.PSObject.Properties.Name -contains "status") { [string]$data.status } else { "active" }
  if ($status -notin @("active", "closed")) {
    throw "Pending Dong Skills install journal has an unsupported status: $journalFile"
  }
  $expectedResources = Get-NormalizedInstallResourcePaths -ResourcePaths $ResourcePaths
  $journalResources = Get-NormalizedInstallResourcePaths -ResourcePaths @($data.resource_paths)
  if (($expectedResources -join "`n") -ne ($journalResources -join "`n")) {
    throw "Pending Dong Skills install journal targets different resources: $journalFile"
  }
  $backupRoot = [System.IO.Path]::GetFullPath([string]$data.backup_root)
  $transactionRoot = Split-Path -Parent $journalFile
  Assert-PathInside -Parent $transactionRoot -Child $backupRoot
  if ($status -eq "active" -and !(Test-Path -LiteralPath $backupRoot)) {
    throw "Pending Dong Skills install backup is missing: $backupRoot"
  }
  $entries = @($data.entries)
  foreach ($entry in $entries) {
    if (!(Test-PathInsideAny -Parents $expectedResources -Child ([string]$entry.path))) {
      throw "Pending Dong Skills install journal contains a target outside managed resources: $($entry.path)"
    }
    Assert-PathInside -Parent $backupRoot -Child ([string]$entry.backup)
    if ($status -eq "active" -and [bool]$entry.existed -and !(Test-Path -LiteralPath ([string]$entry.backup))) {
      throw "Pending Dong Skills install backup entry is missing: $($entry.backup)"
    }
  }
  return [pscustomobject]@{
    Status = $status
    BackupRoot = $backupRoot
    JournalFile = $journalFile
    ResourcePaths = $expectedResources
    Entries = $entries
  }
}

function Restore-InstallTransaction {
  param([object]$Transaction)

  for ($index = $Transaction.Entries.Count - 1; $index -ge 0; $index--) {
    $entry = $Transaction.Entries[$index]
    if (Test-Path -LiteralPath $entry.Path) {
      Remove-Item -LiteralPath $entry.Path -Recurse -Force
    }
    if ($entry.Existed) {
      $parent = Split-Path -Parent $entry.Path
      if ($parent) {
        New-Item -ItemType Directory -Force -Path $parent | Out-Null
      }
      Copy-Item -LiteralPath $entry.Backup -Destination $entry.Path -Recurse -Force
    }
  }
}

function Close-InstallTransaction {
  param([object]$Transaction)

  if (-not $Transaction) {
    return
  }
  if ($Transaction.Status -ne "closed") {
    $Transaction.Status = "closed"
    Write-InstallTransactionJournal -Transaction $Transaction
  }
  if (Test-Path -LiteralPath $Transaction.BackupRoot) {
    Remove-Item -LiteralPath $Transaction.BackupRoot -Recurse -Force
  }
  if ($Transaction.JournalFile -and (Test-Path -LiteralPath $Transaction.JournalFile)) {
    Remove-Item -LiteralPath $Transaction.JournalFile -Force
  }
}

function Recover-PendingInstallTransaction {
  param([string[]]$ResourcePaths)

  $transaction = Read-InstallTransactionJournal -ResourcePaths $ResourcePaths
  if (-not $transaction) {
    return
  }
  if ($transaction.Status -eq "closed") {
    Write-Host "Completing interrupted Dong Skills install cleanup: $($transaction.JournalFile)"
    Close-InstallTransaction -Transaction $transaction
    return
  }
  Write-Host "Recovering interrupted Dong Skills install transaction: $($transaction.JournalFile)"
  Restore-InstallTransaction -Transaction $transaction
  Close-InstallTransaction -Transaction $transaction
}

function Repair-InterruptedSkillDirectory {
  param(
    [string]$DestinationRoot,
    [string]$Name
  )

  if (!(Test-Path -LiteralPath $DestinationRoot)) {
    return
  }
  $target = Join-Path $DestinationRoot $Name
  $backups = @(Get-ChildItem -LiteralPath $DestinationRoot -Force -Directory | Where-Object {
    $_.Name -like ".$Name.previous-*"
  })
  $staging = @(Get-ChildItem -LiteralPath $DestinationRoot -Force -Directory | Where-Object {
    $_.Name -like ".$Name.staging-*"
  })
  if ($backups.Count -eq 0 -and $staging.Count -eq 0) {
    return
  }
  if ((Test-Path -LiteralPath $target) -and -not (Test-DongSkillDirectory -SkillDirectory $target -ExpectedName $Name)) {
    throw "Refusing to repair interrupted install over non-Dong skill directory: $target"
  }
  if (!(Test-Path -LiteralPath $target) -and $backups.Count -gt 1) {
    throw "Multiple interrupted Dong Skills backups require manual review for $Name in $DestinationRoot"
  }
  if (!(Test-Path -LiteralPath $target) -and $backups.Count -eq 1) {
    if (-not (Test-DongSkillDirectory -SkillDirectory $backups[0].FullName -ExpectedName $Name)) {
      throw "Interrupted Dong Skills backup is not recognized: $($backups[0].FullName)"
    }
    Move-Item -LiteralPath $backups[0].FullName -Destination $target
    $backups = @()
  }
  foreach ($artifact in @($backups + $staging)) {
    if (-not (Test-DongSkillDirectory -SkillDirectory $artifact.FullName -ExpectedName $Name)) {
      throw "Interrupted Dong Skills install artifact is not recognized: $($artifact.FullName)"
    }
    Remove-Item -LiteralPath $artifact.FullName -Recurse -Force
  }
}

function Read-DongSkillsManifest {
  param(
    [string]$File
  )

  $manifest = Read-Utf8Text -File $File | ConvertFrom-Json
  foreach ($field in @("global_skills", "project_skills")) {
    if (-not ($manifest.PSObject.Properties.Name -contains $field)) {
      throw "Dong Skills manifest missing field: $field"
    }
  }
  if (-not ($manifest.PSObject.Properties.Name -contains "global_bootstrap_skills")) {
    $manifest | Add-Member -MemberType NoteProperty -Name "global_bootstrap_skills" -Value @($manifest.global_skills)
  }
  return $manifest
}

function Test-DongSkillDirectory {
  param(
    [string]$SkillDirectory,
    [string]$ExpectedName
  )

  if (!(Test-Path -LiteralPath $SkillDirectory)) {
    return $false
  }

  $marker = Join-Path $SkillDirectory ".dong-skill-managed.json"
  if (Test-Path -LiteralPath $marker) {
    try {
      $data = Read-Utf8Text -File $marker | ConvertFrom-Json
      if ($data.managed_by -eq "Dong Skills" -and (!$ExpectedName -or $data.name -eq $ExpectedName)) {
        return $true
      }
    } catch {
      return $false
    }
  }
  return $false
}

function Write-SkillMarker {
  param(
    [string]$SkillDirectory,
    [string]$Name,
    [string]$Scope
  )

  $marker = [pscustomobject]@{
    schema = "dong-skills.skill-install.v1"
    managed_by = "Dong Skills"
    name = $Name
    scope = $Scope
    installed_at = (Get-Date).ToUniversalTime().ToString("o")
    note = "This project skill directory is managed by Dong Skills. Non-Dong project skills are never managed by this marker."
  }
  Write-Utf8Text -File (Join-Path $SkillDirectory ".dong-skill-managed.json") -Content (($marker | ConvertTo-Json -Depth 5) + [Environment]::NewLine)
}

function Install-ManagedSkillDirectory {
  param(
    [string]$Source,
    [string]$DestinationRoot,
    [string]$Scope
  )

  $name = Split-Path -Leaf $Source
  $target = Join-Path $DestinationRoot $name
  $staging = Join-Path $DestinationRoot ".$name.staging-$PID"
  $backup = Join-Path $DestinationRoot ".$name.previous-$PID"

  foreach ($pathToCheck in @($target, $staging, $backup)) {
    Assert-PathInside -Parent $DestinationRoot -Child $pathToCheck
  }

  if (Test-Path -LiteralPath $staging) {
    Remove-Item -LiteralPath $staging -Recurse -Force
  }
  if (Test-Path -LiteralPath $backup) {
    Remove-Item -LiteralPath $backup -Recurse -Force
  }

  if ((Test-Path -LiteralPath $target) -and -not (Test-DongSkillDirectory -SkillDirectory $target -ExpectedName $name)) {
    throw "Refusing to overwrite non-Dong project skill directory: $target"
  }

  Copy-Item -LiteralPath $Source -Destination $staging -Recurse
  $snapshotEntry = Join-Path $staging "SKILL.project.md"
  $skillEntry = Join-Path $staging "SKILL.md"
  if ((Test-Path -LiteralPath $snapshotEntry) -and !(Test-Path -LiteralPath $skillEntry)) {
    Move-Item -LiteralPath $snapshotEntry -Destination $skillEntry
  }
  if (!(Test-Path -LiteralPath $skillEntry)) {
    throw "Dong Skills skill source has no installable entry: $Source"
  }
  Write-SkillMarker -SkillDirectory $staging -Name $name -Scope $Scope

  try {
    if (Test-Path -LiteralPath $target) {
      Move-Item -LiteralPath $target -Destination $backup
    }
    Move-Item -LiteralPath $staging -Destination $target
    if (Test-Path -LiteralPath $backup) {
      Remove-Item -LiteralPath $backup -Recurse -Force
    }
  } catch {
    if ((!(Test-Path -LiteralPath $target)) -and (Test-Path -LiteralPath $backup)) {
      Move-Item -LiteralPath $backup -Destination $target
    }
    if (Test-Path -LiteralPath $staging) {
      Remove-Item -LiteralPath $staging -Recurse -Force
    }
    throw
  }
}

function Resolve-ProjectSkillsSourceRoot {
  param(
    [object]$Manifest
  )

  $directSourcePresent = $true
  foreach ($name in @($Manifest.project_skills)) {
    if (!(Test-Path -LiteralPath (Join-Path $siblingSkillsRoot $name))) {
      $directSourcePresent = $false
      break
    }
  }
  if ($directSourcePresent) {
    $sourceRepoRoot = Split-Path -Parent (Split-Path -Parent $siblingSkillsRoot)
    $sourceManifest = Join-Path $sourceRepoRoot "dong-skills.manifest.json"
    if (!(Test-Path -LiteralPath $sourceManifest) -or
        (Get-Sha256 -File $sourceManifest) -ne (Get-Sha256 -File $manifestFile)) {
      throw "Dong Skills onboarding assets are out of sync with the source repo."
    }
    return [pscustomobject]@{
      Root = $siblingSkillsRoot
      DistributionId = Get-DistributionId -RepositoryRoot $sourceRepoRoot -Manifest $Manifest
    }
  }

  $markerCandidates = if (Test-Path -LiteralPath $installedDongSkillsSourceMarker) {
    @($installedDongSkillsSourceMarker)
  } else {
    @($defaultDongSkillsSourceMarker)
  }
  foreach ($sourceMarkerFile in $markerCandidates | Select-Object -Unique) {
    if (!(Test-Path -LiteralPath $sourceMarkerFile)) {
      continue
    }
    try {
      $sourceMarker = Read-Utf8Text -File $sourceMarkerFile | ConvertFrom-Json
    } catch {
      throw "Dong Skills source marker is unreadable: $sourceMarkerFile"
    }
    Assert-SourceMarkerReceipt -Marker $sourceMarker -MarkerFile $sourceMarkerFile -Manifest $Manifest
    $markerSkillsRoot = Split-Path -Parent $sourceMarkerFile
    $snapshotRoot = Join-Path $markerSkillsRoot "codex-codebase-onboarding\assets\project-skills"
    foreach ($name in @($Manifest.project_skills)) {
      $snapshotSkill = Join-Path $snapshotRoot $name
      if (!(Test-Path -LiteralPath $snapshotSkill) -or
          !(Test-Path -LiteralPath (Join-Path $snapshotSkill "SKILL.project.md")) -or
          (Test-Path -LiteralPath (Join-Path $snapshotSkill "SKILL.md"))) {
        throw "Dong Skills installed project skill snapshot is incomplete: $name"
      }
    }
    return [pscustomobject]@{
      Root = $snapshotRoot
      DistributionId = [string]$sourceMarker.distribution_id
    }
  }

  throw "Cannot locate a verified project-level Dong Skills distribution. Reinstall Dong Skills globally or run bootstrap from the source checkout."
}

function Install-ProjectDongSkills {
  param(
    [string]$SourceRoot,
    [string]$ProjectRoot,
    [object]$Manifest,
    [string]$DistributionId
  )

  $targetProjectSkillsRoot = Join-Path $ProjectRoot ".agents\skills"
  New-Item -ItemType Directory -Force -Path $targetProjectSkillsRoot | Out-Null

  $previousNames = @()
  $previousMarker = Join-Path $targetProjectSkillsRoot ".dong-skills-project.json"
  if (Test-Path -LiteralPath $previousMarker) {
    try {
      $previous = Read-Utf8Text -File $previousMarker | ConvertFrom-Json
      if ($previous.managed_by -eq "Dong Skills") {
        $previousNames = @($previous.installed_skills)
      }
    } catch {}
  }

  foreach ($name in @($Manifest.project_skills)) {
    $source = Join-Path $SourceRoot $name
    $target = Join-Path $targetProjectSkillsRoot $name
    if (!(Test-Path -LiteralPath $source)) {
      throw "Missing Dong Skills project skill source: $source"
    }
    if ((Test-Path -LiteralPath $target) -and -not (Test-DongSkillDirectory -SkillDirectory $target -ExpectedName $name)) {
      throw "Refusing to overwrite non-Dong project skill directory: $target"
    }
  }

  $installedNames = @()
  $skillHashes = [ordered]@{}
  foreach ($name in @($Manifest.project_skills)) {
    $source = Join-Path $SourceRoot $name
    if (!(Test-Path -LiteralPath $source)) {
      throw "Missing Dong Skills project skill source: $source"
    }
    Install-ManagedSkillDirectory -Source $source -DestinationRoot $targetProjectSkillsRoot -Scope "project"
    $installedNames += $name
    $skillHashes[$name] = Get-TreeSha256 -Directory (Join-Path $targetProjectSkillsRoot $name)
  }

  foreach ($oldName in $previousNames) {
    if ($oldName -in @($Manifest.project_skills)) { continue }
    $oldDir = Join-Path $targetProjectSkillsRoot $oldName
    if (Test-DongSkillDirectory -SkillDirectory $oldDir -ExpectedName $oldName) {
      Remove-Item -LiteralPath $oldDir -Recurse -Force
    }
  }

  $projectMarker = [pscustomobject]@{
    schema = "dong-skills.project-install.v2"
    managed_by = "Dong Skills"
    installed_at = (Get-Date).ToUniversalTime().ToString("o")
    installed_skills = $installedNames
    global_entry_skills_required = @($Manifest.global_skills)
    global_bootstrap_skills_required = @($Manifest.global_bootstrap_skills)
    runtime_contract = "project-ops-v2"
    distribution_id = $DistributionId
    content_receipt = [ordered]@{
      algorithm = "sha256-tree-v1"
      skill_trees = $skillHashes
    }
    note = "Only installed_skills are managed by Dong Skills in this project. Other .agents/skills directories are preserved."
  }
  Write-Utf8Text -File (Join-Path $targetProjectSkillsRoot ".dong-skills-project.json") -Content (($projectMarker | ConvertTo-Json -Depth 10) + [Environment]::NewLine)
}

function Get-ManagedRuntimeRelativeFiles {
  $files = @(
    ".codex/hooks/project-ops.mjs",
    ".codex/hooks/launch-project-ops.mjs"
  )
  $codexScriptsRoot = ([System.IO.Path]::GetFullPath($sourceCodexScripts)).TrimEnd($trimChars)
  Get-ChildItem -LiteralPath $codexScriptsRoot -Recurse -File | ForEach-Object {
    $relative = $_.FullName.Substring($codexScriptsRoot.Length).TrimStart($trimChars).Replace('\', '/')
    $files += ".codex/scripts/$relative"
  }
  Get-ChildItem -LiteralPath $sourceScripts -File | ForEach-Object {
    $files += ".codex/scripts/$($_.Name)"
  }
  return @($files | Sort-Object -Unique)
}

function Get-ManagedContextRelativeFiles {
  $contextRoot = ([System.IO.Path]::GetFullPath($sourceContext)).TrimEnd($trimChars)
  return @(Get-ChildItem -LiteralPath $contextRoot -Recurse -File | ForEach-Object {
    $relative = $_.FullName.Substring($contextRoot.Length).TrimStart($trimChars).Replace('\', '/')
    ".codex-context/$relative"
  } | Sort-Object -Unique)
}

function Complete-ProjectInstallReceipt {
  param(
    [string]$ProjectRoot
  )

  $markerFile = Join-Path $ProjectRoot ".agents\skills\.dong-skills-project.json"
  $marker = Read-Utf8Text -File $markerFile | ConvertFrom-Json
  if ($marker.managed_by -ne "Dong Skills" -or $marker.schema -ne "dong-skills.project-install.v2") {
    throw "Cannot complete Dong Skills receipt from an unrecognized project marker: $markerFile"
  }

  $runtimeHashes = [ordered]@{}
  foreach ($relative in Get-ManagedRuntimeRelativeFiles) {
    $target = Join-Path $ProjectRoot ($relative.Replace('/', '\'))
    if (!(Test-Path -LiteralPath $target)) {
      throw "Cannot complete Dong Skills receipt; runtime file is missing: $relative"
    }
    $runtimeHashes[$relative] = Get-Sha256 -File $target
  }

  if ($marker.PSObject.Properties.Name -contains "source_manifest_sha256") {
    $marker.source_manifest_sha256 = Get-Sha256 -File $manifestFile
  } else {
    $marker | Add-Member -MemberType NoteProperty -Name "source_manifest_sha256" -Value (Get-Sha256 -File $manifestFile)
  }
  if ($marker.content_receipt.PSObject.Properties.Name -contains "runtime_files") {
    $marker.content_receipt.runtime_files = $runtimeHashes
  } else {
    $marker.content_receipt | Add-Member -MemberType NoteProperty -Name "runtime_files" -Value $runtimeHashes
  }
  Write-Utf8Text -File $markerFile -Content (($marker | ConvertTo-Json -Depth 10) + [Environment]::NewLine)
}

function Invoke-WorkflowStateMigration {
  param([string]$ProjectRoot)

  $workflowScript = Join-Path $ProjectRoot ".codex\scripts\workflow-state.mjs"
  if (!(Test-Path -LiteralPath $workflowScript)) {
    throw "Cannot migrate workflow state; helper is missing: $workflowScript"
  }
  & node $workflowScript $ProjectRoot migrate | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Dong Skills workflow-state migration failed for $ProjectRoot"
  }
}

function Initialize-FreshProjectRecoveryContext {
  param([string]$ProjectRoot)

  $workflowScript = Join-Path $ProjectRoot ".codex\scripts\workflow-state.mjs"
  & node $workflowScript $ProjectRoot hash --write | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Dong Skills failed to initialize the workflow handoff hash for $ProjectRoot"
  }

  $recoveryScript = Join-Path $ProjectRoot ".codex\scripts\context-recovery-eval.mjs"
  & node $recoveryScript $ProjectRoot | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Dong Skills fresh project context failed recovery validation for $ProjectRoot"
  }
}

function Copy-MissingTreeFiles {
  param(
    [string]$From,
    [string]$To
  )

  New-Item -ItemType Directory -Force -Path $To | Out-Null

  Get-ChildItem -LiteralPath $From -Recurse -File | ForEach-Object {
    $relative = $_.FullName.Substring($From.Length).TrimStart('\', '/')
    $destination = Join-Path $To $relative
    $destinationDir = Split-Path -Parent $destination
    New-Item -ItemType Directory -Force -Path $destinationDir | Out-Null

    if (!(Test-Path -LiteralPath $destination)) {
      Copy-Item -LiteralPath $_.FullName -Destination $destination
    }
  }

  Get-ChildItem -LiteralPath $From -Recurse -Directory | ForEach-Object {
    $relative = $_.FullName.Substring($From.Length).TrimStart('\', '/')
    if ($relative) {
      New-Item -ItemType Directory -Force -Path (Join-Path $To $relative) | Out-Null
    }
  }
}

function Ensure-RuntimeGitignore {
  param(
    [string]$ProjectRoot
  )

  $gitignore = Join-Path $ProjectRoot ".gitignore"
  $markerStart = "# codex-project-ops-runtime:start"
  $markerEnd = "# codex-project-ops-runtime:end"
  $block = "$markerStart`n.codex-context/raw/*`n!.codex-context/raw/.gitkeep`n.codex-context/discussion-state.json`n.skillopt-sleep/`n$markerEnd"
  if (Test-Path -LiteralPath $gitignore) {
    $content = Read-Utf8Text -File $gitignore
  } else {
    $content = ""
  }

  $hasStart = $content -like "*$markerStart*"
  $hasEnd = $content -like "*$markerEnd*"
  if ($hasStart -xor $hasEnd) {
    throw ".gitignore contains an incomplete codex-project-ops runtime marker block. Fix the marker pair before bootstrapping."
  }

  if ($hasStart -and $hasEnd) {
    $pattern = "(?s)" + [regex]::Escape($markerStart) + ".*?" + [regex]::Escape($markerEnd)
    $updated = [regex]::Replace($content, $pattern, [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $block })
  } elseif ($content.Contains(".codex-context/raw/*") -and $content.Contains("!.codex-context/raw/.gitkeep") -and $content.Contains(".codex-context/discussion-state.json") -and $content.Contains(".skillopt-sleep/")) {
    return
  } else {
    $updated = $content.TrimEnd()
    if ($updated) {
      $updated += "`n`n$block"
    } else {
      $updated = $block
    }
  }

  if ($updated -ne $content) {
    Write-Utf8Text -File $gitignore -Content ($updated + [Environment]::NewLine)
  }
}

function Ensure-JsonProperty {
  param(
    [object]$Object,
    [string]$Name,
    [object]$Value
  )

  if (-not ($Object.PSObject.Properties.Name -contains $Name)) {
    $Object | Add-Member -MemberType NoteProperty -Name $Name -Value $Value
  }
}

function Test-DongSkillsHookGroup {
  param(
    [object]$Group
  )

  foreach ($hook in @($Group.hooks)) {
    foreach ($field in @("command", "commandWindows", "command_windows")) {
      if ($hook.PSObject.Properties.Name -contains $field) {
        $value = [string]$hook.$field
        if ($value -like "*project-ops.mjs*") {
          return $true
        }
      }
    }
  }

  return $false
}

function Merge-HooksJson {
  param(
    [string]$SourceFile,
    [string]$TargetFile
  )

  $sourceConfig = Read-Utf8Text -File $SourceFile | ConvertFrom-Json

  if (Test-Path -LiteralPath $TargetFile) {
    $targetConfig = Read-Utf8Text -File $TargetFile | ConvertFrom-Json
  } else {
    $targetConfig = [pscustomobject]@{ hooks = [pscustomobject]@{} }
  }

  Ensure-JsonProperty -Object $targetConfig -Name "hooks" -Value ([pscustomobject]@{})

  foreach ($eventProperty in @($targetConfig.hooks.PSObject.Properties)) {
    $eventProperty.Value = @($eventProperty.Value | Where-Object {
      -not (Test-DongSkillsHookGroup -Group $_)
    })
  }

  foreach ($event in $sourceConfig.hooks.PSObject.Properties.Name) {
    Ensure-JsonProperty -Object $targetConfig.hooks -Name $event -Value @()

    $existing = @($targetConfig.hooks.$event)
    foreach ($group in @($sourceConfig.hooks.$event)) {
      $groupJson = $group | ConvertTo-Json -Depth 30 -Compress
      $alreadyPresent = $false

      foreach ($item in $existing) {
        $itemJson = $item | ConvertTo-Json -Depth 30 -Compress
        if ($itemJson -eq $groupJson) {
          $alreadyPresent = $true
          break
        }
      }

      if (-not $alreadyPresent) {
        $existing += $group
      }
    }

    $targetConfig.hooks.$event = $existing
  }

  $json = $targetConfig | ConvertTo-Json -Depth 30
  Write-Utf8Text -File $TargetFile -Content ($json + [Environment]::NewLine)
}

$manifest = Read-DongSkillsManifest -File $manifestFile
$projectSkillsSource = Resolve-ProjectSkillsSourceRoot -Manifest $manifest
$projectSkillsSourceRoot = $projectSkillsSource.Root
$distributionId = $projectSkillsSource.DistributionId

$resolvedTargetProjectRoot = Resolve-PhysicalPath -PathValue $TargetProjectRoot
$targetProjectSkillsRoot = Join-Path $resolvedTargetProjectRoot ".agents\skills"
foreach ($name in @($manifest.project_skills)) {
  $source = Join-Path $projectSkillsSourceRoot $name
  $target = Join-Path $targetProjectSkillsRoot $name
  if (!(Test-Path -LiteralPath $source)) {
    throw "Missing Dong Skills project skill source: $source"
  }
  if ((Test-Path -LiteralPath $target) -and -not (Test-DongSkillDirectory -SkillDirectory $target -ExpectedName $name)) {
    throw "Refusing to overwrite non-Dong project skill directory: $target"
  }
}

if ($Preview) {
  Write-Host "Dong Skills bootstrap preview"
  Write-Host "Project: $resolvedTargetProjectRoot"
  foreach ($name in @($manifest.project_skills)) {
    $target = Join-Path $targetProjectSkillsRoot $name
    $action = if (Test-Path -LiteralPath $target) { "replace managed" } else { "add" }
    Write-Host "PROJECT $action`: $name"
  }
  Write-Host "RUNTIME update: .codex hooks, scripts, hooks.json"
  Write-Host "STATE merge: .codex-context, .gitignore, AGENTS.md"
  Write-Host "RECEIPT update: project install marker"
  Write-Host "No files were written."
  return
}

$installLock = $null
$transaction = $null
$resourcePaths = @($resolvedTargetProjectRoot)
try {
  $installLock = Enter-InstallLock -ResourcePath $resolvedTargetProjectRoot -TimeoutSeconds $LockTimeoutSeconds
  Recover-PendingInstallTransaction -ResourcePaths $resourcePaths
  New-Item -ItemType Directory -Force -Path $targetProjectSkillsRoot | Out-Null

  $previousNames = @()
  $previousMarker = Join-Path $targetProjectSkillsRoot ".dong-skills-project.json"
  if (Test-Path -LiteralPath $previousMarker) {
    try {
      $previous = Read-Utf8Text -File $previousMarker | ConvertFrom-Json
      if ($previous.managed_by -eq "Dong Skills") {
        $previousNames = @($previous.installed_skills)
      }
    } catch {}
  }
  foreach ($name in @(@($manifest.project_skills) + $previousNames | Sort-Object -Unique)) {
    Repair-InterruptedSkillDirectory -DestinationRoot $targetProjectSkillsRoot -Name $name
  }
  $transaction = New-InstallTransaction -ResourcePaths $resourcePaths
  foreach ($name in @(@($manifest.project_skills) + $previousNames | Sort-Object -Unique)) {
    Add-InstallTransactionPath -Transaction $transaction -Path (Join-Path $targetProjectSkillsRoot $name)
  }
  Add-InstallTransactionPath -Transaction $transaction -Path $previousMarker
  foreach ($relative in Get-ManagedContextRelativeFiles) {
    Add-InstallTransactionPath -Transaction $transaction -Path (Join-Path $resolvedTargetProjectRoot ($relative.Replace('/', '\')))
  }
  foreach ($relative in Get-ManagedRuntimeRelativeFiles) {
    Add-InstallTransactionPath -Transaction $transaction -Path (Join-Path $resolvedTargetProjectRoot ($relative.Replace('/', '\')))
  }
  Add-InstallTransactionPath -Transaction $transaction -Path (Join-Path $resolvedTargetProjectRoot ".codex\hooks.json")
  Add-InstallTransactionPath -Transaction $transaction -Path (Join-Path $resolvedTargetProjectRoot ".gitignore")
  Add-InstallTransactionPath -Transaction $transaction -Path (Join-Path $resolvedTargetProjectRoot "AGENTS.md")
  Add-InstallTransactionPath -Transaction $transaction -Path (Join-Path $resolvedTargetProjectRoot "AGENTS.md.codex-project-ops.bak")

Install-ProjectDongSkills -SourceRoot $projectSkillsSourceRoot -ProjectRoot $resolvedTargetProjectRoot -Manifest $manifest -DistributionId $distributionId

$targetContext = Join-Path $resolvedTargetProjectRoot ".codex-context"
$workflowStateExisted = Test-Path -LiteralPath (Join-Path $targetContext "workflow-state.yaml")
Copy-MissingTreeFiles -From $sourceContext -To $targetContext
Ensure-RuntimeGitignore -ProjectRoot $resolvedTargetProjectRoot

$targetCodex = Join-Path $resolvedTargetProjectRoot ".codex"
$targetHookDir = Join-Path $targetCodex "hooks"
$targetScriptDir = Join-Path $targetCodex "scripts"
New-Item -ItemType Directory -Force -Path $targetHookDir | Out-Null
New-Item -ItemType Directory -Force -Path $targetScriptDir | Out-Null
Copy-Item -LiteralPath (Join-Path $sourceCodex "hooks\project-ops.mjs") -Destination (Join-Path $targetHookDir "project-ops.mjs") -Force
Copy-Item -LiteralPath (Join-Path $sourceCodex "hooks\launch-project-ops.mjs") -Destination (Join-Path $targetHookDir "launch-project-ops.mjs") -Force
Get-ChildItem -LiteralPath $sourceCodexScripts -Force | ForEach-Object {
  Copy-Item -LiteralPath $_.FullName -Destination $targetScriptDir -Recurse -Force
}
Copy-Item -LiteralPath (Join-Path $sourceScripts "instincts.mjs") -Destination (Join-Path $targetScriptDir "instincts.mjs") -Force
Copy-Item -LiteralPath (Join-Path $sourceScripts "asset-governance.mjs") -Destination (Join-Path $targetScriptDir "asset-governance.mjs") -Force
Copy-Item -LiteralPath (Join-Path $sourceScripts "context-recovery-eval.mjs") -Destination (Join-Path $targetScriptDir "context-recovery-eval.mjs") -Force
Copy-Item -LiteralPath (Join-Path $sourceScripts "project-ops-health.mjs") -Destination (Join-Path $targetScriptDir "project-ops-health.mjs") -Force
Copy-Item -LiteralPath (Join-Path $sourceScripts "release-check.mjs") -Destination (Join-Path $targetScriptDir "release-check.mjs") -Force
Copy-Item -LiteralPath (Join-Path $sourceScripts "skill-forward-eval.mjs") -Destination (Join-Path $targetScriptDir "skill-forward-eval.mjs") -Force
Copy-Item -LiteralPath (Join-Path $sourceScripts "state-prune.mjs") -Destination (Join-Path $targetScriptDir "state-prune.mjs") -Force
Copy-Item -LiteralPath (Join-Path $sourceScripts "workflow-state.mjs") -Destination (Join-Path $targetScriptDir "workflow-state.mjs") -Force
Copy-Item -LiteralPath (Join-Path $sourceScripts "solutions.mjs") -Destination (Join-Path $targetScriptDir "solutions.mjs") -Force
Copy-Item -LiteralPath (Join-Path $sourceScripts "session-history.mjs") -Destination (Join-Path $targetScriptDir "session-history.mjs") -Force
Copy-Item -LiteralPath (Join-Path $sourceScripts "skill-evolution.mjs") -Destination (Join-Path $targetScriptDir "skill-evolution.mjs") -Force
Merge-HooksJson -SourceFile (Join-Path $sourceCodex "hooks.json") -TargetFile (Join-Path $targetCodex "hooks.json")
Invoke-WorkflowStateMigration -ProjectRoot $resolvedTargetProjectRoot
if (-not $workflowStateExisted) {
  Initialize-FreshProjectRecoveryContext -ProjectRoot $resolvedTargetProjectRoot
}
Complete-ProjectInstallReceipt -ProjectRoot $resolvedTargetProjectRoot

$agentsFile = Join-Path $resolvedTargetProjectRoot "AGENTS.md"
$markerStart = "<!-- codex-project-ops:start -->"
$markerEnd = "<!-- codex-project-ops:end -->"
$snippet = (Read-Utf8Text -File $sourceAgentsSnippet).TrimEnd()

if (Test-Path -LiteralPath $agentsFile) {
  $agentsContent = Read-Utf8Text -File $agentsFile
} else {
  $agentsContent = ""
}

$snippetBlock = "$markerStart`n$snippet`n$markerEnd"

if ($agentsContent -like "*$markerStart*" -and $agentsContent -like "*$markerEnd*") {
  $pattern = "(?s)" + [regex]::Escape($markerStart) + ".*?" + [regex]::Escape($markerEnd)
  $updatedAgentsContent = [regex]::Replace($agentsContent, $pattern, [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $snippetBlock })
  if ($updatedAgentsContent -ne $agentsContent) {
    Copy-Item -LiteralPath $agentsFile -Destination "$agentsFile.codex-project-ops.bak" -Force
    Write-Utf8Text -File $agentsFile -Content $updatedAgentsContent
  }
} elseif ($agentsContent -like "*$markerStart*" -or $agentsContent -like "*$markerEnd*") {
  throw "AGENTS.md contains an incomplete codex-project-ops marker block. Fix the marker pair before bootstrapping."
} else {
  Write-Utf8Text -File $agentsFile -Content ($agentsContent + "`n" + $snippetBlock + "`n")
}

Close-InstallTransaction -Transaction $transaction
$transaction = $null

Write-Host "Bootstrapped Dong Skills project context to $targetContext"
Write-Host "Installed project-level Dong Skills to $(Join-Path $TargetProjectRoot ".agents\skills")"
Write-Host "Installed project-level Dong Skills hooks to $targetCodex"
Write-Host "Ensured .gitignore protects .codex-context/raw runtime data"
Write-Host "Merged AGENTS.md project ops snippet into $agentsFile"
Write-Host "Restart Codex or start a new thread from this project. Open /hooks and trust project hooks if prompted."
} catch {
  $installError = $_
  if ($transaction) {
    try {
      if ($transaction.Status -ne "closed") {
        Restore-InstallTransaction -Transaction $transaction
      }
      Close-InstallTransaction -Transaction $transaction
      $transaction = $null
    } catch {
      throw "Dong Skills bootstrap failed and rollback also failed. Install error: $installError Rollback error: $_"
    }
  }
  throw $installError
} finally {
  Exit-InstallLock -Lock $installLock
}
