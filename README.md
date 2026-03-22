# SecureAuth

> A full-stack Node.js authentication platform with MongoDB, JWT sessions, bcrypt hashing, role-based access control, platform owner protection, avatar uploads, and a polished responsive UI.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-secureauth.giftedtech.co.ke-blue?style=flat-square)](https://secureauth.giftedtech.co.ke)
[![GitHub](https://img.shields.io/badge/GitHub-mauricegift%2Fsecure--auth-181717?style=flat-square&logo=github)](https://github.com/mauricegift/secure-auth)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-6%2B-47A248?style=flat-square&logo=mongodb)](https://mongodb.com)

---

## Live Demo

**[https://secureauth.giftedtech.co.ke](https://secureauth.giftedtech.co.ke)**

---

## Features

### Authentication
- **Signup & Login** — Email + password auth; login accepts username **or** email
- **JWT Sessions** — Tokens in httpOnly cookies, auto-refreshed every 14 minutes
- **Rate Limiting** — 10 requests per 15 minutes on auth endpoints
- **Input Validation** — Username, email, password strength, phone — both client and server
- **Duplicate checks** — Specific errors for duplicate email, username, and phone

### Roles & Access Control
- **Platform Owner** — The very first registered user becomes the permanent platform owner (crown badge); cannot be edited, disabled, or deleted by any other admin — enforced on both frontend and backend
- **Admin Role** — Admins can manage all users except the platform owner
- **User Role** — Standard authenticated users with profile management
- **Auto-promotion** — First registered user is automatically set as owner/admin, no database edits needed

### Admin Panel
- Search, paginate, and manage all users
- Edit user phone, email, role, and password
- Enable / disable accounts (cannot disable self or platform owner)
- Delete users with admin password confirmation (cannot delete self or platform owner)
- Protected actions: self-edit locks email, username, and role

### Profile & Security
- **Avatar Uploads** — Circular crop with Cropper.js; stored as MongoDB Buffer
- **Profile Management** — Update phone number, validated and uniqueness-checked
- **Password Change** — Strength-validated, must differ from current password
- **Tabbed Profile Page** — Profile info / Security / Account tabs
- **Live Password Strength Checklist** — Real-time per-rule feedback

### UI & UX
- **Responsive** — Works on all screen sizes; hamburger sidebar slides from top on mobile
- **AOS Animations** — Scroll-triggered fade-up entrance animations (bidirectional)
- **Dashboard Stagger** — Cards animate in sequence on load
- **Toast Notifications** — Colored border, icon, and progress bar
- **Role Badges** — Owner (gold/crown), Admin (violet/shield), User (green) — shown consistently across dashboard, profile, and admin panel
- **Scroll-to-top** — SVG progress ring button on all pages

### Security
- **bcrypt** — 12 hashing rounds
- **httpOnly cookies** — JWT never exposed to JavaScript
- **Disabled Account Handling** — Disabled users are auto-logged out on next request
- **Body size limit** — 10 MB JSON limit to prevent payload attacks

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18+ |
| Framework | Express.js |
| Database | MongoDB + Mongoose |
| Authentication | JWT (httpOnly cookies) + bcryptjs (12 rounds) |
| Rate Limiting | express-rate-limit |
| Avatar Cropping | Cropper.js |
| Avatar Storage | MongoDB Buffer (no filesystem dependency) |
| Frontend Styling | Tailwind CSS (CDN) |
| Icons | Font Awesome 6 |
| Animations | AOS (Animate On Scroll) |
| Validation | Custom regex — username, email, password, phone |

---

## Project Structure

```
secureauth/
├── index.js                  # Entry point — connects DB then starts server
├── config.js                 # All env vars with defaults (dotenv-aware)
├── example.env               # Copy to .env and fill in values
├── start.sh                  # Startup script (MongoDB + Node, Replit-aware)
├── lib/
│   ├── index.js              # Exports { db, auth }
│   ├── server.js             # Express app, middleware, static serving
│   ├── auth.js               # requireAuth, requireAdmin JWT middleware
│   ├── validation.js         # Shared validation (username, email, password, phone)
│   ├── db/
│   │   ├── index.js          # connectDB() + startup super-admin migration
│   │   └── models.js         # Mongoose User schema (includes isSuperAdmin flag)
│   └── routes/
│       ├── auth.js           # /api/auth/* — signup, login, logout, profile, avatar
│       ├── admin.js          # /api/admin/* — user management with owner protection
│       └── public.js         # /api/health
└── public/
    ├── index.html            # Landing + Dashboard (single page, auth-gated sections)
    ├── login/index.html      # Login — accepts username or email
    ├── signup/index.html     # Signup — live password strength checklist
    ├── profile/index.html    # Profile — 3 tabs (Profile / Security / Account)
    ├── admin/index.html      # Admin panel (admin-only, owner-protected)
    └── assets/
        ├── style.css         # Custom CSS — toasts, spinner, keyframes, scrollbar
        └── app.js            # Shared JS — auth guards, API helper, toasts, sidebar,
                              #             token refresh, AOS, scroll-to-top, role badges
```

---

## API Reference

### Auth — `/api/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/signup` | — | Register `{ username, email, password }` — rate limited |
| POST | `/login` | — | Login `{ identifier, password }` — accepts username **or** email |
| POST | `/logout` | — | Clear session cookie |
| GET | `/me` | ✓ | Get current user; returns `code: ACCOUNT_DISABLED` if disabled |
| POST | `/refresh` | ✓ | Issue a fresh JWT (client calls every 14 min) |
| GET | `/avatar/:id` | — | Serve user avatar image |
| PATCH | `/profile` | ✓ | Update `{ phone?, avatar? }` — avatar is base64 data URI |
| POST | `/change-password` | ✓ | `{ currentPassword, newPassword, confirmPassword }` |

### Admin — `/api/admin` *(admin role required)*

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | List all users — includes `isSuperAdmin` flag |
| PATCH | `/users/:id` | Edit phone, email, role, username, optional `newPassword` |
| PATCH | `/users/:id/toggle-disable` | Toggle disabled status |
| DELETE | `/users/:id` | Delete user — requires `adminPassword`; cannot delete self or owner |

> **Platform Owner protection** — all modification endpoints (`PATCH`, `toggle-disable`, `DELETE`) reject requests targeting the platform owner from any non-owner admin.

### Public — `/api`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server health check + uptime |

---

## Validation Rules

| Field | Rule |
|-------|------|
| Username | `^[a-z]{3,30}$` — lowercase letters only, 3–30 chars |
| Email | Valid format, uniqueness-checked |
| Password | Min 8 chars, max 128 — requires uppercase, lowercase, number, special char |
| Phone | `^\d{8,15}$` — digits only with country code, uniqueness-checked |

---

## Environment Variables

Copy `example.env` to `.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5000` | Server port |
| `MONGODB_URI` | `mongodb://localhost:27017/secureauth` | MongoDB connection string |
| `JWT_SECRET` | *(required)* | Generate with `crypto.randomBytes(64).toString('hex')` |
| `SESSION_SECRET` | *(required)* | Session secret |
| `JWT_EXPIRES_IN` | `7d` | JWT token lifetime |
| `NODE_ENV` | `development` | Environment (`development` / `production`) |

---

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or [Atlas](https://www.mongodb.com/atlas))

### Install & Run

```bash
# Clone the repo
git clone https://github.com/mauricegift/secure-auth.git
cd secure-auth

# Install dependencies
npm install

# Configure environment
cp example.env .env
# Edit .env with your JWT_SECRET, MONGODB_URI, etc.

# Start the server
node index.js
```

App runs at **http://localhost:5000**

### First Admin / Platform Owner
The **very first user to register** is automatically set as the platform owner — no database edits needed. They get a gold **Owner** badge and are fully protected from modification by other admins. On subsequent startups, if no owner is flagged yet (e.g. existing database), the earliest-registered user is automatically migrated.

---

## Pages

| URL | Access | Description |
|-----|--------|-------------|
| `/` | Public / Protected | Landing page (guests); Dashboard with stats and role badge (logged in) |
| `/login/` | Public | Login — username or email |
| `/signup/` | Public | Registration with live password strength |
| `/profile/` | Protected | Tabbed: Profile / Security / Account |
| `/admin/` | Admin only | User management with owner protection |

---

## Contact

Built by **Maurice Gift** — feel free to reach out:

| | |
|---|---|
| Portfolio | [me.giftedtech.co.ke](https://me.giftedtech.co.ke) |
| API / Services | [api.giftedtech.co.ke/contact](https://api.giftedtech.co.ke/contact) |
| WhatsApp Channel | [Follow on WhatsApp](https://whatsapp.com/channel/0029Vb6lNd511ulWbxu1cT3A) |
| GitHub | [github.com/mauricegift](https://github.com/mauricegift) |

---

*SecureAuth — production-ready authentication, zero compromise.*
