param(
  [string]$TargetProjectRoot = (Get-Location).Path
)

$ErrorActionPreference = "Stop"

$skillRoot = Split-Path -Parent $PSScriptRoot
$assetsRoot = Join-Path $skillRoot "assets\project-ops"
$sourceContext = Join-Path $assetsRoot ".codex-context"
$sourceCodex = Join-Path $assetsRoot ".codex"
$sourceCodexScripts = Join-Path $sourceCodex "scripts"
$sourceScripts = Join-Path $assetsRoot "scripts"
$sourceAgentsSnippet = Join-Path $assetsRoot "AGENTS.project-ops.snippet.md"

if (!(Test-Path -LiteralPath $TargetProjectRoot)) {
  throw "Target project root not found: $TargetProjectRoot"
}

foreach ($required in @($sourceContext, $sourceCodex, $sourceCodexScripts, $sourceScripts, $sourceAgentsSnippet)) {
  if (!(Test-Path -LiteralPath $required)) {
    throw "Missing bootstrap resource: $required"
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

function Get-MarkdownSections {
  param(
    [string]$File
  )

  $content = Get-Content -LiteralPath $File -Raw
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

  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)

  Get-ChildItem -LiteralPath $From -File -Filter "*.md" | ForEach-Object {
    $target = Join-Path $To $_.Name
    if (!(Test-Path -LiteralPath $target)) {
      return
    }

    $targetContent = Get-Content -LiteralPath $target -Raw
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
      [System.IO.File]::WriteAllText($target, $updated + [Environment]::NewLine, $utf8NoBom)
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
  $block = "$markerStart`n.codex-context/raw/*`n!.codex-context/raw/.gitkeep`n$markerEnd"
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)

  if (Test-Path -LiteralPath $gitignore) {
    $content = Get-Content -LiteralPath $gitignore -Raw
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
  } elseif ($content.Contains(".codex-context/raw/*") -and $content.Contains("!.codex-context/raw/.gitkeep")) {
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
    [System.IO.File]::WriteAllText($gitignore, $updated + [Environment]::NewLine, $utf8NoBom)
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
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($TargetFile, $json + [Environment]::NewLine, $utf8NoBom)
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
Get-ChildItem -LiteralPath $sourceCodexScripts -Force | ForEach-Object {
  Copy-Item -LiteralPath $_.FullName -Destination $targetScriptDir -Recurse -Force
}
Copy-Item -LiteralPath (Join-Path $sourceScripts "instincts.mjs") -Destination (Join-Path $targetScriptDir "instincts.mjs") -Force
Copy-Item -LiteralPath (Join-Path $sourceScripts "project-ops-health.mjs") -Destination (Join-Path $targetScriptDir "project-ops-health.mjs") -Force
Copy-Item -LiteralPath (Join-Path $sourceScripts "release-check.mjs") -Destination (Join-Path $targetScriptDir "release-check.mjs") -Force
Copy-Item -LiteralPath (Join-Path $sourceScripts "state-prune.mjs") -Destination (Join-Path $targetScriptDir "state-prune.mjs") -Force
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
  throw "AGENTS.md contains an incomplete codex-project-ops marker block. Fix the marker pair before bootstrapping."
} else {
  [System.IO.File]::WriteAllText($agentsFile, $agentsContent + "`n" + $snippetBlock + "`n", $utf8NoBom)
}

Write-Host "Bootstrapped Dong Skills project context to $targetContext"
Write-Host "Installed project-level Dong Skills hooks to $targetCodex"
Write-Host "Ensured .gitignore protects .codex-context/raw runtime data"
Write-Host "Merged AGENTS.md project ops snippet into $agentsFile"
Write-Host "Restart Codex or start a new thread from this project. Open /hooks and trust project hooks if prompted."
