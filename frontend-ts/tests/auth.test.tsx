import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import React from "react";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../src/App";
import LoginModal from "../src/components/LoginModal";
import RegisterModal from "../src/components/RegisterModal";
import { BetProvider } from "../src/context/BetContext";
import { NotificationProvider } from "../src/context/NotificationContext";
import type { AuthResponse } from "../src/api/types";
import { authUser, jsonResponse, loginAs, renderWithProviders } from "./helpers";

vi.mock("socket.io-client", () => ({
  io: () => ({ on: vi.fn(), disconnect: vi.fn() }),
}));

let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  fetchSpy = vi.spyOn(globalThis, "fetch");
  vi.spyOn(window, "alert").mockImplementation(() => {});
});

describe("LoginModal", () => {
  async function login(phone = "11999990001", pin = "1234") {
    await userEvent.type(screen.getByPlaceholderText("Antre nimewo telefòn mobil ou"), phone);
    await userEvent.type(screen.getByPlaceholderText("Antre PIN (4 chif)"), pin);
    await userEvent.click(screen.getByText("RANTRE SOU KONT OU"));
  }

  it("posts {phone, password} to /api/auth/login and stores the session", async () => {
    const body: AuthResponse = { message: "Login successful", user: authUser({ points: 42 }), token: "jwt-1" };
    fetchSpy.mockResolvedValue(jsonResponse(body));
    const onClose = vi.fn();
    renderWithProviders(<LoginModal onClose={onClose} />);

    await login();

    await waitFor(() => expect(screen.getByText("GAME PAGE")).toBeInTheDocument());
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/auth\/login$/);
    expect(JSON.parse(init.body as string)).toEqual({ phone: "+5511999990001", password: "1234" });
    expect(localStorage.getItem("token")).toBe("jwt-1");
    expect(localStorage.getItem("userPoints")).toBe("42");
    expect(localStorage.getItem("isAdmin")).toBe("false");
    expect(onClose).toHaveBeenCalled();
  });

  it("sends admins to the dashboard and incomplete profiles to /complete-profile", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse({ message: "", token: "t", user: authUser({ isAdmin: true }) }));
    renderWithProviders(<LoginModal />);
    await login();
    await waitFor(() => expect(screen.getByText("ADMIN PAGE")).toBeInTheDocument());
  });

  it("routes users without a complete profile to /complete-profile", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse({ message: "", token: "t", user: authUser({ profileComplete: false }) }));
    renderWithProviders(<LoginModal />);
    await login();
    await waitFor(() => expect(screen.getByText("COMPLETE PROFILE PAGE")).toBeInTheDocument());
  });

  it("shows the backend-ts error message and stores nothing on failure", async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ message: "Invalid password" }, 401));
    renderWithProviders(<LoginModal />);
    await login();
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith("❌ Invalid password"));
    expect(localStorage.getItem("token")).toBeNull();
  });

  it("rejects a PIN that is not 4 digits without calling the API", async () => {
    renderWithProviders(<LoginModal />);
    await login("11999990001", "12");
    expect(window.alert).toHaveBeenCalledWith("PIN nan dwe gen egzakteman 4 chif");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("RegisterModal", () => {
  it("posts name, email, phone and PIN (without confirmPassword) to /api/auth/register", async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ message: "User created", user: authUser(), token: "jwt-2" }, 201));
    const assign = vi.fn();
    vi.spyOn(window, "location", "get").mockReturnValue({ ...window.location, set href(v: string) { assign(v); } } as unknown as Location);
    render(<RegisterModal onClose={vi.fn()} />);

    await userEvent.type(screen.getByPlaceholderText("Non konplè *"), "Ana B");
    await userEvent.type(screen.getByPlaceholderText("Antre nimewo telefòn mobil ou"), "11999990001");
    await userEvent.type(screen.getByPlaceholderText("Imèl *"), "ana@x.com");
    await userEvent.type(screen.getByPlaceholderText("Chwazi yon kòd sekrè *"), "1234");
    await userEvent.type(screen.getByPlaceholderText("Konfime PIN ou *"), "1234");
    await userEvent.click(screen.getByLabelText("Mwen gen 18 lane oswa plis"));
    await userEvent.click(screen.getByText("OUVÈ YON KONT", { selector: "button" }));

    await waitFor(() => expect(localStorage.getItem("token")).toBe("jwt-2"));
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/auth\/register$/);
    expect(JSON.parse(init.body as string)).toEqual({
      phone: "+5511999990001",
      password: "1234",
      fullName: "Ana B",
      email: "ana@x.com",
    });
  });

  it("no longer renders the stray \\n\\n text the JS version showed", () => {
    render(<RegisterModal onClose={vi.fn()} />);
    expect(document.body.textContent).not.toContain("\\n");
  });
});

describe("App route guards", () => {
  beforeEach(() => {
    fetchSpy.mockResolvedValue(jsonResponse(authUser()));
    vi.spyOn(axios, "get").mockResolvedValue({ data: [] });
  });

  // BrowserRouter like main.tsx: ProtectedRoute reads window.location.pathname directly.
  const renderApp = (path: string) => {
    window.history.pushState({}, "", path);
    return render(
      <BrowserRouter>
        <BetProvider>
          <NotificationProvider>
            <App />
          </NotificationProvider>
        </BetProvider>
      </BrowserRouter>
    );
  };

  it("sends logged-out visitors from a protected page back home", () => {
    renderApp("/fich");
    expect(screen.getByText("Jwe Kounye a")).toBeInTheDocument();
  });

  it("shows a protected page to a logged-in user with a complete profile", async () => {
    loginAs(authUser());
    vi.mocked(axios.get).mockResolvedValue({ data: { items: [], totalPwen: 0 } });
    renderApp("/fich");
    expect(await screen.findByText("Fich Pari Mwen Yo")).toBeInTheDocument();
  });

  it("forces users with an incomplete profile to /complete-profile", () => {
    loginAs(authUser({ fullName: "", email: "" }));
    renderApp("/fich");
    expect(screen.getByText("Konplete enfòmasyon kont ou")).toBeInTheDocument();
  });

  it("keeps non-admins out of admin pages", () => {
    loginAs(authUser());
    renderApp("/admin/bets");
    expect(screen.queryByText("🎰 Admin Bets")).not.toBeInTheDocument();
  });

  it("lets admins into admin pages", async () => {
    loginAs(authUser({ isAdmin: true }));
    vi.mocked(axios.get).mockResolvedValue({ data: { items: [], total: 0 } });
    renderApp("/admin/bets");
    expect(await screen.findByText("🎰 Admin Bets")).toBeInTheDocument();
  });
});
