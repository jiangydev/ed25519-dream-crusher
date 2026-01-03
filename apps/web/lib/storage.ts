/**
 * LocalStorage persistence for Pollard's Rho algorithm state.
 */

import { PollardRhoState, AlgorithmState, stateToSerializable, stateFromSerializable } from '@/lib/pollard-rho';

const STORAGE_KEY = 'pollard-rho-state';

/**
 * Save the algorithm state to localStorage.
 */
export function saveState(state: AlgorithmState): void {
  try {
    const serializable = stateToSerializable(state);
    const json = JSON.stringify(serializable);
    localStorage.setItem(STORAGE_KEY, json);
  } catch (error) {
    console.error('Failed to save state to localStorage:', error);
  }
}

/**
 * Load the algorithm state from localStorage.
 */
export function loadState(): AlgorithmState | null {
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) return null;

    const serializable: PollardRhoState = JSON.parse(json);
    return stateFromSerializable(serializable);
  } catch (error) {
    console.error('Failed to load state from localStorage:', error);
    return null;
  }
}

/**
 * Clear the saved state from localStorage.
 */
export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear state from localStorage:', error);
  }
}

/**
 * Check if there's a saved state in localStorage.
 */
export function hasSavedState(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}
