# SchoolStream

A mobile-first school events calendar. School staff paste emails, AI extracts the events, and parents subscribe to a filtered calendar feed for their child's year group.

## Project Structure

```
schoolstream/
├── auth.html         # Login and registration page
├── index.html        # App shell and all HTML markup
├── css/
│   └── styles.css    # All styles (mobile-first, responsive)
├── js/
│   ├── app.js            # Calendar app logic
│   ├── auth.js           # Login/registration logic
│   ├── config.example.js # Supabase config template (committed)
│   └── config.js         # Local Supabase config (gitignored)
├── supabase/
│   └── profiles_trigger.sql # Auto-create profile rows from auth.users
└── README.md
```

## Running Locally

No build tools required — just open `index.html` in a browser, or use VS Code's Live Server extension for auto-reload on save:

1. Install [VS Code](https://code.visualstudio.com/)
2. Install the **Live Server** extension (search in Extensions panel)
3. Right-click `index.html` → **Open with Live Server**
4. The app opens at `http://127.0.0.1:5500` and reloads on every save

## Supabase Setup

The app now reads/writes events from Supabase.

1. Create the `events` table in Supabase:
   ```sql
   create table events (
     id bigint generated always as identity primary key,
     title text not null,
     date date not null,
     time text,
     year_group text default 'all',
     notes text,
     created_at timestamp default now()
   );
   ```
2. Run `supabase/profiles_trigger.sql` in Supabase SQL Editor.
   This auto-creates a `profiles` row for each new Auth user with:
   - `status = 'pending'`
   - `role = 'parent'`
   If you see "Database error saving new user", re-run this SQL script to refresh the trigger/function.
3. Create `js/config.js` (or copy `js/config.example.js`) and set:
   ```js
   window.SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co';
   window.SUPABASE_ANON_KEY = 'YOUR_SUPABASE_PUBLISHABLE_KEY';
   ```
4. `js/config.js` is gitignored so keys are not committed.
5. Add a permissive RLS policy for development (or configure auth/policies as needed for production).

## Deploying to Vercel

1. Push this repo to GitHub.
2. Import the repo in Vercel.
3. In Vercel Project Settings -> Environment Variables, add:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
4. Deploy. `vercel.json` generates `js/config.js` at build time from those environment variables.
5. If env vars are missing, deploy still succeeds but falls back to template config, and the app shows a setup warning banner.

## Roadmap

- [ ] Connect to Supabase for persistent event storage
- [ ] Add admin vs. parent roles (Supabase Auth)
- [ ] Generate real `.ics` calendar feeds per year group
- [ ] Push notifications for new events
