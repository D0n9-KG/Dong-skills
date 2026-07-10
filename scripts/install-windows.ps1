param(
  [string]$TargetProjectRoot = (Get-Location).Path,
  [string]$TargetSkillsRoot = "$env:USERPROFILE\.agents\skills",
  [switch]$Preview,
  [ValidateRange(0, 300)]
  [int]$LockTimeoutSeconds = 30
)

$ErrorActionPreference = "Stop"

$kitRoot = Split-Path -Parent $PSScriptRoot
$sourceSkillsRoot = Join-Path $kitRoot ".agents\skills"
$manifestFile = Join-Path $kitRoot "dong-skills.manifest.json"
$projectOpsAssets = Join-Path $sourceSkillsRoot "codex-codebase-onboarding\assets\project-ops"
$sourceContext = Join-Path $projectOpsAssets ".codex-context"
$sourceCodex = Join-Path $projectOpsAssets ".codex"
$sourceCodexScripts = Join-Path $sourceCodex "scripts"
$sourceProjectScripts = Join-Path $projectOpsAssets "scripts"
$sourceAgentsSnippet = Join-Path $projectOpsAssets "AGENTS.project-ops.snippet.md"

if (!(Test-Path -LiteralPath $sourceSkillsRoot)) {
  throw "Source skills not found: $sourceSkillsRoot"
}

foreach ($required in @($manifestFile, $sourceContext, $sourceCodex, $sourceCodexScripts, $sourceProjectScripts, $sourceAgentsSnippet)) {
  if (!(Test-Path -LiteralPath $required)) {
    throw "Missing project ops install resource: $required"
  }
}

if (!(Test-Path -LiteralPath $TargetProjectRoot)) {
  throw "Target project root not found: $TargetProjectRoot"
}

$trimChars = [char[]]@([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)
$resolvedTargetProjectRoot = ([System.IO.Path]::GetFullPath((Resolve-Path -LiteralPath $TargetProjectRoot).Path)).TrimEnd($trimChars)
$resolvedKitRoot = ([System.IO.Path]::GetFullPath((Resolve-Path -LiteralPath $kitRoot).Path)).TrimEnd($trimChars)
$isKitSelfInstall = [System.String]::Equals($resolvedTargetProjectRoot, $resolvedKitRoot, [System.StringComparison]::OrdinalIgnoreCase)

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

function Write-Utf8Text {
  param(
    [string]$File,
    [string]$Content
  )

  [System.IO.File]::WriteAllText($File, $Content, $utf8NoBom)
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

function Get-InstallLockPath {
  param([string]$ResourcePath)

  $normalized = ([System.IO.Path]::GetFullPath($ResourcePath)).TrimEnd($trimChars).Replace('\', '/').ToLowerInvariant()
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    $digest = (($sha.ComputeHash($utf8NoBom.GetBytes($normalized)) | ForEach-Object { $_.ToString("x2") }) -join "")
  } finally {
    $sha.Dispose()
  }
  return Join-Path ([System.IO.Path]::GetTempPath()) "dong-skills-install-locks\$digest.lock"
}

function Enter-InstallLocks {
  param(
    [string[]]$ResourcePaths,
    [int]$TimeoutSeconds
  )

  $locks = New-Object "System.Collections.Generic.List[object]"
  $lockPaths = @($ResourcePaths | ForEach-Object { Get-InstallLockPath -ResourcePath $_ } | Sort-Object -Unique)
  try {
    foreach ($lockPath in $lockPaths) {
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
          $locks.Add([pscustomobject]@{ Path = $lockPath; Stream = $stream })
          break
        } catch [System.IO.IOException] {
          if ([DateTime]::UtcNow -ge $deadline) {
            throw "Another Dong Skills install is already modifying this target. Lock: $lockPath"
          }
          Start-Sleep -Milliseconds 100
        }
      }
    }
    return $locks
  } catch {
    foreach ($lock in $locks) {
      $lock.Stream.Dispose()
    }
    throw
  }
}

function Exit-InstallLocks {
  param([object[]]$Locks)

  foreach ($lock in @($Locks)) {
    try {
      $lock.Stream.Dispose()
    } finally {
      try {
        Remove-Item -LiteralPath $lock.Path -Force -ErrorAction SilentlyContinue
      } catch {}
    }
  }
}

