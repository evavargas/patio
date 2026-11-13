import { afterEach, describe, expect, it, vi } from "vitest";
import { useSession } from "../auth/session-store";
import { getMe } from "./panel-api";

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const account = { id: "a".repeat(24), email: "a@b.co", role: "moderator", mustChangePassword: false };
const session = (access: string) => ({ accessToken: access, refreshToken: "r".repeat(43), expiresAt: "x", account });

afterEach(() => vi.unstubAllGlobals());

describe("cliente de la API", () => {
  it("ante varios 401 renueva una sola vez y reintenta", async () => {
    useSession.setState({ status: "authenticated", accessToken: "old", refreshToken: "r".repeat(43) });
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      if (url.endsWith("/auth/refresh")) return json(200, session("new"));
      const auth = new Headers(init.headers).get("Authorization");
      return auth === "Bearer new" ? json(200, account) : json(401, { code: "INVALID_TOKEN", message: "x" });
    });
    vi.stubGlobal("fetch", fetchMock);
    await Promise.all([getMe(), getMe(), getMe()]);
    expect(fetchMock.mock.calls.filter(([u]) => u.endsWith("/auth/refresh"))).toHaveLength(1);
  });

  it("traduce un error de dominio a ApiError con su codigo", async () => {
    useSession.setState({ status: "authenticated", accessToken: "t", refreshToken: null });
    vi.stubGlobal("fetch", async () => json(403, { code: "FORBIDDEN_ROLE", message: "x" }));
    await expect(getMe()).rejects.toMatchObject({ code: "FORBIDDEN_ROLE", status: 403 });
  });
});
