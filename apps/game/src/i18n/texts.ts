// Catalogo simple es-UY. Se reemplaza cuando se elija la libreria de i18n.
export const texts = {
  appTitle: 'Patio',
  sceneLabel: 'Patio de recreo en 3D con tu personaje y cuatro juguetes',
  moveHint: 'Moverse: flechas o WASD. Saltar: barra espaciadora.',
  jump: 'Saltar',
  joystickLabel: 'Joystick para moverse',
  openChallenge: 'Abrir desafío',
  challengeTitle: 'Desafío: seres vivos y cosas',
  challengeIntro: 'Llevá cada tarjeta a su caja. Podés arrastrarla o usar los botones.',
  livingBox: 'Seres vivos',
  thingsBox: 'Cosas',
  pool: 'Tarjetas',
  moveToLiving: 'Mover a seres vivos',
  moveToThings: 'Mover a cosas',
  moveBack: 'Devolver a tarjetas',
  achieved: '¡Lo lograste!',
  tryOtherStrategy: 'Probá otra estrategia.',
  closeChallenge: 'Volver al patio',
  dragInstructions:
    'Para mover una tarjeta con el teclado, enfocala, apretá espacio, usá las flechas y apretá espacio otra vez. También podés usar los botones de cada tarjeta.',
  dragStart: 'Levantaste la tarjeta {item}.',
  dragOver: 'La tarjeta {item} está sobre {target}.',
  dragEnd: 'Soltaste la tarjeta {item}.',
  dragCancel: 'Cancelaste el movimiento de {item}.',
  cardCat: 'Gato',
  cardFlower: 'Flor',
  cardStone: 'Piedra',
  cardTable: 'Mesa',
  perfTitle: 'Prueba de rendimiento',
  perfRunning: 'Midiendo… {seconds} s de {total} s. No toques nada.',
  perfDone: 'Prueba terminada.',
  perfNote: 'Estas cifras valen solo para el dispositivo indicado en el JSON.',
  perfDownload: 'Descargar JSON',
  perfCopy: 'Copiar JSON',
  perfCopied: 'Copiado.',
  perfSummary: 'Resumen',
} as const;

export type TextKey = keyof typeof texts;

export function t(key: TextKey, params?: Record<string, string | number>): string {
  let out: string = texts[key];
  if (params) for (const [k, v] of Object.entries(params)) out = out.replace(`{${k}}`, String(v));
  return out;
}
