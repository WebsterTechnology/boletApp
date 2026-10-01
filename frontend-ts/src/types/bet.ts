/** Display names used in the cart (BetContext) and by submitAllBets. */
export type CartBetType = "Yon Chif" | "De Chif" | "Twa Chif" | "Katchif" | "Maryaj";

/** A bet waiting in the cart, before it is sent to the API. */
export interface CartBet {
  id: number;
  type: CartBetType;
  /** Points. Stored as a number by every form. */
  amount: number;
  /** Yon/De/Twa Chif, Katchif; Maryaj stores "p1p2" here too. */
  number?: string;
  /** Maryaj only. */
  part1?: string;
  part2?: string;
  /** Label shown in the bet slip, e.g. "12 x 34". */
  display?: string;
  /** Only used by the old BetCart component. */
  location?: string;
  numbers?: string;
}

export type NewCartBet = Omit<CartBet, "id">;
