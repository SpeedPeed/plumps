// Tastatur, Touch-Joystick und Gamepad.
// Liefert { mx, my, d, u, b, h }:
//   d = Dash gedrückt (Zähler), u = Dash losgelassen (Zähler), h = Dash wird gerade gehalten,
//   b = Stemmen gedrückt (Zähler).
// Zähler statt Ein/Aus, damit kein kurzer Tipp verloren geht, auch wenn ein Paket zu spät kommt.

const keys = new Set();
let dashDown = 0, dashUp = 0, braceDown = 0;
let dashHeld = false;
const stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
const padWas = [];

const DASH_KEYS = ['Space', 'KeyJ', 'Enter', 'NumpadEnter'];
const BRACE_KEYS = ['ShiftLeft', 'ShiftRight', 'KeyK', 'KeyL'];

function dashPress() { if (!dashHeld) { dashHeld = true; dashDown++; } }
function dashRelease() { if (dashHeld) { dashHeld = false; dashUp++; } }

export function initInput(joyEl, knobEl, dashBtn, braceBtn) {
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (!e.repeat) {
      if (DASH_KEYS.includes(e.code)) dashPress();
      if (BRACE_KEYS.includes(e.code)) braceDown++;
    }
    keys.add(e.code);
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    keys.delete(e.code);
    if (DASH_KEYS.includes(e.code) && !DASH_KEYS.some(k => keys.has(k))) dashRelease();
  });
  window.addEventListener('blur', () => { keys.clear(); dashRelease(); });

  const zone = joyEl.parentElement;
  zone.addEventListener('pointerdown', (e) => {
    if (e.target === dashBtn || e.target === braceBtn) return;
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

  // DASH-Knopf: gedrückt halten lädt auf, loslassen löst aus
  let dashPointer = null;
  dashBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    dashPointer = e.pointerId;
    try { dashBtn.setPointerCapture(e.pointerId); } catch { /* egal */ }
    dashPress();
    dashBtn.classList.add('down');
  });
  const dashEnd = (e) => {
    if (e.pointerId !== dashPointer) return;
    dashPointer = null;
    dashRelease();
    dashBtn.classList.remove('down');
  };
  dashBtn.addEventListener('pointerup', dashEnd);
  dashBtn.addEventListener('pointercancel', dashEnd);
  dashBtn.addEventListener('lostpointercapture', dashEnd);

  braceBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    braceDown++;
    braceBtn.classList.add('down');
  });
  const braceEnd = () => braceBtn.classList.remove('down');
  braceBtn.addEventListener('pointerup', braceEnd);
  braceBtn.addEventListener('pointercancel', braceEnd);
  braceBtn.addEventListener('pointerleave', braceEnd);
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
    const was = padWas[gp.index] || {};
    // A = Dash (halten lädt auf), B/X/Schultertasten = Stemmen
    const dash = !!gp.buttons[0]?.pressed;
    const brace = !!(gp.buttons[1]?.pressed || gp.buttons[2]?.pressed || gp.buttons[4]?.pressed || gp.buttons[5]?.pressed);
    if (dash && !was.dash) dashPress();
    if (!dash && was.dash) dashRelease();
    if (brace && !was.brace) braceDown++;
    padWas[gp.index] = { dash, brace };
  }
  const m = Math.hypot(mx, my);
  if (m > 1) { mx /= m; my /= m; }
  return { mx, my, d: dashDown, u: dashUp, b: braceDown, h: dashHeld ? 1 : 0 };
}
