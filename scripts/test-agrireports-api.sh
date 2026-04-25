# AgriReports API - Quick Test Script
# Run these commands to test the API endpoints

# ==========================================
# Configuration
# ==========================================
BASE_URL="http://localhost:3000/api/v1"
EMAIL="admin@example.com"
PASSWORD="admin123"

# ==========================================
# 1. Get JWT Token
# ==========================================
echo "=== Step 1: Authenticate and get token ==="

TOKEN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/token" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

echo "$TOKEN_RESPONSE" | jq .

# Extract token (requires jq)
TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.data.token')
echo ""
echo "Token: ${TOKEN:0:50}..."
echo ""

# ==========================================
# 2. Create a New Report
# ==========================================
echo "=== Step 2: Create a new report ==="

CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/reports/create" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "period": "daily",
    "role": "field_ops_manager",
    "roleName": "Field Operations Manager",
    "reportingWindow": "2026-04-21",
    "data": {
      "executiveSummary": "All operations running smoothly.",
      "metrics": []
    }
  }')

echo "$CREATE_RESPONSE" | jq .

REPORT_ID=$(echo "$CREATE_RESPONSE" | jq -r '.data.id')
echo ""
echo "Report ID: $REPORT_ID"
echo ""

# ==========================================
# 3. Get Report by ID
# ==========================================
echo "=== Step 3: Get report details ==="

curl -s -X GET "$BASE_URL/reports/$REPORT_ID" \
  -H "Authorization: Bearer $TOKEN" | jq .

echo ""

# ==========================================
# 4. List Reports (with filters)
# ==========================================
echo "=== Step 4: List all draft reports ==="

curl -s -X GET "$BASE_URL/reports?status=draft&page=1&pageSize=10" \
  -H "Authorization: Bearer $TOKEN" | jq .

echo ""

# ==========================================
# 5. Update Report
# ==========================================
echo "=== Step 5: Update report ==="

curl -s -X PUT "$BASE_URL/reports/$REPORT_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "data": {
      "executiveSummary": "Updated: All operations running smoothly with new metrics.",
      "metrics": [
        {
          "id": "metric_1",
          "name": "Yield",
          "value": 95.5,
          "status": "on_track"
        }
      ]
    }
  }' | jq .

echo ""

# ==========================================
# 6. Submit Report for Review
# ==========================================
echo "=== Step 6: Submit report for review ==="

curl -s -X POST "$BASE_URL/reports/$REPORT_ID/submit" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
  }' | jq .

echo ""

# ==========================================
# 7. Review Report (as Admin)
# ==========================================
echo "=== Step 7: Approve report (requires admin role) ==="

curl -s -X POST "$BASE_URL/reports/$REPORT_ID/review" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "action": "approve",
    "comments": "All metrics are within acceptable range. Report approved.",
    "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
  }' | jq .

echo ""

# ==========================================
# 8. Try Invalid Operations
# ==========================================
echo "=== Step 8: Test validation - Try to update approved report ==="

curl -s -X PUT "$BASE_URL/reports/$REPORT_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "data": {
      "executiveSummary": "This should fail!"
    }
  }' | jq .

echo ""

# ==========================================
# 9. Test Without Authentication
# ==========================================
echo "=== Step 9: Test without token (should fail) ==="

curl -s -X GET "$BASE_URL/reports" | jq .

echo ""

# ==========================================
# 10. Delete Report (if still in draft)
# ==========================================
echo "=== Step 10: Delete report (only works for drafts) ==="

curl -s -X DELETE "$BASE_URL/reports/$REPORT_ID" \
  -H "Authorization: Bearer $TOKEN" | jq .

echo ""
echo "=== All tests completed! ==="
