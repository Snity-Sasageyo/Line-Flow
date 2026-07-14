const board = document.getElementById('flow-board');
const ctx = board.getContext('2d');

let halted = false;
const swarm = [];
const count = 350;
const palette = ['#EAEAEA', '#7A7A7A'];
let fieldShift = 0;

const resize = () => {
    board.width = window.innerWidth;
    board.height = window.innerHeight;
};

window.addEventListener('resize', resize);
resize();

const hash = (x, y) => {
    let h = (x * 374761393 + y * 668265263) | 0;
    h = (h ^ (h >> 13)) * 1274126177;
    return ((h ^ (h >> 16)) >>> 0) / 4294967296;
};

const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a, b, t) => a + t * (b - a);

const getAngle = (px, py) => {
    const scale = 0.0025;
    const xi = Math.floor(px * scale);
    const yi = Math.floor(py * scale);
    const xf = (px * scale) - xi;
    const yf = (py * scale) - yi;

    const v1 = hash(xi + fieldShift, yi);
    const v2 = hash(xi + 1 + fieldShift, yi);
    const v3 = hash(xi + fieldShift, yi + 1);
    const v4 = hash(xi + 1 + fieldShift, yi + 1);

    const u = fade(xf);
    const v = fade(yf);

    const top = lerp(v1, v2, u);
    const bot = lerp(v3, v4, u);
    return lerp(top, bot, v) * Math.PI * 4;
};

class Mote {
    constructor() {
        this.revive();
    }

    revive() {
        this.x = Math.random() * board.width;
        this.y = Math.random() * board.height;
        this.px = this.x;
        this.py = this.y;
        this.angle = Math.random() * Math.PI * 2;
        this.vel = 0.8 + Math.random() * 1.2;
        this.life = 400 + Math.random() * 600;
        this.hue = palette[Math.floor(Math.random() * palette.length)];
    }

    step() {
        if (this.life <= 0) {
            this.revive();
            return;
        }

        this.px = this.x;
        this.py = this.y;

        let target = getAngle(this.x, this.y);
        let diff = target - this.angle;
        
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        
        this.angle += diff * 0.05;
        this.angle += (Math.random() - 0.5) * 0.05;

        this.x += Math.cos(this.angle) * this.vel;
        this.y += Math.sin(this.angle) * this.vel;
        this.life -= 1;

        if (this.x < -50 || this.x > board.width + 50 || this.y < -50 || this.y > board.height + 50) {
            this.revive();
        }
    }
}

const buildSwarm = () => {
    for (let i = 0; i < count; i++) {
        swarm.push(new Mote());
    }
};

const wipe = () => {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, board.width, board.height);
    fieldShift += Math.random() * 100;
    swarm.forEach(m => m.revive());
};

const drawBatch = () => {
    const groups = {};
    palette.forEach(c => groups[c] = []);

    for (let m of swarm) {
        groups[m.hue].push(m);
    }

    ctx.lineWidth = 1;
    ctx.lineCap = 'butt';

    for (let color in groups) {
        if (groups[color].length === 0) continue;
        ctx.strokeStyle = color;
        ctx.beginPath();
        for (let m of groups[color]) {
            ctx.moveTo(m.px, m.py);
            ctx.lineTo(m.x, m.y);
        }
        ctx.stroke();
    }
};

const tick = () => {
    if (!halted) {
        for (let m of swarm) {
            m.step();
        }
        drawBatch();
    }
    requestAnimationFrame(tick);
};

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        halted = !halted;
    } else if (e.code === 'KeyR') {
        wipe();
    }
});

buildSwarm();
wipe();
tick();
