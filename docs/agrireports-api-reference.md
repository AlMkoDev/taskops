# AgriReports API Reference

## Base URL

```
https://your-domain.com/api/v1
```

All endpoints require JWT authentication unless otherwise noted.

---

## Authentication

### POST /auth/token

Get a JWT token for API access.

**Request:**
```http
POST /api/v1/auth/token
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": "7d",
    "user": {
      "id": "usr_123",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "admin",
      "team": "Field Ops"
    }
  }
}
```

**Errors:**
- `400` - Missing email or password
- `401` - Invalid credentials
- `500` - Internal server error

---

## Reports

### GET /reports

List reports with pagination and filtering.

**Request:**
```http
GET /api/v1/reports?status=draft&page=1&pageSize=20
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| status | string | No | Filter by status: draft, submitted, approved, rejected, changes_requested |
| frequency | string | No | Filter by period: daily, weekly, monthly, quarterly, closeout |
| authorId | string | No | Filter by author ID |
| reviewerId | string | No | Filter by reviewer ID |
| search | string | No | Search by role name or reporting window |
| page | number | No | Page number (default: 1) |
| pageSize | number | No | Items per page (default: 20) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "reports": [
      {
        "id": "rpt_1234567890_abc123",
        "period": "daily",
        "role": "field_ops_manager",
        "roleName": "Field Operations Manager",
        "status": "draft",
        "authorId": "usr_123",
        "author": {
          "id": "usr_123",
          "name": "John Doe",
          "email": "john@example.com"
        },
        "data": {},
        "reportingWindow": "2026-04-21",
        "createdAt": "2026-04-21T10:00:00.000Z",
        "updatedAt": "2026-04-21T10:00:00.000Z",
        "lastSavedAt": "2026-04-21T10:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 45,
      "page": 1,
      "pageSize": 20,
      "hasMore": true
    }
  }
}
```

---

### POST /reports/create

Create a new report.

**Request:**
```http
POST /api/v1/reports/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "period": "daily",
  "role": "field_ops_manager",
  "roleName": "Field Operations Manager",
  "reportingWindow": "2026-04-21",
  "data": {
    "metrics": [...],
    "narrative": "..."
  }
}
```

**Body Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| period | string | Yes | Report frequency: daily, weekly, monthly, quarterly, closeout |
| role | string | Yes | Role identifier |
| roleName | string | No | Human-readable role name |
| reportingWindow | string | No | Date or date range for the report |
| data | object | No | Report content and metrics |

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "rpt_1234567890_abc123",
    "period": "daily",
    "role": "field_ops_manager",
    "roleName": "Field Operations Manager",
    "status": "draft",
    "authorId": "usr_123",
    "author": {
      "id": "usr_123",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "data": {
      "metrics": [],
      "narrative": ""
    },
    "reportingWindow": "2026-04-21",
    "createdAt": "2026-04-21T10:00:00.000Z",
    "updatedAt": "2026-04-21T10:00:00.000Z",
    "lastSavedAt": "2026-04-21T10:00:00.000Z"
  },
  "message": "Report created successfully"
}
```

**Errors:**
- `400` - Missing required fields or invalid period
- `401` - Not authenticated
- `500` - Internal server error

---

### GET /reports/:id

Get a single report by ID.

**Request:**
```http
GET /api/v1/reports/rpt_1234567890_abc123
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "rpt_1234567890_abc123",
    "period": "daily",
    "role": "field_ops_manager",
    "roleName": "Field Operations Manager",
    "status": "submitted",
    "authorId": "usr_123",
    "author": {
      "id": "usr_123",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "data": {},
    "signature": "data:image/png;base64,...",
    "reviewerId": "usr_456",
    "reviewComments": "All metrics look good.",
    "reviewerSignature": "data:image/png;base64,...",
    "reportingWindow": "2026-04-21",
    "createdAt": "2026-04-21T10:00:00.000Z",
    "updatedAt": "2026-04-21T14:30:00.000Z",
    "lastSavedAt": "2026-04-21T12:15:00.000Z"
  }
}
```

**Errors:**
- `400` - Missing report ID
- `404` - Report not found
- `401` - Not authenticated
- `500` - Internal server error

---

### PUT /reports/:id

Update an existing report (draft or changes_requested only).

**Request:**
```http
PUT /api/v1/reports/rpt_1234567890_abc123
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": {
    "metrics": [...],
    "narrative": "Updated content"
  },
  "signature": "data:image/png;base64,...",
  "reportingWindow": "2026-04-21"
}
```

**Body Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| data | object | No | Updated report content |
| signature | string | No | Base64 PNG signature |
| reportingWindow | string | No | Updated reporting window |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "rpt_1234567890_abc123",
    ...
  },
  "message": "Report updated successfully"
}
```

**Errors:**
- `400` - Invalid state (not draft or changes_requested)
- `403` - Not author or admin
- `404` - Report not found
- `401` - Not authenticated
- `500` - Internal server error

