import { Engine } from './Engine.js';

export const UIManager = {
    // DOM Cache
    screens: {
        loading: document.getElementById('screen-loading'),
        menu: document.getElementById('screen-menu'),
        gameover: document.getElementById('screen-gameover')
    },

    init() {
        // Bind Buttons
        document.getElementById('btn-prev-game').onclick = () => this.switchGame(-1);
        document.getElementById('btn-next-game').onclick = () => this.switchGame(1);
        document.getElementById('btn-start').onclick = () => Engine.start();
        document.getElementById('btn-menu').onclick = () => this.showMenu();

        this.renderSettings();
    },

    hideLoading() {
        this.screens.loading.classList.add('hidden');
        this.screens.menu.classList.remove('hidden');
    },

    startGame() {
        document.getElementById('screen-menu').classList.add('hidden');
    },

    showMenu() {
        Engine.stop();
        this.screens.gameover.classList.add('hidden');
        this.screens.menu.classList.remove('hidden');
    },

    showGameOver(winner, scoreTxt) {
        document.getElementById('go-title').innerText = winner === 'Tie' ? "DRAW" : `${winner} WINS`;
        document.getElementById('go-score').innerText = scoreTxt;
        this.screens.gameover.classList.remove('hidden');
    },

    switchGame(dir) {
        Engine.toggleGameMode();
        this.renderSettings();
    },

    // Dynamic Settings Render
    renderSettings() {
        const gameName = Engine.getCurrentGameName();
        document.getElementById('menu-title').innerText = gameName;
        const diffLabel = "SPEED";

        const html = `
            <div class="setting-label">TIME</div>
            <div class="setting-options">
                <button class="opt-btn ${Engine.config.time == 60 ? 'active' : ''}" onclick="UI.set('time', 60, this)">60s</button>
                <button class="opt-btn ${Engine.config.time == 90 ? 'active' : ''}" onclick="UI.set('time', 90, this)">90s</button>
                <button class="opt-btn ${Engine.config.time == -1 ? 'active' : ''}" onclick="UI.set('time', -1, this)">Inf</button>
            </div>
            <div class="setting-label">SCORE</div>
            <div class="setting-options">
                <button class="opt-btn ${Engine.config.score == 3 ? 'active' : ''}" onclick="UI.set('score', 3, this)">3</button>
                <button class="opt-btn ${Engine.config.score == 5 ? 'active' : ''}" onclick="UI.set('score', 5, this)">5</button>
                <button class="opt-btn ${Engine.config.score == 10 ? 'active' : ''}" onclick="UI.set('score', 10, this)">10</button>
            </div>
            <div class="setting-label">${diffLabel}</div>
            <div class="setting-options">
                <button class="opt-btn ${Engine.config.diff == 'easy' ? 'active' : ''}" onclick="UI.set('diff', 'easy', this)">EASY</button>
                <button class="opt-btn ${Engine.config.diff == 'normal' ? 'active' : ''}" onclick="UI.set('diff', 'normal', this)">NORM</button>
                <button class="opt-btn ${Engine.config.diff == 'hard' ? 'active' : ''}" onclick="UI.set('diff', 'hard', this)">HARD</button>
            </div>
            <div class="setting-label">THEME</div>
            <div class="setting-options">
                <button class="opt-btn ${Engine.config.theme == 'classic' ? 'active' : ''}" onclick="UI.set('theme', 'classic', this)">Retro</button>
                <button class="opt-btn ${Engine.config.theme == 'cyber' ? 'active' : ''}" data-val="cyber" onclick="UI.set('theme', 'cyber', this)">Cyber</button>
                <button class="opt-btn ${Engine.config.theme == 'camera' ? 'active' : ''}" data-val="camera" onclick="UI.set('theme', 'camera', this)">Camera</button>
            </div>
        `;
        document.getElementById('settings-container').innerHTML = html;
        // Re-bind global helper for inline onclicks
        window.UI = this;
    },

    set(key, val, btn) {
        Engine.config[key] = val;
        // Simple visual toggle logic
        btn.parentNode.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }
};