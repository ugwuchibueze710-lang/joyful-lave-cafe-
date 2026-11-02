import * as THREE from 'three';

function canvas(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const rand = (a, b) => a + Math.random() * (b - a);

/** Kraft cup sleeve with the hand-written "happy :)" seen in the cafe's own photo. */
export function kraftSleeve(text = 'happy :)') {
  return canvas(1024, 256, (g, w, h) => {
    g.fillStyle = '#b98a5a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { // corrugation + fibres
      g.fillStyle = `rgba(${Math.random() < .5 ? '90,60,30' : '230,200,160'},${rand(.04, .12)})`;
      g.fillRect(rand(0, w), rand(0, h), rand(1, 4), 1);
    }
    for (let x = 0; x < w; x += 6) { g.fillStyle = 'rgba(80,50,20,.06)'; g.fillRect(x, 0, 2, h); }
    g.save();
    g.translate(w * 0.5, h * 0.55); g.rotate(-0.06);
    g.fillStyle = '#2b1b10';
    g.font = '600 92px "Segoe Script","Bradley Hand","Comic Sans MS",cursive';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, 0, 0);
    g.lineWidth = 4; g.strokeStyle = '#2b1b10';
    g.beginPath(); g.moveTo(-170, 52); g.quadraticCurveTo(0, 66, 170, 46); g.stroke();
    g.restore();
  });
}

/** Soft radial glow used behind the neon JOY sign and the lemon sun. */
export function glow(color = '#ffffff') {
  return canvas(256, 256, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, color); gr.addColorStop(0.35, color + '88'); gr.addColorStop(1, color + '00');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
}

/** Speckle map: strawberry seeds, pepper jack peppers, granola, croissant flake. */
export function speckle(base, dot, count = 600, size = [1, 3], w = 512, h = 512) {
  return canvas(w, h, (g) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < count; i++) {
      g.fillStyle = dot; g.globalAlpha = rand(.5, 1);
      g.beginPath(); g.ellipse(rand(0, w), rand(0, h), rand(...size), rand(...size) * .7, rand(0, 3), 0, 7); g.fill();
    }
    g.globalAlpha = 1;
  });
}

/** Baked-bread gradient with flaky streaks for the croissant / toast. */
export function bake(top = '#c97a2b', mid = '#e2a457', streak = 'rgba(120,60,10,.25)') {
  return canvas(512, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, top); gr.addColorStop(.6, mid); gr.addColorStop(1, '#f2cf8f');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = streak;
    for (let i = 0; i < 140; i++) {
      g.lineWidth = rand(1, 3); g.beginPath();
      const y = rand(0, h); g.moveTo(rand(-40, w), y); g.bezierCurveTo(rand(0, w), y + rand(-20, 20), rand(0, w), y + rand(-20, 20), rand(0, w + 40), y + rand(-10, 10));
      g.stroke();
    }
  });
}

/** Painted wooden slat look for the red wall behind the counter. */
export function slats() {
  return canvas(256, 512, (g, w, h) => {
    g.fillStyle = '#e1302f'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) {
      g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(0, y + 26, w, 6);
      g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(0, y, w, 3);
    }
  });
}
