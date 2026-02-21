param(
  [string]$ExportDir = "C:\Users\unrea\Downloads\Export",
  [string]$OutputFile = "supabase\migrations\20260221090000_import_lovable_exports.sql"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $ExportDir)) {
  throw "Export directory not found: $ExportDir"
}

function Quote-Identifier([string]$name) {
  return '"' + ($name -replace '"', '""') + '"'
}

function To-SqlLiteral([string]$table, [string]$column, [object]$value) {
  if ($null -eq $value) { return "NULL" }
  $s = [string]$value
  if ([string]::IsNullOrWhiteSpace($s)) { return "NULL" }

  if ($table -eq "automated_report_schedules" -and ($column -eq "recipient_emails" -or $column -eq "cc_emails")) {
    try {
      $items = ConvertFrom-Json -InputObject $s
      if ($items -is [System.Array]) {
        $arrVals = @()
        foreach ($item in $items) {
          $itemEscaped = ([string]$item) -replace "'", "''"
          $arrVals += "'$itemEscaped'"
        }
        return "ARRAY[" + ($arrVals -join ", ") + "]"
      }
    } catch {
      # Fallback to plain string literal when value is not valid JSON.
    }
  }

  $escaped = $s -replace "'", "''"
  return "'$escaped'"
}

$tableOrder = @(
  "blog_categories",
  "team_members",
  "leads",
  "profiles",
  "employees",
  "user_roles",
  "otp_verifications",
  "automated_report_schedules",
  "lead_assignees",
  "lead_assignment_history",
  "lead_interest_tags",
  "lead_notes",
  "lead_activities",
  "follow_ups",
  "meetings",
  "call_logs",
  "mcube_call_records",
  "integration_logs",
  "webhooks",
  "user_sessions",
  "user_locations",
  "attendance",
  "api_keys"
)

$lines = New-Object System.Collections.Generic.List[string]
$lines.Add("-- Auto-generated from Lovable CSV exports")
$lines.Add("-- Generated on $(Get-Date -Format s)")
$lines.Add("")
$lines.Add("BEGIN;")
$lines.Add("SET session_replication_role = replica;")
$lines.Add("")
$truncateList = ($tableOrder | ForEach-Object { "public." + (Quote-Identifier $_) }) -join ", "
$lines.Add("-- Clear imported tables before loading CSV data")
$lines.Add("TRUNCATE TABLE $truncateList RESTART IDENTITY CASCADE;")
$lines.Add("")

foreach ($table in $tableOrder) {
  $file = Get-ChildItem -Path $ExportDir -Filter "$table-export-*.csv" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (-not $file) {
    $lines.Add("-- Skipped $table (file not found)")
    $lines.Add("")
    continue
  }

  if ($file.Length -eq 0) {
    $lines.Add("-- Skipped $table (empty file)")
    $lines.Add("")
    continue
  }

  $rowsRaw = Import-Csv -Path $file.FullName -Delimiter ';'
  $rows = @()
  foreach ($r in @($rowsRaw)) {
    if ($null -eq $r) { continue }
    $hasAnyValue = $false
    foreach ($p in $r.PSObject.Properties) {
      if (-not [string]::IsNullOrWhiteSpace([string]$p.Value)) {
        $hasAnyValue = $true
        break
      }
    }
    if ($hasAnyValue) {
      $rows += $r
    }
  }
  if (-not $rows -or $rows.Count -eq 0) {
    $lines.Add("-- Skipped $table (no rows)")
    $lines.Add("")
    continue
  }

  $columns = $rows[0].PSObject.Properties.Name
  $quotedColumns = ($columns | ForEach-Object { Quote-Identifier $_ }) -join ", "
  $tableRef = "public." + (Quote-Identifier $table)

  $lines.Add("-- Import $table from $($file.Name) ($($rows.Count) rows)")
  $lines.Add("INSERT INTO $tableRef ($quotedColumns) VALUES")

  for ($i = 0; $i -lt $rows.Count; $i++) {
    $row = $rows[$i]
    $values = @()
    foreach ($col in $columns) {
      $values += (To-SqlLiteral $table $col $row.$col)
    }
    $suffix = if ($i -lt $rows.Count - 1) { "," } else { ";" }
    $lines.Add("  (" + ($values -join ", ") + ")" + $suffix)
  }

  $lines.Add("")
}

$lines.Add("SET session_replication_role = origin;")
$lines.Add("COMMIT;")
$lines.Add("")

Set-Content -Path $OutputFile -Value $lines -Encoding UTF8
Write-Output "Wrote migration: $OutputFile"
