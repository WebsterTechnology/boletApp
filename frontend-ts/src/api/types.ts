/**
 * Response/request shapes of backend-ts (../backend-ts/src).
 * Each type names the endpoint and the backend function that produces it,
 * so a change on either side is easy to trace. tests/contract.test.ts checks
 * these against the real backend-ts app.
 */

export type BetStatus = "pending" | "won" | "lost" | "paid" | "void" | "cancelled";

/** Bet type keys used by /api/bets/me and /api/admin/bets. */
export type BetTypeKey = "yonchif" | "dechif" | "twachif" | "maryaj" | "katchif";

export type Location = "New York" | "Florida" | "Georgia";

/** shapeUser() in controllers/authController.ts — login, register, complete-profile. */
export interface AuthUser {
  id: number;
  phone: string;
  points: number;
  withdrawablePoints: number;
  isAdmin: boolean;
  fullName: string;
  cpf: string;
  birthDate: string;
  email: string;
  address: string;
  city: string;
  state: string;
  cep: string;
  profileComplete: boolean;
}

/** POST /api/auth/login, POST /api/auth/register */
export interface AuthResponse {
  message: string;
  user: AuthUser;
  token: string;
}

/** PATCH /api/auth/complete-profile */
export interface CompleteProfileResponse {
  message: string;
  user: AuthUser;
}

/** GET /api/users/me — shapeUser() in routes/userRoutes.ts (a smaller shape than AuthUser). */
export interface MeUser {
  id: number;
  phone: string;
  points: number;
  isAdmin: boolean;
  fullName: string;
  email: string;
  profileComplete: boolean;
}

/** What the app keeps in localStorage["user"]: whichever of the shapes above it saw last. */
export type StoredUser = Partial<AuthUser> & { name?: string };

/** Error body most endpoints send with 4xx/5xx. */
export interface ApiMessage {
  message?: string;
  error?: string;
}

/** POST /api/{yonchif,dechif,twachif,katchif} body. */
export interface NumberBetRequest {
  number: string;
  pwen: number;
  location: string;
  receiptId: string;
}

/** POST /api/maryaj body. */
export interface MaryajBetRequest {
  part1: string;
  part2: string;
  pwen: number;
  location: string;
  receiptId: string;
}

/** GET /api/bets/me — getAllMyBets() in controllers/betsController.ts. */
export interface MyBetItem {
  id: number;
  receiptId: string;
  type: BetTypeKey;
  numbers: string;
  part1?: string;
  part2?: string;
  pwen: number;
  draw: string | null;
  status: BetStatus | string;
  createdAt: string;
}

export interface MyBetsResponse {
  items: MyBetItem[];
  totalPwen: number;
}

/** GET /api/admin/bets — mapRow() in routes/adminBetsRoutes.ts. */
export interface AdminBetItem {
  id: number;
  type: BetTypeKey;
  userId: number;
  receiptId: string;
  /** Always undefined: the User model has no `name` column. */
  customerName?: string;
  phone?: string;
  numbers: string;
  pwen: number;
  draw: string | null;
  status: BetStatus | string;
  createdAt: string;
}

export interface AdminBetsResponse {
  items: AdminBetItem[];
  total: number;
}

/** GET /api/admin/users */
export interface AdminUser {
  id: number;
  phone: string;
  points: number;
  withdrawablePoints: number;
  isAdmin: boolean;
  fullName: string | null;
  cpf: string | null;
  birthDate: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  cep: string | null;
}

/** POST /api/admin/disabled-numbers */
export interface DisabledNumbersResponse {
  message: string;
  disabledNumbers: string[];
}

/** POST /api/admin/disabled-locations */
export interface DisabledLocationsResponse {
  message: string;
  disabledLocations: string[];
}

export type NotificationPriority = "info" | "warning" | "critical";

/** Notification rows from /api/notifications, /unread, and socket "notification" events. */
export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  priority: NotificationPriority;
  imageUrl: string | null;
  linkUrl: string | null;
  createdAt: string;
  updatedAt?: string;
  /** Present on GET /api/notifications; added locally for socket events. */
  read?: boolean;
}

/** GET /api/notifications/history */
export interface NotificationHistoryItem extends NotificationItem {
  readCount: number | string;
  recipientType: "all" | "user";
  recipientUserId: number | null;
  recipient: { id: number; phone: string } | null;
}

/** POST /api/notifications/send body. */
export interface SendNotificationRequest {
  title: string;
  message: string;
  priority: NotificationPriority;
  imageUrl: string;
  linkUrl: string;
  recipientType: "all" | "user";
  recipientUserId: number | null;
}

/** POST /api/pix/create */
export interface PixCreateResponse {
  paymentId: number;
  providerPaymentId: string;
  status: string;
  qrCode: string | null;
  copyPaste: string | null;
  expirationDate: string | null;
  invoiceUrl: string | null;
  userId: number;
}

/** GET /api/pix/qr/:paymentId (204 when not ready). */
export interface PixQrResponse {
  qrCode: string | null;
  copyPaste: string | null;
  expirationDate: string | null;
  /** Not sent by backend-ts; read by PixPayment for older responses. */
  invoiceUrl?: string | null;
}

/** POST /api/infinitepay/create-payment */
export interface InfinitePayCreateResponse {
  success?: boolean;
  paymentId?: number;
  providerPaymentId?: string;
  checkoutUrl?: string;
  url?: string;
  status?: string;
  userId?: number;
  error?: unknown;
}
