import { Inject, Injectable } from "@nestjs/common";
import { type AccountSummary, type InvitationResponse, isAccountId, isAcceptInvitationRequest, isCreateModeratorRequest, isEmail, isInviteModeratorRequest, isResetPasswordRequest, isUpdateAccountRequest } from "@patio/contracts";
import { randomUUID } from "node:crypto";
import { generateToken, hashToken } from "../auth/credentials.ts";
import { hashPassword } from "../auth/password.ts";
import { Clock } from "../platform/clock.ts";
import { type AppConfig, CONFIG } from "../platform/config.ts";
import { DomainException } from "../platform/domain.exception.ts";
import { MAILER, type Mailer } from "../platform/mailer.ts";
import { RateLimitService } from "../rate-limit/rate-limit.service.ts";
import { type AccountDoc, type AccountSafeDoc, AccountsRepository } from "./accounts.repository.ts";
import { normalizeEmail } from "./email.ts";
import { InvitationsRepository } from "./invitations.repository.ts";
import { RefreshTokensRepository } from "./refresh-tokens.repository.ts";

const INVITATION_TTL_SECONDS = 7 * 86_400; // propuesta

export const toSummary = (a: AccountSafeDoc): AccountSummary => {
  if (!isEmail(a.email) || !isAccountId(a._id)) throw new Error("cuenta guardada fuera del contrato");
  return {
    id: a._id,
    email: a.email,
    role: a.role,
    active: a.active,
    mustChangePassword: a.mustChangePassword,
    createdAt: a.createdAt.toISOString(),
    ...(a.lastLoginAt === undefined ? {} : { lastLoginAt: a.lastLoginAt.toISOString() }),
  };
};

/** Cuentas del panel: solo administrator (lo exige el controlador). */
@Injectable()
export class AccountsAdminService {
  constructor(
    @Inject(CONFIG) private readonly config: Pick<AppConfig, "limits" | "panelUrl" | "exposeInvitationLink">,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(MAILER) private readonly mailer: Mailer,
    @Inject(RateLimitService) private readonly rateLimit: Pick<RateLimitService, "hit">,
    @Inject(AccountsRepository) private readonly accounts: AccountsRepository,
    @Inject(InvitationsRepository) private readonly invitations: InvitationsRepository,
    @Inject(RefreshTokensRepository) private readonly tokens: Pick<RefreshTokensRepository, "deleteByAccount">,
  ) {}

  /** 1 lectura. */
  async list(): Promise<AccountSummary[]> {
    return (await this.accounts.list()).map(toSummary);
  }

  /** 1 lectura: cuantos de estos ids son cuentas reales (para validar `ownerIds`). */
  countExisting(ids: string[]): Promise<number> {
    return this.accounts.countByIds(ids);
  }

  /** Crea un moderator con clave temporal (mustChangePassword). 2 operaciones. */
  async createModerator(body: unknown): Promise<AccountSummary> {
    if (!isCreateModeratorRequest(body)) throw new DomainException("VALIDATION_FAILED", 400);
    const email = this.validEmail(body.email);
    const now = this.clock.now();
    const doc: AccountDoc = { _id: randomUUID(), email, role: "moderator", passwordHash: await hashPassword(body.temporaryPassword), mustChangePassword: true, active: true, createdAt: now, passwordChangedAt: now };
    await this.insert(doc);
    return toSummary(doc);
  }

  /** Cambia correo y/o activa o desactiva. Desactivar revoca los refresh tokens. 2 a 4 operaciones. */
  async update(actorId: string, id: string, body: unknown): Promise<AccountSummary> {
    if (!isUpdateAccountRequest(body)) throw new DomainException("VALIDATION_FAILED", 400);
    if (body.active === false) await this.assertCanRemoveAdmin(actorId, id);
    const patch = { ...(body.email === undefined ? {} : { email: this.validEmail(body.email) }), ...(body.active === undefined ? {} : { active: body.active }) };
    const updated = await this.accounts.update(id, patch);
    if (updated === "taken") throw new DomainException("ACCOUNT_EMAIL_TAKEN", 409);
    if (updated === null) throw new DomainException("ACCOUNT_NOT_FOUND", 404);
    if (body.active === false) await this.tokens.deleteByAccount(id);
    return toSummary(updated);
  }

  /** Clave temporal: la cuenta debe cambiarla y se cierran todas sus sesiones. 2 escrituras. */
  async resetPassword(id: string, body: unknown): Promise<void> {
    if (!isResetPasswordRequest(body)) throw new DomainException("VALIDATION_FAILED", 400);
    if (!(await this.accounts.resetPassword(id, await hashPassword(body.temporaryPassword), this.clock.now()))) throw new DomainException("ACCOUNT_NOT_FOUND", 404);
    await this.tokens.deleteByAccount(id);
  }

