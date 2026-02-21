param(
  [string]$SupabaseUrl = "https://jqfskvyqoyyjztwcjpia.supabase.co",
  [string]$ApiKey = "",
  [string]$ProjectRef = "jqfskvyqoyyjztwcjpia"
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($ApiKey)) {
  $json = npx.cmd supabase projects api-keys --project-ref $ProjectRef -o json
  $keys = $json | ConvertFrom-Json
  $legacyService = $keys | Where-Object { $_.id -eq "service_role" } | Select-Object -First 1
  if ($legacyService -and $legacyService.api_key) {
    $ApiKey = $legacyService.api_key
  }
}

if ([string]::IsNullOrWhiteSpace($ApiKey)) {
  throw "Service API key not found. Pass -ApiKey explicitly."
}

node scripts/check-import-counts.mjs --url $SupabaseUrl --key $ApiKey
