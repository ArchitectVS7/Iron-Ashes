// src/ui/atmosphere.ts
export class AtmosphereEngine {
    private layer: HTMLElement;
    private silhouette: HTMLElement;
    private lighting: HTMLElement;
    private audioCtx: AudioContext | null = null;
    private particles: HTMLElement;

    constructor(parentId: string) {
        const parent = document.getElementById(parentId);
        if (!parent) throw new Error("Parent not found");

        this.layer = document.createElement('div');
        this.layer.id = 'atmosphere-layer';

        this.lighting = document.createElement('div');
        this.lighting.className = 'board-lighting';
        this.layer.appendChild(this.lighting);

        this.silhouette = document.createElement('div');
        this.silhouette.className = 'shadowking-silhouette';
        this.layer.appendChild(this.silhouette);

        this.particles = document.createElement('div');
        this.particles.id = 'particle-layer';
        this.layer.appendChild(this.particles);

        parent.insertBefore(this.layer, parent.firstChild);
    }

    private initAudio() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }

    public playBellStrike() {
        this.initAudio();
        if (!this.audioCtx) return;

        this.layer.classList.remove('bell-strike-flash');
        void this.layer.offsetWidth; // Reflow
        this.layer.classList.add('bell-strike-flash');

        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(110, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(108, this.audioCtx.currentTime + 2);

        const osc2 = this.audioCtx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(220, this.audioCtx.currentTime);

        gain.gain.setValueAtTime(1, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 3);

        osc.connect(gain);
        osc2.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start();
        osc2.start();
        osc.stop(this.audioCtx.currentTime + 3.5);
        osc2.stop(this.audioCtx.currentTime + 3.5);
    }

    public playRescueSound() {
        this.initAudio();
        if (!this.audioCtx) return;

        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';

        osc.frequency.setValueAtTime(440, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, this.audioCtx.currentTime + 0.5);

        gain.gain.setValueAtTime(0, this.audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.5, this.audioCtx.currentTime + 0.2);
        gain.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + 1);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start();
        osc.stop(this.audioCtx.currentTime + 1.5);
    }

    public explodeParticles(x: number, y: number, color: string) {
        for (let i = 0; i < 20; i++) {
            const p = document.createElement('div');
            p.className = 'particle';
            p.style.backgroundColor = color;
            const size = Math.random() * 6 + 2;
            p.style.width = size + 'px';
            p.style.height = size + 'px';
            p.style.left = x + 'px';
            p.style.top = y + 'px';

            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * 150 + 50;
            const destX = Math.cos(angle) * dist;
            const destY = Math.sin(angle) * dist;

            this.particles.appendChild(p);

            p.animate([
                { transform: 'translate(0, 0) scale(1)', opacity: 1 },
                { transform: `translate(${destX}px, ${destY}px) scale(0)`, opacity: 0 }
            ], {
                duration: 1000 + Math.random() * 500,
                easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)'
            }).onfinish = () => p.remove();
        }
    }

    public updateDoomTollEvent(oldToll: number, newToll: number) {
        if (newToll > oldToll) {
            this.playBellStrike();
        }

        this.lighting.classList.remove('vignette-dim', 'vignette-heavy', 'lighting-cold');
        this.silhouette.classList.remove('shadowking-7', 'shadowking-10');

        if (newToll >= 7 && newToll <= 9) {
            this.lighting.classList.add('vignette-dim');
            this.silhouette.classList.add('shadowking-7');
        } else if (newToll >= 10 && newToll < 13) {
            this.lighting.classList.add('vignette-heavy', 'lighting-cold');
            this.silhouette.classList.add('shadowking-10');
        } else if (newToll >= 13) {
            this.lighting.classList.add('vignette-heavy', 'lighting-cold');
            this.silhouette.classList.add('shadowking-10');
            this.triggerGameOver();
        }
    }

    private triggerGameOver() {
        const cutscene = document.createElement('div');
        cutscene.className = 'game-over-cutscene';
        cutscene.innerHTML = `<div class="overlord-title">THE SHADOWKING REIGNS</div>`;
        document.body.appendChild(cutscene);

        setTimeout(() => {
            cutscene.classList.add('visible');
        }, 1000);
    }
}