  /** Eliminacion definitiva. Orden: cuenta primero (deja de servir al instante), sesiones despues. Idempotente. 3 operaciones. */
  async delete(actorId: string, id: string): Promise<void> {
    await this.assertCanRemoveAdmin(actorId, id);
    await this.accounts.delete(id);
    await this.tokens.deleteByAccount(id);
  }

  /** ACCOUNT_NOT_FOUND si no existe. 1 lectura. */
  async get(id: string): Promise<AccountSafeDoc> {
    const doc = await this.accounts.findForGuard(id);
    if (doc === null) throw new DomainException("ACCOUNT_NOT_FOUND", 404);
    return doc;
  }

  /**
   * Invitacion por correo. Guarda SOLO el hash del token (32 bytes aleatorios), vence a los 7 dias. Reinvitar al mismo correo
   * reemplaza la invitacion anterior. Si el envio falla la invitacion queda guardada y se informa `emailSent: false` (reinvitar la
   * reemplaza). El enlace solo vuelve en la respuesta con NODE_ENV=development; jamas se loguea. 3 operaciones.
   */
  async invite(actorId: string, body: unknown): Promise<InvitationResponse> {
    if (!isInviteModeratorRequest(body)) throw new DomainException("VALIDATION_FAILED", 400);
    const email = this.validEmail(body.email);
    if ((await this.accounts.findByEmail(email)) !== null) throw new DomainException("ACCOUNT_EMAIL_TAKEN", 409);
    const token = generateToken();
    const now = this.clock.now();
    const expiresAt = this.clock.addSeconds(now, INVITATION_TTL_SECONDS);
    await this.invitations.upsertForEmail({ _id: randomUUID(), email, tokenHash: hashToken(token), createdBy: actorId, createdAt: now, expiresAt });
    const link = `${this.config.panelUrl}/accept-invitation?token=${token}`;
    let emailSent = false;
    try {
      emailSent = (await this.mailer.send({ to: email, subject: "Invitacion al panel de Patio", text: `Te invitaron a moderar en Patio. Elegi tu contrasena en este enlace (vence en 7 dias):\n\n${link}\n` })) === "sent";
    } catch {
      emailSent = false; // sin detalle: el error del servidor SMTP puede nombrar direcciones
    }
    return { email, expiresAt: expiresAt.toISOString(), emailSent, ...(this.config.exposeInvitationLink ? { link } : {}) };
  }

  /** Publico, con limite por IP. Crea el moderator activo, sin mustChangePassword. 4 operaciones. Token invalido, vencido o usado: mismo error. */
  async acceptInvitation(ip: string, body: unknown): Promise<void> {
    if (!(await this.rateLimit.hit(`accept-invitation:${ip}`, this.config.limits.login))) throw new DomainException("RATE_LIMITED", 429);
    if (!isAcceptInvitationRequest(body)) throw new DomainException("VALIDATION_FAILED", 400);
    const now = this.clock.now();
    const invitation = await this.invitations.claim(hashToken(body.token), now);
    if (invitation === null) throw new DomainException("INVITATION_INVALID", 404);
    const doc: AccountDoc = { _id: randomUUID(), email: invitation.email, role: "moderator", passwordHash: await hashPassword(body.password), mustChangePassword: false, active: true, createdAt: now, passwordChangedAt: now };
    await this.insert(doc);
    await this.invitations.delete(invitation._id);
  }

  private validEmail(raw: string): string {
    const email = normalizeEmail(raw);
    if (!isEmail(email)) throw new DomainException("VALIDATION_FAILED", 400);
    return email;
  }

  private async insert(doc: AccountDoc): Promise<void> {
    try {
      await this.accounts.insert(doc);
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) throw new DomainException("ACCOUNT_EMAIL_TAKEN", 409);
      throw error;
    }
  }

  /** Un administrator no puede quitarse a si mismo ni dejar al sistema sin administrator activo. */
  private async assertCanRemoveAdmin(actorId: string, id: string): Promise<void> {
    if (id === actorId) throw new DomainException("CANNOT_DELETE_OWN_ACCOUNT", 409);
    const target = await this.accounts.findForGuard(id);
    if (target === null) throw new DomainException("ACCOUNT_NOT_FOUND", 404);
    if (target.role === "administrator" && target.active && (await this.accounts.countActiveAdministrators()) <= 1) throw new DomainException("CANNOT_DELETE_LAST_ADMINISTRATOR", 409);
  }
}
