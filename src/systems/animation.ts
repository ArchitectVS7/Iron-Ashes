/**
 * Animation System — Visual state transitions and atmospheric effects.
 *
 * This system provides animation primitives for game state transitions,
 * atmospheric effects, and event-driven visual feedback. All animations
 * respect the prefers-reduced-motion media query and can be disabled
 * via settings.
 *
 * @module animation
 */

/** Animation configuration options. */
export interface AnimationOptions {
  /** Duration in milliseconds (default: 300). */
  duration?: number;
  /** Easing function (default: 'ease-in-out'). */
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  /** Whether to respect reduced motion preference (default: true). */
  respectReducedMotion?: boolean;
}

/** Animation event types for the event system. */
export type AnimationEventType =
  | 'doom_advance'
  | 'doom_advance_deck_reshuffle'
  | 'doom_advance_vote_fail'
  | 'doom_recede'
  | 'rescue_performed'
  | 'blood_pact_reveal'
  | 'final_phase_enter'
  | 'combat_fate_reveal'
  | 'combat_resolution'
  | 'movement_complete'
  | 'stronghold_claim'
  | 'broken_court_enter'
  | 'voting_complete'
  | 'shadowking_action';

/** Animation event payload. */
export interface AnimationEvent {
  type: AnimationEventType;
  timestamp: number;
  data?: Record<string, unknown>;
}

/** Animation event listener callback. */
export type AnimationEventListener = (event: AnimationEvent) => void;

/**
 * Check if the user prefers reduced motion.
 *
 * @returns True if prefers-reduced-motion is set, false otherwise.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Check if animations should be disabled based on settings and user preference.
 *
 * @param enabled - Whether animations are enabled in settings.
 * @param respectReducedMotion - Whether to respect the reduced motion preference.
 * @returns True if animations should proceed, false if they should be skipped.
 */
export function shouldAnimate(enabled: boolean, respectReducedMotion: boolean = true): boolean {
  if (!enabled) {
    return false;
  }
  if (respectReducedMotion && prefersReducedMotion()) {
    return false;
  }
  return true;
}

/**
 * Sleep for a specified duration.
 *
 * @param ms - Duration in milliseconds.
 * @returns A promise that resolves after the specified duration.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Animate a numeric value from start to end over a duration.
 *
 * @param start - Starting value.
 * @param end - Ending value.
 * @param duration - Duration in milliseconds.
 * @param easing - Easing function type.
 * @param onUpdate - Callback fired on each frame with the current value.
 * @param shouldAnimate - Whether to animate or jump to end.
 * @returns A promise that resolves when the animation completes.
 */
export async function animateValue(
  start: number,
  end: number,
  duration: number,
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out',
  onUpdate: (value: number) => void,
  shouldAnimate: boolean = true,
): Promise<void> {
  if (!shouldAnimate || duration <= 0) {
    onUpdate(end);
    return;
  }

  const startTime = performance.now();
  const change = end - start;

  const easeFunctions: Record<string, (t: number) => number> = {
    linear: (t) => t,
    'ease-in': (t) => t * t,
    'ease-out': (t) => t * (2 - t),
    'ease-in-out': (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  };

  const ease = easeFunctions[easing];

  return new Promise(resolve => {
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = ease(progress);
      const currentValue = start + change * easedProgress;

      onUpdate(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        onUpdate(end);
        resolve();
      }
    };

    requestAnimationFrame(animate);
  });
}

/**
 * Animation system state and configuration.
 */
export class AnimationSystem {
  private enabled: boolean = true;
  private listeners: Map<AnimationEventType, Set<AnimationEventListener>> = new Map();
  private reducedMotionOverride: boolean = false;

  /**
   * Enable or disable animations.
   *
   * @param enabled - Whether animations should be enabled.
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if animations are currently enabled.
   *
   * @returns True if animations are enabled, false otherwise.
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Override the reduced motion preference.
   *
   * @param override - Whether to override reduced motion preference.
   */
  setReducedMotionOverride(override: boolean): void {
    this.reducedMotionOverride = override;
  }

  /**
   * Check if animations should proceed based on settings and user preference.
   *
   * @param respectReducedMotion - Whether to respect the reduced motion preference.
   * @returns True if animations should proceed, false otherwise.
   */
  shouldAnimate(respectReducedMotion: boolean = true): boolean {
    if (!this.enabled) {
      return false;
    }
    if (this.reducedMotionOverride) {
      return true;
    }
    if (respectReducedMotion && prefersReducedMotion()) {
      return false;
    }
    return true;
  }

