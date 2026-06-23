#!/usr/bin/env pwsh
# UIFlow2 Documentation Quick Finder for Windows PowerShell.
# Searches both file names and markdown content under this skill's docs directory.

[CmdletBinding()]
param(
    [Parameter(Position = 0, ValueFromRemainingArguments = $true)]
    [string[]] $Keyword,

    [int] $MaxResults = 0
)

$ErrorActionPreference = "Stop"

if ($MaxResults -le 0) {
    $envMax = $env:MAX_RESULTS -as [int]
    if ($envMax -gt 0) {
        $MaxResults = $envMax
    } else {
        $MaxResults = 80
    }
}

if (-not $Keyword -or $Keyword.Count -eq 0) {
    Write-Host "Usage: .\find_doc.ps1 <keyword> [keyword...]"
    Write-Host "Example: .\find_doc.ps1 env temperature"
    exit 1
}

$scriptDir = Split-Path -Parent $PSCommandPath
$docsDir = Resolve-Path -LiteralPath (Join-Path $scriptDir "..\docs")
$docsRoot = $docsDir.ProviderPath.TrimEnd("\", "/")

function Get-RelativeDocPath {
    param([Parameter(Mandatory = $true)][string] $Path)

    $relative = $Path
    if ($Path.StartsWith($docsRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
        $relative = $Path.Substring($docsRoot.Length).TrimStart("\", "/")
    }
    return ($relative -replace "\\", "/")
}

$query = $Keyword -join " "
Write-Host "Searching UIFlow2 docs for: $query"
Write-Host "------------------------------------------"

$files = @(Get-ChildItem -LiteralPath $docsRoot -Recurse -File -Filter "*.md")

$nameMatches = New-Object "System.Collections.Generic.HashSet[string]" ([System.StringComparer]::OrdinalIgnoreCase)
foreach ($file in $files) {
    $relative = Get-RelativeDocPath -Path $file.FullName
    foreach ($word in $Keyword) {
        if ($relative.IndexOf($word, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
            [void] $nameMatches.Add($relative)
            break
        }
    }
}

$sortedNameMatches = @($nameMatches | Sort-Object)

$contentMatches = @()
if ($files.Count -gt 0) {
    $matches = Select-String -LiteralPath $files.FullName -Pattern $Keyword -SimpleMatch -Encoding UTF8 -ErrorAction SilentlyContinue
    foreach ($match in $matches) {
        $relative = Get-RelativeDocPath -Path $match.Path
        $contentMatches += "{0}:{1}:{2}" -f $relative, $match.LineNumber, $match.Line
    }
}

Write-Host ""
Write-Host ("File name matches ({0}):" -f $sortedNameMatches.Count)
if ($sortedNameMatches.Count -gt 0) {
    $sortedNameMatches | ForEach-Object { Write-Host $_ }
} else {
    Write-Host "  (none)"
}

Write-Host ""
Write-Host ("Content matches ({0} line hits, first {1}):" -f $contentMatches.Count, $MaxResults)
if ($contentMatches.Count -gt 0) {
    $contentMatches | Select-Object -First $MaxResults | ForEach-Object { Write-Host $_ }
} else {
    Write-Host "  (none)"
}

if ($sortedNameMatches.Count -eq 0 -and $contentMatches.Count -eq 0) {
    exit 1
}
