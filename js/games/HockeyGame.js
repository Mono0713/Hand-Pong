import { GameBase } from './GameBase.js';
import { AudioSys } from '../modules/AudioManager.js';

export class HockeyGame extends GameBase {
    constructor(w, h, config) {
        super(w, h);
        this.cfg = config;

        // Dimensions
        this.paddleR = 30; // Paddle Radius
        this.puckR = 20;   // Puck Radius
        this.goalH = 180;  // Goal Height

        // Physics
        this.friction = 0.995; // Super slippery (Air Hockey style)
        this.paddleMass = 10;
        this.puckMass = 1;

        // Entities
        this.p1 = { x: 100, y: h / 2, r: this.paddleR, color: '#00ffff' };
        this.p2 = { x: w - 100, y: h / 2, r: this.paddleR, color: '#ff0055' };

        this.puck = {
            x: w / 2, y: h / 2,
            vx: 0, vy: 0,
            r: this.puckR,
            color: '#ccff00'
        };

        this.resetInternal();
    }

    resetInternal() {
        this.puck.x = this.w / 2;
        this.puck.y = this.h / 2;
        this.puck.vx = 0;
        this.puck.vy = 0;
    }

    resetRound(scorer) {
        // scorer: 1 (P1 scored), 2 (P2 scored)
        // Reset Puck to center, but maybe give it a slight nudge towards loser?
        // Or just stationary center.
        this.resetInternal();

        // Add a small delay/state if needed, currently just instant reset.
    }

    update(dt, inputSys) {
        const ts = dt * 60; // Time scale

        // 1. Update Paddles (Follow Hands with Constraint)
        const updatePaddle = (paddle, hand, isLeft) => {
            // Map Hand (0-1) to Screen
            let targetX = hand.x * this.w;
            let targetY = hand.y * this.h;

            // Constraint: Stay in own half
            if (isLeft) {
                targetX = Math.min(this.w / 2 - paddle.r, targetX);
            } else {
                targetX = Math.max(this.w / 2 + paddle.r, targetX);
            }

            // INSTANT tracking (No LERP)
            // InputManager already smooths, we want zero added latency for Hockey
            paddle.x = targetX;
            paddle.y = targetY;

            // Optional: Calculate Velocity for collision? 
            // For now, static collision response based on mass relies on overlap resolution
            // But for "Hitting" the puck, we need paddle velocity transfer.
            // Let's rely on simple displacement push for now (Arcade Physics).
        };

        updatePaddle(this.p1, inputSys.p1, true);
        updatePaddle(this.p2, inputSys.p2, false);

        // 2. Puck Physics
        this.puck.x += this.puck.vx * ts;
        this.puck.y += this.puck.vy * ts;

        // Friction
        this.puck.vx *= this.friction;
        this.puck.vy *= this.friction;

        // Stop if too slow
        if (Math.abs(this.puck.vx) < 0.1) this.puck.vx = 0;
        if (Math.abs(this.puck.vy) < 0.1) this.puck.vy = 0;

        // 3. Wall Collisions
        // Top/Bottom
        if (this.puck.y - this.puck.r < 0) {
            this.puck.y = this.puck.r;
            this.puck.vy *= -0.9; // Bounciness
            AudioSys.wall();
        } else if (this.puck.y + this.puck.r > this.h) {
            this.puck.y = this.h - this.puck.r;
            this.puck.vy *= -0.9;
            AudioSys.wall();
        }

        // Left/Right (Goals vs Walls)
        const goalTop = (this.h - this.goalH) / 2;
        const goalBot = (this.h + this.goalH) / 2;

        const checkGoal = () => {
            // Left Wall
            if (this.puck.x - this.puck.r < 0) {
                if (this.puck.y > goalTop && this.puck.y < goalBot) {
                    // GOAL P2
                    this.p2Score++;
                    AudioSys.score();
                    this.resetRound(2);
                } else {
                    // Bounce
                    this.puck.x = this.puck.r;
                    this.puck.vx *= -0.9;
                    AudioSys.wall();
                }
            }
            // Right Wall
            if (this.puck.x + this.puck.r > this.w) {
                if (this.puck.y > goalTop && this.puck.y < goalBot) {
                    // GOAL P1
                    this.p1Score++;
                    AudioSys.score();
                    this.resetRound(1);
                } else {
                    // Bounce
                    this.puck.x = this.w - this.puck.r;
                    this.puck.vx *= -0.9;
                    AudioSys.wall();
                }
            }
        };
        checkGoal();

        // 4. Paddle vs Puck Collision
        const resolveCollision = (paddle) => {
            const dx = this.puck.x - paddle.x;
            const dy = this.puck.y - paddle.y;
            const dist = Math.hypot(dx, dy);
            const minDist = paddle.r + this.puck.r;

            if (dist < minDist) {
                // Collision Detected!

                // Normal Vector
                const nx = dx / dist;
                const ny = dy / dist;

                // Push Puck out
                const overlap = minDist - dist;
                this.puck.x += nx * overlap;
                this.puck.y += ny * overlap;

                // Velocity Transfer (Elastic-ish)
                // Simply reflect puck velocity relative to normal?
                // Or give it a "kick" based on normal.
                // Air Hockey: The paddle "hits" the puck. 

                // Simple Bounce:
                // v' = v - 2 * (v . n) * n
                // But we also want to add speed if the paddle is moving (which we are not tracking velocity explicitly yet).
                // Let's give it a boost.

                const speed = Math.hypot(this.puck.vx, this.puck.vy);
                const boost = 10; // BIG static boost for hitting it

                // Reflect velocity
                // dot product
                const dot = this.puck.vx * nx + this.puck.vy * ny;

                this.puck.vx = this.puck.vx - 2 * dot * nx;
                this.puck.vy = this.puck.vy - 2 * dot * ny;

                // Add "Hit" force (simulates mallet strike)
                this.puck.vx += nx * 6; // Hit harder
                this.puck.vy += ny * 6;

                // Cap Max Speed
                const maxSpeed = 40; // Much faster cap
                const newSpeed = Math.hypot(this.puck.vx, this.puck.vy);
                if (newSpeed > maxSpeed) {
                    this.puck.vx = (this.puck.vx / newSpeed) * maxSpeed;
                    this.puck.vy = (this.puck.vy / newSpeed) * maxSpeed;
                }

                AudioSys.hit();
            }
        };

        resolveCollision(this.p1);
        resolveCollision(this.p2);
    }

