import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DeChif from "../src/components/DeChif";
import Katchif from "../src/components/Katchif";
import Maryaj from "../src/components/Maryaj";
import TwaChif from "../src/components/TwaChif";
import YonChif from "../src/components/YonChif";
import api from "../src/utils/axios";
import { authUser, jsonResponse, loginAs, renderWithProviders } from "./helpers";

let disabledNumbers: string[] = [];
let serverPoints = 100;
let disabledLocations: string[] = [];
let remaining = 20;

/** Answers the GETs every game form makes on mount. */
function fakeGet(url: string) {
  if (url.endsWith("/api/admin/public-disabled-numbers")) return Promise.resolve({ data: disabledNumbers });
  if (url.endsWith("/api/admin/public-disabled-locations")) return Promise.resolve({ data: disabledLocations });
  if (url.endsWith("/remaining")) return Promise.resolve({ data: { remaining } });
  if (url.endsWith("/api/users/me")) return Promise.resolve({ data: authUser({ points: serverPoints }) });
  return Promise.reject(new Error(`unexpected GET ${url}`));
}

let post: ReturnType<typeof vi.spyOn>;
let alertSpy: ReturnType<typeof vi.spyOn>;
let confirmSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  disabledNumbers = [];
  disabledLocations = [];
  remaining = 20;
  serverPoints = 100;
  loginAs(authUser({ points: 100 }));
  vi.spyOn(axios, "get").mockImplementation(fakeGet as never);
  vi.spyOn(api, "get").mockImplementation(fakeGet as never);
  post = vi.spyOn(api, "post").mockResolvedValue({ data: {} });
  vi.spyOn(globalThis, "fetch").mockImplementation(async () => jsonResponse(authUser({ points: serverPoints })));
  alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
  confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
});

const GAMES = [
  { name: "Yon Chif", Component: YonChif, fill: { X: "5" }, endpoint: "/api/yonchif", body: { number: "5" } },
  { name: "De Chif", Component: DeChif, fill: { XX: "25" }, endpoint: "/api/dechif", body: { number: "25" } },
  { name: "Twa Chif", Component: TwaChif, fill: { XXX: "123" }, endpoint: "/api/twachif", body: { number: "123" } },
  { name: "Katchif", Component: Katchif, fill: { XXXX: "1234" }, endpoint: "/api/katchif", body: { number: "1234" } },
  { name: "Maryaj", Component: Maryaj, fill: { XX: ["12", "34"] }, endpoint: "/api/maryaj", body: { part1: "12", part2: "34" } },
] as const;

/** Waits until the form has fetched the disabled lists (via global axios or the app instance). */
const loaded = () =>
  waitFor(() => expect(vi.mocked(axios.get).mock.calls.length + vi.mocked(api.get).mock.calls.length).toBeGreaterThanOrEqual(2));

async function fillAndAdd(fill: Record<string, string | readonly string[]>, pwen: string) {
  for (const [placeholder, value] of Object.entries(fill)) {
    const inputs = screen.getAllByPlaceholderText(placeholder);
    const values = Array.isArray(value) ? value : [value];
    for (let i = 0; i < values.length; i++) await userEvent.type(inputs[i], values[i]);
  }
  await userEvent.type(screen.getByPlaceholderText("Pwen"), pwen);
  await userEvent.click(screen.getByText("+"));
}

describe.each(GAMES)("$name form", ({ Component, fill, endpoint, body }) => {
  it("adds a bet to the slip and submits it to backend-ts for each chosen location", async () => {
    renderWithProviders(<Component />);
    await loaded();

    await fillAndAdd(fill, "10");
    expect(screen.getByText("*Total 10*")).toBeInTheDocument();

    await userEvent.click(screen.getByText("Soumèt Pari"));
    const modal = screen.getByText("Chwazi kote pou jwe").parentElement as HTMLElement;
    await userEvent.click(within(modal).getByText("Florida"));
    await userEvent.click(within(modal).getByText("Georgia"));
    expect(within(modal).getByText("Total Final: 20 p")).toBeInTheDocument();

    await userEvent.click(within(modal).getByText("Finalize Paryaj ou"));

    await waitFor(() => expect(post).toHaveBeenCalledTimes(2));
    for (const location of ["Florida", "Georgia"]) {
      expect(post).toHaveBeenCalledWith(endpoint, expect.objectContaining({ ...body, pwen: 10, location, receiptId: expect.any(String) }));
    }
    expect(alertSpy).toHaveBeenCalledWith("Tout pari yo soumèt avèk siksè!");
    expect(localStorage.getItem("userPoints")).toBe("80");
  });

  it("blocks a number the admin disabled", async () => {
    const first = Object.values(fill)[0];
    disabledNumbers = [Array.isArray(first) ? first[0] : (first as string)];
    renderWithProviders(<Component />);
    await loaded();
    await new Promise((r) => setTimeout(r, 0));

    await fillAndAdd(fill, "10");
    expect(alertSpy).toHaveBeenCalledWith(expect.stringMatching(/dezaktive/));
    expect(screen.getByText("Pa gen pari ankò")).toBeInTheDocument();
  });

  it("disables a location the admin disabled", async () => {
    disabledLocations = ["Florida"];
    renderWithProviders(<Component />);
    await loaded();

    await fillAndAdd(fill, "10");
    await userEvent.click(screen.getByText("Soumèt Pari"));
    const florida = screen.getByText("Florida").closest("label") as HTMLElement;
    await waitFor(() => expect(within(florida).getByRole("checkbox")).toBeDisabled());
  });

  it("asks to buy points instead of adding a bet the user can't afford", async () => {
    serverPoints = 5;
    loginAs(authUser({ points: 5 }));
    renderWithProviders(<Component />);
    await loaded();

    await fillAndAdd(fill, "10");
    expect(confirmSpy).toHaveBeenCalledWith("Ou pa gen ase pwen. Ou vle achte plis?");
    expect(screen.getByText("Pa gen pari ankò")).toBeInTheDocument();
  });
});

describe("pair/number caps", () => {
  it("Maryaj refuses more than the remaining points for the pair", async () => {
    remaining = 3;
    renderWithProviders(<Maryaj />);
    await fillAndAdd({ XX: ["12", "34"] }, "5");
    expect(alertSpy).toHaveBeenCalledWith("Ou ka jwe sèlman 3 pwen.");
  });

  it("Katchif refuses more than the remaining points for the number", async () => {
    remaining = 2;
    renderWithProviders(<Katchif />);
    await fillAndAdd({ XXXX: "1234" }, "5");
    expect(alertSpy).toHaveBeenCalledWith("Ou ka jwe sèlman 2 pwen pou 1234.");
  });
});
