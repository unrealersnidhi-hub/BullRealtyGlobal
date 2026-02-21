param(
  [string]$SourceDbUrl = $env:SOURCE_DB_URL,
  [string]$TargetDbUrl = $env:TARGET_DB_URL,
  [string]$BackupFile = "supabase-backup.dump",
  [switch]$UseSql
)

$ErrorActionPreference = "Stop"

function Require-Command {
  param([string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Missing required command: $Name"
  }
}

if ([string]::IsNullOrWhiteSpace($SourceDbUrl)) {
  throw "SOURCE_DB_URL is required (env var or -SourceDbUrl)."
}

if ([string]::IsNullOrWhiteSpace($TargetDbUrl)) {
  throw "TARGET_DB_URL is required (env var or -TargetDbUrl)."
}

Write-Host "Starting Supabase migration..."

if ($UseSql) {
  Require-Command "pg_dump"
  Require-Command "psql"

  if (-not $BackupFile.EndsWith(".sql")) {
    $BackupFile = [System.IO.Path]::ChangeExtension($BackupFile, ".sql")
  }

  Write-Host "Exporting SQL dump from source..."
  & pg_dump --dbname $SourceDbUrl --no-owner --no-privileges --file $BackupFile

  Write-Host "Importing SQL dump into target..."
  & psql $TargetDbUrl -f $BackupFile
} else {
  Require-Command "pg_dump"
  Require-Command "pg_restore"

  if (-not $BackupFile.EndsWith(".dump")) {
    $BackupFile = [System.IO.Path]::ChangeExtension($BackupFile, ".dump")
  }

  Write-Host "Exporting custom-format dump from source..."
  & pg_dump --dbname $SourceDbUrl --format=custom --no-owner --no-privileges --file $BackupFile

  Write-Host "Restoring dump into target..."
  & pg_restore --dbname $TargetDbUrl --clean --if-exists --no-owner --no-privileges $BackupFile
}

Write-Host "Migration completed."
