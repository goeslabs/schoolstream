# SchoolStream

A mobile-first school events calendar. School staff paste emails, AI extracts the events, and parents subscribe to a filtered calendar feed for their child's year group.

## Project Structure

```
schoolstream/
├── index.html        # App shell and all HTML markup
├── css/
│   └── styles.css    # All styles (mobile-first, responsive)
├── js/
│   └── app.js        # All JavaScript logic
└── README.md
```

## Running Locally

No build tools required — just open `index.html` in a browser, or use VS Code's Live Server extension for auto-reload on save:

1. Install [VS Code](https://code.visualstudio.com/)
2. Install the **Live Server** extension (search in Extensions panel)
3. Right-click `index.html` → **Open with Live Server**
4. The app opens at `http://127.0.0.1:5500` and reloads on every save

## Deploying to Netlify (recommended)

1. Push this repo to GitHub
2. Go to [netlify.com](https://netlify.com) → **Add new site** → **Import from Git**
3. Select your GitHub repo
4. Leave build settings blank (no build step needed)
5. Click **Deploy** — your site will be live in ~30 seconds

Every time you push a change to GitHub, Netlify redeploys automatically.

## Roadmap

- [ ] Connect to Supabase for persistent event storage
- [ ] Add admin vs. parent roles (Supabase Auth)
- [ ] Generate real `.ics` calendar feeds per year group
- [ ] Push notifications for new events
