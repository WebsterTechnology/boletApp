import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "../src/utils/axios";
import submitAllBets, { getBetPayload } from "../src/utils/submitAllBets";
import type { CartBet } from "../src/types/bet";

const bet = (b: Partial<CartBet> & Pick<CartBet, "type">): CartBet => ({ id: Math.random(), amount: 5, ...b });

describe("getBetPayload", () => {
  it.each([
    ["Yon Chif", "/api/yonchif", "5"],
    ["De Chif", "/api/dechif", "25"],
    ["Twa Chif", "/api/twachif", "123"],
    ["Katchif", "/api/katchif", "1234"],
  ] as const)("maps %s to %s with the backend-ts body", (type, endpoint, number) => {
    expect(getBetPayload(bet({ type, number, amount: 7 }), "Florida", "R1")).toEqual({
      endpoint,
      body: { number, pwen: 7, location: "Florida", receiptId: "R1" },
    });
  });

  it("maps Maryaj to part1/part2", () => {
    expect(getBetPayload(bet({ type: "Maryaj", part1: "12", part2: "34", amount: 3 }), "Georgia", "R2")).toEqual({
      endpoint: "/api/maryaj",
      body: { part1: "12", part2: "34", pwen: 3, location: "Georgia", receiptId: "R2" },
    });
  });

  it("sends pwen as an integer, never a string", () => {
    const payload = getBetPayload(bet({ type: "Yon Chif", number: "1", amount: "10" as unknown as number }), "Florida", "R");
    expect(payload?.body.pwen).toBe(10);
  });
});

describe("submitAllBets", () => {
  let post: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    post = vi.spyOn(api, "post").mockResolvedValue({ data: {} });
    localStorage.setItem("user", JSON.stringify({ id: 1, points: 100 }));
  });

  it("posts every bet once per location, with one receiptId per location", async () => {
    const deleteBet = vi.fn();
    const bets = [bet({ id: 1, type: "Yon Chif", number: "5", amount: 10 }), bet({ id: 2, type: "Maryaj", part1: "12", part2: "34", amount: 5 })];

    const result = await submitAllBets({ bets, selectedLocations: ["New York", "Florida"], deleteBet });

    expect(post).toHaveBeenCalledTimes(4);
    type Body = { location: string; receiptId: string };
    const receipts: Body[] = post.mock.calls.map((call: unknown[]) => call[1] as Body);
    const ny = receipts.filter((b) => b.location === "New York").map((b) => b.receiptId);
    const fl = receipts.filter((b) => b.location === "Florida").map((b) => b.receiptId);
    expect(new Set(ny).size).toBe(1);
    expect(new Set(fl).size).toBe(1);
    expect(ny[0]).not.toBe(fl[0]);
    expect(result).toMatchObject({ success: true, total: 30, remaining: 70 });
    expect(result.receiptIds).toEqual({ "New York": ny[0], Florida: fl[0] });
  });

  it("updates cached points, fires pointsUpdated and empties the cart", async () => {
    const deleteBet = vi.fn();
    const listener = vi.fn();
    window.addEventListener("pointsUpdated", listener);

    await submitAllBets({ bets: [bet({ id: 9, type: "De Chif", number: "07", amount: 20 })], selectedLocations: ["Georgia"], deleteBet });

    expect(JSON.parse(localStorage.getItem("user")!).points).toBe(80);
    expect(localStorage.getItem("userPoints")).toBe("80");
    expect(listener).toHaveBeenCalledOnce();
    expect(deleteBet).toHaveBeenCalledWith(9);
    window.removeEventListener("pointsUpdated", listener);
  });

  it("refuses when the total for all locations exceeds the balance, without calling the API", async () => {
    const bets = [bet({ type: "Yon Chif", number: "5", amount: 40 })];
    await expect(
      submitAllBets({ bets, selectedLocations: ["New York", "Florida", "Georgia"], deleteBet: vi.fn() })
    ).rejects.toThrow("Ou pa gen ase pwen.");
    expect(post).not.toHaveBeenCalled();
  });

  it("stops and keeps the cart when the API rejects a bet", async () => {
    post.mockRejectedValueOnce(new Error("Nimewo 5 dezaktive"));
    const deleteBet = vi.fn();

    await expect(
      submitAllBets({ bets: [bet({ type: "Yon Chif", number: "5", amount: 1 })], selectedLocations: ["Florida"], deleteBet })
    ).rejects.toThrow("Nimewo 5 dezaktive");
    expect(deleteBet).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem("user")!).points).toBe(100);
  });
});
