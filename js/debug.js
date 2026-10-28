// Debug-Ansicht, nur mit ?debug in der URL: FPS, Ping, Startwert, aktive Effekte
// und Schieberegler für die wichtigsten Werte aus tuning.js.
// Die Regler wirken nur beim Host (bzw. im Solo-Spiel), weil nur dort simuliert wird.
import { T, T_DEFAULTS, TUNING_SLIDERS } from './tuning.js';
import { MODES, MAPS, CARDS } from './sim.js';

export const DEBUG = new URLSearchParams(location.search).has('debug');

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const fmt = (v) => (Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 100) / 100);

export function initDebug({ getGame, getRole, getPings, view }) {
  if (!DEBUG) return { frame() {} };
  view.debug = true;

  const box = document.createElement('div');
  box.id = 'debug';
  box.innerHTML = `
    <div class="dbg-head"><b>Debug</b><span id="dbgFps"></span><button id="dbgToggle">−</button></div>
    <div id="dbgBody">
      <pre id="dbgInfo"></pre>
      <div id="dbgSliders"></div>
      <div class="dbg-row">
        <button id="dbgReset">Zurücksetzen</button>
        <button id="dbgCopy">Geänderte Werte kopieren</button>
      </div>
      <label class="dbg-check"><input type="checkbox" id="dbgHit" checked> Hitboxen</label>
    </div>`;
  document.body.appendChild(box);
  const $ = (id) => document.getElementById(id);

  $('dbgToggle').onclick = () => {
    const hidden = $('dbgBody').classList.toggle('hidden');
    $('dbgToggle').textContent = hidden ? '+' : '−';
  };
  $('dbgHit').onchange = (e) => { view.debug = e.target.checked; };
  // Am Handy würde das Panel zu viel verdecken – dort startet es eingeklappt
  if (matchMedia('(pointer: coarse)').matches) $('dbgToggle').click();

  // Schieberegler
  const sliders = $('dbgSliders');
  for (const [key, min, max, step] of TUNING_SLIDERS) {
    const row = document.createElement('label');
    row.className = 'dbg-slider';
    row.innerHTML = `<span>${key}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${T[key]}"><output>${fmt(T[key])}</output>`;
    const input = row.querySelector('input'), out = row.querySelector('output');
    input.oninput = () => { T[key] = +input.value; out.textContent = fmt(T[key]); out.classList.toggle('changed', T[key] !== T_DEFAULTS[key]); };
    sliders.appendChild(row);
  }
  const syncSliders = () => {
    sliders.querySelectorAll('.dbg-slider').forEach((row, i) => {
      const key = TUNING_SLIDERS[i][0];
      row.querySelector('input').value = T[key];
      const out = row.querySelector('output');
      out.textContent = fmt(T[key]);
      out.classList.toggle('changed', T[key] !== T_DEFAULTS[key]);
    });
  };
  $('dbgReset').onclick = () => { Object.assign(T, T_DEFAULTS); syncSliders(); };
  $('dbgCopy').onclick = async () => {
    const changed = Object.fromEntries(Object.keys(T).filter(k => T[k] !== T_DEFAULTS[k]).map(k => [k, T[k]]));
    const text = JSON.stringify(changed, null, 2);
    try { await navigator.clipboard.writeText(text); $('dbgCopy').textContent = 'Kopiert!'; }
    catch { prompt('Geänderte Werte:', text); }
    setTimeout(() => { $('dbgCopy').textContent = 'Geänderte Werte kopieren'; }, 1500);
  };

  let frames = 0, acc = 0, fps = 0, infoT = 0;
  return {
    frame(dt, s) {
      frames++; acc += dt;
      if (acc >= 0.5) { fps = Math.round(frames / acc); frames = 0; acc = 0; }
      infoT -= dt;
      if (infoT > 0) return;
      infoT = 0.2;
      const role = getRole();
      const canTune = role === 'host' || role === 'solo';
      sliders.classList.toggle('off', !canTune);
      sliders.title = canTune ? '' : 'Regler wirken nur beim Host';
      const pings = getPings();
      const pingText = role === 'client' ? `Ping ${pings.me ?? '–'} ms` : role === 'host' ? 'Host' : 'Solo';
      $('dbgFps').textContent = `${fps} FPS · ${pingText}`;
      if (!s) { $('dbgInfo').textContent = ''; return; }

      const g = canTune ? getGame() : null;
      const lines = [];
      lines.push(`Phase ${s.ph}  Runde ${s.rd}  Startwert ${s.sd ?? '–'}`);
      lines.push(`Modus ${MODES[s.mo]?.name}  Insel ${MAPS[s.mp]?.name}`);
      lines.push(`Karte ${s.c ? CARDS[s.c]?.name : '–'}${s.co ? ' (von ' + (s.p.find(p => p.id === s.co)?.n || '?') + ')' : ''}`);
      if (g && g.phase === 'play') lines.push(`Zeit ${g.t.toFixed(1)} s  Inselgröße ${(g.k * 100).toFixed(0)} %  Tempo ×${g.gm.dtScale}`);
      lines.push('');
      for (const p of s.p) {
        const gp = g?.players.get(p.id);
        const fx = gp
          ? Object.entries(gp.pw).filter(([, v]) => v > 0).map(([k, v]) => `${k} ${v.toFixed(1)}s`).join(', ')
          : (p.pw || '') + (p.sl ? ' slip' : '');
        const hit = gp?.lastHitBy && g.t - gp.lastHitT < T.KO_WINDOW ? ` ← ${s.p.find(q => q.id === gp.lastHitBy)?.n || gp.lastHitBy}` : '';
        const ping = role === 'host' && pings[p.id] != null ? ` ${pings[p.id]}ms` : '';
        lines.push(`${p.n.padEnd(12).slice(0, 12)} ${p.st.padEnd(7)}${fx ? ' [' + fx + ']' : ''}${hit}${ping}`);
      }
      $('dbgInfo').innerHTML = esc(lines.join('\n'));
    },
  };
}
