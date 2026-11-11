/**
 * Unico lugar del alfabeto de 31 simbolos: A-Z y 2-9 sin O, I, L (letras) ni 0, 1 (digitos).
 * 23 letras + 8 digitos = 31. Lo comparten ID publico, codigo de grupo y codigo de recuperacion.
 * El contrato (`primitives.schema.json`) repite la misma clase en su patron: una prueba lo compara.
 */
export const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
