// First-person hands drawn as 2D pixel art over the 3D scene. Uses PNGs from assets/ when present.
import { Assets } from './assets.js';
import { VIEW } from './view.js';
export class Overlay {
  constructor(cv) { this.cv = cv; this.x = cv.getContext('2d'); this.x.imageSmoothingEnabled = false; this.W = cv.width; this.H = cv.height; this.t = 0; }
  draw(p, g, dt) {
    const x = this.x, W = this.W, H = this.H; this.t += dt; x.clearRect(0, 0, W, H);
    const bob = Math.sin(p.bobT) * 5 * (p.moving ? 1 : 0.2) + Math.sin(this.t * 1.6);
    const sw = p.swing >= 0 ? Math.sin(p.swing * Math.PI) : 0;
    if (VIEW.hands) this.hands(x, W, H, p, bob, sw);
    // dodge / hurt
    if (p.hurtT > 0) { x.fillStyle = `rgba(220,30,30,${Math.min(0.22, p.hurtT * 0.5)})`; x.fillRect(0, 0, W, H); }
    if (g.flash > 0) { x.fillStyle = `rgba(255,255,255,${Math.min(1, g.flash)})`; x.fillRect(0, 0, W, H); }
  }
  hands(x, W, H, p, bob, sw) {
    // ---- right: sword ----
    const useImg = Assets.has('hand_sword_idle');
    if (useImg) {
      const img = (p.swing >= 0 && p.swing < 0.7 && Assets.has('hand_sword_attack')) ? Assets.images.hand_sword_attack : Assets.images.hand_sword_idle;
      const hgt = H * 0.74, wid = hgt * img.width / img.height;   // anchored to the bottom-right corner, forearm leaves the frame
      x.save(); x.translate(W + 14 - wid - sw * 150, H + 16 - hgt + bob + sw * 30); if (sw) { x.translate(wid * 0.6, hgt * 0.7); x.rotate(-sw * 0.35); x.translate(-wid * 0.6, -hgt * 0.7); } x.drawImage(img, 0, 0, wid, hgt); x.restore();
    } else this.arm(x, W - 104 - sw * 110, H - 70 + bob - sw * 20, 'right', p, p.swingType === 'h' ? -sw * 1.3 : sw * 0.9);
    // ---- left ----
    const blocking = p.blocking && p.leftItem === 'shield';
    const leftName = p.leftItem === 'shield' ? (p.shieldCrack && Assets.has('hand_shield_broken') ? 'hand_shield_broken' : 'hand_shield') : p.leftItem === 'torch' ? 'hand_torch' : null;
    if (leftName && Assets.has(leftName)) {
      const img = Assets.images[leftName]; const hgt = H * (blocking ? 0.9 : 0.74), wid = hgt * img.width / img.height;
      if (blocking) x.drawImage(img, W * 0.5 - wid * 0.5, H - hgt * 0.98, wid, hgt); else x.drawImage(img, -14, H + 16 - hgt + bob, wid, hgt);
    } else if (p.leftItem !== 'none') this.arm(x, blocking ? W / 2 - 40 : 76, blocking ? H - 120 : H - 68 + bob, 'left', p, 0);
  }
  arm(x, ax, ay, side, p, ang) {
    const s = side === 'right' ? 1 : -1; const S = 1.25; x.save(); x.translate(ax, ay); x.scale(S, S); ax = 0; ay = 0;
    x.fillStyle = '#1e46a8'; x.fillRect(ax - 14 + s * 6, ay + 14, 28, 70); x.fillStyle = '#2b5fc7'; x.fillRect(ax - 10 + s * 6, ay + 14, 20, 70);
    x.fillStyle = '#f6c12e'; x.fillRect(ax - 16 + s * 6, ay + 12, 32, 6); x.fillStyle = '#b8880f'; x.fillRect(ax - 16 + s * 6, ay + 17, 32, 2);
    x.fillStyle = '#5a2e12'; x.fillRect(ax - 16, ay - 14, 32, 30); x.fillStyle = '#8a4b1f'; x.fillRect(ax - 14, ay - 12, 28, 26);
    x.fillStyle = '#a65d2a'; x.fillRect(ax - 12, ay - 10, 24, 6); for (let i = 0; i < 3; i++) x.fillRect(ax - 11 + i * 8, ay - 2, 6, 12);
    x.fillStyle = '#5a2e12'; for (let i = 0; i < 4; i++) x.fillRect(ax - 12 + i * 8, ay - 2, 1, 12);
    if (side === 'right') this.sword(x, ax, ay - 10, ang, p); else if (p.leftItem === 'torch') this.torch(x, ax, ay - 10); else if (p.leftItem === 'shield') this.shield(x, ax, ay, p);
    x.restore();
  }
  sword(x, hx, hy, ang, p) {
    const col = p.sword === 'glacial' ? ['#7fe8ff', '#e6fbff'] : ['#9fdcff', '#e6f7ff'];
    x.fillStyle = '#2a1a0a'; x.fillRect(hx - 18, hy - 2, 36, 8); x.fillStyle = '#f6c12e'; x.fillRect(hx - 16, hy, 32, 4); x.fillStyle = '#2b5fc7'; x.fillRect(hx - 3, hy - 1, 6, 6);
    const len = 62; const dx = Math.sin(ang - 0.2), dy = -Math.cos(ang - 0.2);
    for (let i = 0; i < len; i++) { const bx = hx + dx * i, by = hy - 2 + dy * i; const wdt = i > len - 9 ? Math.max(2, 14 - (i - (len - 9)) * 1.5) : 14; const L = Math.round(bx - wdt / 2);
      x.fillStyle = '#1e3a55'; x.fillRect(L - 1, Math.round(by), wdt + 2, 2); x.fillStyle = col[0]; x.fillRect(L, Math.round(by), wdt, 2); x.fillStyle = col[1]; x.fillRect(L + 1, Math.round(by), 3, 2); x.fillStyle = '#4a8fc0'; x.fillRect(L + wdt - 4, Math.round(by), 3, 2); }
    x.fillStyle = '#f6c12e'; x.fillRect(hx - 5, hy + 22, 10, 5);
  }
  torch(x, hx, hy) {
    x.fillStyle = '#3a2210'; x.fillRect(hx - 5, hy - 30, 10, 50); x.fillStyle = '#6b4423'; x.fillRect(hx - 3, hy - 30, 6, 50); x.fillStyle = '#2a1a0a'; x.fillRect(hx - 7, hy - 36, 14, 8);
    const f = Math.floor(this.t * 10) % 2; x.fillStyle = '#ff7a1a'; x.fillRect(hx - 8, hy - 52 - f, 16, 16); x.fillRect(hx - 5, hy - 60 - f * 2, 10, 8); x.fillStyle = '#ffd23a'; x.fillRect(hx - 5, hy - 48, 10, 10); x.fillRect(hx - 2, hy - 54 - f, 4, 6); x.fillStyle = '#fff6c0'; x.fillRect(hx - 2, hy - 44, 4, 4);
  }
  shield(x, hx, hy, p) {
    x.fillStyle = '#2a1a0a'; x.fillRect(hx - 36, hy - 52, 72, 76); x.fillStyle = '#f6c12e'; x.fillRect(hx - 33, hy - 49, 66, 70); x.fillStyle = '#2b5fc7'; x.fillRect(hx - 28, hy - 44, 56, 60);
    x.fillStyle = '#f6c12e'; x.fillRect(hx - 10, hy - 30, 20, 26); x.fillRect(hx - 16, hy - 24, 8, 10); x.fillRect(hx + 8, hy - 24, 8, 10); x.fillRect(hx - 6, hy - 36, 6, 6); x.fillRect(hx + 2, hy - 36, 6, 6);
    x.fillStyle = '#2b5fc7'; x.fillRect(hx - 4, hy - 26, 3, 3); x.fillRect(hx + 2, hy - 26, 3, 3);
    if (p.shieldCrack) { x.fillStyle = '#ffe066'; for (let i = 0; i < 40; i++) x.fillRect(hx + 8 - Math.floor(i / 6) * 2 + ((i % 7) > 3 ? 2 : 0), hy - 44 + i * 1.5, 3, 2); }
  }
}