  /**
   * Register an event listener for a specific animation event type.
   *
   * @param type - The animation event type to listen for.
   * @param listener - The callback to invoke when the event fires.
   */
  addEventListener(type: AnimationEventType, listener: AnimationEventListener): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
  }

  /**
   * Remove an event listener for a specific animation event type.
   *
   * @param type - The animation event type to remove the listener from.
   * @param listener - The callback to remove.
   */
  removeEventListener(type: AnimationEventType, listener: AnimationEventListener): void {
    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * Fire an animation event to all registered listeners.
   *
   * @param type - The animation event type to fire.
   * @param data - Optional data payload for the event.
   */
  fireEvent(type: AnimationEventType, data?: Record<string, unknown>): void {
    const event: AnimationEvent = {
      type,
      timestamp: performance.now(),
      data,
    };

    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error(`Animation event listener error for ${type}:`, error);
        }
      });
    }
  }

  /**
   * Fire the doom advance animation event with the appropriate subtype.
   *
   * @param cause - The cause of the doom advance ('vote_fail', 'deck_reshuffle', or 'other').
   * @param newPosition - The new doom toll position.
   */
  fireDoomAdvance(cause: 'vote_fail' | 'deck_reshuffle' | 'other', newPosition: number): void {
    const eventType: AnimationEventType = cause === 'vote_fail'
      ? 'doom_advance_vote_fail'
      : cause === 'deck_reshuffle'
        ? 'doom_advance_deck_reshuffle'
        : 'doom_advance';

    this.fireEvent(eventType, { newPosition, cause });
  }

  /**
   * Fire the doom recede animation event.
   *
   * @param newPosition - The new doom toll position.
   */
  fireDoomRecede(newPosition: number): void {
    this.fireEvent('doom_recede', { newPosition });
  }

  /**
   * Fire the rescue performed animation event.
   *
   * @param rescuerIndex - The index of the player performing the rescue.
   * @param rescuedIndex - The index of the player being rescued.
   * @param cardsGiven - The number of fate cards given.
   */
  fireRescuePerformed(rescuerIndex: number, rescuedIndex: number, cardsGiven: number): void {
    this.fireEvent('rescue_performed', { rescuerIndex, rescuedIndex, cardsGiven });
  }

  /**
   * Fire the blood pact reveal animation event.
   *
   * @param traitorIndex - The index of the player who is the traitor.
   * @param revealedAt - When the reveal occurred ('accusation' or 'game_end').
   */
  fireBloodPactReveal(traitorIndex: number, revealedAt: 'accusation' | 'game_end'): void {
    this.fireEvent('blood_pact_reveal', { traitorIndex, revealedAt });
  }

  /**
   * Fire the final phase entered animation event.
   *
   * @param doomToll - The doom toll position when final phase was entered.
   */
  fireFinalPhaseEnter(doomToll: number): void {
    this.fireEvent('final_phase_enter', { doomToll });
  }

  /**
   * Fire the combat fate reveal animation event.
   *
   * @param attackerCard - The attacker's fate card value.
   * @param defenderCard - The defender's fate card value.
   * @param attackerMargin - The margin before cards (positive = attacker ahead).
   */
  fireCombatFateReveal(attackerCard: number, defenderCard: number, attackerMargin: number): void {
    this.fireEvent('combat_fate_reveal', { attackerCard, defenderCard, attackerMargin });
  }

  /**
   * Fire the combat resolution animation event.
   *
   * @param winner - 'attacker' or 'defender'.
   * @param margin - The final margin of victory.
   */
  fireCombatResolution(winner: 'attacker' | 'defender', margin: number): void {
    this.fireEvent('combat_resolution', { winner, margin });
  }

  /**
   * Fire the movement complete animation event.
   *
   * @param playerIndex - The index of the player who moved.
   * @param fromNode - The node ID moved from.
   * @param toNode - The node ID moved to.
   */
  fireMovementComplete(playerIndex: number, fromNode: string, toNode: string): void {
    this.fireEvent('movement_complete', { playerIndex, fromNode, toNode });
  }

  /**
   * Fire the stronghold claim animation event.
   *
   * @param playerIndex - The index of the player claiming the stronghold.
   * @param nodeId - The node ID being claimed.
   */
  fireStrongholdClaim(playerIndex: number, nodeId: string): void {
    this.fireEvent('stronghold_claim', { playerIndex, nodeId });
  }

  /**
   * Fire the broken court entered animation event.
   *
   * @param playerIndex - The index of the player entering broken court.
   */
  fireBrokenCourtEnter(playerIndex: number): void {
    this.fireEvent('broken_court_enter', { playerIndex });
  }

  /**
   * Fire the voting complete animation event.
   *
   * @param unanimous - Whether the vote was unanimous.
   * @param doomAdvanced - Whether the doom toll advanced as a result.
   */
  fireVotingComplete(unanimous: boolean, doomAdvanced: boolean): void {
    this.fireEvent('voting_complete', { unanimous, doomAdvanced });
  }

  /**
   * Fire the shadowking action animation event.
   *
   * @param cardType - The type of behavior card resolved.
   * @param description - A description of the action taken.
   */
  fireShadowkingAction(cardType: string, description: string): void {
    this.fireEvent('shadowking_action', { cardType, description });
  }
}