function New-InstallTransaction {
  $backupRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("dong-skills-install-transaction-" + [guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
  return [pscustomobject]@{
    BackupRoot = $backupRoot
    Entries = New-Object "System.Collections.Generic.List[object]"
  }
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

  if ($Transaction -and (Test-Path -LiteralPath $Transaction.BackupRoot)) {
    Remove-Item -LiteralPath $Transaction.BackupRoot -Recurse -Force
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
    note = "This skill directory is managed by Dong Skills. Non-Dong skill directories are never managed by this marker."
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
    throw "Refusing to overwrite non-Dong skill directory: $target"
  }

  Copy-Item -LiteralPath $Source -Destination $staging -Recurse
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

function Remove-ManagedDongSkillDirectory {
  param(
    [string]$DestinationRoot,
    [string]$Name
  )

  $target = Join-Path $DestinationRoot $Name
  Assert-PathInside -Parent $DestinationRoot -Child $target

  if (!(Test-Path -LiteralPath $target)) {
    return
  }

  if (Test-DongSkillDirectory -SkillDirectory $target -ExpectedName $Name) {
    Remove-Item -LiteralPath $target -Recurse -Force
  } else {
    Write-Warning "Preserved non-Dong skill directory with managed-name conflict: $target"
  }
}

function Install-ProjectDongSkills {
  param(
    [string]$SourceRoot,
    [string]$ProjectRoot,
    [object]$Manifest
  )

  $targetProjectSkillsRoot = Join-Path $ProjectRoot ".agents\skills"
  $sourceFull = ([System.IO.Path]::GetFullPath($SourceRoot)).TrimEnd($trimChars)
  $targetFull = ([System.IO.Path]::GetFullPath($targetProjectSkillsRoot)).TrimEnd($trimChars)
  if ([System.String]::Equals($sourceFull, $targetFull, [System.StringComparison]::OrdinalIgnoreCase)) {
    return
  }

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
      throw "Missing Dong Skills source skill: $source"
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
      throw "Missing Dong Skills source skill: $source"
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
    content_receipt = [ordered]@{
      algorithm = "sha256-tree-v1"
      skill_trees = $skillHashes
    }
    note = "Only installed_skills are managed by Dong Skills in this project. This marker intentionally omits local source paths."
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
  Get-ChildItem -LiteralPath $sourceProjectScripts -File | ForEach-Object {
    $files += ".codex/scripts/$($_.Name)"
  }
  return @($files | Sort-Object -Unique)
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

$manifest = Read-DongSkillsManifest -File $manifestFile
$globalSkillNames = @($manifest.global_skills)
$globalBootstrapSkillNames = @($manifest.global_bootstrap_skills)
$projectSkillNames = @($manifest.project_skills)
$resolvedTargetSkillsRoot = ([System.IO.Path]::GetFullPath($TargetSkillsRoot)).TrimEnd($trimChars)

foreach ($name in $globalSkillNames) {
  $source = Join-Path $sourceSkillsRoot $name
  $target = Join-Path $resolvedTargetSkillsRoot $name
  if (!(Test-Path -LiteralPath $source)) {
    throw "Missing global Dong Skills source skill: $source"
  }
  if ((Test-Path -LiteralPath $target) -and -not (Test-DongSkillDirectory -SkillDirectory $target -ExpectedName $name)) {
    throw "Refusing to overwrite non-Dong global skill directory: $target"
  }
}

if (-not $isKitSelfInstall) {
  $projectSkillsRoot = Join-Path $resolvedTargetProjectRoot ".agents\skills"
  foreach ($name in $projectSkillNames) {
    $source = Join-Path $sourceSkillsRoot $name
    $target = Join-Path $projectSkillsRoot $name
    if (!(Test-Path -LiteralPath $source)) {
      throw "Missing Dong Skills source skill: $source"
    }
    if ((Test-Path -LiteralPath $target) -and -not (Test-DongSkillDirectory -SkillDirectory $target -ExpectedName $name)) {
      throw "Refusing to overwrite non-Dong project skill directory: $target"
    }
  }
}

if ($Preview) {
  Write-Host "Dong Skills install preview"
  Write-Host "Project: $resolvedTargetProjectRoot"
  Write-Host "Global skills root: $resolvedTargetSkillsRoot"
  foreach ($name in $globalSkillNames) {
    $target = Join-Path $resolvedTargetSkillsRoot $name
    $action = if (Test-Path -LiteralPath $target) { "replace managed" } else { "add" }
    Write-Host "GLOBAL $action`: $name"
  }
  if (-not $isKitSelfInstall) {
    foreach ($name in $projectSkillNames) {
      $target = Join-Path $resolvedTargetProjectRoot ".agents\skills\$name"
      $action = if (Test-Path -LiteralPath $target) { "replace managed" } else { "add" }
      Write-Host "PROJECT $action`: $name"
    }
  }
  Write-Host "RUNTIME update: .codex hooks, scripts, hooks.json"
  Write-Host "STATE merge: .codex-context, .gitignore, AGENTS.md"
  Write-Host "RECEIPTS update: global source marker and project install marker"
  Write-Host "No files were written."
  return
}

$installLocks = $null
$transaction = $null
try {
  $installLocks = Enter-InstallLocks -ResourcePaths @($resolvedTargetProjectRoot, $resolvedTargetSkillsRoot) -TimeoutSeconds $LockTimeoutSeconds
  $transaction = New-InstallTransaction

  foreach ($name in @($globalSkillNames + $projectSkillNames | Sort-Object -Unique)) {
    Add-InstallTransactionPath -Transaction $transaction -Path (Join-Path $resolvedTargetSkillsRoot $name)
  }
  Add-InstallTransactionPath -Transaction $transaction -Path (Join-Path $resolvedTargetSkillsRoot ".dong-skills-source.json")

  if (-not $isKitSelfInstall) {
    $projectSkillsRoot = Join-Path $resolvedTargetProjectRoot ".agents\skills"
    $previousNames = @()
    $previousMarker = Join-Path $projectSkillsRoot ".dong-skills-project.json"
    if (Test-Path -LiteralPath $previousMarker) {
      try {
        $previous = Read-Utf8Text -File $previousMarker | ConvertFrom-Json
        if ($previous.managed_by -eq "Dong Skills") {
          $previousNames = @($previous.installed_skills)
        }
      } catch {}
    }
    foreach ($name in @($projectSkillNames + $previousNames | Sort-Object -Unique)) {
      Add-InstallTransactionPath -Transaction $transaction -Path (Join-Path $projectSkillsRoot $name)
    }
    Add-InstallTransactionPath -Transaction $transaction -Path $previousMarker
  }

  Add-InstallTransactionPath -Transaction $transaction -Path (Join-Path $resolvedTargetProjectRoot ".codex-context")
  Add-InstallTransactionPath -Transaction $transaction -Path (Join-Path $resolvedTargetProjectRoot ".codex")
  Add-InstallTransactionPath -Transaction $transaction -Path (Join-Path $resolvedTargetProjectRoot ".gitignore")
  Add-InstallTransactionPath -Transaction $transaction -Path (Join-Path $resolvedTargetProjectRoot "AGENTS.md")
  Add-InstallTransactionPath -Transaction $transaction -Path (Join-Path $resolvedTargetProjectRoot "AGENTS.md.codex-project-ops.bak")

New-Item -ItemType Directory -Force -Path $TargetSkillsRoot | Out-Null

foreach ($name in $projectSkillNames) {
  Remove-ManagedDongSkillDirectory -DestinationRoot $TargetSkillsRoot -Name $name
}

foreach ($name in $globalSkillNames) {
  $source = Join-Path $sourceSkillsRoot $name
  if (!(Test-Path -LiteralPath $source)) {
    throw "Missing global Dong Skills source skill: $source"
  }
  Install-ManagedSkillDirectory -Source $source -DestinationRoot $TargetSkillsRoot -Scope "global-entry"
}

$globalSkillHashes = [ordered]@{}
foreach ($name in $globalSkillNames) {
  $globalSkillHashes[$name] = Get-TreeSha256 -Directory (Join-Path $TargetSkillsRoot $name)
}
$sourceMarker = [pscustomobject]@{
  schema = "dong-skills.source-install.v2"
  managed_by = "Dong Skills"
  source_repo = $resolvedKitRoot
  source_backlog = (Join-Path $resolvedKitRoot "docs\improvements\backlog.md")
  installed_at = (Get-Date).ToUniversalTime().ToString("o")
  source_manifest_sha256 = Get-Sha256 -File $manifestFile
  global_skills = $globalSkillNames
  global_bootstrap_skills = $globalBootstrapSkillNames
  project_skills = $projectSkillNames
  global_skill_trees = $globalSkillHashes
  note = "Generated by Dong Skills install-windows.ps1. Global install exposes bootstrap/router skills plus global maintenance entries; full workflow skills and hooks are installed per project. Installed skill copies are not the source repo."
}
Write-Utf8Text -File (Join-Path $TargetSkillsRoot ".dong-skills-source.json") -Content (($sourceMarker | ConvertTo-Json -Depth 10) + [Environment]::NewLine)

function Copy-MissingTreeFiles {
  param(
    [string]$From,
    [string]$To
  )

  if (!(Test-Path -LiteralPath $From)) {
    throw "Source directory not found: $From"
  }

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

function Get-MarkdownSections {
  param(
    [string]$File
  )

  $content = Read-Utf8Text -File $File
  $lines = $content -split "\r?\n"
  $sections = @()
  $heading = $null
  $body = @()

  foreach ($line in $lines) {
    if ($line -match "^##\s+(.+?)\s*$") {
      if ($heading) {
        $sections += [pscustomobject]@{
          Heading = $heading
          Body = (($body -join [Environment]::NewLine).Trim())
        }
      }
      $heading = $Matches[1]
      $body = @()
    } elseif ($heading) {
      $body += $line
    }
  }

  if ($heading) {
    $sections += [pscustomobject]@{
      Heading = $heading
      Body = (($body -join [Environment]::NewLine).Trim())
    }
  }

  return $sections
}

function Update-ContextTemplateSections {
  param(
    [string]$From,
    [string]$To
  )

  Get-ChildItem -LiteralPath $From -File -Filter "*.md" | ForEach-Object {
    $target = Join-Path $To $_.Name
    if (!(Test-Path -LiteralPath $target)) {
      return
    }

    $targetContent = Read-Utf8Text -File $target
    $updated = $targetContent.TrimEnd()
    $changed = $false

    foreach ($section in Get-MarkdownSections -File $_.FullName) {
      $pattern = "(?m)^##\s+" + [regex]::Escape($section.Heading) + "\s*$"
      if (-not [regex]::IsMatch($targetContent, $pattern)) {
        $updated += "`n`n## $($section.Heading)"
        if ($section.Body) {
          $updated += "`n$($section.Body)"
        }
        $updated += "`n"
        $changed = $true
      }
    }

    if ($changed) {
      Write-Utf8Text -File $target -Content ($updated + [Environment]::NewLine)
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
    throw ".gitignore contains an incomplete codex-project-ops runtime marker block. Fix the marker pair before reinstalling."
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
  if (Test-Path -LiteralPath $TargetFile) {
    try {
      $existingCanonical = (Read-Utf8Text -File $TargetFile | ConvertFrom-Json) | ConvertTo-Json -Depth 30 -Compress
      $nextCanonical = $targetConfig | ConvertTo-Json -Depth 30 -Compress
      if ($existingCanonical -eq $nextCanonical) {
        return
      }
    } catch {
      # Fall through and rewrite malformed or unreadable hook config.
    }
  }
  Write-Utf8Text -File $TargetFile -Content ($json + [Environment]::NewLine)
}

if (-not $isKitSelfInstall) {
  Install-ProjectDongSkills -SourceRoot $sourceSkillsRoot -ProjectRoot $TargetProjectRoot -Manifest $manifest
}

$targetContext = Join-Path $TargetProjectRoot ".codex-context"
Copy-MissingTreeFiles -From $sourceContext -To $targetContext
Update-ContextTemplateSections -From $sourceContext -To $targetContext
Ensure-RuntimeGitignore -ProjectRoot $TargetProjectRoot

$targetCodex = Join-Path $TargetProjectRoot ".codex"
$targetHookDir = Join-Path $targetCodex "hooks"
$targetScriptDir = Join-Path $targetCodex "scripts"
New-Item -ItemType Directory -Force -Path $targetHookDir | Out-Null
New-Item -ItemType Directory -Force -Path $targetScriptDir | Out-Null
Copy-Item -LiteralPath (Join-Path $sourceCodex "hooks\project-ops.mjs") -Destination (Join-Path $targetHookDir "project-ops.mjs") -Force
Copy-Item -LiteralPath (Join-Path $sourceCodex "hooks\launch-project-ops.mjs") -Destination (Join-Path $targetHookDir "launch-project-ops.mjs") -Force
Get-ChildItem -LiteralPath $sourceCodexScripts -Force | ForEach-Object {
  Copy-Item -LiteralPath $_.FullName -Destination $targetScriptDir -Recurse -Force
}
$projectHelperScripts = @(
  "instincts.mjs",
  "asset-governance.mjs",
  "context-recovery-eval.mjs",
  "project-ops-health.mjs",
  "release-check.mjs",
  "skill-forward-eval.mjs",
  "state-prune.mjs",
  "workflow-state.mjs",
  "solutions.mjs",
  "session-history.mjs",
  "skill-evolution.mjs"
)
if ($isKitSelfInstall) {
  foreach ($scriptName in $projectHelperScripts) {
    $generatedScript = Join-Path $targetScriptDir $scriptName
    if (Test-Path -LiteralPath $generatedScript) {
      Remove-Item -LiteralPath $generatedScript -Force
    }
  }
} else {
  foreach ($scriptName in $projectHelperScripts) {
    Copy-Item -LiteralPath (Join-Path $sourceProjectScripts $scriptName) -Destination (Join-Path $targetScriptDir $scriptName) -Force
  }
}
Merge-HooksJson -SourceFile (Join-Path $sourceCodex "hooks.json") -TargetFile (Join-Path $targetCodex "hooks.json")
if (-not $isKitSelfInstall) {
  Complete-ProjectInstallReceipt -ProjectRoot $TargetProjectRoot
}

$agentsFile = Join-Path $TargetProjectRoot "AGENTS.md"
$markerStart = "<!-- codex-project-ops:start -->"
$markerEnd = "<!-- codex-project-ops:end -->"
$snippet = Read-Utf8Text -File $sourceAgentsSnippet

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
    if (-not $isKitSelfInstall) {
      Copy-Item -LiteralPath $agentsFile -Destination "$agentsFile.codex-project-ops.bak" -Force
    }
    Write-Utf8Text -File $agentsFile -Content $updatedAgentsContent
  }
} elseif ($agentsContent -like "*$markerStart*" -or $agentsContent -like "*$markerEnd*") {
  throw "AGENTS.md contains an incomplete codex-project-ops marker block. Fix the marker pair before reinstalling."
} else {
  Write-Utf8Text -File $agentsFile -Content ($agentsContent + "`n" + $snippetBlock + "`n")
}

Write-Host "Installed global Dong Skills entry skills to $TargetSkillsRoot"
Write-Host "Installed project-level Dong Skills to $(Join-Path $TargetProjectRoot ".agents\skills")"
Write-Host "Installed project context templates to $targetContext"
Write-Host "Installed project ops hooks to $targetCodex"
Write-Host "Installed project ops scripts to $targetScriptDir"
Write-Host "Ensured .gitignore protects .codex-context/raw runtime data"
Write-Host "Merged AGENTS.md project ops snippet into $agentsFile"
Write-Host "Restart Codex or start a new thread so skills and hooks are discovered."
Write-Host "Open /hooks in Codex and trust the new project hooks if prompted."
} catch {
  $installError = $_
  if ($transaction) {
    try {
      Restore-InstallTransaction -Transaction $transaction
    } catch {
      throw "Dong Skills install failed and rollback also failed. Install error: $installError Rollback error: $_"
    }
  }
  throw $installError
} finally {
  Close-InstallTransaction -Transaction $transaction
  Exit-InstallLocks -Locks $installLocks
}
