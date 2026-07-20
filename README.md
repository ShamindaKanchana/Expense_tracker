# Expense Tracker

**English:** Expense Tracker · **සිංහල:** වියදම් පොත · **தமிழ்:** செலவு கணக்கு

A free personal expense tracking app: record spending by category, see monthly totals and charts, and manage your account — with a simple sign-in and **English / Sinhala / Tamil** interface.

Built with React, Node.js, Express, and MySQL.

## Live demo

[![Open app](https://img.shields.io/badge/Live_demo-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://expense-tracker-liard-nine.vercel.app)

## About the app

Expense Tracker helps you:

- Create an account with a **username and password** (no email required for new accounts)
- Add expenses with amount, description, **category**, and date
- View a **dashboard** (this month’s total, top category, charts, recent expenses)
- Browse a **monthly report** by year and month
- Change your password on the **Account** page
- Use the app in **English**, **Sinhala**, or **Tamil**

| Language | App name | Switcher label |
|----------|----------|----------------|
| English | Expense Tracker | **EN** |
| Sinhala | වියදම් පොත | **සිං** |
| Tamil | செலவு கணக்கு | **த** |

Expense **categories** stored in the database stay in English (`Food`, `Transport`, …). The UI shows translated labels when you switch language.

## Features

- Interactive dashboard with charts and summaries
- Add expenses with fixed categories
- Monthly report with year/month filters
- JWT authentication (username or email + password)
- Account page: profile, theme (light/dark), change password, language
- **Trilingual UI** (EN / SI / TA) with preference saved on the device
- **Forgot password** with administrator approval and a one-time code
- Responsive layout (desktop + mobile bottom navigation)
- Light / dark theme toggle

## Languages — how to use

1. Open the app (live demo or local).
2. On **Sign in** / **Sign up**, use the **EN | සිං | த** control (top of the card, next to Info/Help).
3. After you are signed in, switch language from:
   - the **navbar** (desktop), or
   - **Account → Language**
4. Your choice is stored in the browser (`localStorage`) and applied on the next visit.

**What is translated:** navigation, forms, buttons, dashboard labels, month names, category names in the UI, Info/Help, and common messages.

**What is not translated:** expense **descriptions** you type yourself, and (for now) the **admin panel** UI (still English).

## Password reset — how it works

New accounts are username-only, so reset is **not** email-based. An administrator must approve the request and share a code with you out-of-band (message, call, in person, etc.).

### Steps for users

1. On the sign-in page, open **Forgot password?**
2. Enter your **username** and submit the request.
3. You will see a **Request submitted** screen (not a code yet).
4. Wait until the **administrator** approves the request and gives you a **one-time code**.
5. Choose **I have my code — set new password** (or open **Set a new password** from the links).
6. Enter **username**, the **code**, and your **new password** (twice), then save.
7. Sign in with the new password.

If you already know you have a code, go straight to **Set a new password** from the login page.

### Notes

- The public form always shows a generic success message (it does not reveal whether the username exists).
- The code is shown to the **admin only once** when they approve; it expires after a short time.
- After you change the password, the code cannot be reused.

### Operators (admin)

Admins sign in at a separate path (`/admin/login` — not linked from the user app), review **pending password resets**, then **Approve** (copy the code and send it to the user) or **Reject**.

Seed credentials: set `ADMIN_USERNAME` and `ADMIN_PASSWORD` in the backend environment. See [docs/srs/password-reset-admin-approval.md](docs/srs/password-reset-admin-approval.md) and [docs/srs/admin-panel.md](docs/srs/admin-panel.md).

## Tech stack

| Layer | Stack |
|-------|--------|
| Frontend | React 18, React Router, Axios, Chart.js, **i18next / react-i18next**, CSS |
| Backend | Node.js, Express, JWT, MySQL |
| Hosting (typical) | Frontend on Vercel; API on Render (or similar); MySQL on Aiven |

## Getting started (local)

Full guide: **[docs/development.md](docs/development.md)**

```bash
# Backend
cd backend
npm install
cp .env.example .env   # edit DB_*, JWT_SECRET, optional ADMIN_*
npm run dev            # http://localhost:5000

# Frontend (second terminal)
cd frontend
npm install
cp .env.example .env   # REACT_APP_API_URL=http://localhost:5000/api
npm start              # http://localhost:3000
```

### Useful docs

| Doc | Description |
|-----|-------------|
| [docs/development.md](docs/development.md) | Local setup, env vars, troubleshooting |
| [docs/api.md](docs/api.md) | API endpoints and auth |
| [docs/database.md](docs/database.md) | Schema and models |
| [docs/deployment/README.md](docs/deployment/README.md) | Production deployment |
| [docs/releases/README.md](docs/releases/README.md) | Version history (current: **v0.4.0**) |
| [docs/srs/README.md](docs/srs/README.md) | Product requirements (admin, password reset) |

## Environment variables (summary)

### Backend

| Variable | Purpose |
|----------|---------|
| `PORT` | API port (default `5000`) |
| `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT` | MySQL connection |
| `JWT_SECRET` | Signs user (and admin) tokens |
| `NODE_ENV` | `development` / `production` |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | Optional; seeds admin account for panel + password resets |
| `CORS_ALLOWED_ORIGINS` | Production CORS allow-list |

### Frontend

| Variable | Purpose |
|----------|---------|
| `REACT_APP_API_URL` | API base URL (e.g. `http://localhost:5000/api`) |

## Contributing

Contributions are welcome.

1. Fork the repository  
2. Create a feature branch (`git checkout -b feature/your-feature`)  
3. Commit and push  
4. Open a Pull Request  

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [React](https://reactjs.org/), [Express](https://expressjs.com/), [MySQL](https://www.mysql.com/), [Chart.js](https://www.chartjs.org/), [i18next](https://www.i18next.com/)
- Hosting: [Vercel](https://vercel.com/), [Aiven](https://aiven.io/), and related free-tier services

---

Built with ❤️ by **Shaminda Kanchana** · **ෂමින්ද කාංචන** · **ஷமிந்த காஞ்சன**
