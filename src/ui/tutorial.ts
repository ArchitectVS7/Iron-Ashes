// src/ui/tutorial.ts
interface TutorialStep {
    title: string;
    content: string;
}

export class TutorialEngine {
    private overlay: HTMLElement;
    private currentStepIndex: number = 0;
    private steps: TutorialStep[] = [];

    constructor() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'tutorial-overlay';
        document.body.appendChild(this.overlay);
    }

    public startGuidedTutorial(steps: TutorialStep[]) {
        this.steps = steps;
        this.currentStepIndex = 0;
        this.overlay.classList.add('active');
        this.renderStep();
    }

    private renderStep() {
        if (this.currentStepIndex >= this.steps.length) {
            this.closeTutorial();
            return;
        }

        const step = this.steps[this.currentStepIndex];
        const isLast = this.currentStepIndex === this.steps.length - 1;

        this.overlay.innerHTML = `
      <div class="dialogue-box">
        <div class="dialogue-title">${step.title}</div>
        <div class="dialogue-content">${step.content}</div>
        <div class="dialogue-actions">
          <button class="btn-skip" id="btn-tut-skip">Skip Tutorial</button>
          <button class="btn-next" id="btn-tut-next">${isLast ? 'Complete' : 'Continue'}</button>
        </div>
      </div>
    `;

        document.getElementById('btn-tut-skip')?.addEventListener('click', () => this.closeTutorial());
        document.getElementById('btn-tut-next')?.addEventListener('click', () => {
            this.currentStepIndex++;
            this.renderStep();
        });
    }

    private closeTutorial() {
        this.overlay.classList.remove('active');
        this.overlay.innerHTML = '';
    }

    public showDiscoveredTooltip(title: string, content: string, x: number, y: number) {
        const tooltip = document.createElement('div');
        tooltip.className = 'discovered-tooltip visible';
        tooltip.style.left = `${x}px`;
        tooltip.style.top = `${y}px`;

        tooltip.innerHTML = `
            <div class="tooltip-title">
                <span>${title}</span>
                <button class="tooltip-close">&times;</button>
            </div>
            <div>${content}</div>
        `;

        document.body.appendChild(tooltip);

        tooltip.querySelector('.tooltip-close')?.addEventListener('click', () => {
            tooltip.classList.remove('visible');
            setTimeout(() => tooltip.remove(), 300);
        });
    }
}
