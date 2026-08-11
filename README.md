# novels

**write. share. be read.**

Novels is a lightweight social publishing community for writers and readers, built with plain HTML/CSS/JavaScript, Supabase Auth/Postgres/Storage/RLS, and GitHub Pages.

## Launch candidate

The current launch candidate includes:

- public story discovery, search and genre filtering
- email sign-up/sign-in and password reset/change controls
- full writer profiles with avatar, banner, bio, tagline, location, genres and social links
- public writer pages with published work and follow controls
- direct image uploads from phone/computer for avatars, banners and story covers
- optional external image URL fallback
- private drafts and published stories
- editable story metadata and covers
- chapter manager with create, edit, preview, local autosave recovery, word count, reorder and delete
- version-controlled protection for the locked `Balance Due` manuscript
- likes, bookmarks, follows and reader comments
- automatic notifications for follows, likes, comments and new chapters
- reader font sizing, light/sepia/dark modes and saved reading progress
- story/profile/comment reporting
- author comment moderation and an admin moderation queue
- Terms of Use, Privacy Policy and Community Guidelines
- Row Level Security on exposed user/community data
- GitHub Actions syntax/security-marker checks before deployment

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

The browser uses only a Supabase publishable key; no service-role/admin key is shipped to the client. Public media is stored in a dedicated Supabase Storage bucket with per-user upload/update/delete policies.

The only current Supabase security-advisor warning is leaked-password protection, which is unavailable while the organisation remains on the Supabase Free plan.

## Deployment

GitHub Pages deploys from `main` → `/`.

Live address: `https://sumkindafreak.github.io/novels/`

The `Launch candidate checks` GitHub Action syntax-checks all frontend JavaScript, verifies required launch files and guards against server-secret markers being committed into client files.
