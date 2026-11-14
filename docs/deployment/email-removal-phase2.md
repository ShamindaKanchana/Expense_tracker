# Runbook: Email Removal Phase 2

| Field | Value |
|-------|--------|
| **Status** | Scheduled — do not execute before **2026-11-15** (Asia/Colombo) |
| **Related** | `MIG-07` in [../srs/playstore-data-safety.md](../srs/playstore-data-safety.md) |
| **Goal** | Make login username-only, remove legacy email storage, and retire `EMAIL_HMAC_PEPPER` |

> Reminder: keep email login and `EMAIL_HMAC_PEPPER` active until the end of
> **2026-11-15**, or until all four legacy users confirm they can sign in with
> their usernames. Do not drop columns before then.

## Legacy users to confirm

| Username | Note |
|----------|------|
| `Shaminda` | — |
| `Sachinthani` | Stored with a trailing space; sign in as `Sachinthani` |
| `kavinda99` | — |
| `Shaki` | — |

## Preconditions

- [ ] Phase 1 is deployed (`/api/auth/register` rejects `email`).
- [ ] The four users have been emailed their usernames and removal date.
- [ ] All four have confirmed username login, or the grace period has elapsed.
- [ ] `EMAIL_HMAC_PEPPER` is still present in production (current login needs it).
- [ ] A fresh production backup exists and restore has been tested.

## Cutover order

1. [ ] Deploy Phase 2 code:
   - Remove `email` from the login schema.
   - Make `User.findByLogin()` username-only.
   - Remove `User.findByEmail()` and `User.resolveEmail()`.
   - Remove email from login/profile/admin responses and UI.
2. [ ] Verify username login for all four legacy users.
3. [ ] Verify new registration and login use username only.
4. [ ] Take a fresh backup.
5. [ ] Run the schema migration:
   - Drop `users.email`.
   - Drop `users.temp_email_enc`.
   - Drop `users.temp_email_iv`.
   - Drop `users.email_hmac`.
6. [ ] Remove `EMAIL_HMAC_PEPPER` from the production environment.
7. [ ] Keep `ENC_KEY`; expense descriptions still depend on it.
8. [ ] Verify:
   - Username signup and login.
   - Username password reset/admin approval.
   - Profile and admin pages render without email.
   - No email decrypt/lookup errors in logs.
9. [ ] Update:
   - `MIG-07` to complete.
   - `docs/api.md`, `docs/database.md`, `docs/privacy-policy.md`.
   - Play **Data Safety** (email no longer collected).
   - `docs/security.md`.

## Rollback

- Restore the pre-migration backup if the code deployment fails before column drops.
- If columns are dropped and a rollback is required, restore the backup; do not
  recreate plaintext email columns manually.
- Keep the old `EMAIL_HMAC_PEPPER` backed up until the migration is confirmed
  stable in case a rollback restore needs it.
