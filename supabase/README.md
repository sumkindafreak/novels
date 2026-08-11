# Novels community database

The live backend is Supabase project `novels-community` (`efftrxqdsrmyuaubjumh`) in London (`eu-west-2`).

## Security

All exposed `public` tables use Row Level Security. The browser app uses only the project's publishable key; no service-role or secret key is shipped to the client.

Current community tables:

- `profiles`
- `stories`
- `chapters`
- `comments`
- `story_likes`
- `bookmarks`
- `follows`

The launch story, **Balance Due** by Toby Brandon, is seeded as the featured published story. Its full reader text is served from the version-controlled canonical final manuscript in `balance-due/final/Balance_Due_FINAL.txt`.

## One dashboard setting after Pages deployment

Supabase's connected management tools do not currently expose Auth URL Configuration as a write action. In the Supabase Dashboard, open:

**Authentication → URL Configuration**

Set **Site URL** to:

`https://sumkindafreak.github.io/novels/`

Also add that same address to **Redirect URLs**. This makes email-confirmation/auth redirects return to the live Novels site.

## Schema history

The beta schema is already live. Add checked-in SQL migrations here as the product moves beyond beta so database changes remain reproducible alongside the application code.
