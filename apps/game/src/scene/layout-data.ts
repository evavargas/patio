// Datos fijos del patio, compartidos por el mundo y por el reparto de juguetes.
export const SIZE = 16; // medio lado del patio

export const OBSTACLES: ReadonlyArray<{ pos: [number, number, number]; size: [number, number, number] }> = [
  { pos: [6, 0.75, -3], size: [2, 1.5, 2] },
  { pos: [-5, 0.75, 3], size: [2, 1.5, 2] },
  { pos: [0, 0.5, -11], size: [5, 1, 1] },
  { pos: [3, 0.15, 8], size: [3, 0.3, 3] }, // escalon sobre el circuito
];

export const TREES: Array<[number, number, number]> = [
  [-13, 0, -13], [13, 0, -13], [-13, 0, 13], [13, 0, 13], [-13, 0, 0], [13, 0, 0], [0, 0, 14], [10, 0, -9],
];
