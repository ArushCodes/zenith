# How to Setup Unlimited Verification Emails in Supabase (Custom SMTP)

By default, Supabase's built-in email service is meant only for quick testing and imposes a strict rate limit of **~3 to 4 emails per hour**. When students sign up, Supabase will block subsequent emails once this threshold is hit.

To send unlimited verification emails to `@learner.manipal.edu` student inboxes, you should connect a **Custom SMTP Provider**.

---

## Recommended Free Provider: Resend (3,000 free emails/month)

### Step 1: Create a free Resend Account
1. Go to [resend.com](https://resend.com) and sign up for a free account.
2. Go to **API Keys** -> Create an API Key (Name: `Supabase Auth`, Permissions: `Full Access`).
3. Copy the API Key (`re_xxxxxxxx...`).

---

### Step 2: Configure SMTP in your Supabase Dashboard
1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your Zenith project.
3. Go to **Project Settings** (gear icon at bottom left) -> **Authentication**.
4. Scroll down to **SMTP Settings** (or **Email Settings**).
5. Toggle **Enable Custom SMTP** to `ON`.
6. Fill in the following credentials:

| Setting | Value |
| :--- | :--- |
| **Sender Email** | `noreply@yourdomain.com` (or your verified email) |
| **Sender Name** | `Zenith — TAPMI Manipal` |
| **Host** | `smtp.resend.com` |
| **Port Number** | `465` (SSL/TLS) or `587` (STARTTLS) |
| **Minimum Encryption** | `SSL / TLS` |
| **Username** | `resend` |
| **Password** | *Your Resend API Key (`re_...`)* |

7. Click **Save**.

---

### Step 3: Enable Email Confirmation in Supabase Auth
1. In Supabase Dashboard, go to **Authentication** -> **Providers** -> **Email**.
2. Make sure **Enable Email Provider** is toggled `ON`.
3. Toggle **Confirm email** to `ON` so sign-up sends the verification link.
4. Set **Site URL** and **Redirect URLs** to your deployed website URL (and `http://localhost:5173` / `http://localhost:3000` for local dev).

---

### Alternate Providers:
If you prefer other services, the setup is identical—just use their SMTP server details:
- **SendGrid**: Host: `smtp.sendgrid.net`, User: `apikey`, Password: *SendGrid API Key*
- **Brevo (Sendinblue)**: Host: `smtp-relay.brevo.com`, Port: `587`
- **Gmail / Google Workspace**: Host: `smtp.gmail.com`, Port: `587`, User: *Your Gmail*, Password: *App Password*
