import { UIManager } from './UIManager.js';
import { InputSys } from './InputManager.js';
import { PongGame } from '../games/PongGame.js';
import { VolleyGame } from '../games/VolleyGame.js';
import { HockeyGame } from '../games/HockeyGame.js';

export const Engine = {
    canvas: document.getElementById('gameCanvas'),
    ctx: document.getElementById('gameCanvas').getContext('2d'),

    // Config
    config: {
        time: 60, // -1 for infinity
        score: 5,
        diff: 'normal', // easy, normal, hard
        theme: 'classic' // classic, cyber, camera
    },

    // State
    running: false,
    games: [PongGame, VolleyGame, HockeyGame],
    gameNames: ['PONG', 'VOLLEY', 'HOCKEY'],
    gameIndex: 0,
    currGame: null,

    // Timer
    startTime: 0,
    lastTime: 0,

    // Themes
    themes: {
        classic: { bg: '#000000', p1: '#ffffff', p2: '#ffffff', ball: '#ffffff' },
        cyber: { bg: '#0b1021', p1: '#ff0055', p2: '#00aaff', ball: '#ccff00' },
        camera: { bg: 'transparent', p1: 'rgba(0,255,100,0.8)', p2: 'rgba(255,0,50,0.8)', ball: '#ffff00' }
    },

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.canvas.width = 1280;
        this.canvas.width = 1280;
        this.canvas.height = 720;

        // Global ESC Listener
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Escape' && this.running) {
                UIManager.showMenu();
            }
        });
    },

    resize() {
        // Handled by CSS for display size, but we keep internal res fixed for logic
    },

    start() {
        if (this.running) return;

        // Init Game Instance
        const GameClass = this.games[this.gameIndex];
        this.currGame = new GameClass(this.canvas.width, this.canvas.height, this.config);

        this.running = true;
        this.startTime = Date.now();
        this.lastTime = Date.now();

        UIManager.startGame(); // Hide Menu
        this.loop();
    },

    stop() {
        this.running = false;
    },

    toggleGameMode() {
        this.gameIndex = (this.gameIndex + 1) % this.games.length;
    },

    switchGame(dir) {
        // dir is -1 or 1, effectively same as toggle for 2 games
        this.gameIndex = (this.gameIndex + dir + this.games.length) % this.games.length;
    },

    getCurrentGameName() {
        return this.gameNames[this.gameIndex];
    },

    loop() {
        if (!this.running) return;

        const now = Date.now();
        const dt = (now - this.lastTime) / 1000;
        this.lastTime = now;

        // 1. Check Game Over Conditions
        const elapsed = (now - this.startTime) / 1000;
        if (this.config.time > 0 && elapsed >= this.config.time) {
            this.finishGame('Time Out');
            return;
        }
        if (this.currGame.p1Score >= this.config.score) {
            this.finishGame('P1');
            return;
        }
        if (this.currGame.p2Score >= this.config.score) {
            this.finishGame('P2');
            return;
        }

        // 2. Update Physics
        // Pass InputSys state to game
        this.currGame.update(dt, InputSys);

        // 3. Draw
        const theme = this.themes[this.config.theme];

        // Clear / BG
        // Clear / BG
        if (this.config.theme === 'camera') {
            // Draw Mirrored Video Feed
            this.ctx.save();
            this.ctx.translate(this.canvas.width, 0);
            this.ctx.scale(-1, 1);
            if (InputSys.video.readyState === 4) {
                const vid = InputSys.video;
                const vidW = vid.videoWidth;
                const vidH = vid.videoHeight;

                if (vidW && vidH) {
                    const canvasAspect = this.canvas.width / this.canvas.height;
                    const vidAspect = vidW / vidH;

                    let sx = 0, sy = 0, sw = vidW, sh = vidH;

                    if (vidAspect > canvasAspect) {
                        // Video matches width, crop height? No, wait. 
                        // Logic: if Video (2.0) > Canvas (1.7), Video is wider. Crop sides.
                        sw = vidH * canvasAspect;
                        sx = (vidW - sw) / 2;
                    } else {
                        // Canvas (1.7) > Video (1.3). Canvas is wider. Crop top/bottom.
                        sh = vidW / canvasAspect;
                        sy = (vidH - sh) / 2;
                    }

                    this.ctx.drawImage(vid, sx, sy, sw, sh, 0, 0, this.canvas.width, this.canvas.height);
                }
            }
            this.ctx.restore();

            // Overlay for contrast
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        } else {
            this.ctx.fillStyle = theme.bg;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // Draw Game
        this.currGame.draw(this.ctx, theme, this.config.theme);

        // Draw Cursors (Hand Tracking Visualization)
        this.drawCursors();

        // Draw HUD (Timer & Score)
        this.drawHUD(elapsed);

        requestAnimationFrame(this.loop.bind(this));
    },

    drawHUD(elapsed) {
        this.ctx.font = '40px "Press Start 2P"';
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = '#fff';

        // Scores
        this.ctx.fillText(this.currGame.p1Score, this.canvas.width * 0.25, 50);
        this.ctx.fillText(this.currGame.p2Score, this.canvas.width * 0.75, 50);

        // Timer
        if (this.config.time > 0) {
            const rem = Math.max(0, Math.ceil(this.config.time - elapsed));
            this.ctx.font = '20px "Press Start 2P"';
            this.ctx.fillStyle = (rem <= 10) ? '#ff4444' : '#fff';
            this.ctx.fillText(rem, this.canvas.width / 2, 50);
        }
    },

    finishGame(winner) {
        this.running = false;
        let winText = winner;
        if (winner === 'Time Out') {
            if (this.currGame.p1Score > this.currGame.p2Score) winText = 'P1';
            else if (this.currGame.p2Score > this.currGame.p1Score) winText = 'P2';
            else winText = 'Tie';
        }

        UIManager.showGameOver(winText, `${this.currGame.p1Score} - ${this.currGame.p2Score}`);
    },

    drawCursors() {
        // P1 Cursor (Green Dot)
        if (InputSys.p1.visible) {
            const x = InputSys.p1.x * this.canvas.width;
            const y = InputSys.p1.y * this.canvas.height;

            this.ctx.beginPath();
            this.ctx.fillStyle = '#00ff00';
            this.ctx.arc(x, y, 6, 0, Math.PI * 2);
            this.ctx.fill();

            // Contrast outline
            this.ctx.lineWidth = 1;
            this.ctx.strokeStyle = 'rgba(0,0,0,0.5)';
            this.ctx.stroke();
        }

        // P2 Cursor (Red Dot)
        if (InputSys.p2.visible) {
            const x = InputSys.p2.x * this.canvas.width;
            const y = InputSys.p2.y * this.canvas.height;

            this.ctx.beginPath();
            this.ctx.fillStyle = '#ff0000';
            this.ctx.arc(x, y, 6, 0, Math.PI * 2);
            this.ctx.fill();

            // Contrast outline
            this.ctx.lineWidth = 1;
            this.ctx.strokeStyle = 'rgba(0,0,0,0.5)';
            this.ctx.stroke();
        }
    }
};