    draw(ctx, colors, themeName) {
        // Theme Config
        let isNeon = false;
        let p1Color = colors.p1;
        let p2Color = colors.p2;
        let puckColor = colors.ball;
        let wallColor = '#444';

        if (themeName === 'cyber') {
            isNeon = true;
            wallColor = '#00aaff'; // Cyber Grid
        } else if (themeName === 'camera') {
            // Camera specific overrides if needed, essentially same as default passed colors
            wallColor = 'rgba(255,255,255,0.5)';
        } else {
            // Classic / Retro (Force Black & White)
            p1Color = '#ffffff';
            p2Color = '#ffffff';
            puckColor = '#ffffff';
            wallColor = '#ffffff';
        }

        if (isNeon) {
            ctx.shadowBlur = 20;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
        } else {
            ctx.shadowBlur = 0;
        }

        // Draw Field Lines
        ctx.strokeStyle = wallColor;
        ctx.lineWidth = 5;

        if (themeName === 'cyber') {
            ctx.shadowColor = wallColor;
            ctx.shadowBlur = 10;
        } else {
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
        }

        // Center Line
        ctx.beginPath();
        ctx.moveTo(this.w / 2, 0);
        ctx.lineTo(this.w / 2, this.h);
        ctx.stroke();

        // Center Circle
        ctx.beginPath();
        ctx.arc(this.w / 2, this.h / 2, 80, 0, Math.PI * 2);
        ctx.stroke();

        // Goals
        const goalTop = (this.h - this.goalH) / 2;
        ctx.lineWidth = 10;

        // P1 Goal (Left)
        ctx.strokeStyle = p1Color;
        ctx.shadowColor = isNeon ? p1Color : 'transparent';
        ctx.beginPath();
        ctx.moveTo(0, goalTop);
        ctx.lineTo(0, goalTop + this.goalH);
        ctx.stroke();

        // P2 Goal (Right)
        ctx.strokeStyle = p2Color;
        ctx.shadowColor = isNeon ? p2Color : 'transparent';
        ctx.beginPath();
        ctx.moveTo(this.w, goalTop);
        ctx.lineTo(this.w, goalTop + this.goalH);
        ctx.stroke();


        // Helper for entities
        const drawEntity = (obj, color, isPuck = false) => {
            // Shadow / Glow
            if (isNeon) {
                ctx.shadowColor = color;
                ctx.shadowBlur = 30;
                if (isPuck) ctx.shadowBlur = 40;
            } else {
                ctx.shadowBlur = 0;
            }

            ctx.strokeStyle = color;
            ctx.lineWidth = 5;
            ctx.fillStyle = color;

            // Main Circle Outline
            ctx.beginPath();
            ctx.arc(obj.x, obj.y, obj.r, 0, Math.PI * 2);
            if (!isPuck) ctx.stroke(); // Paddles have outline
            else ctx.fill(); // Puck is solid filled usually

            // Fill
            if (isNeon || themeName === 'camera') {
                if (!isPuck) {
                    ctx.globalAlpha = 0.2; // Transparent core for Neon/Camera Paddles
                    ctx.fill();
                    ctx.globalAlpha = 1.0;

                    // Handle/Core
                    ctx.beginPath();
                    ctx.arc(obj.x, obj.y, obj.r * 0.4, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else {
                // Retro: Solid Fill for everything
                ctx.fill();
            }
        };

        // Draw Entities
        // Note: We use the local color variables which might override the object's internal color
        drawEntity(this.p1, p1Color);
        drawEntity(this.p2, p2Color);
        drawEntity(this.puck, puckColor, true);

        // Reset Context
        ctx.shadowBlur = 0;
    }
}
