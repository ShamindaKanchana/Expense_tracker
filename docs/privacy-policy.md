# Privacy Policy — Expense Tracker

**Effective date:** [SET DATE BEFORE PUBLISHING]
**App:** Expense Tracker (`com.shaminda.expensetracker`)
**Developer:** [YOUR NAME / COMPANY]
**Contact for privacy questions and deletion requests:** [YOUR EMAIL]

This policy explains what Expense Tracker collects, why, who it is shared
with, how long it is kept, and how you can delete it. It is written to match
our Play Store Data Safety declaration.

---

## 1. Data we collect

| Data | Why | Required? |
|------|-----|-----------|
| Username | Account identity and sign-in | Yes |
| Email (optional) | Sign-in and account recovery (new accounts may use username only) | No |
| Password (stored as a one-way bcrypt hash — we never store or see your plain password) | Authentication | Yes |
| Expense records: amount, description, category, date | The app's core function — tracking your spending | Yes, when you add expenses |
| Voice transcript, app locale, timezone (voice input only) | Sent to our language provider to extract the expense from speech | Only when you tap the mic |
| Microphone access (foreground only) | Voice expense entry; no background recording | Only when you use voice input |
| Device and app-activity data (app version, OS, crash/diagnostic signals) | Fraud prevention, debugging, Play pre-launch reports | Automatic |

We do **not** collect your contacts, location history, photos, or files.
Typing an expense works fully without ever touching the microphone.

## 2. Voice input — please read before tapping the mic

When you use voice entry, your speech is transcribed **on your device** and
the resulting **text plus app locale and timezone** are sent to **Cohere**
solely to extract the expense details. We do **not** send your username,
email, or account ID.

Because speech can itself contain personal details, **avoid speaking account
numbers or other people's names**. The same warning is shown under the mic
button in the app in English, Sinhala, and Tamil.

## 3. Who data is shared with

We do not sell your data and do not use it for advertising. Data is shared
only with these service providers, for app functionality and fraud
prevention:

| Recipient | What they receive | Retention |
|-----------|-------------------|-----------|
| **Cohere** (language provider) | Voice transcript, locale, timezone | Prompts kept **30 days by default**. On our current free tier there is **no training opt-out and no data-processing agreement**, so prompts may be used for model improvement. Upgrading our Cohere plan would change this row. |
| **Aiven** (database hosting) | Encrypted account and expense records | As per account lifetime below |
| **Render** (API hosting) | Data you send and receive while using the app | Operational logs ≤ 30 days |
| **Vercel** (app download hosting) | Standard web delivery signals | Per their policy |

## 4. How data is protected

* **Encryption in transit:** TLS (HTTPS) between app, API, database, and Cohere.
* **Encryption at rest:** Expense descriptions and emails are encrypted per
  record with AES-256-GCM; database disks are encrypted by our host.
* **Passwords:** one-way bcrypt hashes (cost 10); hashes are never returned
  by any API.
* **Access control:** Every expense request is filtered to your own account
  by your sign-in token. Admin accounts cannot see other users' amounts.

## 5. How long data is kept

| Data | Kept until |
|------|------------|
| Expenses | You delete them, or delete your account |
| Account (username, email, password hash) | You delete your account |
| Password-reset rows | 90 days |
| Server logs | 30 days |
| Cohere voice prompts | 30 days (their default) |

## 6. Deleting your data

* **In the app:** Account → danger zone → delete your account (password
  confirmation required). This permanently wipes your account, expenses, and
  reset rows.
* **By email:** write to the contact address above from your account email
  and we will delete it.

## 7. Children

Expense Tracker is not directed at children under 13. Do not let children
use the voice feature unsupervised, since speech is sent to our provider as
described above.

## 8. Changes to this policy

If this policy changes materially (new provider, new retention), the updated
date above changes and the new text ships with the app update. Continued use
after an update means you accept the current text.

---

*Source of truth for the statements above: `docs/security.md` and
`docs/srs/playstore-data-safety.md` in the app repository. If this page and
the Play Data Safety form ever disagree, this page governs — tell us at the
contact address so we fix the form.*
