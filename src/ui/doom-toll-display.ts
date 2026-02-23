export class DoomTollDisplay {
    private container: HTMLElement;

    constructor(parentId: string) {
        const parent = document.getElementById(parentId);
        if (!parent) throw new Error("Parent not found");

        this.container = document.createElement('div');
        this.container.className = 'doom-toll-large';
        parent.appendChild(this.container);
    }

    public updateToll(value: number) {
        let html = '<div class="doom-track">';
        for (let i = 1; i <= 13; i++) {
            const isPast = i <= value;
            const isCurrent = i === value;
            const markerClass = isCurrent ? 'marker-current pulsing' : (isPast ? 'marker-past' : 'marker-future');
            html += `<div class="doom-marker ${markerClass} ${i >= 10 ? 'final-phase' : ''}">${i}</div>`;
        }
        html += '</div>';

        this.container.innerHTML = `
      <div class="doom-toll-header">THE DOOM TOLL</div>
      ${html}
    `;
    }
}
