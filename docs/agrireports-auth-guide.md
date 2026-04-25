# AgriReports Authentication & API Guide

## Overview

The AgriReports platform uses a hybrid authentication system:
- **Session-based auth** for web UI (existing)
- **JWT tokens** for API access (new)

---

## Authentication Flow

### 1. Get JWT Token

```bash
POST /api/v1/auth/token
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
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

### 2. Use Token in API Requests

```bash
GET /api/v1/reports?status=draft&page=1
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

---

## Protected Endpoints

All `/api/v1/*` endpoints require JWT authentication.

### Available Endpoints

| Endpoint | Method | Description | Required Role |
|----------|--------|-------------|---------------|
| `/api/v1/auth/token` | POST | Get JWT token | Any |
| `/api/v1/reports` | GET | List reports (paginated) | Any authenticated |
| `/api/v1/reports/:id` | GET | Get report by ID | Any authenticated |
| `/api/v1/reports` | POST | Create new report | Any authenticated |
| `/api/v1/reports/:id` | PUT | Update report | Author or Admin |
| `/api/v1/reports/:id/submit` | POST | Submit for review | Author |
| `/api/v1/reports/:id/review` | POST | Review report | Admin/Reviewer |

---

## Using the Middleware

### Basic Authentication

```typescript
import { withAuth } from '@/lib/agrireports-middleware';
import { NextRequest, NextResponse } from 'next/server';

export const GET = withAuth(async (request: NextRequest, user) => {
  // user contains JWT payload
  console.log(user.email, user.role);
  
  return NextResponse.json({ success: true, data: [] });
});
```

### Role-Based Authorization

```typescript
import { withAuthAndRoles } from '@/lib/agrireports-middleware';

export const POST = withAuthAndRoles(
  ['admin', 'manager'], // Only these roles can access
  async (request: NextRequest, user) => {
    // Admin-only logic here
    return NextResponse.json({ success: true });
  }
);
```

### Manual Authentication Check

```typescript
import { requireAuth, unauthorizedResponse } from '@/lib/agrireports-middleware';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    
    // Handle request
    return NextResponse.json({ success: true });
  } catch (error) {
    return unauthorizedResponse();
  }
}
```

---

## JWT Configuration

### Environment Variables

```env
# JWT Secret (CHANGE IN PRODUCTION!)
JWT_SECRET=your-super-secret-key-min-32-chars

# Token expiration
JWT_EXPIRES_IN=7d
```

### Default Settings

- **Algorithm**: HS256 (HMAC with SHA-256)
- **Expiration**: 7 days
- **Payload**: User ID, email, name, role, team

---

## JWT Token Payload Structure

```typescript
interface AgriReportsJwtPayload {
  sub: string;        // User ID
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'reviewer' | 'field_ops' | 'compliance';
  team: string;
  iat: number;        // Issued at (timestamp)
  exp: number;        // Expiration (timestamp)
}
```

---

## Error Responses

### 401 Unauthorized

```json
{
  "success": false,
  "error": "UNAUTHORIZED",
  "message": "Authentication required"
}
```

### 403 Forbidden

```json
{
  "success": false,
  "error": "FORBIDDEN",
  "message": "Insufficient permissions"
}
```

### 400 Validation Error

```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Email and password are required"
}
```

---

## Security Best Practices

1. **Never commit JWT_SECRET** - Use environment variables
2. **Use strong secrets** - Minimum 32 characters
3. **Rotate secrets regularly** - Especially after security incidents
4. **Use HTTPS** - Always in production
5. **Short expiration** - 7 days for API tokens, shorter for sensitive operations
6. **Validate roles server-side** - Don't trust client-side role checks

---

## Testing

### Using cURL

```bash
# 1. Get token
curl -X POST http://localhost:3000/api/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@agrireports.com","password":"admin123"}'

# 2. Use token
curl http://localhost:3000/api/v1/reports \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Using JavaScript/Fetch

```javascript
// Login
const loginResponse = await fetch('/api/v1/auth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

const { data: { token } } = await loginResponse.json();

// Use token
const reportsResponse = await fetch('/api/v1/reports?status=draft', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { data: { reports } } = await reportsResponse.json();
```

---

## Architecture Notes

- **Repository Pattern**: Database operations isolated in `ReportRepository`
- **Middleware Pattern**: Auth logic separated from business logic
- **Type Safety**: Full TypeScript coverage with strict typing
- **Backward Compatibility**: Existing session-based auth still works for UI
- **Stateless**: JWT tokens don't require server-side session storage

---

## Migration from Session to JWT

For existing users:
1. Continue using session-based auth for web UI
2. Use JWT tokens for API integrations
3. Both systems coexist peacefully
4. Gradually migrate to JWT as needed

---

## Troubleshooting

### "Invalid token" Error
- Check if token has expired
- Verify JWT_SECRET matches between generation and verification
- Ensure token format is correct (no extra whitespace)

### "Authentication required" Error
- Make sure `Authorization` header is present
- Verify header format: `Bearer <token>`
- Check that token hasn't expired

### "Insufficient permissions" Error
- Verify user role matches endpoint requirements
- Check role spelling in middleware configuration
