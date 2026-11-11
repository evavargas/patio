import { Inject, Injectable, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { type Db, MongoClient } from "mongodb";
import { type AppConfig, CONFIG } from "../platform/config.ts";

/** Una conexion (pool del driver) por instancia. Sin transacciones: Atlas M0 no las garantiza. */
@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly client: MongoClient;
  readonly db: Db;

  constructor(@Inject(CONFIG) config: AppConfig) {
    // maxPoolSize 10: tope por instancia de doc 04 (M0 admite 500 conexiones en total)
    this.client = new MongoClient(config.mongoUri, { maxPoolSize: 10, serverSelectionTimeoutMS: 5000 });
    this.db = this.client.db(config.mongoDb);
  }

  /** Falla el arranque si la base no responde. El mensaje no incluye la URI. */
  async onModuleInit(): Promise<void> {
    try {
      await this.client.connect();
      await this.db.command({ ping: 1 });
    } catch {
      await this.client.close();
      throw new Error("No se pudo conectar a MongoDB (revisa MONGODB_URI y que la base este arriba)");
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.close();
  }
}
