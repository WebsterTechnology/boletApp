# BoletApp — Architecture Guide

> Internal technical documentation for understanding and maintaining the BoletApp production system.

## 1. System overview

BoletApp is a full-stack lottery platform with a web application, mobile application, REST API, PostgreSQL database, real-time notifications, administration tools, and InfinitePay checkout integration.

The repository is organized into three main applications:

```text
boletApp/
├── frontend/     React web application
├── backend/      Node.js / Express API
└── mobile/       React Native / Expo application
```

### High-level architecture

```text
                 ┌─────────────────────┐
                 │      CUSTOMER       │
                 └──────────┬──────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
        ┌───────▼────────┐      ┌──────▼─────────┐
        │ React Web App  │      │ Expo Mobile App│
        │ Vite / Vercel  │      │ React Native   │
        └───────┬────────┘      └──────┬─────────┘
                │ HTTPS / REST / Socket.IO
                └───────────┬───────────┘
                            ▼
                 ┌─────────────────────┐
                 │ Express Backend API │
                 │ Node.js / Railway   │
                 └──────┬───────┬──────┘
                        │       │
               Sequelize│       │HTTPS
                        ▼       ▼
              ┌────────────┐  ┌───────────────┐
              │ PostgreSQL │  │ InfinitePay   │
              │ Database   │  │ Checkout/API  │
              └────────────┘  └───────┬───────┘
                                      │ webhook
                                      ▼
                              Express Backend API
                                      │
                                      ▼
                              points / payment state
```

## 2. Technology stack

| Layer | Technologies |
| --- | --- |
| Web frontend | React 19, JavaScript, Vite, React Router, Axios |
| Mobile | React Native, Expo, React Navigation, Axios |
| Backend | Node.js, Express 5 |
| Database | PostgreSQL |
| ORM | Sequelize |
| Authentication | JWT + bcrypt |
| Real-time | Socket.IO |
| Payments | InfinitePay Checkout |
| Web deployment | Vercel |
| Backend / database hosting | Railway |
| Version control | Git + GitHub |

## 3. Frontend architecture

The web application lives in `frontend/`.

```text
frontend/
└── src/
    ├── components/   Reusable UI and modals
    ├── pages/        Route-level screens
    ├── context/      Shared application state
    ├── assets/       Images and static assets
    ├── styles/       Shared styling
    └── App.jsx       Main routes and route protection
```

`App.jsx` is the central routing layer. Public screens can be opened without authentication. Protected screens are wrapped by `ProtectedRoute`. Admin screens additionally require the stored admin role.

Important web flows include authentication/registration, one-time profile completion, game entry, bets/tickets, Pwen purchase, profile, support, notifications, and administration.

The browser stores the JWT and basic session information in local storage. Axios attaches the JWT as a Bearer token for authenticated API requests.

## 4. Backend architecture

The backend lives in `backend/` and follows an Express layered structure:

```text
HTTP request
    ↓
Route
    ↓
Authentication / authorization middleware
    ↓
Controller or route handler
    ↓
Sequelize model
    ↓
PostgreSQL
    ↓
JSON response
```

Important directories:

```text
backend/
├── config/          Database configuration
├── controllers/     Business logic
├── middleware/      Authentication / authorization
├── models/          Sequelize data models
├── routes/          REST endpoints
├── app.js           Express configuration + route mounting
└── server.js        HTTP server + database + Socket.IO startup
```

`app.js` configures Express and mounts the API modules. `server.js` authenticates the database connection, starts Sequelize, creates the HTTP server, and attaches Socket.IO.

## 5. Authentication and authorization

The authentication flow is:

```text
Register / Login
      ↓
Express auth endpoint
      ↓
Password/PIN verification
      ↓
JWT issued
      ↓
Frontend stores session
      ↓
Authorization: Bearer <token>
      ↓
authenticate middleware
      ↓
Protected API
```

There are two important authorization levels:

- **Authenticated user** — normal protected customer functionality.
- **Administrator** — protected administrative functionality.

Public registration cannot create an administrator account. Admin-role changes use protected administration functionality.

Existing customers missing required profile information are sent through the one-time profile-completion flow before entering the game.

## 6. Core domain

The Sequelize model layer represents the main business entities. Major areas include:

- Users and account balances.
- Yon Chif, De Chif, Twa Chif, Maryaj, and Kat Chif game records.
- Pwen transactions.
- Payment records and payment requests.
- Win claims.
- Notifications, notification recipients, and read state.

Model relationships are assembled in `backend/models/index.js`.

## 7. Betting flow

Conceptually, a normal betting request follows:

```text
Customer selects game/numbers
          ↓
React / Mobile UI
          ↓
Authenticated API request
          ↓
Game route/controller
          ↓
Validate user + request + business rules
          ↓
Persist bet with Sequelize
          ↓
Update/read account state
          ↓
Return result to UI
```

Game-specific routes are separated by game type. This keeps Yon Chif, De Chif, Twa Chif, Maryaj, and Kat Chif logic independently maintainable.

## 8. Pwen and InfinitePay payment architecture

Pwen purchasing is a security-sensitive flow.

