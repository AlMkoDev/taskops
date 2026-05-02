# TaskOps Render Deployment Guide

## Issue: Login 500 Error on Render

When you see a 500 error on login or the app banner says the database is unavailable, the Render web service is not reaching PostgreSQL safely. In production this app now requires PostgreSQL at startup so operational data is not written to temporary JSON fallback storage.

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
   - **Region**: Use the same region as the web service. The included Blueprint uses `oregon` for both.
   - **Plan**: Free (for testing)
4. Click **Create Database**
5. Wait for the database to be ready (takes 2-3 minutes)
6. Copy the **Internal Database URL** only if the web service is in the same Render account and region.

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
   - `REQUIRE_DATABASE` = `true`
7. Click **Save Changes**

#### Step 3: Redeploy

1. In the web service **Settings**, set **Start Command** to `npm run start:render` if it is not already using the repository Blueprint.
2. Go to **Manual Deploy** → **Deploy latest commit**
3. Wait for the deployment to complete. The deploy runs `npm run db:migrate` before starting Next.js.
4. Test the login again

If logs show `getaddrinfo ENOTFOUND dpg-...-a`, the service is using a Render internal database hostname that is not resolvable from that runtime. Fix it by using a Blueprint-managed database/web pair in the same region, or recreate the web service in the database's region. For services outside Render or in another region, use the database's External Database URL instead.

---

### Option 2: Use External PostgreSQL Database

If you have an external PostgreSQL database (Supabase, Neon, Railway, etc.):

1. Get your database connection string
2. Go to your Render web service → **Environment** tab
3. Add environment variable:
   - **Key**: `DATABASE_URL`
   - **Value**: `postgresql://user:password@host:port/database`
4. Add: `POSTGRES_SSL` = `true`
5. Add: `REQUIRE_DATABASE` = `true`
6. Redeploy the service

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
| `REQUIRE_DATABASE` | `true` | ✅ Yes in production |
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
3. If using a Render Internal Database URL, confirm the web service and database are in the same Render account and region
4. If using an External Database URL, confirm the database allows inbound connections and credentials are current

---

## Quick Fix (If you need immediate access)

If you need to test immediately without setting up a database:

1. The app supports file-based authentication as fallback only when `REQUIRE_DATABASE` is not `true`
2. For Render production, keep `REQUIRE_DATABASE=true` and set a working `DATABASE_URL`
3. You can use a free tier from:
   - [Supabase](https://supabase.com/) (Free PostgreSQL)
   - [Neon](https://neon.tech/) (Free Serverless PostgreSQL)
   - [Railway](https://railway.app/) (Free tier available)

Once you have a database URL, add it to Render environment variables and redeploy.
