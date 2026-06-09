param(
  [string]$TargetProjectRoot = (Get-Location).Path,
  [string]$TargetSkillsRoot = "$env:USERPROFILE\.agents\skills"
)

$ErrorActionPreference = "Stop"

$kitRoot = Split-Path -Parent $PSScriptRoot
$sourceSkillsRoot = Join-Path $kitRoot ".agents\skills"
$sourceContext = Join-Path $kitRoot ".codex-context"
$sourceCodex = Join-Path $kitRoot ".codex"
$sourceAgentsSnippet = Join-Path $kitRoot "AGENTS.project-ops.snippet.md"

if (!(Test-Path -LiteralPath $sourceSkillsRoot)) {
  throw "Source skills not found: $sourceSkillsRoot"
}

if (!(Test-Path -LiteralPath $TargetProjectRoot)) {
  throw "Target project root not found: $TargetProjectRoot"
}

New-Item -ItemType Directory -Force -Path $TargetSkillsRoot | Out-Null

Get-ChildItem -LiteralPath $sourceSkillsRoot -Directory | ForEach-Object {
  $target = Join-Path $TargetSkillsRoot $_.Name
  if (Test-Path -LiteralPath $target) {
    Remove-Item -LiteralPath $target -Recurse -Force
  }
  Copy-Item -LiteralPath $_.FullName -Destination $target -Recurse
}

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

function Test-ProjectOpsHookGroup {
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

  $sourceConfig = Get-Content -LiteralPath $SourceFile -Raw | ConvertFrom-Json

  if (Test-Path -LiteralPath $TargetFile) {
    $targetConfig = Get-Content -LiteralPath $TargetFile -Raw | ConvertFrom-Json
  } else {
    $targetConfig = [pscustomobject]@{ hooks = [pscustomobject]@{} }
  }

  Ensure-JsonProperty -Object $targetConfig -Name "hooks" -Value ([pscustomobject]@{})

  foreach ($event in $sourceConfig.hooks.PSObject.Properties.Name) {
    Ensure-JsonProperty -Object $targetConfig.hooks -Name $event -Value @()

    $existing = @($targetConfig.hooks.$event)
    $sourceHasProjectOps = @($sourceConfig.hooks.$event) | Where-Object { Test-ProjectOpsHookGroup -Group $_ }
    if ($sourceHasProjectOps) {
      $existing = @($existing | Where-Object { -not (Test-ProjectOpsHookGroup -Group $_) })
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
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($TargetFile, $json + [Environment]::NewLine, $utf8NoBom)
}

$targetContext = Join-Path $TargetProjectRoot ".codex-context"
Copy-MissingTreeFiles -From $sourceContext -To $targetContext

$targetCodex = Join-Path $TargetProjectRoot ".codex"
$targetHookDir = Join-Path $targetCodex "hooks"
$targetScriptDir = Join-Path $targetCodex "scripts"
New-Item -ItemType Directory -Force -Path $targetHookDir | Out-Null
New-Item -ItemType Directory -Force -Path $targetScriptDir | Out-Null
Copy-Item -LiteralPath (Join-Path $sourceCodex "hooks\project-ops.mjs") -Destination (Join-Path $targetHookDir "project-ops.mjs") -Force
Copy-Item -LiteralPath (Join-Path $kitRoot "scripts\instincts.mjs") -Destination (Join-Path $targetScriptDir "instincts.mjs") -Force
Merge-HooksJson -SourceFile (Join-Path $sourceCodex "hooks.json") -TargetFile (Join-Path $targetCodex "hooks.json")

$agentsFile = Join-Path $TargetProjectRoot "AGENTS.md"
$markerStart = "<!-- codex-project-ops:start -->"
$markerEnd = "<!-- codex-project-ops:end -->"
$snippet = Get-Content -LiteralPath $sourceAgentsSnippet -Raw

if (Test-Path -LiteralPath $agentsFile) {
  $agentsContent = Get-Content -LiteralPath $agentsFile -Raw
} else {
  $agentsContent = ""
}

$snippetBlock = "$markerStart`n$snippet`n$markerEnd"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

if ($agentsContent -like "*$markerStart*" -and $agentsContent -like "*$markerEnd*") {
  $pattern = "(?s)" + [regex]::Escape($markerStart) + ".*?" + [regex]::Escape($markerEnd)
  $updatedAgentsContent = [regex]::Replace($agentsContent, $pattern, [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $snippetBlock })
  if ($updatedAgentsContent -ne $agentsContent) {
    Copy-Item -LiteralPath $agentsFile -Destination "$agentsFile.codex-project-ops.bak" -Force
    [System.IO.File]::WriteAllText($agentsFile, $updatedAgentsContent, $utf8NoBom)
  }
} elseif ($agentsContent -like "*$markerStart*" -or $agentsContent -like "*$markerEnd*") {
  throw "AGENTS.md contains an incomplete codex-project-ops marker block. Fix the marker pair before reinstalling."
} else {
  [System.IO.File]::WriteAllText($agentsFile, $agentsContent + "`n" + $snippetBlock + "`n", $utf8NoBom)
}

Write-Host "Installed curated skills to $TargetSkillsRoot"
Write-Host "Installed project context templates to $targetContext"
Write-Host "Installed project ops hooks to $targetCodex"
Write-Host "Installed project ops scripts to $targetScriptDir"
Write-Host "Merged AGENTS.md project ops snippet into $agentsFile"
Write-Host "Restart Codex or start a new thread so skills and hooks are discovered."
Write-Host "Open /hooks in Codex and trust the new project hooks if prompted."
