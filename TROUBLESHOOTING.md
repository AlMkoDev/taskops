# Database Connection Troubleshooting

## Your Current Error: `ECONNREFUSED`

The logs show:
```
[AggregateError: ] { code: 'ECONNREFUSED' }
```

This means **the database connection is being refused**. 

---

## 🔍 Root Cause

Looking at your Render logs, there are **two possible issues**:

### Issue 1: DATABASE_URL Not Set or Incorrect
The most common cause is that the `DATABASE_URL` environment variable is either:
- Not set in Render
- Set to an incorrect value
- Pointing to a database that doesn't exist or isn't running

### Issue 2: Database Not Created Yet
If you're using Render's PostgreSQL service, you need to create the database first before the web service can connect to it.

---

## ✅ Step-by-Step Fix

### Step 1: Check if DATABASE_URL is Set

1. Go to your [Render Dashboard](https://dashboard.render.com/)
2. Click on your **taskops** web service
3. Click the **Environment** tab
4. Look for `DATABASE_URL` in the environment variables list

**If it's NOT there:** You need to add it (see Step 2)

**If it IS there:** Check that the value is correct (see Step 3)

---

### Step 2: Create a PostgreSQL Database on Render

#### Option A: Create via Render Dashboard (Recommended)

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **New+** → **PostgreSQL**
3. Fill in the details:
   ```
   Name: taskops-db
   Database: taskops
   User: taskops
   Region: (same region as your web service)
   Plan: Free
   ```
4. Click **Create Database**
5. **Wait 2-3 minutes** for the database to be ready
6. Once ready, copy the **Internal Database URL** (looks like):
   ```
   postgresql://taskops:password@hostname:5432/taskops
   ```

#### Option B: Use the render.yaml Blueprint

1. The `render.yaml` file is already in your repository
2. Go to Render Dashboard → **New+** → **Blueprint**
3. Connect your repository
4. Render will automatically create both the database and web service
5. Click **Apply**

---

### Step 3: Add DATABASE_URL to Your Web Service

1. Go to your **taskops** web service on Render
2. Click **Environment** tab
3. Click **Add Environment Variable**
4. Add:
   ```
   Key: DATABASE_URL
   Value: (paste the Internal Database URL from Step 2)
   ```
5. Click **Save Changes**

Also add these variables:
```
Key: NODE_ENV
Value: production

Key: POSTGRES_SSL
Value: true
```

---

### Step 4: Redeploy

1. Go to your web service dashboard
2. Click **Manual Deploy** → **Deploy latest commit**
3. Wait for the deployment to complete
4. Check the logs to see if the database connection succeeds

---

## 🔧 Alternative: Use External Database

If you prefer not to use Render's PostgreSQL, you can use any of these free alternatives:

### Supabase (Free PostgreSQL)
1. Go to [supabase.com](https://supabase.com/)
2. Create a new project
3. Go to Project Settings → Database
4. Copy the **Connection string** (URI mode)
5. Add it to Render as `DATABASE_URL`

### Neon (Free Serverless PostgreSQL)
1. Go to [neon.tech](https://neon.tech/)
2. Create a new project
3. Copy the connection string
4. Add it to Render as `DATABASE_URL`

---

## 📋 What Changed in This Update

I've improved the error handling so that:

1. ✅ **Better error messages** - You'll now see a clear 503 error instead of 500
2. ✅ **Connection timeouts** - Database connections will timeout faster (5s instead of hanging)
3. ✅ **Graceful fallback** - The app will try to use file-based auth if database fails
4. ✅ **No infinite retries** - The app won't spam connection attempts

---

## 🧪 Testing the Connection

After setting up the database, you can test if it's working:

1. Check Render logs for:
   ```
   [Postgres] Database initialized successfully
   ```

2. Try logging in with demo credentials:
   ```
   Email: shift.lead@agrireports.local
   Password: demo123
   ```

3. If login works, you'll see:
   ```
   POST /api/auth/login 200
   ```

---

## ❓ Still Having Issues?

### Check these common problems:

1. **Database region mismatch**: Make sure your database and web service are in the same region
2. **SSL not enabled**: Add `POSTGRES_SSL=true` to environment variables
3. **Wrong connection string format**: Should be `postgresql://user:password@host:port/dbname`
4. **Database not ready**: Wait a few minutes after creating the database
5. **Firewall/IP restrictions**: Render databases should allow internal connections by default

### View Detailed Logs

1. Go to your web service → **Logs** tab
2. Look for lines starting with:
   - `[Postgres]` - Database initialization messages
   - `[Login]` - Authentication attempts
   - `ECONNREFUSED` - Connection errors

---

## 🎯 Quick Checklist

- [ ] PostgreSQL database created on Render or external provider
- [ ] `DATABASE_URL` environment variable set correctly
- [ ] `NODE_ENV=production` set
- [ ] `POSTGRES_SSL=true` set
- [ ] Latest code deployed (commit `f5b9d00` or newer)
- [ ] Database is in "Ready" state (not "Creating")
- [ ] Web service and database in same region

Once all these are set, your login should work perfectly! 🚀
