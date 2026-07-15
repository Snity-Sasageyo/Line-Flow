const board = document.getElementById('flow-board');
const ctx = board.getContext('2d');

let halted = false;
const swarm = [];
const eddies = [];
const maxCount = 500;
let activeCount = maxCount;
const palette = ['#EAEAEA', '#7A7A7A'];
let epoch = 0;
let epochDrift = 0;
let lastStamp = 0;
let frameBudget = 16.6;
let budgetSmooth = 16.6;

const gridCols = 8;
const gridRows = 6;
let cellW = 0;
let cellH = 0;
const grid = [];

const resize = () => {
    board.width = window.innerWidth;
    board.height = window.innerHeight;
    cellW = board.width / gridCols;
    cellH = board.height / gridRows;
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
    const scale = 0.0018;
    const xi = Math.floor(px * scale);
    const yi = Math.floor(py * scale);
    const xf = (px * scale) - xi;
    const yf = (py * scale) - yi;

    const seed = Math.floor(epochDrift);
    const v1 = hash(xi + seed, yi);
    const v2 = hash(xi + 1 + seed, yi);
    const v3 = hash(xi + seed, yi + 1);
    const v4 = hash(xi + 1 + seed, yi + 1);

    const u = fade(xf);
    const v = fade(yf);

    return lerp(lerp(v1, v2, u), lerp(v3, v4, u), v) * Math.PI * 4;
};

const getFieldDensity = (px, py) => {
    const col = Math.min(gridCols - 1, Math.max(0, Math.floor(px / cellW)));
    const row = Math.min(gridRows - 1, Math.max(0, Math.floor(py / cellH)));
    return grid[row * gridCols + col] || 0;
};

const rebuildGrid = () => {
    for (let i = 0; i < grid.length; i++) grid[i] = 0;
    for (let i = 0; i < activeCount; i++) {
        const m = swarm[i];
        const col = Math.min(gridCols - 1, Math.max(0, Math.floor(m.x / cellW)));
        const row = Math.min(gridRows - 1, Math.max(0, Math.floor(m.y / cellH)));
        grid[row * gridCols + col]++;
    }
};

class Eddy {
    constructor() {
        this.x = Math.random() * board.width;
        this.y = Math.random() * board.height;
        this.vx = (Math.random() - 0.5) * 0.35;
        this.vy = (Math.random() - 0.5) * 0.35;
        this.rad = 100 + Math.random() * 300;
        this.radSq = this.rad * this.rad;
        this.pull = (Math.random() > 0.5 ? 1 : -1) * (0.15 + Math.random() * 0.55);
        this.phase = Math.random() * Math.PI * 2;
    }

    drift(dt) {
        this.phase += 0.003 * dt;
        this.x += this.vx * dt + Math.sin(this.phase) * 0.15;
        this.y += this.vy * dt + Math.cos(this.phase * 0.7) * 0.15;
        if (this.x < -200 || this.x > board.width + 200) this.vx *= -1;
        if (this.y < -200 || this.y > board.height + 200) this.vy *= -1;
    }
}

class Mote {
    constructor(stagger) {
        this.birthDelay = stagger ? Math.floor(Math.random() * 120) : 0;
        this.revive();
    }

    revive() {
        this.x = Math.random() * board.width;
        this.y = Math.random() * board.height;
        this.px = this.x;
        this.py = this.y;
        this.angle = Math.random() * Math.PI * 2;
        this.baseVel = 0.5 + Math.random() * 1.3;
        this.vel = this.baseVel;
        this.life = 250 + Math.random() * 750;
        this.maxLife = this.life;
        this.hue = palette[Math.floor(Math.random() * palette.length)];
        this.track = [];
        this.stuckFrames = 0;
    }

