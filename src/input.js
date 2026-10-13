// Keyboard, mouse and touch. Touch: a floating joystick on the left part of the screen, a tap elsewhere acts like a
// mouse click (walk there / attack the creature), two fingers pinch to zoom, and the on-screen buttons (#actions) hold
// attack and shield, trigger the dodge and toggle running.
import { PERF } from './perf.js';
export class Input {
  constructor(canvas) {
    this.keys = {}; this.pressed = {}; this.mouse = { dx: 0, dy: 0, nx: 0, ny: 0, left: false, right: false, leftClick: false, rightClick: false }; this.wheel = 0; this.locked = false; this.canvas = canvas;
    this.touch = false; this.joy = { x: 0, z: 0, mag: 0, id: null, ox: 0, oy: 0 }; this.attackHeld = false; this.shieldHeld = false; this.runToggle = false; this.taps = new Map(); this.pinch = null;
    if (PERF.mobile || new URLSearchParams(location.search).has('touch')) this.setTouch();
    window.addEventListener('keydown', e => { if (!this.keys[e.code]) this.pressed[e.code] = true; this.keys[e.code] = true; if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault(); });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; });
    window.addEventListener('blur', () => { this.keys = {}; this.attackHeld = this.shieldHeld = false; this.mouse.left = this.mouse.right = false; this.joyEnd(); });
    const view = canvas.parentElement, ui = t => t.closest && t.closest('.tap, .ui-panel, button, #card-wrap, #lockpick, #bigmap-wrap');
    document.addEventListener('mousemove', e => { this.mouseUsed = true; const r = canvas.getBoundingClientRect(); this.mouse.nx = ((e.clientX - r.left) / r.width) * 2 - 1; this.mouse.ny = -((e.clientY - r.top) / r.height) * 2 + 1; });
    view.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse') { if (ui(e.target)) return; if (e.button === 0) { this.mouse.left = true; this.mouse.leftClick = true; } if (e.button === 2) { this.mouse.right = true; this.mouse.rightClick = true; } return; }
      this.setTouch(); if (ui(e.target)) return; e.preventDefault();
      const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      if (this.joy.id == null && x < r.width * 0.45 && y > r.height * 0.3) { this.joy.id = e.pointerId; this.joy.ox = e.clientX; this.joy.oy = e.clientY; this.placeJoy(x, y); view.setPointerCapture?.(e.pointerId); return; }
      this.taps.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now(), sx: e.clientX, sy: e.clientY });
      if (this.taps.size === 2) { const [a, b] = [...this.taps.values()]; this.pinch = Math.hypot(a.x - b.x, a.y - b.y); }
    }, { passive: false });
    view.addEventListener('pointermove', e => {
      if (e.pointerType === 'mouse') return;
      if (e.pointerId === this.joy.id) { const R = 52; let dx = e.clientX - this.joy.ox, dy = e.clientY - this.joy.oy; const d = Math.hypot(dx, dy); if (d > R) { dx *= R / d; dy *= R / d; } this.joy.x = dx / R; this.joy.z = dy / R; this.joy.mag = Math.min(1, d / R); this.knob.style.transform = `translate(${dx}px,${dy}px)`; this.joyEl.classList.toggle('run', this.joy.mag > 0.97 && d > R * 1.25); this.joy.run = d > R * 1.25; return; }
      const t = this.taps.get(e.pointerId); if (!t) return; t.x = e.clientX; t.y = e.clientY;
      if (this.taps.size === 2 && this.pinch) { const [a, b] = [...this.taps.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); this.wheel -= (d - this.pinch) * 4; this.pinch = d; this.pinchUsed = true; }
    });
    const up = e => {
      if (e.pointerType === 'mouse') return;
      if (e.pointerId === this.joy.id) { this.joyEnd(); return; }
      const t = this.taps.get(e.pointerId); if (!t) return; this.taps.delete(e.pointerId);
      if (this.taps.size < 2) this.pinch = null;
      if (!this.pinchUsed && performance.now() - t.t < 400 && Math.hypot(t.x - t.sx, t.y - t.sy) < 14) { const r = canvas.getBoundingClientRect(); this.mouse.nx = ((t.x - r.left) / r.width) * 2 - 1; this.mouse.ny = -((t.y - r.top) / r.height) * 2 + 1; this.mouse.leftClick = true; }
      if (!this.taps.size) this.pinchUsed = false;
    };
    view.addEventListener('pointerup', up); view.addEventListener('pointercancel', up);
    document.addEventListener('mouseup', e => { if (e.button === 0) this.mouse.left = false; if (e.button === 2) this.mouse.right = false; });
    document.addEventListener('contextmenu', e => e.preventDefault());
    view.addEventListener('wheel', e => { this.wheel += e.deltaY; e.preventDefault(); }, { passive: false });
    // on-screen action buttons
    const hold = (id, on, off) => { const b = document.getElementById(id); if (!b) return; b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); b.classList.add('on'); on(); b.setPointerCapture?.(e.pointerId); }); const end = () => { b.classList.remove('on'); if (off) off(); }; b.addEventListener('pointerup', end); b.addEventListener('pointercancel', end); b.addEventListener('lostpointercapture', end); };
    hold('act-attack', () => { this.attackHeld = true; this.pressed.KeyF = true; }, () => { this.attackHeld = false; });
    hold('act-shield', () => { this.shieldHeld = true; }, () => { this.shieldHeld = false; });
    hold('act-dodge', () => { this.pressed.Space = true; });
    hold('act-skill', () => { this.pressed.KeyQ = true; });
    hold('act-run', () => { this.runToggle = !this.runToggle; document.getElementById('act-run').style.filter = this.runToggle ? 'hue-rotate(80deg) brightness(1.3)' : ''; });
  }
  setTouch() { if (this.touch) return; this.touch = true; document.body.classList.add('touch'); this.joyEl = document.getElementById('joy'); this.knob = document.getElementById('joy-knob'); this.home = null; }
  placeJoy(x, y) { const j = this.joyEl; if (!j) return; if (!this.home) { const r = j.getBoundingClientRect(), v = this.canvas.getBoundingClientRect(); this.home = [r.left - v.left, r.top - v.top]; } j.style.left = (x - 65) + 'px'; j.style.top = (y - 65) + 'px'; j.style.bottom = 'auto'; }
  joyEnd() { this.joy.id = null; this.joy.x = this.joy.z = this.joy.mag = 0; this.joy.run = false; if (this.knob) this.knob.style.transform = ''; if (this.joyEl) { this.joyEl.classList.remove('run'); this.joyEl.style.left = ''; this.joyEl.style.top = ''; this.joyEl.style.bottom = ''; } }
  // Pointer lock is not used in the top-down view; kept so callers stay simple.
  lock() {}
  unlock() {}
  down(k) { const m = { fwd: ['KeyW', 'ArrowUp'], back: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'], run: ['ShiftLeft', 'ShiftRight'] }; if (k === 'run' && (this.runToggle || this.joy.run)) return true; return (m[k] || []).some(c => this.keys[c]); }
  get blockHeld() { return this.mouse.right || this.shieldHeld; }
  endFrame() { this.pressed = {}; this.mouse.dx = 0; this.mouse.dy = 0; this.mouse.leftClick = false; this.mouse.rightClick = false; this.wheel = 0; }
}
