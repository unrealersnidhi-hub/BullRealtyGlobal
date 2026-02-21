param(
  [string]$ProjectRef = "jqfskvyqoyyjztwcjpia",
  [string]$SupabaseUrl = "https://jqfskvyqoyyjztwcjpia.supabase.co",
  [string]$ProfilesCsv = "C:\Users\unrea\Downloads\Export\profiles-export-2026-02-21_08-54-42.csv",
  [string]$ServiceRoleKey = "",
  [switch]$GenerateRecoveryLinks = $true
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $ProfilesCsv)) {
  throw "Profiles CSV not found: $ProfilesCsv"
}

function New-RandomPassword {
  $chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*"
  $bytes = New-Object byte[] 18
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $sb = New-Object System.Text.StringBuilder
  foreach ($b in $bytes) {
    [void]$sb.Append($chars[$b % $chars.Length])
  }
  return $sb.ToString()
}

if ([string]::IsNullOrWhiteSpace($ServiceRoleKey)) {
  $keys = npx.cmd supabase projects api-keys --project-ref $ProjectRef -o json | Out-String | ConvertFrom-Json
  $legacyService = $keys | Where-Object { $_.id -eq "service_role" } | Select-Object -First 1
  if (-not $legacyService -or [string]::IsNullOrWhiteSpace($legacyService.api_key)) {
    throw "Could not resolve service_role key. Pass -ServiceRoleKey explicitly."
  }
  $ServiceRoleKey = $legacyService.api_key
}

$headers = @{
  "apikey" = $ServiceRoleKey
  "Authorization" = "Bearer $ServiceRoleKey"
  "Content-Type" = "application/json"
}

$profiles = Import-Csv -Path $ProfilesCsv -Delimiter ';' | Where-Object {
  -not [string]::IsNullOrWhiteSpace($_.email) -and -not [string]::IsNullOrWhiteSpace($_.user_id)
}

$existingUsers = @{}
$page = 1
while ($true) {
  $list = Invoke-RestMethod -Method Get -Uri "$SupabaseUrl/auth/v1/admin/users?page=$page&per_page=200" -Headers $headers
  if (-not $list.users -or $list.users.Count -eq 0) { break }
  foreach ($u in $list.users) {
    $existingUsers[$u.email.ToLower()] = $u
  }
  if ($list.users.Count -lt 200) { break }
  $page++
}

$results = New-Object System.Collections.Generic.List[object]

foreach ($p in $profiles) {
  $email = $p.email.Trim().ToLower()
  $oldUserId = $p.user_id.Trim()
  $fullName = $p.full_name
  $newUserId = $null
  $status = ""
  $errorMessage = ""
  $recoveryLink = ""

  try {
    if ($existingUsers.ContainsKey($email)) {
      $existing = $existingUsers[$email]
      $newUserId = $existing.id
      $status = "already_exists"
    } else {
      $password = New-RandomPassword
      $payload = @{
        id = $oldUserId
        email = $email
        password = $password
        email_confirm = $true
        user_metadata = @{
          full_name = $fullName
        }
      } | ConvertTo-Json -Depth 5

      $created = Invoke-RestMethod -Method Post -Uri "$SupabaseUrl/auth/v1/admin/users" -Headers $headers -Body $payload
      $newUserId = $created.id
      $status = "created"
      $existingUsers[$email] = $created
    }

    if ($GenerateRecoveryLinks -and $newUserId) {
      $linkPayload = @{
        type = "recovery"
        email = $email
      } | ConvertTo-Json
      $linkResp = Invoke-RestMethod -Method Post -Uri "$SupabaseUrl/auth/v1/admin/generate_link" -Headers $headers -Body $linkPayload
      $recoveryLink = $linkResp.properties.action_link
    }
  } catch {
    $status = "failed"
    if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
      $errorMessage = $_.ErrorDetails.Message
    } else {
      $errorMessage = $_.Exception.Message
    }
  }

  $results.Add([PSCustomObject]@{
    old_user_id = $oldUserId
    email = $email
    new_user_id = $newUserId
    status = $status
    recovery_link = $recoveryLink
    error = $errorMessage
  })
}

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$reportPath = "auth-user-import-report_$stamp.csv"
$results | Export-Csv -Path $reportPath -NoTypeInformation -Encoding UTF8

$createdCount = ($results | Where-Object { $_.status -eq "created" }).Count
$existsCount = ($results | Where-Object { $_.status -eq "already_exists" }).Count
$failedCount = ($results | Where-Object { $_.status -eq "failed" }).Count

Write-Host "Auth user import complete."
Write-Host "Created: $createdCount"
Write-Host "Already existed: $existsCount"
Write-Host "Failed: $failedCount"
Write-Host "Report: $reportPath"
