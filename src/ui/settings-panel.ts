// src/ui/settings-panel.ts
// Minimal settings button — re-opens Social Pressure Onboarding from within the game HUD

import { SocialPressureOnboarding } from './social-pressure-onboarding.js';

export class SettingsPanel {
  private btn: HTMLElement;

  constructor(container: HTMLElement) {
    this.btn = document.createElement('button');
    this.btn.className = 'settings-btn';
    this.btn.textContent = '⚙';
    this.btn.setAttribute('title', 'Settings — About the Voting Phase');
    this.btn.setAttribute('aria-label', 'Open settings');
    this.btn.addEventListener('click', () => {
      void new SocialPressureOnboarding().showFromSettings();
    });
    container.appendChild(this.btn);
  }
}