```text
Authenticated customer
        ↓
POST /api/infinitepay/create-payment
        ↓
Backend loads authenticated user
        ↓
Backend generates unique order_nsu
        ↓
Backend creates InfinitePay checkout link
        ↓
Local pending payment saved
        ↓
Customer completes checkout at InfinitePay
        ↓
InfinitePay sends webhook
        ↓
POST /api/infinitepay/webhook
        ↓
Backend calls InfinitePay payment_check
        ↓
Confirm success + paid + expected amount
        ↓
DB transaction + row locks
        ↓
Credit Pwen once
        ↓
Mark local payment credited
```

### Payment security rules

The webhook body alone must never be enough to change a user's balance.

The backend verifies the transaction directly with InfinitePay before crediting Pwen. The locally stored payment amount is compared with the provider-confirmed amount. Database locking and the `credited` status provide idempotency protection so the same payment is not normally credited twice.

The customer's point amount comes from the local payment record rather than trusting a client-supplied webhook value.

## 9. Real-time notification architecture

BoletApp uses Socket.IO for real-time notifications.

```text
Admin creates notification
          ↓
Backend persists notification
          ↓
Socket.IO server
          ↓
Authenticated user room
          ↓
Web / Mobile notification context
          ↓
Modal + bell/unread state
```

Socket connections authenticate using JWT. Each authenticated connection joins a room associated with its user ID, allowing targeted delivery as well as broadcast behavior.

Notifications also have persistent database records, recipient targeting, and read/unread state so they are not dependent only on a live socket connection.

## 10. Admin architecture

The admin area is protected separately from ordinary user routes. Major responsibilities include:

- User/account visibility.
- Admin-role management.
- Bet management.
- Claim management.
- Number/location controls.
- Payment/account operations.
- Broadcast and targeted notifications.
- Notification history.

Security-sensitive admin actions must be protected on the backend. Hiding a button in React is not authorization.

## 11. Database layer

BoletApp uses PostgreSQL through Sequelize.

```text
Controller / Handler
        ↓
Sequelize Model
        ↓
Sequelize ORM
        ↓
PostgreSQL
```

Associations are defined in `backend/models/index.js`. Production startup authenticates the database connection before the HTTP server begins accepting requests.

For operations that affect money/points, transactions and locking should be preferred so concurrent requests cannot easily produce inconsistent balances.

## 12. Deployment architecture

```text
GitHub main
   │
   ├── frontend changes ──→ Vercel ──→ htnovatech.com
   │
   └── backend changes ───→ Railway ─→ boletapp-production.up.railway.app
                                      │
                                      └── PostgreSQL
```

The production web domain is **htnovatech.com**. The previous **ht-lotodigital.com** domain is retained as a permanent redirect so existing links continue to work.

Secrets such as database credentials, JWT secrets, and provider configuration belong in environment variables and must never be committed to Git.

## 13. How to trace a feature

When learning or debugging a feature, trace it in this order:

```text
1. Page / Component
2. API request
3. Route
4. Middleware
5. Controller / Handler
6. Sequelize model
7. PostgreSQL data
8. API response
9. UI update
```

Example for buying Pwen:

```text
InfinitePayment page
→ /api/infinitepay/create-payment
→ authenticate middleware
→ infinitepayController.createPayment
→ User + PixPayment + PixPaymentRequest
→ InfinitePay checkout
→ /api/infinitepay/webhook
→ InfinitePay payment_check
→ database transaction
→ User.points updated
```

If you can explain a feature through all nine layers, you understand that feature end-to-end.

## 14. Security roadmap

Completed or active hardening areas:

- Prevent privilege escalation during public registration.
- Verify InfinitePay transactions before crediting Pwen.
- Preserve payment idempotency and transactional balance updates.

Planned hardening:

- Rate limiting for authentication and sensitive APIs.
- Restrict HTTP and Socket.IO CORS to approved production origins.
- Add/tune HTTP security headers.
- Audit all balance, betting, payment, withdrawal, and admin adjustment paths.
- Remove unnecessary sensitive/debug production logs.
- Add stronger audit logging for sensitive administrative actions.

## 15. Architecture principles

When modifying BoletApp:

1. **Never trust the frontend for authorization, balances, payment status, or admin privileges.**
2. **Authenticate and authorize sensitive operations on the backend.**
3. **Verify external payment state with the payment provider before crediting value.**
4. **Use database transactions for money/points operations.**
5. **Keep secrets in environment variables.**
6. **Make small production changes and test them before moving to the next task.**
7. **Do not mix unrelated refactors with payment/security fixes.**
8. **Preserve backward compatibility for existing customers whenever possible.**

## 16. Developer learning map

To master the codebase, study it in this order:

```text
App.jsx and navigation
        ↓
Authentication + JWT
        ↓
User/Profile flow
        ↓
Game and betting flow
        ↓
Pwen/balance flow
        ↓
InfinitePay payment flow
        ↓
Database models/relations
        ↓
Admin system
        ↓
Socket.IO notifications
        ↓
Deployment and production security
```

The goal is to be able to answer, for every feature:

> What starts this feature, which endpoint receives it, which middleware protects it, which controller executes it, which database models change, what response comes back, and how does the UI react?
