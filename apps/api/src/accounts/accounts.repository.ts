import { Inject, Injectable, type OnModuleInit } from "@nestjs/common";
import type { AccountRole } from "@patio/contracts";
import { DatabaseService } from "../database/database.service.ts";

/** Doc 04: `accounts`. `_id` = AccountId (UUID). `passwordChangedAt` es propuesta: invalida los access tokens previos a un cambio de clave. */
export interface AccountDoc {
  _id: string;
  email: string;
  role: AccountRole;
  passwordHash: string;
  mustChangePassword: boolean;
  active: boolean;
  createdAt: Date;
  passwordChangedAt: Date;
  lastLoginAt?: Date;
}

export type AccountSafeDoc = Omit<AccountDoc, "passwordHash">;

/** Indice: unico `email`. */
@Injectable()
export class AccountsRepository implements OnModuleInit {
  private readonly collection;

  constructor(@Inject(DatabaseService) database: Pick<DatabaseService, "db">) {
    this.collection = database.db.collection<AccountDoc>("accounts");
  }

  async onModuleInit(): Promise<void> {
    await this.collection.createIndexes([{ key: { email: 1 }, unique: true }]);
  }

  /** 1 escritura. Falla con codigo 11000 si el correo ya existe. */
  async insert(account: AccountDoc): Promise<void> {
    await this.collection.insertOne(account);
  }

  /** 1 lectura por el indice unico. Trae el hash: solo para verificar la contrasena. */
  findByEmail(email: string): Promise<AccountDoc | null> {
    return this.collection.findOne({ email });
  }

  /** 1 lectura por `_id`. Trae el hash. */
  findById(id: string): Promise<AccountDoc | null> {
    return this.collection.findOne({ _id: id });
  }

  /** 1 lectura por `_id`, SIN el hash: lo que lee el guard en cada pedido. */
  findForGuard(id: string): Promise<AccountSafeDoc | null> {
    return this.collection.findOne({ _id: id }, { projection: { passwordHash: 0 } });
  }

  /** 1 escritura. */
  async markLogin(id: string, now: Date): Promise<void> {
    await this.collection.updateOne({ _id: id }, { $set: { lastLoginAt: now } });
  }

  /** 1 escritura atomica: hash, fin de mustChangePassword y marca de tiempo juntos. */
  async setPassword(id: string, passwordHash: string, now: Date): Promise<void> {
    await this.collection.updateOne({ _id: id }, { $set: { passwordHash, mustChangePassword: false, passwordChangedAt: now } });
  }

  // ---- Administracion de cuentas (panel) ----

  /** 1 lectura, sin hashes. Pocas cuentas: tope de 500. */
  list(): Promise<AccountSafeDoc[]> {
    return this.collection.find({}, { projection: { passwordHash: 0 } }).sort({ email: 1 }).limit(500).toArray();
  }

  /** 1 lectura: cuantas de estas cuentas existen. */
  countByIds(ids: string[]): Promise<number> {
    return this.collection.countDocuments({ _id: { $in: ids } });
  }

  /** 1 lectura. */
  countActiveAdministrators(): Promise<number> {
    return this.collection.countDocuments({ role: "administrator", active: true });
  }

  /** 1 escritura. false si el correo ya existe. */
  async update(id: string, patch: Partial<Pick<AccountDoc, "email" | "active">>): Promise<AccountSafeDoc | null | "taken"> {
    try {
      return await this.collection.findOneAndUpdate({ _id: id }, { $set: patch }, { returnDocument: "after", projection: { passwordHash: 0 } });
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) return "taken";
      throw error;
    }
  }

  /** 1 escritura: clave temporal; la cuenta queda obligada a cambiarla. */
  async resetPassword(id: string, passwordHash: string, now: Date): Promise<boolean> {
    return (await this.collection.updateOne({ _id: id }, { $set: { passwordHash, mustChangePassword: true, passwordChangedAt: now } })).matchedCount === 1;
  }

  /** 1 escritura. Idempotente. */
  async delete(id: string): Promise<void> {
    await this.collection.deleteOne({ _id: id });
  }
}
