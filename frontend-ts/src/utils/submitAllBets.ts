import axios from "./axios";
import type { MaryajBetRequest, NumberBetRequest, StoredUser } from "../api/types";
import type { CartBet } from "../types/bet";

function getUserAndPoints() {
  try {
    const user: StoredUser = JSON.parse(localStorage.getItem("user") || "{}");

    return {
      points: Number(
        user.points ??
          localStorage.getItem("userPoints") ??
          0
      ),
      withdrawablePoints: Number(user.withdrawablePoints ?? 0),
    };
  } catch {
    return {
      points: Number(
        localStorage.getItem("userPoints") || 0
      ),
      withdrawablePoints: 0,
    };
  }
}

function createReceiptId(): string {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return (
    Date.now().toString() +
    "-" +
    Math.random().toString(36).substring(2, 8)
  );
}

export type BetPayload =
  | { endpoint: "/api/yonchif" | "/api/dechif" | "/api/twachif" | "/api/katchif"; body: NumberBetRequest }
  | { endpoint: "/api/maryaj"; body: MaryajBetRequest };

/** Maps a cart bet to the backend-ts endpoint and request body for one location. */
export function getBetPayload(bet: CartBet, location: string, receiptId: string): BetPayload | null {
  const pwen = parseInt(String(bet.amount), 10);

  if (bet.type === "Yon Chif") {
    return {
      endpoint: "/api/yonchif",
      body: {
        number: bet.number as string,
        pwen,
        location,
        receiptId,
      },
    };
  }

  if (bet.type === "De Chif") {
    return {
      endpoint: "/api/dechif",
      body: {
        number: bet.number as string,
        pwen,
        location,
        receiptId,
      },
    };
  }

  if (bet.type === "Twa Chif") {
    return {
      endpoint: "/api/twachif",
      body: {
        number: bet.number as string,
        pwen,
        location,
        receiptId,
      },
    };
  }

  if (bet.type === "Katchif") {
    return {
      endpoint: "/api/katchif",
      body: {
        number: bet.number as string,
        pwen,
        location,
        receiptId,
      },
    };
  }

  if (bet.type === "Maryaj") {
    return {
      endpoint: "/api/maryaj",
      body: {
        part1: bet.part1 as string,
        part2: bet.part2 as string,
        pwen,
        location,
        receiptId,
      },
    };
  }

  return null;
}

export interface SubmitAllBetsOptions {
  bets: CartBet[];
  selectedLocations: string[];
  deleteBet: (id: number) => void;
}

export interface SubmitAllBetsResult {
  success: true;
  receiptIds: Record<string, string>;
  total: number;
  remaining: number;
}

export default async function submitAllBets({
  bets,
  selectedLocations,
  deleteBet,
}: SubmitAllBetsOptions): Promise<SubmitAllBetsResult> {
  const { points, withdrawablePoints } = getUserAndPoints();

  // One receipt per location
  const receiptIdsByLocation: Record<string, string> = {};

  selectedLocations.forEach((location) => {
    receiptIdsByLocation[location] = createReceiptId();
  });

  const total = bets.reduce(
    (sum, bet) => sum + Number(bet.amount || 0),
    0
  );

  const finalTotal =
    total * selectedLocations.length;

  if (points + withdrawablePoints < finalTotal) {
    throw new Error("Ou pa gen ase pwen.");
  }

  for (const bet of bets) {
    for (const location of selectedLocations) {
      const payload = getBetPayload(
        bet,
        location,
        receiptIdsByLocation[location]
      );

      if (!payload) continue;

      await axios.post(
        payload.endpoint,
        payload.body
      );
    }
  }

  // Keep the frontend in sync with the backend: spend play-only points
  // first, then use withdrawable points for any remainder.
  const fromPlay = Math.min(points, finalTotal);
  const fromWithdraw = finalTotal - fromPlay;
  const updatedPoints = points - fromPlay;
  const updatedWithdrawablePoints = withdrawablePoints - fromWithdraw;

  const user: StoredUser = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  user.points = updatedPoints;
  user.withdrawablePoints = updatedWithdrawablePoints;

  localStorage.setItem(
    "user",
    JSON.stringify(user)
  );

  localStorage.setItem(
    "userPoints",
    String(updatedPoints)
  );

  window.dispatchEvent(
    new Event("pointsUpdated")
  );

  bets.forEach((bet) => {
    deleteBet(bet.id);
  });

  return {
    success: true,
    receiptIds: receiptIdsByLocation,
    total: finalTotal,
    remaining: updatedPoints,
  };
}