---

### DELETE /reports/:id

Delete a report (draft only).

**Request:**
```http
DELETE /api/v1/reports/rpt_1234567890_abc123
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Report deleted successfully"
}
```

**Errors:**
- `400` - Report is not in draft state
- `403` - Not author or admin
- `404` - Report not found
- `401` - Not authenticated
- `500` - Internal server error

---

### POST /reports/:id/submit

Submit a draft report for review.

**Request:**
```http
POST /api/v1/reports/rpt_1234567890_abc123/submit
Authorization: Bearer <token>
Content-Type: application/json

{
  "signature": "data:image/png;base64,iVBORw0KGgo..."
}
```

**Body Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| signature | string | Yes | Base64 PNG digital signature |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "rpt_1234567890_abc123",
    "status": "submitted",
    "signature": "data:image/png;base64,...",
    ...
  },
  "message": "Report submitted for review successfully"
}
```

**Errors:**
- `400` - Missing signature or invalid state transition
- `403` - Not the author
- `404` - Report not found
- `401` - Not authenticated
- `500` - Internal server error

---

### POST /reports/:id/review

Review a submitted report (approve, reject, or request changes).

**Requires:** admin, reviewer, or manager role

**Request:**
```http
POST /api/v1/reports/rpt_1234567890_abc123/review
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "approve",
  "comments": "Report looks good, all metrics are within range.",
  "signature": "data:image/png;base64,iVBORw0KGgo..."
}
```

**Body Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| action | string | Yes | approve, reject, or changes_requested |
| comments | string | Conditional | Required for reject/changes_requested |
| signature | string | Conditional | Required for approve |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "rpt_1234567890_abc123",
    "status": "approved",
    "reviewerId": "usr_456",
    "reviewComments": "Report looks good...",
    "reviewerSignature": "data:image/png;base64,...",
    ...
  },
  "message": "Report approved successfully"
}
```

**Errors:**
- `400` - Invalid action, missing required fields, or invalid state transition
- `403` - Insufficient permissions
- `404` - Report not found
- `401` - Not authenticated
- `500` - Internal server error

---

## Workflow State Machine

### Allowed Transitions

```
draft ──────────────────────→ submitted
submitted ──────────────────→ approved
submitted ──────────────────→ rejected
submitted ──────────────────→ changes_requested
changes_requested ──────────→ submitted
approved ───────────────────→ (terminal)
rejected ───────────────────→ (terminal)
```

### Status Definitions

| Status | Description | Can Edit? | Can Delete? |
|--------|-------------|-----------|-------------|
| draft | Report is being created | ✅ Yes | ✅ Yes |
| submitted | Awaiting review | ❌ No | ❌ No |
| approved | Review passed | ❌ No | ❌ No |
| rejected | Review failed | ❌ No | ❌ No |
| changes_requested | Author must revise | ✅ Yes | ❌ No |

---

## Error Response Format

All errors follow this structure:

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {
    "field": ["Specific validation error"]
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Invalid request data |
| UNAUTHORIZED | 401 | Missing or invalid token |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| INVALID_TRANSITION | 400 | Invalid state transition |
| INVALID_STATE | 400 | Operation not allowed in current state |
| INTERNAL_ERROR | 500 | Server error |

---

## Rate Limiting

API endpoints are rate-limited to:
- **Authentication**: 10 requests per minute
- **Report Operations**: 100 requests per minute
- **Bulk Operations**: 50 requests per minute

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1682000000
```

---

## Best Practices

1. **Cache tokens** - Don't request a new token for every API call
2. **Handle errors** - Check `success` field and handle error codes
3. **Use pagination** - Don't request all reports at once
4. **Retry logic** - Implement exponential backoff for 500 errors
5. **Validate locally** - Check required fields before sending requests
6. **Secure storage** - Store JWT tokens securely (not in localStorage for production)

---

## SDK Examples

### JavaScript/TypeScript

```typescript
class AgriReportsAPI {
  private token: string;
  private baseUrl: string;

  constructor(token: string, baseUrl = '/api/v1') {
    this.token = token;
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
        ...options?.headers,
      },
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'API request failed');
    }

    return data.data;
  }

  async getReports(filters?: { status?: string; page?: number }) {
    const params = new URLSearchParams(filters as any);
    return this.request(`/reports?${params}`);
  }

  async createReport(body: { period: string; role: string }) {
    return this.request('/reports/create', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async submitReport(id: string, signature: string) {
    return this.request(`/reports/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ signature }),
    });
  }

  async reviewReport(id: string, action: string, comments?: string, signature?: string) {
    return this.request(`/reports/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ action, comments, signature }),
    });
  }
}
```

---

## Changelog

### v1.0.0 (2026-04-21)
- Initial release
- JWT authentication
- Full CRUD operations for reports
- Workflow engine (submit, approve, reject)
- Pagination and filtering
- Role-based access control
