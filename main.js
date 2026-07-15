const board = document.getElementById('flow-board');
const ctx = board.getContext('2d');

let halted = false;
const swarm = [];
const eddies = [];
const count = 400;
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
    const scale = 0.002;
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

class Eddy {
    constructor() {
        this.x = Math.random() * board.width;
        this.y = Math.random() * board.height;
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = (Math.random() - 0.5) * 0.4;
        this.rad = 120 + Math.random() * 280;
        this.radSq = this.rad * this.rad;
        this.pull = (Math.random() > 0.5 ? 1 : -1) * (0.2 + Math.random() * 0.6);
    }
    
    drift() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < -150 || this.x > board.width + 150) this.vx *= -1;
        if (this.y < -150 || this.y > board.height + 150) this.vy *= -1;
    }
}

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
        this.vel = 0.6 + Math.random() * 1.4;
        this.life = 300 + Math.random() * 700;
        this.hue = palette[Math.floor(Math.random() * palette.length)];
        this.track = [];
    }

    step() {
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
            if (distSq < e.radSq) {
                let dist = Math.sqrt(distSq);
                let weight = (1 - dist / e.rad) * Math.abs(e.pull);
                let tang = Math.atan2(dy, dx) + (e.pull > 0 ? -Math.PI / 2 : Math.PI / 2);
                
                let tDiff = tang - target;
                while (tDiff > Math.PI) tDiff -= Math.PI * 2;
                while (tDiff < -Math.PI) tDiff += Math.PI * 2;
                target += tDiff * weight;
            }
        }

        let diff = target - this.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        
        this.angle += diff * 0.06;
        this.angle += (Math.random() - 0.5) * 0.03;

        let nx = this.x + Math.cos(this.angle) * this.vel;
        let ny = this.y + Math.sin(this.angle) * this.vel;

        if (nx < 0 || nx > board.width) {
            this.angle = Math.PI - this.angle;
            nx = Math.max(0, Math.min(board.width, nx));
        }
        if (ny < 0 || ny > board.height) {
            this.angle = -this.angle;
            ny = Math.max(0, Math.min(board.height, ny));
        }

        this.x = nx;
        this.y = ny;
        this.life -= 1;

        this.track.push(this.x, this.y);
        if (this.track.length > 60) {
            this.track.shift();
            this.track.shift();
        }

        if (this.life % 45 === 0 && this.track.length === 60) {
            let minX = this.x, maxX = this.x, minY = this.y, maxY = this.y;
            for (let i = 0; i < this.track.length; i += 2) {
                let tx = this.track[i];
                let ty = this.track[i+1];
                if (tx < minX) minX = tx;
                if (tx > maxX) maxX = tx;
                if (ty < minY) minY = ty;
                if (ty > maxY) maxY = ty;
            }
            if ((maxX - minX) < 12 && (maxY - minY) < 12) {
                this.revive();
            }
        }
    }
}

const buildSwarm = () => {
    for (let i = 0; i < count; i++) {
        swarm.push(new Mote());
    }
    for (let i = 0; i < 5; i++) {
        eddies.push(new Eddy());
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
        for (let e of eddies) e.drift();
        for (let m of swarm) m.step();
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
