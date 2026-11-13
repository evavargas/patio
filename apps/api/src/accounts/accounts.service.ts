import { Inject, Injectable } from "@nestjs/common";
import { type AccountRole, type PanelAccount, type PanelSession, isAccountId, isChangePasswordRequest, isLoginRequest, isLogoutRequest, isRefreshRequest } from "@patio/contracts";
import { randomUUID } from "node:crypto";
import { generateToken, hashToken } from "../auth/credentials.ts";
import { signJwt, verifyJwt } from "../auth/jwt.ts";
import { hashPassword, verifyPassword } from "../auth/password.ts";
import { Clock } from "../platform/clock.ts";
import { type AppConfig, CONFIG } from "../platform/config.ts";
import { DomainException } from "../platform/domain.exception.ts";
import { RateLimitService } from "../rate-limit/rate-limit.service.ts";
import { AccountsRepository } from "./accounts.repository.ts";
import { normalizeEmail } from "./email.ts";
import { RefreshTokensRepository } from "./refresh-tokens.repository.ts";

// Propuestas (doc 03 solo fija los 15 min del access token): el refresh token vive 7 dias y NO se extiende al rotar,
// asi que la sesion tiene un tope absoluto de 7 dias.
const ACCESS_TTL_SECONDS = 900;
const REFRESH_TTL_SECONDS = 7 * 86_400;

/** Lo que el guard deja en el pedido: nunca el hash. */
export interface AuthenticatedAccount {
  accountId: string;
  email: string;
  role: AccountRole;
  mustChangePassword: boolean;
}

const toPanelAccount = (a: AuthenticatedAccount): PanelAccount => {
  if (!isAccountId(a.accountId)) throw new Error("ID de cuenta fuera del contrato");
  return { id: a.accountId, email: a.email, role: a.role, mustChangePassword: a.mustChangePassword };
};

@Injectable()
export class AccountsService {
  constructor(
    @Inject(CONFIG) private readonly config: Pick<AppConfig, "jwtSecret" | "limits">,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(RateLimitService) private readonly rateLimit: Pick<RateLimitService, "hit">,
    @Inject(AccountsRepository) private readonly accounts: Pick<AccountsRepository, "findByEmail" | "findById" | "findForGuard" | "markLogin" | "setPassword">,
    @Inject(RefreshTokensRepository) private readonly tokens: Pick<RefreshTokensRepository, "insert" | "claim" | "findByHash" | "deleteFamily" | "deleteByAccount">,
  ) {}

  /**
   * Valida el access token y lee la cuenta en CADA pedido. Falla con INVALID_TOKEN (token malo, cuenta eliminada o clave
   * cambiada despues de emitirlo) o ACCOUNT_INACTIVE. 1 lectura, 0 si el token no sirve.
   */
  async authenticate(header: string | undefined): Promise<AuthenticatedAccount> {
    const token = /^Bearer (\S+)$/.exec(header ?? "")?.[1];
    const claims = token === undefined ? null : verifyJwt(token, this.config.jwtSecret, this.nowSeconds());
    if (claims === null) throw new DomainException("INVALID_TOKEN", 401);
    const account = await this.accounts.findForGuard(claims.sub);
    if (account === null) throw new DomainException("INVALID_TOKEN", 401);
    if (!account.active) throw new DomainException("ACCOUNT_INACTIVE", 403);
    if (claims.iat < Math.floor(account.passwordChangedAt.getTime() / 1000)) throw new DomainException("INVALID_TOKEN", 401);
    return { accountId: account._id, email: account.email, role: account.role, mustChangePassword: account.mustChangePassword };
  }

  me(account: AuthenticatedAccount): PanelAccount {
    return toPanelAccount(account);
  }

  /** Limite -> cuenta -> hash (ficticio si no existe) -> sesion nueva. Operaciones: 2 si falla, 4 si entra. */
  async login(ip: string, body: unknown): Promise<PanelSession> {
    if (!isLoginRequest(body)) throw new DomainException("VALIDATION_FAILED", 400);
    const email = normalizeEmail(body.email);
    // La clave lleva el correo como hash: la base no guarda correos de quien no tiene cuenta.
    if (!(await this.rateLimit.hit(`login:${ip}:${hashToken(email)}`, this.config.limits.login))) throw new DomainException("RATE_LIMITED", 429);
    const account = await this.accounts.findByEmail(email);
    const valid = await verifyPassword(body.password, account?.passwordHash ?? null);
    if (account === null || !valid) throw new DomainException("INVALID_CREDENTIALS", 401);
    if (!account.active) throw new DomainException("ACCOUNT_INACTIVE", 403);
    const now = this.clock.now();
    const session = await this.openSession(account._id, account, randomUUID(), this.clock.addSeconds(now, REFRESH_TTL_SECONDS), now);
    await this.accounts.markLogin(account._id, now);
    return session;
  }

