/**
 * Share link generation and parsing for Pollard's Rho algorithm state.
 *
 * Uses ultra-compact format + gzip compression + Base64 encoding to create
 * shareable URLs that contain the current attack state.
 */

import pako from 'pako';
import { AlgorithmState, stateToCompact, stateFromCompact } from '@/lib/pollard-rho';

const QUERY_PARAM = 's';

/**
 * Convert a string to Base64 URL-safe format.
 */
function toBase64Url(str: string): string {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Convert a Base64 URL-safe string back to original.
 */
function fromBase64Url(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  return atob(str);
}

/**
 * Generate a shareable link containing the current algorithm state.
 * Uses ultra-compact format for maximum URL shortness.
 * @param state - The current algorithm state
 * @param speed - Current speed in ops/sec
 * @param baseUrl - The base URL of the application (defaults to current origin)
 * @returns A shareable URL
 */
export function generateShareLink(state: AlgorithmState, speed: number, baseUrl?: string): string {
  try {
    // Convert to ultra-compact format with speed
    const compact = stateToCompact(state, speed);

    // Compress with gzip (even compact format benefits from compression)
    const compressed = pako.gzip(compact);

    // Convert to binary string
    const binaryStr = String.fromCharCode(...compressed);

    // Encode as Base64 URL-safe
    const encoded = toBase64Url(binaryStr);

    // Construct URL
    const url = new URL(baseUrl || window.location.href);
    url.searchParams.set(QUERY_PARAM, encoded);

    return url.toString();
  } catch (error) {
    console.error('Failed to generate share link:', error);
    return window.location.href;
  }
}

/**
 * Parse a shareable link and extract the algorithm state and speed.
 * @param url - The URL to parse (defaults to current URL)
 * @returns Object with state and speed, or null if invalid
 */
export function parseShareLink(url?: string): { state: AlgorithmState; speed: number } | null {
  try {
    console.log('[parseShareLink] Starting...');
    const urlObj = new URL(url || window.location.href);
    const encoded = urlObj.searchParams.get(QUERY_PARAM);
    console.log('[parseShareLink] Encoded param length:', encoded?.length);

    if (!encoded) {
      return null;
    }

    // Decode from Base64 URL-safe
    const binaryStr = fromBase64Url(encoded);
    console.log('[parseShareLink] Binary string length:', binaryStr.length);

    // Convert back to binary array
    const compressed = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      compressed[i] = binaryStr.charCodeAt(i);
    }
    console.log('[parseShareLink] Compressed bytes:', compressed.length);

    // Decompress with gzip
    const decompressed = pako.ungzip(compressed, { to: 'string' });
    console.log('[parseShareLink] Decompressed:', decompressed);
    console.log('[parseShareLink] Decompressed length:', decompressed.length);

    // Parse compact format - returns { state, speed }
    const result = stateFromCompact(decompressed);
    console.log('[parseShareLink] Parsed result:', result);
    return result;
  } catch (error) {
    console.error('[parseShareLink] Failed:', error);
    return null;
  }
}

/**
 * Clear the share state from the URL.
 */
export function clearShareStateFromUrl(): void {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete(QUERY_PARAM);
    window.history.replaceState({}, '', url.toString());
  } catch (error) {
    console.error('Failed to clear share state from URL:', error);
  }
}

/**
 * Check if the URL contains a shared state.
 */
export function hasShareState(url?: string): boolean {
  try {
    const urlObj = new URL(url || window.location.href);
    return urlObj.searchParams.has(QUERY_PARAM);
  } catch {
    return false;
  }
}
