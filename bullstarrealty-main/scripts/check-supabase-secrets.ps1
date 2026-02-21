param(
  [string]$ProjectRef = "jqfskvyqoyyjztwcjpia"
)

$ErrorActionPreference = "Stop"

$required = @(
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "AI_API_KEY",
  "AI_GATEWAY_URL",
  "RESEND_API_KEY",
  "MCUBE_API_TOKEN"
)

$raw = npx.cmd supabase secrets list --project-ref $ProjectRef
$existing = $raw |
  Select-String -Pattern '^\s+[A-Z0-9_]+' |
  ForEach-Object { ($_ -split '\|')[0].Trim() } |
  Where-Object { $_ -and $_ -ne "NAME" } |
  Sort-Object -Unique

Write-Host "Configured secrets:"
$existing | ForEach-Object { Write-Host " - $_" }

$missing = $required | Where-Object { $_ -notin $existing }

Write-Host ""
if ($missing.Count -eq 0) {
  Write-Host "All required secrets are configured."
} else {
  Write-Host "Missing required secrets:"
  $missing | ForEach-Object { Write-Host " - $_" }
}