    step(dt) {
        if (this.birthDelay > 0) {
            this.birthDelay -= dt;
            return;
        }

        if (this.life <= 0) {
            this.revive();
            return;
        }

        this.px = this.x;
        this.py = this.y;

        let target = getAngle(this.x, this.y);

        for (let e of eddies) {
            let dx = this.x - e.x;
            let dy = this.y - e.y;
            let distSq = dx * dx + dy * dy;
            if (distSq < e.radSq && distSq > 1) {
                let dist = Math.sqrt(distSq);
                let weight = (1 - dist / e.rad);
                weight = weight * weight * Math.abs(e.pull);
                let tang = Math.atan2(dy, dx) + (e.pull > 0 ? -1.5708 : 1.5708);

                let tDiff = tang - target;
                while (tDiff > Math.PI) tDiff -= 6.2832;
                while (tDiff < -Math.PI) tDiff += 6.2832;
                target += tDiff * weight;
            }
        }

        let diff = target - this.angle;
        while (diff > Math.PI) diff -= 6.2832;
        while (diff < -Math.PI) diff += 6.2832;

        this.angle += diff * 0.055 * dt;
        this.angle += (Math.random() - 0.5) * 0.025 * dt;

        let density = getFieldDensity(this.x, this.y);
        let dampen = density > 18 ? 0.4 : density > 10 ? 0.7 : 1.0;
        this.vel = this.baseVel * dampen;

        let nx = this.x + Math.cos(this.angle) * this.vel * dt;
        let ny = this.y + Math.sin(this.angle) * this.vel * dt;

        if (nx < 0) { this.angle = Math.PI - this.angle; nx = -nx; }
        else if (nx > board.width) { this.angle = Math.PI - this.angle; nx = 2 * board.width - nx; }
        if (ny < 0) { this.angle = -this.angle; ny = -ny; }
        else if (ny > board.height) { this.angle = -this.angle; ny = 2 * board.height - ny; }

        this.x = nx;
        this.y = ny;
        this.life -= dt;

        this.track.push(this.x, this.y);
        if (this.track.length > 80) {
            this.track.shift();
            this.track.shift();
        }

        if (this.track.length >= 80) {
            let minX = this.x, maxX = this.x, minY = this.y, maxY = this.y;
            for (let i = 0; i < this.track.length; i += 2) {
                if (this.track[i] < minX) minX = this.track[i];
                if (this.track[i] > maxX) maxX = this.track[i];
                if (this.track[i + 1] < minY) minY = this.track[i + 1];
                if (this.track[i + 1] > maxY) maxY = this.track[i + 1];
            }
            if ((maxX - minX) < 10 && (maxY - minY) < 10) {
                this.stuckFrames += dt;
                if (this.stuckFrames > 30) this.revive();
            } else {
                this.stuckFrames = 0;
            }
        }
    }
}

const buildSwarm = () => {
    for (let i = 0; i < maxCount; i++) {
        swarm.push(new Mote(true));
    }
    for (let i = 0; i < 6; i++) {
        eddies.push(new Eddy());
    }
    for (let i = 0; i < gridCols * gridRows; i++) {
        grid.push(0);
    }
};

const wipe = () => {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, board.width, board.height);
    epoch++;
    epochDrift += 37 + Math.random() * 60;
    swarm.forEach(m => m.revive());
    eddies.forEach(e => {
        e.x = Math.random() * board.width;
        e.y = Math.random() * board.height;
    });
};

const adjustPool = () => {
    if (budgetSmooth > 20 && activeCount > 120) {
        activeCount -= 10;
    } else if (budgetSmooth < 14 && activeCount < maxCount) {
        activeCount += 5;
    }
};

const drawBatch = () => {
    const light = [];
    const dim = [];

    for (let i = 0; i < activeCount; i++) {
        const m = swarm[i];
        if (m.birthDelay > 0) continue;
        if (m.hue === '#EAEAEA') light.push(m);
        else dim.push(m);
    }

    ctx.lineWidth = 1;
    ctx.lineCap = 'butt';

    if (dim.length) {
        ctx.strokeStyle = '#7A7A7A';
        ctx.beginPath();
        for (let m of dim) {
            ctx.moveTo(m.px, m.py);
            ctx.lineTo(m.x, m.y);
        }
        ctx.stroke();
    }

    if (light.length) {
        ctx.strokeStyle = '#EAEAEA';
        ctx.beginPath();
        for (let m of light) {
            ctx.moveTo(m.px, m.py);
            ctx.lineTo(m.x, m.y);
        }
        ctx.stroke();
    }
};

const tick = (stamp) => {
    if (!lastStamp) lastStamp = stamp;
    let raw = stamp - lastStamp;
    lastStamp = stamp;

    if (raw > 100) raw = 16.6;
    let dt = raw / 16.6;

    budgetSmooth = budgetSmooth * 0.92 + raw * 0.08;

    if (!halted) {
        epochDrift += 0.002 * dt;

        rebuildGrid();

        for (let e of eddies) e.drift(dt);
        for (let i = 0; i < activeCount; i++) swarm[i].step(dt);

        drawBatch();

        if (epoch % 1 === 0 && Math.random() < 0.005) adjustPool();
    }

    requestAnimationFrame(tick);
};

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        halted = !halted;
        if (!halted) lastStamp = 0;
    } else if (e.code === 'KeyR') {
        wipe();
    }
});

buildSwarm();
wipe();
requestAnimationFrame(tick);

