import { render } from "@testing-library/react";
import React, { type ReactElement } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { BetProvider } from "../src/context/BetContext";
import type { AuthUser } from "../src/api/types";

/** Renders `ui` at `path` inside the app providers, plus marker pages for redirect targets. */
export function renderWithProviders(ui: ReactElement, { path = "/" } = {}) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <BetProvider>
        <Routes>
          <Route path="*" element={ui} />
          <Route path="/game" element={<div>GAME PAGE</div>} />
          <Route path="/admin/dashboard" element={<div>ADMIN PAGE</div>} />
          <Route path="/complete-profile" element={<div>COMPLETE PROFILE PAGE</div>} />
        </Routes>
      </BetProvider>
    </MemoryRouter>
  );
}

export const authUser = (over: Partial<AuthUser> = {}): AuthUser => ({
  id: 1,
  phone: "+5511999990001",
  points: 100,
  withdrawablePoints: 0,
  isAdmin: false,
  fullName: "Ana",
  cpf: "",
  birthDate: "",
  email: "ana@x.com",
  address: "",
  city: "",
  state: "",
  cep: "",
  profileComplete: true,
  ...over,
});

/** Logs a user in the way LoginModal does. */
export function loginAs(user: AuthUser, token = "test-token") {
  localStorage.setItem("user", JSON.stringify(user));
  localStorage.setItem("userId", String(user.id));
  localStorage.setItem("userPhone", user.phone);
  localStorage.setItem("token", token);
  localStorage.setItem("isAdmin", JSON.stringify(user.isAdmin));
  localStorage.setItem("userPoints", String(user.points));
}

/** A fetch Response stand-in. */
export const jsonResponse = (body: unknown, status = 200) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body, text: async () => JSON.stringify(body) }) as Response;
