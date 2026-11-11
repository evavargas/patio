// Estado de entrada compartido por referencia: la escena lo lee en cada cuadro sin re-renderizar React.
export const inputState = {
  moveX: 0, // -1 izquierda .. 1 derecha
  moveZ: 0, // -1 adelante .. 1 atras
  jumpRequested: false,
};

export const playerPosition = { x: 0, y: 0, z: 0 };

const keys = new Set<string>();

function recompute() {
  const x = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
  const z = (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0);
  const len = Math.hypot(x, z) || 1;
  keyboardVector.x = x / len;
  keyboardVector.z = z / len;
}

export const keyboardVector = { x: 0, z: 0 };
export const joystickVector = { x: 0, z: 0 };
export const scriptVector = { x: 0, z: 0, active: false };

/** Combina fuentes en inputState. Se llama una vez por paso de fisica. */
export function resolveInput() {
  const src = scriptVector.active ? scriptVector : joystickVector.x || joystickVector.z ? joystickVector : keyboardVector;
  inputState.moveX = src.x;
  inputState.moveZ = src.z;
}

export function attachKeyboard(): () => void {
  const isTyping = (e: KeyboardEvent) => e.target instanceof HTMLElement && e.target.closest('button, input, select, textarea, [role="button"]') !== null;
  const down = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (k === ' ' && !isTyping(e)) {
      inputState.jumpRequested = true;
      e.preventDefault();
    }
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
      keys.add(k);
      recompute();
    }
  };
  const up = (e: KeyboardEvent) => {
    keys.delete(e.key.toLowerCase());
    recompute();
  };
  const blur = () => {
    keys.clear();
    recompute();
  };
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', blur);
  return () => {
    window.removeEventListener('keydown', down);
    window.removeEventListener('keyup', up);
    window.removeEventListener('blur', blur);
  };
}
