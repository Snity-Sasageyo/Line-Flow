const board = document.getElementById('flow-board');
const ctx = board.getContext('2d');

let isPaused = false;
let drifters = [];
const TOTAL = 150;
const STROKE_TONE = '#7A7A7A';

const fitBoard = () => {
    board.width = window.innerWidth;
    board.height = window.innerHeight;
};

window.addEventListener('resize', fitBoard);
fitBoard();

class Drifter {
    constructor() {
        this.spawn();
    }

    spawn() {
        this.x = Math.random() * board.width;
        this.y = Math.random() * board.height;
        this.prevX = this.x;
        this.prevY = this.y;
        this.angle = Math.random() * Math.PI * 2;
        this.speed = 0.5 + Math.random() * 1.5;
        this.life = 300 + Math.random() * 400;
    }

    move() {
        if (this.life <= 0) {
            this.spawn();
            return;
        }

        this.angle += (Math.random() - 0.5) * 0.2;
        this.prevX = this.x;
        this.prevY = this.y;
        
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        this.life -= 1;

        if (this.x < 0 || this.x > board.width || this.y < 0 || this.y > board.height) {
            this.spawn();
        }
    }
}

const initPool = () => {
    for (let i = 0; i < TOTAL; i++) {
        drifters.push(new Drifter());
    }
};

const wipeSlate = () => {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, board.width, board.height);
    drifters.forEach(d => d.spawn());
};

const tick = () => {
    if (!isPaused) {
        ctx.strokeStyle = STROKE_TONE;
        ctx.lineWidth = 1;
        ctx.lineCap = 'butt';

        for (let d of drifters) {
            d.move();
            ctx.beginPath();
            ctx.moveTo(d.prevX, d.prevY);
            ctx.lineTo(d.x, d.y);
            ctx.stroke();
        }
    }
    requestAnimationFrame(tick);
};

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') isPaused = !isPaused;
    if (e.code === 'KeyR') wipeSlate();
});

initPool();
wipeSlate();
tick();
