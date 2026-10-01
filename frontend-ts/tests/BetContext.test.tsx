import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import BetSlip from "../src/components/BetSlip";
import { BetProvider, useBet } from "../src/context/BetContext";

const wrapper = ({ children }: { children: ReactNode }) => <BetProvider>{children}</BetProvider>;

describe("BetContext", () => {
  it("adds, edits and deletes bets and keeps the total in sync", () => {
    vi.spyOn(Date, "now").mockReturnValueOnce(1).mockReturnValueOnce(2);
    const { result } = renderHook(() => useBet(), { wrapper });

    act(() => result.current.addBet({ type: "Yon Chif", number: "5", amount: 10 }));
    act(() => result.current.addBet({ type: "De Chif", number: "25", amount: 15 }));
    expect(result.current.bets.map((b) => b.id)).toEqual([1, 2]);
    expect(result.current.total).toBe(25);

    act(() => result.current.editBet(1, { amount: 4 }));
    expect(result.current.total).toBe(19);

    act(() => result.current.deleteBet(2));
    expect(result.current.bets).toHaveLength(1);
    expect(result.current.total).toBe(4);
  });

  it("throws a clear error outside the provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useBet())).toThrow("useBet must be used inside <BetProvider>");
  });
});

function Seed() {
  const { addBet } = useBet();
  return (
    <button
      onClick={() => {
        addBet({ type: "Maryaj", part1: "12", part2: "34", number: "1234", display: "12 x 34", amount: 3 });
      }}
    >
      seed
    </button>
  );
}

describe("BetSlip", () => {
  it("groups bets by game, shows the total, and edits/deletes", async () => {
    const onEdit = vi.fn();
    const onSubmit = vi.fn();
    render(
      <BetProvider>
        <Seed />
        <BetSlip onEdit={onEdit} onSubmit={onSubmit} />
      </BetProvider>
    );

    expect(screen.getByText("Pa gen pari ankò")).toBeInTheDocument();
    await userEvent.click(screen.getByText("seed"));

    expect(screen.getByText("Maryaj")).toBeInTheDocument();
    expect(screen.getByText("12 x 34")).toBeInTheDocument();
    expect(screen.getByText("*Total 3*")).toBeInTheDocument();

    const [editBtn, deleteBtn] = screen.getAllByRole("button").filter((b) => b.textContent === "");
    await userEvent.click(editBtn);
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ part1: "12", part2: "34" }));

    await userEvent.click(screen.getByText("Soumèt Pari"));
    expect(onSubmit).toHaveBeenCalled();

    await userEvent.click(deleteBtn);
    expect(screen.getByText("*Total 0*")).toBeInTheDocument();
  });
});
