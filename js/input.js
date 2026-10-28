// Tastatur + Touch-Joystick. Liefert {mx, my, d}; d zählt Dash-Drücke hoch,
// damit kein Dash verloren geht, auch wenn ein Paket zu spät kommt.

const keys = new Set();
let dashCount = 0;
const stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
const padWas = [];

const DASH_KEYS = ['Space', 'ShiftLeft', 'ShiftRight', 'KeyK', 'KeyJ', 'Enter'];

export function initInput(joyEl, knobEl, dashBtn) {
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (DASH_KEYS.includes(e.code) && !e.repeat) dashCount++;
    keys.add(e.code);
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());

  const zone = joyEl.parentElement;
  zone.addEventListener('pointerdown', (e) => {
    if (e.target === dashBtn) return;
    if (e.clientX > window.innerWidth * 0.55 || stick.id !== null) return;
    stick.id = e.pointerId;
    stick.ox = e.clientX; stick.oy = e.clientY;
    stick.x = 0; stick.y = 0;
    joyEl.style.left = e.clientX + 'px';
    joyEl.style.top = e.clientY + 'px';
    joyEl.classList.add('on');
    knobEl.style.transform = 'translate(-50%,-50%)';
  });
  window.addEventListener('pointermove', (e) => {
    if (e.pointerId !== stick.id) return;
    let dx = e.clientX - stick.ox, dy = e.clientY - stick.oy;
    const max = 55, d = Math.hypot(dx, dy);
    if (d > max) { dx *= max / d; dy *= max / d; }
    stick.x = dx / max; stick.y = dy / max;
    knobEl.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  });
  const end = (e) => {
    if (e.pointerId !== stick.id) return;
    stick.id = null; stick.x = stick.y = 0;
    joyEl.classList.remove('on');
  };
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);

  dashBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); dashCount++; dashBtn.classList.add('down'); });
  dashBtn.addEventListener('pointerup', () => dashBtn.classList.remove('down'));
  dashBtn.addEventListener('pointerleave', () => dashBtn.classList.remove('down'));
}

export function readInput() {
  let mx = 0, my = 0;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) mx -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) mx += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) my -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) my += 1;
  if (stick.id !== null) { mx = stick.x; my = stick.y; }
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const gp of pads) {
    if (!gp) continue;
    if (Math.abs(gp.axes[0]) > 0.2 || Math.abs(gp.axes[1]) > 0.2) { mx = gp.axes[0]; my = gp.axes[1]; }
    const pressed = gp.buttons[0]?.pressed || gp.buttons[1]?.pressed;
    if (pressed && !padWas[gp.index]) dashCount++;
    padWas[gp.index] = pressed;
  }
  const m = Math.hypot(mx, my);
  if (m > 1) { mx /= m; my /= m; }
  return { mx, my, d: dashCount };
}
