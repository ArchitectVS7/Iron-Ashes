/**
 * GLL Registry — runtime lookup system for content tokens.
 *
 * The registry loads a GLLContentPack, validates it against the required
 * key set, and provides typed accessors so the engine never hardcodes
 * any in-world noun.
 */

import {
  GLLContentPack,
  GLLKey,
  GLLTokenDef,
  REQUIRED_GLL_KEYS,
} from './types.js';

export class GLLValidationError extends Error {
  constructor(
    public readonly missingKeys: string[],
    packId: string,
  ) {
    super(
      `GLL content pack "${packId}" is missing required keys: ${missingKeys.join(', ')}`,
    );
    this.name = 'GLLValidationError';
  }
}

export class GLLRegistry {
  private pack: GLLContentPack | null = null;

  /**
   * Load and validate a content pack. Throws if any required keys are missing.
   */
  load(pack: GLLContentPack): void {
    const missing = REQUIRED_GLL_KEYS.filter(
      (key) => !(key in pack.tokens),
    );

    if (missing.length > 0) {
      throw new GLLValidationError([...missing], pack.id);
    }

    this.pack = pack;
  }

  /**
   * Get the display name for a GLL token key.
   */
  name(key: GLLKey): string {
    return this.get(key).name;
  }

  /**
   * Get the plural form for a GLL token key (falls back to name + "s").
   */
  plural(key: GLLKey): string {
    const token = this.get(key);
    return token.plural ?? token.name + 's';
  }

  /**
   * Get the description for a GLL token key.
   */
  description(key: GLLKey): string {
    return this.get(key).description;
  }

  /**
   * Get the full token definition for a key.
   */
  get(key: GLLKey): GLLTokenDef {
    if (!this.pack) {
      throw new Error('No GLL content pack loaded. Call load() first.');
    }

    const token = this.pack.tokens[key];
    if (!token) {
      throw new Error(`GLL key "${key}" not found in pack "${this.pack.id}".`);
    }

    return token;
  }

  /**
   * Get the currently loaded content pack ID, or null if none loaded.
   */
  get packId(): string | null {
    return this.pack?.id ?? null;
  }

  /**
   * Check whether a content pack is currently loaded.
   */
  get isLoaded(): boolean {
    return this.pack !== null;
  }
}
