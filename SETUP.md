# GSCC Pro — Setup Guide

## Prerequisites
- **Node.js 18+** — download from https://nodejs.org (choose LTS)
- A free **Supabase** account — https://supabase.com
- A free **Vercel** account (for deployment) — https://vercel.com

---

## Step 1 — Install Node.js
Download and install Node.js from https://nodejs.org/en/download
After installing, open a Terminal and verify:
```bash
node --version   # should show v18 or higher
npm --version
```

---

## Step 2 — Install project dependencies
Open Terminal, navigate to this project folder, then run:
```bash
cd "/Users/zhonghan/Documents/ClaudeCode/GSCC Pro"
npm install
```

---

## Step 3 — Create Supabase project
1. Go to https://supabase.com → New Project
2. Choose a name (e.g. `gscc-pro`), set a strong database password, pick the closest region
3. Wait ~2 minutes for the project to be ready
4. Go to **Settings → API** and copy:
   - Project URL
   - `anon` public key
   - `service_role` secret key

---

## Step 4 — Configure environment variables
Copy `.env.local.example` to `.env.local` and fill in your keys:
```bash
cp .env.local.example .env.local
```
Edit `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## Step 5 — Set up the database
1. In Supabase Dashboard → **SQL Editor**
2. Open the file `supabase/migrations/001_initial_schema.sql` from this project
3. Paste the entire contents into the SQL Editor and click **Run**
4. Verify the tables appear under **Table Editor**: `profiles`, `residents`, `emergency_contacts`, `care_notes`

---

## Step 6 — Create storage bucket
1. In Supabase Dashboard → **Storage** → **New bucket**
2. Name: `resident-photos`, uncheck "Public bucket" → Create
3. Go to **Storage → Policies** and add:
   - **SELECT policy**: allow authenticated users to read (`auth.uid() is not null`)
   - **INSERT policy**: allow admins to upload (`current_user_role() = 'admin'`)

---

## Step 7 — Create your first admin account
1. In Supabase Dashboard → **Authentication → Users** → **Invite user**
2. Enter your email address → Send invitation
3. Check your email, click the link, set your password
4. Go back to **SQL Editor** and run:
```sql
update public.profiles set role = 'admin' where id = '<your-user-uuid>';
```
Replace `<your-user-uuid>` with your user's UUID (visible in Authentication → Users)

---

## Step 8 — Run the app locally
```bash
npm run dev
```
Open http://localhost:3000 — you will be redirected to the login page.
Sign in with your admin email and password.

---

## Step 9 — Deploy to Vercel (optional)
1. Push this project to a GitHub repository
2. Go to https://vercel.com → **New Project** → import your GitHub repo
3. Add these **Environment Variables** in Vercel settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` = `https://your-app.vercel.app`
4. Deploy
5. In Supabase Dashboard → **Authentication → URL Configuration**:
   - Add `https://your-app.vercel.app/**` to **Redirect URLs**

---

## Features summary
| Feature | Who |
|---------|-----|
| View all residents | All staff |
| Add / edit / delete residents | Admin only |
| Upload resident photo | Admin only |
| Add care notes | All staff |
| Delete care notes | Admin only |
| Manage staff accounts | Admin only |
| View dashboard stats | All staff |

---

## Roles
- **Admin** — created via SQL update (step 7) or promoted via Staff Management page
- **Staff** — default role for all new accounts created via the "Add Staff" page
