# Shiksha Alumni Network

React + Vite front end on top of Supabase (auth, Postgres, storage, realtime).

```bash
npm install
cp .env.example .env   # fill in your Supabase URL and anon key
npm run dev
```

## Database setup

Run these in the Supabase SQL editor, in order. `schema.sql` first if this is a
fresh project, then each migration once.

| File | What it does |
| --- | --- |
| `supabase/schema.sql` | Base tables, RLS, and the `taken_slots` lookup |
| `supabase/migrations/001_profiles.sql` | `profiles` table + a row per signup |
| `supabase/migrations/002_avatar_storage.sql` | `avatars` storage bucket and its policies |
| `supabase/migrations/003_encrypted_messages.sql` | Encrypts chat messages at rest |
| `supabase/migrations/004_booking_concurrency.sql` | `book_session` / `cancel_booking` and the slot indexes |
| `supabase/migrations/005_one_session_per_student_slot.sql` | Stops one student holding two sessions at the same moment |
| `supabase/migrations/006_alumni_sample_photos.sql` | Fills in sample photos for alumni without one |
| `supabase/migrations/007_account_lookup.sql` | `account_exists` — lets "forgot password" check the address first |

`003` generates an encryption key and stores it in `private.crypto_keys`.
**Back that value up.** If it is lost, existing messages cannot be decrypted.

## Sign-in with Google

The login page offers Google as well as email and password. To turn it on:

1. Google Cloud Console → APIs & Services → Credentials → **Create OAuth client
   ID** (type: Web application).
2. Authorised redirect URI:
   `https://<your-project-ref>.supabase.co/auth/v1/callback`
3. Supabase Dashboard → Authentication → Providers → **Google**: paste the
   client ID and secret, save.
4. Supabase Dashboard → Authentication → URL Configuration: set the Site URL
   and add `http://localhost:5173/**` plus your deployed URL to the redirect
   allow-list. Password reset links land on `/reset-password`, so that path has
   to be reachable.

Until step 3 is done, the Google button returns a "provider is not enabled"
error; email and password sign-in works either way.

## Message security

Chat messages are protected in three layers:

- **In transit** — TLS between the browser and Supabase.
- **At rest** — bodies are stored as `pgp_sym_encrypt()` ciphertext in
  `messages.body_encrypted`. There is no plaintext column. A table dump or
  direct table read yields bytea.
- **In use** — the key lives in the `private` schema, which the `anon` and
  `authenticated` roles cannot read. Only two `security definer` functions can
  decrypt, and each one filters to the caller's own thread:
  `public.send_message()` and `public.thread_messages()`. Direct inserts into
  `messages` are no longer allowed by policy.

This is *not* end-to-end encryption, and it should not be described as such.
True E2EE needs a private key per participant, and alumni are rows in
`public.alumni` rather than `auth.users` — they have no account to hold one.
Making alumni real authenticated users is the prerequisite for E2EE; the layers
above are what is achievable until then.

## Booking concurrency

Two students picking the same slot at the same second is settled by Postgres,
not by the app: `bookings_slot_unique` is a partial unique index on
`(alumni_id, scheduled_at) where status = 'confirmed'`, so the first
transaction to commit wins and the second gets a unique violation that
`book_session()` turns into "That slot was just booked by someone else."

To see it happen, create two confirmed test accounts and run:

```powershell
$env:TEST_USER_A="john@example.com"; $env:TEST_PASS_A="..."
$env:TEST_USER_B="jane@example.com"; $env:TEST_PASS_B="..."
npm run test:booking-race
```

It fires both bookings in parallel and passes only if exactly one succeeds.
It cancels the winning booking afterwards.

## Checking the review fixes

```powershell
npm run test:v2
```

Covers the two Version 2 items a screenshot cannot show: that past sessions
drop off the "upcoming" list (`src/lib/bookings.js`, offline), and that
`account_exists` answers the forgot-password form. The second needs migration
007 applied — until it is, that check fails and says so. Set
`$env:TEST_KNOWN_EMAIL` to a real account's address to also cover the
address-is-registered case.

## Replacing the logo

The header, login card and reset page all render
`src/assets/Shiksha-Logo-Updated-1.png` through `src/components/Logo.jsx`. To
change the artwork, drop the new file in `src/assets/` and update that one
import.

The browser tab icon comes from a different file. `src/assets/shiksha-icon-source.png`
is the stacked logo shiksha-edu.com serves as its own site icon, at its full
1080px (`wp-content/uploads/2022/08/logo.png`). `public/favicon.ico` (16 through
256px) and `public/shiksha-mark.png` (512px, also the Apple touch icon) are cut
from it.

They hold the graduation-cap "S" only, not the whole lockup. The live site pads
the full stacked logo — mark, "Shiksha", and the tagline — into the icon, and
below about 48px the two lines of type collapse into noise. Cropping above the
wordmark keeps the same artwork legible at 16px.

Regenerate after replacing the source file:

```bash
python -c "
from PIL import Image
src = Image.open('src/assets/shiksha-icon-source.png').convert('RGBA')
mark = src.crop((0, 0, 1080, 636))    # everything above the wordmark
mark = mark.crop(mark.getbbox())
w, h = mark.size
side = int(max(w, h) * 1.08)
c = Image.new('RGBA', (side, side), (0, 0, 0, 0))
c.alpha_composite(mark, ((side - w) // 2, (side - h) // 2))
c.resize((512, 512), Image.LANCZOS).save('public/shiksha-mark.png')
c.resize((256, 256), Image.LANCZOS).save('public/favicon.ico',
    sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])
"
```

## Placeholder pages

Home, About Us, Programme and FAQs are laid out but filled with Lorem Ipsum.
The copy lives in `src/content/pages.js` — swap the strings there and no
component needs to change.