/**
 * Default animation durations for various game events.
 */
export const ANIMATION_DURATIONS = {
  doomAdvance: 600,
  doomRecede: 400,
  rescuePerformed: 800,
  bloodPactReveal: 1500,
  finalPhaseEnter: 2000,
  combatFateReveal: 500,
  combatResolution: 400,
  movementComplete: 300,
  strongholdClaim: 400,
  brokenCourtEnter: 600,
  votingComplete: 300,
  shadowkingAction: 500,
} as const;

/**
 * Shared singleton animation system instance.
 */
export const animationSystem = new AnimationSystem();

/**
 * Play the doom toll advance animation.
 *
 * @param currentPosition - The current doom toll position.
 * @param newPosition - The new doom toll position.
 * @param cause - The cause of the advance.
 * @returns A promise that resolves when the animation completes.
 */
export async function playDoomAdvanceAnimation(
  currentPosition: number,
  newPosition: number,
  cause: 'vote_fail' | 'deck_reshuffle' | 'other',
): Promise<void> {
  animationSystem.fireDoomAdvance(cause, newPosition);

  const shouldAnimate = animationSystem.shouldAnimate();
  const duration = shouldAnimate ? ANIMATION_DURATIONS.doomAdvance : 0;

  // Animate the counter increment
  await animateValue(
    currentPosition,
    newPosition,
    duration,
    'ease-in-out',
    () => {}, // Value animation handled by UI component
    shouldAnimate,
  );
}

/**
 * Play the doom toll recede animation.
 *
 * @param currentPosition - The current doom toll position.
 * @param newPosition - The new doom toll position.
 * @returns A promise that resolves when the animation completes.
 */
export async function playDoomRecedeAnimation(
  currentPosition: number,
  newPosition: number,
): Promise<void> {
  animationSystem.fireDoomRecede(newPosition);

  const shouldAnimate = animationSystem.shouldAnimate();
  const duration = shouldAnimate ? ANIMATION_DURATIONS.doomRecede : 0;

  await animateValue(
    currentPosition,
    newPosition,
    duration,
    'ease-in-out',
    () => {},
    shouldAnimate,
  );
}

/**
 * Play the rescue performed animation.
 *
 * @param rescuerIndex - The index of the rescuing player.
 * @param rescuedIndex - The index of the rescued player.
 * @param cardsGiven - The number of cards given.
 * @returns A promise that resolves when the animation completes.
 */
export async function playRescueAnimation(
  rescuerIndex: number,
  rescuedIndex: number,
  cardsGiven: number,
): Promise<void> {
  animationSystem.fireRescuePerformed(rescuerIndex, rescuedIndex, cardsGiven);

  const shouldAnimate = animationSystem.shouldAnimate();
  await sleep(shouldAnimate ? ANIMATION_DURATIONS.rescuePerformed : 0);
}

/**
 * Play the blood pact reveal animation.
 *
 * @param traitorIndex - The index of the traitor.
 * @param revealedAt - When the reveal occurred.
 * @returns A promise that resolves when the animation completes.
 */
export async function playBloodPactRevealAnimation(
  traitorIndex: number,
  revealedAt: 'accusation' | 'game_end',
): Promise<void> {
  animationSystem.fireBloodPactReveal(traitorIndex, revealedAt);

  const shouldAnimate = animationSystem.shouldAnimate();
  await sleep(shouldAnimate ? ANIMATION_DURATIONS.bloodPactReveal : 0);
}

