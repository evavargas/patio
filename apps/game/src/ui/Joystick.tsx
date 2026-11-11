import { useRef } from 'react';
import { joystickVector } from '../input/input-state';
import { t } from '../i18n/texts';

// Todo por refs y estilos directos: ningun estado de React cambia al mover el dedo.
export function Joystick() {
  const base = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);

  const update = (e: React.PointerEvent) => {
    const el = base.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const radius = r.width / 2;
    let dx = (e.clientX - (r.left + radius)) / radius;
    let dz = (e.clientY - (r.top + radius)) / radius;
    const len = Math.hypot(dx, dz);
    if (len > 1) {
      dx /= len;
      dz /= len;
    }
    const dead = len < 0.15;
    joystickVector.x = dead ? 0 : dx;
    joystickVector.z = dead ? 0 : dz;
    if (knob.current) knob.current.style.transform = `translate(${dx * radius * 0.6}px, ${dz * radius * 0.6}px)`;
  };
  const reset = () => {
    joystickVector.x = 0;
    joystickVector.z = 0;
    if (knob.current) knob.current.style.transform = '';
  };

  return (
    // Complemento tactil: el movimiento tiene alternativa de teclado (flechas o WASD).
    <div
      ref={base}
      className="joystick"
      role="presentation"
      aria-label={t('joystickLabel')}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e);
      }}
      onPointerMove={(e) => e.buttons && update(e)}
      onPointerUp={reset}
      onPointerCancel={reset}
    >
      <div ref={knob} className="joystick-knob" />
    </div>
  );
}