  /**
   * Rota el refresh token. Orden sin transacciones: reclamar el viejo (atomico, gana uno) -> leer la cuenta -> insertar el nuevo
   * -> comprobar que la familia no se revoco mientras tanto. Operaciones: 4 en el caso feliz.
   */
  async refresh(body: unknown): Promise<PanelSession> {
    if (!isRefreshRequest(body)) throw new DomainException("VALIDATION_FAILED", 400);
    const hash = hashToken(body.refreshToken);
    const now = this.clock.now();
    const claimed = await this.tokens.claim(hash, now);
    if (claimed === null) {
      // Un token ya rotado que vuelve a aparecer = posible robo: se revoca la familia entera.
      const existing = await this.tokens.findByHash(hash);
      if (existing?.rotatedAt !== undefined) await this.tokens.deleteFamily(existing.familyId);
      throw new DomainException("INVALID_REFRESH_TOKEN", 401);
    }
    const account = await this.accounts.findForGuard(claimed.accountId);
    if (account === null || !account.active) {
      await this.tokens.deleteFamily(claimed.familyId);
      throw account === null ? new DomainException("INVALID_REFRESH_TOKEN", 401) : new DomainException("ACCOUNT_INACTIVE", 403);
    }
    const session = await this.openSession(claimed.accountId, { ...account }, claimed.familyId, claimed.expiresAt, now);
    // Si otro pedido con el mismo token revoco la familia entre el reclamo y el insert, el viejo ya no esta: se deshace el nuevo.
    if ((await this.tokens.findByHash(hash)) === null) {
      await this.tokens.deleteFamily(claimed.familyId);
      throw new DomainException("INVALID_REFRESH_TOKEN", 401);
    }
    return session;
  }

  /** Revoca la familia del token. Idempotente: un token desconocido tambien termina bien (no revela nada). 2 operaciones. */
  async logout(body: unknown): Promise<void> {
    if (!isLogoutRequest(body)) throw new DomainException("VALIDATION_FAILED", 400);
    const existing = await this.tokens.findByHash(hashToken(body.refreshToken));
    if (existing !== null) await this.tokens.deleteFamily(existing.familyId);
  }

  /**
   * Orden: verificar la actual -> guardar la nueva -> revocar TODOS los refresh tokens de la cuenta -> sesion nueva.
   * Un corte despues de guardar y antes de revocar deja vivos los refresh viejos (se corrige repitiendo el cambio). 6 operaciones.
   */
  async changePassword(account: AuthenticatedAccount, body: unknown): Promise<PanelSession> {
    if (!isChangePasswordRequest(body)) throw new DomainException("VALIDATION_FAILED", 400);
    // Con un access token robado hay 15 min para adivinar la clave actual: mismo limite que el login, por cuenta.
    if (!(await this.rateLimit.hit(`change-password:${account.accountId}`, this.config.limits.login))) throw new DomainException("RATE_LIMITED", 429);
    const doc = await this.accounts.findById(account.accountId);
    if (doc === null) throw new DomainException("INVALID_TOKEN", 401);
    if (!(await verifyPassword(body.currentPassword, doc.passwordHash))) throw new DomainException("INVALID_CREDENTIALS", 401);
    if (body.newPassword.normalize("NFKC") === body.currentPassword.normalize("NFKC")) throw new DomainException("VALIDATION_FAILED", 400);
    const now = this.clock.now();
    await this.accounts.setPassword(doc._id, await hashPassword(body.newPassword), now);
    await this.tokens.deleteByAccount(doc._id);
    return this.openSession(doc._id, { email: doc.email, role: doc.role, mustChangePassword: false }, randomUUID(), this.clock.addSeconds(now, REFRESH_TTL_SECONDS), now);
  }

  private nowSeconds(): number {
    return Math.floor(this.clock.now().getTime() / 1000);
  }

  /** Inserta el refresh token (solo su hash) y firma el access token. 1 escritura. */
  private async openSession(accountId: string, account: Pick<AuthenticatedAccount, "email" | "role" | "mustChangePassword">, familyId: string, refreshExpiresAt: Date, now: Date): Promise<PanelSession> {
    const refreshToken = generateToken();
    await this.tokens.insert({ accountId, familyId, tokenHash: hashToken(refreshToken), expiresAt: refreshExpiresAt });
    const iat = Math.floor(now.getTime() / 1000);
    const exp = iat + ACCESS_TTL_SECONDS;
    return {
      accessToken: signJwt({ sub: accountId, iat, exp }, this.config.jwtSecret),
      refreshToken,
      expiresAt: this.clock.fromEpochSeconds(exp).toISOString(),
      account: toPanelAccount({ accountId, email: account.email, role: account.role, mustChangePassword: account.mustChangePassword }),
    };
  }
}
