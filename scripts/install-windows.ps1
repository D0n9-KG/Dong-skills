param(
  [string]$TargetProjectRoot = (Get-Location).Path,
  [string]$TargetSkillsRoot = "$env:USERPROFILE\.agents\skills"
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

  $skillFile = Join-Path $SkillDirectory "SKILL.md"
  if (!(Test-Path -LiteralPath $skillFile)) {
    return $false
  }

  $text = Read-Utf8Text -File $skillFile
  return (($text -match "Dong Skills") -or ($text -match "Codex Project Ops"))
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

  $installedNames = @()
  foreach ($name in @($Manifest.project_skills)) {
    $source = Join-Path $SourceRoot $name
    if (!(Test-Path -LiteralPath $source)) {
      throw "Missing Dong Skills source skill: $source"
    }
    Install-ManagedSkillDirectory -Source $source -DestinationRoot $targetProjectSkillsRoot -Scope "project"
    $installedNames += $name
  }

  $projectMarker = [pscustomobject]@{
    schema = "dong-skills.project-install.v1"
    managed_by = "Dong Skills"
    installed_at = (Get-Date).ToUniversalTime().ToString("o")
    installed_skills = $installedNames
    global_bootstrap_skills_required = @($Manifest.global_skills)
    note = "Only installed_skills are managed by Dong Skills in this project. This marker intentionally omits local source paths."
  }
  Write-Utf8Text -File (Join-Path $targetProjectSkillsRoot ".dong-skills-project.json") -Content (($projectMarker | ConvertTo-Json -Depth 10) + [Environment]::NewLine)
}

$manifest = Read-DongSkillsManifest -File $manifestFile
$globalSkillNames = @($manifest.global_skills)
$projectSkillNames = @($manifest.project_skills)

New-Item -ItemType Directory -Force -Path $TargetSkillsRoot | Out-Null

foreach ($name in $projectSkillNames) {
  Remove-ManagedDongSkillDirectory -DestinationRoot $TargetSkillsRoot -Name $name
}

foreach ($name in $globalSkillNames) {
  $source = Join-Path $sourceSkillsRoot $name
  if (!(Test-Path -LiteralPath $source)) {
    throw "Missing global Dong Skills source skill: $source"
  }
  Install-ManagedSkillDirectory -Source $source -DestinationRoot $TargetSkillsRoot -Scope "global-bootstrap"
}

$sourceMarker = [pscustomobject]@{
  source_repo = $resolvedKitRoot
  source_backlog = (Join-Path $resolvedKitRoot "docs\improvements\backlog.md")
  installed_at = (Get-Date).ToUniversalTime().ToString("o")
  global_skills = $globalSkillNames
  project_skills = $projectSkillNames
  note = "Generated by Dong Skills install-windows.ps1. Global install is bootstrap-only; full project skills are installed per project. Installed skill copies are not the source repo."
}
Write-Utf8Text -File (Join-Path $TargetSkillsRoot ".dong-skills-source.json") -Content (($sourceMarker | ConvertTo-Json -Depth 5) + [Environment]::NewLine)

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
  $block = "$markerStart`n.codex-context/raw/*`n!.codex-context/raw/.gitkeep`n.codex-context/discussion-state.json`n$markerEnd"
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
  } elseif ($content.Contains(".codex-context/raw/*") -and $content.Contains("!.codex-context/raw/.gitkeep") -and $content.Contains(".codex-context/discussion-state.json")) {
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

  foreach ($event in $sourceConfig.hooks.PSObject.Properties.Name) {
    Ensure-JsonProperty -Object $targetConfig.hooks -Name $event -Value @()

    $existing = @($targetConfig.hooks.$event)
    $sourceHasDongSkills = @($sourceConfig.hooks.$event) | Where-Object { Test-DongSkillsHookGroup -Group $_ }
    if ($sourceHasDongSkills) {
      $existing = @($existing | Where-Object { -not (Test-DongSkillsHookGroup -Group $_) })
    }

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
  "project-ops-health.mjs",
  "release-check.mjs",
  "state-prune.mjs",
  "workflow-state.mjs",
  "solutions.mjs",
  "session-history.mjs"
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

Write-Host "Installed global Dong Skills bootstrap skills to $TargetSkillsRoot"
Write-Host "Installed project-level Dong Skills to $(Join-Path $TargetProjectRoot ".agents\skills")"
Write-Host "Installed project context templates to $targetContext"
Write-Host "Installed project ops hooks to $targetCodex"
Write-Host "Installed project ops scripts to $targetScriptDir"
Write-Host "Ensured .gitignore protects .codex-context/raw runtime data"
Write-Host "Merged AGENTS.md project ops snippet into $agentsFile"
Write-Host "Restart Codex or start a new thread so skills and hooks are discovered."
Write-Host "Open /hooks in Codex and trust the new project hooks if prompted."