/**
 * Play the final phase entered animation.
 *
 * @param doomToll - The doom toll position.
 * @returns A promise that resolves when the animation completes.
 */
export async function playFinalPhaseEnterAnimation(doomToll: number): Promise<void> {
  animationSystem.fireFinalPhaseEnter(doomToll);

  const shouldAnimate = animationSystem.shouldAnimate();
  await sleep(shouldAnimate ? ANIMATION_DURATIONS.finalPhaseEnter : 0);
}

/**
 * Play the combat fate card reveal animation.
 *
 * @param attackerCard - The attacker's card value.
 * @param defenderCard - The defender's card value.
 * @param attackerMargin - The margin before cards.
 * @returns A promise that resolves when the animation completes.
 */
export async function playCombatFateRevealAnimation(
  attackerCard: number,
  defenderCard: number,
  attackerMargin: number,
): Promise<void> {
  animationSystem.fireCombatFateReveal(attackerCard, defenderCard, attackerMargin);

  const shouldAnimate = animationSystem.shouldAnimate();
  await sleep(shouldAnimate ? ANIMATION_DURATIONS.combatFateReveal : 0);
}

/**
 * Play the combat resolution animation.
 *
 * @param winner - The winner of the combat.
 * @param margin - The margin of victory.
 * @returns A promise that resolves when the animation completes.
 */
export async function playCombatResolutionAnimation(
  winner: 'attacker' | 'defender',
  margin: number,
): Promise<void> {
  animationSystem.fireCombatResolution(winner, margin);

  const shouldAnimate = animationSystem.shouldAnimate();
  await sleep(shouldAnimate ? ANIMATION_DURATIONS.combatResolution : 0);
}

/**
 * Play the movement complete animation.
 *
 * @param playerIndex - The index of the moving player.
 * @param fromNode - The starting node.
 * @param toNode - The destination node.
 * @returns A promise that resolves when the animation completes.
 */
export async function playMovementCompleteAnimation(
  playerIndex: number,
  fromNode: string,
  toNode: string,
): Promise<void> {
  animationSystem.fireMovementComplete(playerIndex, fromNode, toNode);

  const shouldAnimate = animationSystem.shouldAnimate();
  await sleep(shouldAnimate ? ANIMATION_DURATIONS.movementComplete : 0);
}

/**
 * Play the stronghold claim animation.
 *
 * @param playerIndex - The index of the claiming player.
 * @param nodeId - The node being claimed.
 * @returns A promise that resolves when the animation completes.
 */
export async function playStrongholdClaimAnimation(
  playerIndex: number,
  nodeId: string,
): Promise<void> {
  animationSystem.fireStrongholdClaim(playerIndex, nodeId);

  const shouldAnimate = animationSystem.shouldAnimate();
  await sleep(shouldAnimate ? ANIMATION_DURATIONS.strongholdClaim : 0);
}

/**
 * Play the broken court entered animation.
 *
 * @param playerIndex - The index of the player entering broken court.
 * @returns A promise that resolves when the animation completes.
 */
export async function playBrokenCourtEnterAnimation(playerIndex: number): Promise<void> {
  animationSystem.fireBrokenCourtEnter(playerIndex);

  const shouldAnimate = animationSystem.shouldAnimate();
  await sleep(shouldAnimate ? ANIMATION_DURATIONS.brokenCourtEnter : 0);
}

/**
 * Play the voting complete animation.
 *
 * @param unanimous - Whether the vote was unanimous.
 * @param doomAdvanced - Whether doom advanced.
 * @returns A promise that resolves when the animation completes.
 */
export async function playVotingCompleteAnimation(
  unanimous: boolean,
  doomAdvanced: boolean,
): Promise<void> {
  animationSystem.fireVotingComplete(unanimous, doomAdvanced);

  const shouldAnimate = animationSystem.shouldAnimate();
  await sleep(shouldAnimate ? ANIMATION_DURATIONS.votingComplete : 0);
}

/**
 * Play the shadowking action animation.
 *
 * @param cardType - The type of behavior card.
 * @param description - Description of the action.
 * @returns A promise that resolves when the animation completes.
 */
export async function playShadowkingActionAnimation(
  cardType: string,
  description: string,
): Promise<void> {
  animationSystem.fireShadowkingAction(cardType, description);

  const shouldAnimate = animationSystem.shouldAnimate();
  await sleep(shouldAnimate ? ANIMATION_DURATIONS.shadowkingAction : 0);
}
