/**
 * Every backend call the frontend makes, with the file that makes it.
 * `missing` marks calls that backend-ts does not serve (bugs carried over from the JS app);
 * the contract test asserts they are still missing, so fixing either side forces an update here.
 */
export interface Endpoint {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  usedBy: string;
  missing?: string;
}

export const ENDPOINTS: Endpoint[] = [
  // auth
  { method: "POST", path: "/api/auth/login", usedBy: "components/LoginModal.tsx" },
  { method: "POST", path: "/api/auth/register", usedBy: "components/RegisterModal.tsx" },
  { method: "PATCH", path: "/api/auth/complete-profile", usedBy: "pages/CompleteProfile.tsx" },
  { method: "DELETE", path: "/api/auth/users/1", usedBy: "pages/AdminDashboard.tsx" },
  { method: "GET", path: "/api/users/me", usedBy: "components/Pwen.tsx, games, Profile, WithdrawModal" },

  // betting
  { method: "POST", path: "/api/yonchif", usedBy: "utils/submitAllBets.ts" },
  { method: "POST", path: "/api/dechif", usedBy: "utils/submitAllBets.ts" },
  { method: "POST", path: "/api/twachif", usedBy: "utils/submitAllBets.ts" },
  { method: "POST", path: "/api/katchif", usedBy: "utils/submitAllBets.ts" },
  { method: "POST", path: "/api/maryaj", usedBy: "utils/submitAllBets.ts" },
  { method: "GET", path: "/api/maryaj/remaining?part1=12&part2=34&location=New%20York", usedBy: "components/Maryaj.tsx" },
  { method: "GET", path: "/api/katchif/remaining?number=1234&location=New%20York", usedBy: "components/Katchif.tsx" },
  { method: "GET", path: "/api/bets/me", usedBy: "pages/Fich.tsx" },
  { method: "GET", path: "/api/admin/public-disabled-numbers", usedBy: "all game forms" },
  { method: "GET", path: "/api/admin/public-disabled-locations", usedBy: "all game forms" },

  // admin
  { method: "GET", path: "/api/admin/users", usedBy: "pages/AdminDashboard.tsx" },
  { method: "POST", path: "/api/admin/users/1/add-pwen", usedBy: "pages/AdminDashboard.tsx" },
  { method: "POST", path: "/api/admin/users/1/remove-pwen", usedBy: "pages/AdminDashboard.tsx" },
  { method: "PATCH", path: "/api/admin/users/1/admin-status", usedBy: "pages/AdminDashboard.tsx" },
  { method: "GET", path: "/api/admin/disabled-numbers", usedBy: "pages/AdminDashboard.tsx" },
  { method: "POST", path: "/api/admin/disabled-numbers", usedBy: "pages/AdminDashboard.tsx" },
  { method: "GET", path: "/api/admin/disabled-locations", usedBy: "pages/AdminDashboard.tsx" },
  { method: "POST", path: "/api/admin/disabled-locations", usedBy: "pages/AdminDashboard.tsx" },
  { method: "GET", path: "/api/admin/bets?type=all", usedBy: "pages/AdminBets.tsx" },
  { method: "PATCH", path: "/api/admin/bets/yonchif/1/status", usedBy: "pages/AdminBets.tsx" },
  { method: "GET", path: "/api/admin/claims?status=requested", usedBy: "pages/AdminClaims.tsx" },

  // notifications
  { method: "GET", path: "/api/notifications", usedBy: "context/NotificationContext.tsx" },
  { method: "GET", path: "/api/notifications/unread", usedBy: "context/NotificationContext.tsx" },
  { method: "POST", path: "/api/notifications/read-all", usedBy: "context/NotificationContext.tsx" },
  { method: "POST", path: "/api/notifications/1/read", usedBy: "context/NotificationContext.tsx" },
  { method: "GET", path: "/api/notifications/history", usedBy: "pages/AdminDashboard.tsx" },
  { method: "POST", path: "/api/notifications/send", usedBy: "pages/AdminDashboard.tsx" },

  // payments
  { method: "POST", path: "/api/pix/create", usedBy: "pages/PixPayment.tsx" },
  { method: "GET", path: "/api/pix/qr/1", usedBy: "pages/PixPayment.tsx" },
  { method: "GET", path: "/api/pix/status/1", usedBy: "pages/PixPayment.tsx" },
  { method: "POST", path: "/api/infinitepay/create-payment", usedBy: "pages/InfinitePayment.tsx" },

  // Known gaps: the frontend calls these but backend-ts has no such route.
  {
    method: "GET",
    path: "/api/auth/verify",
    usedBy: "pages/PlayPage.tsx",
    missing: "Relative URL, so in production it hits the frontend host (Vercel rewrites to index.html → 200) and always passes.",
  },
  {
    method: "POST",
    path: "/api/stripe",
    usedBy: "pages/CreditCardForm.tsx",
    missing: "Hardcoded to http://localhost:3001; Stripe routes are commented out in the backend. 'Kat Kredi' checkout cannot work.",
  },
  {
    method: "GET",
    path: "/api/users/1",
    usedBy: "pages/PixPayment.tsx",
    missing: "Balance refresh after a PIX payment confirms; backend-ts only has /api/users/me.",
  },
  {
    method: "POST",
    path: "/api/admin/claims/1/credit-points",
    usedBy: "pages/AdminClaims.tsx",
    missing: "Claims admin actions were never implemented in the backend.",
  },
  {
    method: "POST",
    path: "/api/admin/claims/1/mark-paid",
    usedBy: "pages/AdminClaims.tsx",
    missing: "Claims admin actions were never implemented in the backend.",
  },
];
