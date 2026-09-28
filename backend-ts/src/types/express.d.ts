import type { User } from "../models/User";

declare global {
  namespace Express {
    interface Request {
      /** Set by the `authenticate` middleware. */
      user?: User;
    }
  }
}

export {};
