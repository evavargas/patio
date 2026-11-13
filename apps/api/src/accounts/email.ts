/** Correo normalizado: recortado y en minusculas. Es la unica forma que se guarda y se busca. */
export const normalizeEmail = (email: string): string => email.trim().toLowerCase();
