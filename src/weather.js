// Falling snow in winter: a few hundred points in a box that follows the player (one draw call, cheap on phones).
import * as THREE from 'three';
import { PERF } from './perf.js';
export class Snow {
  constructor(scene) {
    const n = PERF.tier === 'high' ? 900 : 450; this.n = n; this.box = [44, 18, 34];
    const pos = new Float32Array(n * 3); this.vel = new Float32Array(n); for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * this.box[0]; pos[i * 3 + 1] = Math.random() * this.box[1]; pos[i * 3 + 2] = (Math.random() - 0.5) * this.box[2]; this.vel[i] = 1.6 + Math.random() * 1.8; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'); const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 32, 32);
    this.points = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.28, map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, fog: true }));
    this.points.frustumCulled = false; this.points.visible = false; scene.add(this.points); this.t = 0;
  }
  update(dt, at, on) {
    this.points.visible = on; if (!on) return; this.t += dt; const p = this.points.geometry.attributes.position, a = p.array, [W, H, D] = this.box;
    this.points.position.set(at.x, 0, at.z);
    for (let i = 0; i < this.n; i++) { a[i * 3 + 1] -= this.vel[i] * dt; a[i * 3] += Math.sin(this.t * 0.8 + i) * 0.4 * dt; if (a[i * 3 + 1] < 0) { a[i * 3 + 1] = H; a[i * 3] = (Math.random() - 0.5) * W; a[i * 3 + 2] = (Math.random() - 0.5) * D; } }
    p.needsUpdate = true;
  }
}
