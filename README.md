# novels

**write. share. be read.**

A lightweight community for writers and readers, built with plain HTML/CSS/JavaScript, Supabase Auth/Postgres/RLS, and GitHub Pages.

## Community beta

The app includes:

- reader discovery/feed and genre/search filters
- email sign-up and sign-in
- writer profiles
- private drafts and published stories
- chapter-based story publishing
- likes, bookmarks, comments, and follows
- a writer studio for creating and updating work
- a book-style reader

`Balance Due` by Toby Brandon is the featured launch story.

## Balance Due masters

The untouched original source remains at the repository root:

- `Balance_Due_Enhanced.docx`

The locked release masters are generated into:

- `balance-due/final/Balance_Due_FINAL.txt` — canonical final manuscript
- `balance-due/final/Balance_Due_FINAL.docx` — 6×9 Word edition
- `balance-due/final/Balance_Due_FINAL.epub` — ebook edition

`tools/build_balance_due.py` rebuilds the DOCX and EPUB from the canonical TXT so the release formats remain reproducible.

## Backend

Supabase project: `novels-community` (`efftrxqdsrmyuaubjumh`), London `eu-west-2`.

Every exposed table uses Row Level Security. The browser uses only a Supabase publishable key; no service-role/admin key is shipped to the client.

## Deployment

GitHub Actions builds the final book formats and deploys the community app to GitHub Pages.

Expected Pages address: `https://sumkindafreak.github.io/novels/`
