# AgriReports API - Quick Test Script (PowerShell)
# Run: .\scripts\test-agrireports-api.ps1

# ==========================================
# Configuration
# ==========================================
$BaseUrl = "http://localhost:3000/api/v1"
$Email = "admin@example.com"
$Password = "admin123"

function Write-Section {
    param([string]$Title)
    Write-Host "`n=== $Title ===" -ForegroundColor Cyan
}

function Write-Json {
    param($Object)
    $Object | ConvertTo-Json -Depth 10
}

# ==========================================
# 1. Get JWT Token
# ==========================================
Write-Section "Step 1: Authenticate and get token"

$TokenResponse = Invoke-RestMethod -Uri "$BaseUrl/auth/token" -Method POST `
    -ContentType "application/json" `
    -Body (@{
        email = $Email
        password = $Password
    } | ConvertTo-Json)

Write-Json $TokenResponse
$Token = $TokenResponse.data.token
Write-Host "`nToken: $($Token.Substring(0, [Math]::Min(50, $Token.Length)))..." -ForegroundColor Yellow

# ==========================================
# 2. Create a New Report
# ==========================================
Write-Section "Step 2: Create a new report"

$CreateResponse = Invoke-RestMethod -Uri "$BaseUrl/reports/create" -Method POST `
    -Headers @{ Authorization = "Bearer $Token" } `
    -ContentType "application/json" `
    -Body (@{
        period = "daily"
        role = "field_ops_manager"
        roleName = "Field Operations Manager"
        reportingWindow = "2026-04-21"
        data = @{
            executiveSummary = "All operations running smoothly."
            metrics = @()
        }
    } | ConvertTo-Json -Depth 5)

Write-Json $CreateResponse
$ReportId = $CreateResponse.data.id
Write-Host "`nReport ID: $ReportId" -ForegroundColor Yellow

# ==========================================
# 3. Get Report by ID
# ==========================================
Write-Section "Step 3: Get report details"

$GetResponse = Invoke-RestMethod -Uri "$BaseUrl/reports/$ReportId" -Method GET `
    -Headers @{ Authorization = "Bearer $Token" }

Write-Json $GetResponse

# ==========================================
# 4. List Reports (with filters)
# ==========================================
Write-Section "Step 4: List all draft reports"

$ListResponse = Invoke-RestMethod -Uri "$BaseUrl/reports?status=draft&page=1&pageSize=10" -Method GET `
    -Headers @{ Authorization = "Bearer $Token" }

Write-Json $ListResponse

# ==========================================
# 5. Update Report
# ==========================================
Write-Section "Step 5: Update report"

$UpdateResponse = Invoke-RestMethod -Uri "$BaseUrl/reports/$ReportId" -Method PUT `
    -Headers @{ Authorization = "Bearer $Token" } `
    -ContentType "application/json" `
    -Body (@{
        data = @{
            executiveSummary = "Updated: All operations running smoothly with new metrics."
            metrics = @(
                @{
                    id = "metric_1"
                    name = "Yield"
                    value = 95.5
                    status = "on_track"
                }
            )
        }
    } | ConvertTo-Json -Depth 5)

Write-Json $UpdateResponse

# ==========================================
# 6. Submit Report for Review
# ==========================================
Write-Section "Step 6: Submit report for review"

$SubmitResponse = Invoke-RestMethod -Uri "$BaseUrl/reports/$ReportId/submit" -Method POST `
    -Headers @{ Authorization = "Bearer $Token" } `
    -ContentType "application/json" `
    -Body (@{
        signature = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
    } | ConvertTo-Json)

Write-Json $SubmitResponse

# ==========================================
# 7. Review Report (as Admin)
# ==========================================
Write-Section "Step 7: Approve report (requires admin role)"

$ReviewResponse = Invoke-RestMethod -Uri "$BaseUrl/reports/$ReportId/review" -Method POST `
    -Headers @{ Authorization = "Bearer $Token" } `
    -ContentType "application/json" `
    -Body (@{
        action = "approve"
        comments = "All metrics are within acceptable range. Report approved."
        signature = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
    } | ConvertTo-Json)

Write-Json $ReviewResponse

# ==========================================
# 8. Try Invalid Operations
# ==========================================
Write-Section "Step 8: Test validation - Try to update approved report"

try {
    $InvalidUpdate = Invoke-RestMethod -Uri "$BaseUrl/reports/$ReportId" -Method PUT `
        -Headers @{ Authorization = "Bearer $Token" } `
        -ContentType "application/json" `
        -Body (@{
            data = @{
                executiveSummary = "This should fail!"
            }
        } | ConvertTo-Json)
    
    Write-Json $InvalidUpdate
} catch {
    Write-Host "Expected error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
}

# ==========================================
# 9. Test Without Authentication
# ==========================================
Write-Section "Step 9: Test without token (should fail)"

try {
    $NoAuth = Invoke-RestMethod -Uri "$BaseUrl/reports" -Method GET
    Write-Json $NoAuth
} catch {
    Write-Host "Expected error: $($_.Exception.Message)" -ForegroundColor Red
}

# ==========================================
# 10. Delete Report (if still in draft)
# ==========================================
Write-Section "Step 10: Delete report (only works for drafts)"

try {
    $DeleteResponse = Invoke-RestMethod -Uri "$BaseUrl/reports/$ReportId" -Method DELETE `
        -Headers @{ Authorization = "Bearer $Token" }
    
    Write-Json $DeleteResponse
} catch {
    Write-Host "Delete failed (expected if report was approved): $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "`n=== All tests completed! ===" -ForegroundColor Green
