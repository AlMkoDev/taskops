# TaskOps Render Deployment Guide

## Issue: Login 500 Error on Render

When you see a 500 error on login, it's because the `DATABASE_URL` environment variable is not configured on Render.

## Solution: Configure Database on Render

You have **two options** to fix this:

---

### Option 1: Use Render PostgreSQL Database (Recommended)

#### Step 1: Create a PostgreSQL Database on Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **New+** → **PostgreSQL**
3. Configure your database:
   - **Name**: `taskops-db`
   - **Database**: `taskops`
   - **User**: `taskops`
   - **Region**: Choose closest to you
   - **Plan**: Free (for testing)
4. Click **Create Database**
5. Wait for the database to be ready (takes 2-3 minutes)
6. Copy the **Internal Database URL** (looks like: `postgresql://user:password@host:5432/dbname`)

#### Step 2: Add Environment Variable to Your Web Service

1. Go to your Render web service dashboard
2. Click **Environment** tab
3. Click **Add Environment Variable**
4. Add the following:
   - **Key**: `DATABASE_URL`
   - **Value**: Paste the Internal Database URL from Step 1
5. Click **Save Changes**
6. Add these additional variables:
   - `NODE_ENV` = `production`
   - `POSTGRES_SSL` = `true`
7. Click **Save Changes**

#### Step 3: Redeploy

1. Go to **Manual Deploy** → **Deploy latest commit**
2. Wait for the deployment to complete
3. Test the login again

---

### Option 2: Use External PostgreSQL Database

If you have an external PostgreSQL database (Supabase, Neon, Railway, etc.):

1. Get your database connection string
2. Go to your Render web service → **Environment** tab
3. Add environment variable:
   - **Key**: `DATABASE_URL`
   - **Value**: `postgresql://user:password@host:port/database`
4. Add: `POSTGRES_SSL` = `true`
5. Redeploy the service

---

### Option 3: Use render.yaml (Automatic Setup)

If you want to automate the entire setup:

1. The `render.yaml` file has been created in your repository
2. Go to [Render Dashboard](https://dashboard.render.com/)
3. Click **New+** → **Blueprint**
4. Connect your repository
5. Render will automatically create:
   - PostgreSQL database
   - Web service
   - All environment variables
6. Click **Apply**

---

## Required Environment Variables

| Variable | Value | Required |
|----------|-------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ Yes |
| `NODE_ENV` | `production` | ✅ Yes |
| `POSTGRES_SSL` | `true` | ✅ Yes |
| `NEXT_PUBLIC_APP_URL` | Your Render URL | Auto-set |
| `APP_BASE_URL` | Your Render URL | Auto-set |
| `USE_NOTIFICATION_QUEUE` | `false` | Optional |

---

## Testing Locally

If you want to test without a database, the app will fall back to file-based authentication:

```bash
# Don't set DATABASE_URL, and it will use JSON files in /data
npm run dev
```

The seed users will be created in `data/auth-users.json` with password `demo123`.

---

## Troubleshooting

### Still getting 500 error?

1. Check Render logs: **Logs** tab → Look for database connection errors
2. Verify `DATABASE_URL` is set correctly
3. Make sure `POSTGRES_SSL=true` is set
4. Check that the database is running and accessible

### Database migration errors?

The app will automatically run migrations on first connection. If you see errors:
1. Check the logs for specific migration failures
2. Try clearing the database and redeploying
3. Ensure your PostgreSQL version is 12+

### Can't connect to database?

1. Verify the connection string format: `postgresql://user:password@host:port/dbname`
2. Check that SSL is enabled (`POSTGRES_SSL=true`)
3. Ensure the database allows connections from Render's IP range

---

## Quick Fix (If you need immediate access)

If you need to test immediately without setting up a database:

1. The app supports file-based authentication as fallback
2. However, on Render, you still need `DATABASE_URL` set
3. You can use a free tier from:
   - [Supabase](https://supabase.com/) (Free PostgreSQL)
   - [Neon](https://neon.tech/) (Free Serverless PostgreSQL)
   - [Railway](https://railway.app/) (Free tier available)

Once you have a database URL, add it to Render environment variables and redeploy.
