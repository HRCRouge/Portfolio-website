# Ankit Gajurel — portfolio

Next.js + Supabase. Every file is commented; start with `app/admin/page.js` (admin) and `supabase/schema.sql` (data).

## Setup (about 10 minutes)
1. **Supabase**: create a free project, open *SQL Editor*, paste and run `supabase/schema.sql`.
2. **Admin account**: *Authentication → Users → Add user* (your email + a strong password). Then *Authentication → Sign In / Providers* and turn **off** "Allow new users to sign up", so nobody else can ever log in.
3. **Keys**: copy `.env.local.example` to `.env.local` and paste the Project URL and anon key (*Project Settings → API*).
4. **Run**: `npm install`, then `npm run dev`, then open http://localhost:3000/admin and log in.
5. **Deploy**: push to GitHub, import the repo in Vercel (free), add the same two env vars, then *Settings → Domains* to attach your domain.

## Notes
- Contact messages and CV requests appear in *Admin → Inbox*. Nothing is emailed automatically; you send the CV yourself.
- Add your socials in *Admin → Socials*; the footer appears once there is at least one.
- Photos are resized in the browser to 2560px WebP before upload to save free storage.
