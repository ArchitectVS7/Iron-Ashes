export interface ResourceState {
    currentBanners: number;
    generatedThisTurn: number;
}

export class ResourceDisplay {
    private container: HTMLElement;

    constructor(parentElement: HTMLElement) {
        this.container = document.createElement('div');
        this.container.className = 'resource-display';
        parentElement.appendChild(this.container);
    }

    public update(state: ResourceState) {
        const isZero = state.currentBanners === 0;

        this.container.innerHTML = `
      <div class="resource-banner ${isZero ? 'resource-zero' : ''}">
        <div class="resource-icon">
          <svg fill="currentColor" viewBox="0 0 24 24"><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6h-5.6z"/></svg>
        </div>
        <div class="resource-count">
          <span class="current">${state.currentBanners}</span>
          ${state.generatedThisTurn > 0 ? `<span class="generated">(+${state.generatedThisTurn})</span>` : ''}
        </div>
      </div>
    `;
    }
}
