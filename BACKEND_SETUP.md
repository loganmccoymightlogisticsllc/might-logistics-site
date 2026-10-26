# Back end setup

> Status: the Supabase project `might-logistics` (id wgtryggabrcctpwyavqe, US East 2) already has `schema.sql` and `storage.sql` applied. Remaining: create your admin login (step 1.4-1.5) and the Vercel settings (step 2).

(Original full steps, about 20 minutes, no coding:)

What this gives you: one private database that stores everything. Right now it receives every website form
(quote requests, dispatch signups, carrier onboarding, with their PDFs) and holds the full structure for accounts,
loads, quotes, carrier vetting, documents, sales leads and the change log. The privacy rules are enforced inside the
database itself: employees can never read money, brokers only see brokerage work, dispatchers only dispatch,
and the change log cannot be edited or deleted by anyone.

## 1. Create the database (Supabase)
1. Go to supabase.com and sign up with your company email. Create an organization, then **New project**.
   Name it `might-logistics`, pick the region closest to Texas (US East or US Central), and **save the database password**.
2. Left menu: **SQL Editor > New query**. Paste all of `supabase/schema.sql` and press **Run**. It should say "Success".
3. New query again. Paste all of `supabase/storage.sql` and press **Run**.
4. Left menu: **Authentication > Users > Add user > Create new user.** Use your email and a strong password. Copy the
   user's **UID** shown in the list.
5. New query. Paste this (use your UID and name) and Run. This makes you the admin:
   `insert into profiles (id, full_name, role) values ('PASTE-YOUR-UID', 'Your Name', 'admin');`

## 2. Connect the website to it (Vercel)
1. Supabase: **Project Settings > API**. Copy the **Project URL** and the **service_role** key.
   The service_role key is a master key. Never paste it into a web page, an email or a chat.
2. Vercel: your project > **Settings > Environment Variables**. Add:
   `SUPABASE_URL` = the Project URL, `SUPABASE_SERVICE_ROLE_KEY` = the service_role key, `IP_SALT` = any long random text.
3. **Deployments > Redeploy.** Open `yoursite/api/health`. It should show `{"ok":true}`.
4. Submit a test quote on the site. In Supabase: **Table Editor > intake_submissions** shows it.

## 3. Turn on backups
Free Supabase projects do not include daily backups and can pause when idle. Upgrade the project to the paid plan
before real customers use it (check Supabase's current pricing page), then confirm **Database > Backups** lists daily backups.

## 4. Let Claude push changes to GitHub
Open https://github.com/apps/claude/installations/select_target, choose the `loganmccoymightlogisticsllc` account and
install it with access to `might-logistics-site`.

## Known limits
* Website forms accept PDF, PNG and JPG files, 4 MB each and about 4.4 MB per submission in total (a Vercel limit).
* The employee portal, CRM and shipper portal are still working prototypes with sample data. The next phase connects
  them to this database with real logins (Google sign-in plus 2-step for staff).
* Never commit real keys. `.env.example` shows the names only.
