// Skyrim-style lockpicking: aim the pick with the mouse, hold to turn the lock. The lock only turns fully when the pick sits in the
// sweet spot; forcing it elsewhere shakes and snaps the pick. Difficulty narrows the sweet spot.
const TOL = { 1: 0.60, 2: 0.34, 3: 0.17, 4: 0.08 };   // radians of forgiveness around the sweet spot
export const DIFF_NAMES = { 1: 'fácil', 2: 'média', 3: 'difícil', 4: 'muito difícil' };
export class Lockpick {
  constructor(game) { this.game = game; this.el = document.getElementById('lockpick'); this.cv = document.getElementById('lockpick-cv'); this.x = this.cv.getContext('2d'); this.active = false; this.t = 0; this.aim = null; this.turnHeld = false;
    // touch and mouse on the lock itself: dragging aims the pick, pressing turns the lock; buttons for phones
    const aimAt = e => { const r = this.cv.getBoundingClientRect(); this.aim = ((e.clientX - r.left) / r.width) * 2 - 1; };
    this.cv.addEventListener('pointerdown', e => { e.preventDefault(); aimAt(e); if (e.pointerType === 'mouse') this.turnHeld = true; this.cv.setPointerCapture?.(e.pointerId); });
    this.cv.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse' || this.turnHeld || this.aim != null) aimAt(e); });
    this.cv.addEventListener('pointerup', e => { if (e.pointerType === 'mouse') this.turnHeld = false; });
    const turn = document.getElementById('lp-turn'); turn.addEventListener('pointerdown', e => { e.preventDefault(); this.turnHeld = true; turn.setPointerCapture?.(e.pointerId); }); ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(k => turn.addEventListener(k, () => { this.turnHeld = false; }));
    document.getElementById('lp-quit').onclick = () => { if (this.active) this.end(false); };
  }
  // resolves true (opened) or false (gave up / out of picks)
  start(diff) {
    return new Promise(res => { this.res = res; this.diff = diff; this.tol = TOL[diff] || 0.3; this.sweet = (Math.random() - 0.5) * 2.6; this.pick = 0; this.lock = 0; this.shake = 0; this.stress = 0; this.active = true; this.broken = 0; this.aim = null; this.turnHeld = false; this.msg = ''; this.msgT = 0; this.el.classList.add('show'); this.game.player.frozen = true; });
  }
  end(ok) { this.active = false; this.el.classList.remove('show'); this.game.player.frozen = false; this.game.input.pressed = {}; const r = this.res; this.res = null; r(ok); }
  get picks() { return this.game.player.inventory.gazua || 0; }
  update(dt) {
    if (!this.active) return; const inp = this.game.input; this.t += dt;
    if (inp.pressed.Escape || inp.pressed.KeyE) return this.end(false);
    this.pick += ((-(this.aim ?? inp.mouse.nx) * 1.5) - this.pick) * Math.min(1, dt * 14); this.pick = Math.max(-1.5, Math.min(1.5, this.pick));
    const err = Math.max(0, Math.abs(this.pick - this.sweet) - this.tol); const maxTurn = Math.max(0.06, 1 - err / 0.9) * (Math.PI / 2);   // how far the lock can go with the pick here
    const turning = this.turnHeld || inp.keys.Space;
    if (turning) { if (this.lock < maxTurn) { this.lock = Math.min(maxTurn, this.lock + dt * 1.6); this.stress = Math.max(0, this.stress - dt); } else { this.stress += dt; this.shake = 1; }
      if (this.lock >= Math.PI / 2 - 0.01) { this.game.audio.pickup(); return this.end(true); }
      if (this.stress > 0.9) { this.stress = 0; this.lock = 0; this.broken++; this.game.removeItem('gazua'); this.game.audio.block(); this.msg = 'A gazua quebrou!'; this.msgT = 1.5; if (!this.picks) { this.game.hud.toast('Sem gazuas. Compre mais com o Mercador Gaspar.', 3000); return this.end(false); } }
    } else { this.lock = Math.max(0, this.lock - dt * 3); this.stress = Math.max(0, this.stress - dt * 2); }
    this.shake = Math.max(0, this.shake - dt * 3); this.msgT -= dt;
    this.draw();
  }
  draw() {
    const x = this.x, W = this.cv.width, H = this.cv.height, cx = W / 2, cy = H / 2 + 10; x.clearRect(0, 0, W, H);
    x.fillStyle = '#0d0a08'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#e9d4a4'; x.font = 'bold 13px Trebuchet MS, sans-serif'; x.textAlign = 'left'; x.fillText(`FECHADURA ${DIFF_NAMES[this.diff].toUpperCase()}`, 12, 22); x.textAlign = 'right'; x.fillText(`GAZUAS: ${this.picks}`, W - 12, 22);
    // lock body
    const jit = this.shake * (Math.random() - 0.5) * 6;
    x.save(); x.translate(cx + jit, cy + jit * 0.5);
    const g = x.createRadialGradient(0, 0, 20, 0, 0, 120); g.addColorStop(0, '#6a5a3a'); g.addColorStop(1, '#2a2218'); x.fillStyle = g; x.beginPath(); x.arc(0, 0, 118, 0, 7); x.fill(); x.strokeStyle = '#c9a84a'; x.lineWidth = 6; x.stroke();
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; x.fillStyle = '#1a1410'; x.beginPath(); x.arc(Math.cos(a) * 104, Math.sin(a) * 104, 5, 0, 7); x.fill(); }
    // inner cylinder rotates with the lock
    x.save(); x.rotate(this.lock); x.fillStyle = '#3a3026'; x.beginPath(); x.arc(0, 0, 70, 0, 7); x.fill(); x.strokeStyle = '#8a7a5a'; x.lineWidth = 3; x.stroke();
    x.fillStyle = '#0a0806'; x.beginPath(); x.roundRect(-7, -48, 14, 70, 5); x.fill(); x.beginPath(); x.arc(0, -40, 13, 0, 7); x.fill(); x.restore();
    // the pick, hinged at the keyhole, pointing up and rotated by the player
    x.save(); x.rotate(this.pick + this.lock * 0.15); x.strokeStyle = '#d8dde5'; x.lineWidth = 4; x.lineCap = 'round'; x.beginPath(); x.moveTo(0, 0); x.lineTo(0, -82); x.lineTo(8, -96); x.stroke(); x.strokeStyle = '#8a8f99'; x.lineWidth = 2; x.beginPath(); x.moveTo(-2, 0); x.lineTo(-2, -80); x.stroke(); x.restore();
    // tension wrench at the bottom
    x.save(); x.rotate(this.lock); x.strokeStyle = '#b0b8c0'; x.lineWidth = 7; x.lineCap = 'round'; x.beginPath(); x.moveTo(0, 10); x.lineTo(0, 150); x.stroke(); x.restore();
    x.restore();
    if (this.msgT > 0) { x.fillStyle = '#ff6060'; x.font = 'bold 18px Trebuchet MS, sans-serif'; x.textAlign = 'center'; x.fillText(this.msg, cx, 48); }
    else if (this.stress > 0.3) { x.fillStyle = '#ffb040'; x.font = 'bold 14px Trebuchet MS, sans-serif'; x.textAlign = 'center'; x.fillText('A gazua está forçando...', cx, 48); }
  }
}
