import nodemailer from "nodemailer";
import type { AppConfig } from "./config.ts";

export const MAILER = Symbol("MAILER");

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

/** "skipped" = no hay SMTP configurado (solo en development/test). Un fallo de envio lanza. */
export interface Mailer {
  send(message: MailMessage): Promise<"sent" | "skipped">;
}

/** Gmail SMTP (u otro) con nodemailer. Nunca registra ni imprime la contrasena ni el contenido. */
export function createMailer(mail: AppConfig["mail"]): Mailer {
  if (mail === null) return { send: () => Promise.resolve("skipped") };
  const transport = nodemailer.createTransport({
    host: mail.host,
    port: mail.port,
    secure: mail.port === 465,
    auth: { user: mail.user, pass: mail.password },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  return {
    send: async (message) => {
      await transport.sendMail({ from: mail.from, ...message });
      return "sent";
    },
  };
}
