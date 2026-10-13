// Walking animation for characters and creatures drawn from a sprite sheet: 4 directions (down, left, right, up) x 3 frames
// (standing, left foot forward, right foot forward). Without a sheet the sprite stays a single image and the owner flips it.
import { setBillboardImage } from './billboard.js';
export const DIRS = ['down', 'left', 'right', 'up'];
export function dirFrom(dx, dz, prev = 'down') { if (Math.abs(dx) < 1e-3 && Math.abs(dz) < 1e-3) return prev; return Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'right' : 'left') : (dz > 0 ? 'down' : 'up'); }
const CYCLE = [1, 0, 2, 0];
export class Walker {
  constructor(mesh, frames = null) { this.mesh = mesh; this.frames = frames; this.dir = 'down'; this.t = 0; this.cur = null; }
  get has() { return !!this.frames; }
  face(dx, dz) { this.dir = dirFrom(dx, dz, this.dir); return this.dir; }
  // moving: whether to run the step cycle; rate: steps per second
  update(dt, moving, rate = 7) {
    if (!this.frames) return; this.t = moving ? this.t + dt * rate : 0;
    const f = moving ? CYCLE[Math.floor(this.t) % 4] : 0; const img = (this.frames[this.dir] || this.frames.down)[f];
    if (img && img !== this.cur) { this.cur = img; setBillboardImage(this.mesh, img); }
  }
}
