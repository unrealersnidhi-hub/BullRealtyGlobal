param(
  [string]$DbUrl = $env:TARGET_DB_URL
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($DbUrl)) {
  throw "TARGET_DB_URL is required (env var or -DbUrl)."
}

Write-Host "Pushing local migrations to remote Supabase..."
& npx.cmd supabase db push --db-url $DbUrl --include-all --yes

if ($LASTEXITCODE -ne 0) {
  throw "Migration push failed."
}

Write-Host "Migration push completed."
