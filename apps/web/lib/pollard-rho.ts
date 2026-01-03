/**
 * Pollard's Rho Algorithm for ECDLP on Ed25519
 *
 * Ported from Python implementation to TypeScript.
 * Uses @noble/curves for elliptic curve operations.
 *
 * DISCLAIMER: This is for ENTERTAINMENT and EDUCATIONAL PURPOSES ONLY.
 * Breaking Ed25519 on a classical computer is computationally infeasible.
 */

import { ed25519 } from '@noble/curves/ed25519';

// Type definitions
export type Point = typeof ed25519.ExtendedPoint.prototype;

export interface PollardRhoState {
  publicKey: string;
  iteration: number;
  tortoise: {
    pointX: string;
    pointY: string;
    alpha: string;
    beta: string;
  };
  hare: {
    pointX: string;
    pointY: string;
    alpha: string;
    beta: string;
  };
}

export interface AlgorithmState {
  publicKey: string;
  iteration: number;
  tortoisePoint: Point;
  tortoiseAlpha: bigint;
  tortoiseBeta: bigint;
  harePoint: Point;
  hareAlpha: bigint;
  hareBeta: bigint;
  Q: Point;
}

// Curve constants
const CURVE = ed25519.ExtendedPoint;
const G = CURVE.BASE;
const n = ed25519.CURVE.n; // Group order, approximately 2^252

/**
 * Validate a public key hex string format (without parsing the point).
 * @param pubkeyHex - Public key as hex string (with or without '0x' prefix)
 * @returns true if valid format, false otherwise
 */
export function validatePublicKeyFormat(pubkeyHex: string): boolean {
  // Remove '0x' prefix if present
  if (pubkeyHex.startsWith('0x') || pubkeyHex.startsWith('0X')) {
    pubkeyHex = pubkeyHex.slice(2);
  }

  // Remove any whitespace
  pubkeyHex = pubkeyHex.trim().replace(/\s/g, '');

  // Check hex string format
  if (!/^[0-9a-fA-F]+$/.test(pubkeyHex)) {
    return false;
  }

  // Check length (32 bytes = 64 hex characters)
  return pubkeyHex.length === 64;
}

/**
 * Parse a public key hex string and convert to an Ed25519 point.
 * Uses fromHex which should be fast for valid keys.
 * @param pubkeyHex - Public key as hex string (with or without '0x' prefix)
 * @returns The elliptic curve point representing the public key
 */
export function parsePublicKey(pubkeyHex: string): Point {
  // Remove '0x' prefix if present
  if (pubkeyHex.startsWith('0x') || pubkeyHex.startsWith('0X')) {
    pubkeyHex = pubkeyHex.slice(2);
  }

  // Remove any whitespace
  pubkeyHex = pubkeyHex.trim().replace(/\s/g, '');

  // Validate hex string
  if (!/^[0-9a-fA-F]+$/.test(pubkeyHex)) {
    throw new Error('Invalid hex string in public key');
  }

  // Ed25519 public keys are 32 bytes (64 hex characters)
  if (pubkeyHex.length !== 64) {
    throw new Error(
      `Ed25519 public key must be 64 hex characters (32 bytes), got ${pubkeyHex.length}`
    );
  }

  console.log('[parsePublicKey] Starting to parse:', pubkeyHex.slice(0, 16) + '...');

  // Use fromHex - this should not block for valid keys
  const point = ed25519.ExtendedPoint.fromHex(pubkeyHex);

  console.log('[parsePublicKey] Successfully parsed');

  return point;
}

/**
 * Convert hex string to bytes
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Convert bytes to hex string
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Partition function for the random walk.
 * Divides points into 20 partitions based on x-coordinate hash.
 * @param point - Elliptic curve point
 * @returns Partition number (0-19)
 */
function partitionFunction(point: Point): number {
  // Get x-coordinate as bytes
  const xBytes = point.toRawBytes();
  // Simple hash: take first 4 bytes and mod 20
  let hash = 0;
  for (let i = 0; i < Math.min(4, xBytes.length); i++) {
    hash = (hash << 8) | (xBytes[i] & 0xff);  // Ensure unsigned
  }
  return Math.abs(hash % 20);
}

/**
 * Update rule constants for each partition
 */
const C_LIST = [
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
];
const D_LIST = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
];

/**
 * Perform one iteration step of the random walk.
 *
 * Uses the 20-partition method:
 * - Each partition defines a different update rule
 * - P = alpha * G + beta * Q
 *
 * @param pointP - Current point P = alpha*G + beta*Q
 * @param alpha - Current alpha coefficient
 * @param beta - Current beta coefficient
 * @param Q - Target public key point
 * @returns Tuple of (new_point, new_alpha, new_beta)
 */
export function iterationStep(
  pointP: Point,
  alpha: bigint,
  beta: bigint,
  Q: Point
): { point: Point; alpha: bigint; beta: bigint } {
  const partition = partitionFunction(pointP);
  const c = BigInt(C_LIST[partition]);
  const d = BigInt(D_LIST[partition]);

  // P_new = P + c*G + d*Q
  // This means: alpha_new = alpha + c, beta_new = beta + d
  const cG = G.multiply(c);
  // Handle d = 0 case: multiply doesn't accept 0, so we skip the multiplication
  const dQ = d === 0n ? CURVE.ZERO : Q.multiply(d);

  const newPoint = pointP.add(cG).add(dQ);
  const newAlpha = (alpha + c) % n;
  const newBeta = (beta + d) % n;

  return { point: newPoint, alpha: newAlpha, beta: newBeta };
}

/**
 * Modular inverse using BigInt
 * @param a - Number to invert
 * @param m - Modulus
 * @returns Modular inverse of a mod m
 */
function modInverse(a: bigint, m: bigint): bigint {
  // Extended Euclidean algorithm
  let [old_r, r] = [a, m];
  let [old_s, s] = [1n, 0n];

  while (r !== 0n) {
    const quotient = old_r / r;
    [old_r, r] = [r, old_r - quotient * r];
    [old_s, s] = [s, old_s - quotient * s];
  }

  if (old_r > 1n) {
    throw new Error('Inverse does not exist');
  }

  if (old_s < 0n) {
    old_s += m;
  }

  return old_s % m;
}

/**
 * Check if two points are equal
 */
export function pointsEqual(p1: Point, p2: Point): boolean {
  const bytes1 = p1.toRawBytes();
  const bytes2 = p2.toRawBytes();
  if (bytes1.length !== bytes2.length) return false;
  for (let i = 0; i < bytes1.length; i++) {
    if (bytes1[i] !== bytes2[i]) return false;
  }
  return true;
}

/**
 * Solve for k when a collision is detected.
 * We have: P = alpha_t * G + beta_t * Q = alpha_h * G + beta_h * Q
 * This gives us: (alpha_t - alpha_h) * G = (beta_h - beta_t) * Q
 * Since Q = k * G: (alpha_t - alpha_h) * G = (beta_h - beta_t) * k * G
 * Therefore: k = (alpha_t - alpha_h) * inv(beta_h - beta_t) mod n
 *
 * @param tortoiseAlpha - Tortoise's alpha coefficient
 * @param tortoiseBeta - Tortoise's beta coefficient
 * @param hareAlpha - Hare's alpha coefficient
 * @param hareBeta - Hare's beta coefficient
 * @param Q - Target public key point
 * @returns The private key k if found, null otherwise
 */
export function solveForK(
  tortoiseAlpha: bigint,
  tortoiseBeta: bigint,
  hareAlpha: bigint,
  hareBeta: bigint,
  Q: Point
): bigint | null {
  const betaDiff = (hareBeta - tortoiseBeta) % n;
  const alphaDiff = (tortoiseAlpha - hareAlpha) % n;

  if (betaDiff === 0n) {
    // Trivial collision
    return null;
  }

  try {
    const k = (alphaDiff * modInverse(betaDiff, n)) % n;

    // Verify the solution
    const kG = G.multiply(k);
    if (pointsEqual(kG, Q)) {
      return k;
    }
  } catch {
    // Inverse doesn't exist (betaDiff shares factor with n)
  }

  return null;
}

/**
 * Initialize the algorithm state for a given public key.
 * @param publicKeyHex - The target public key in hex format
 * @returns Initial algorithm state
 */
export function initializeState(publicKeyHex: string): AlgorithmState {
  const Q = parsePublicKey(publicKeyHex);

  // Initialize tortoise and hare at the same starting point
  const startAlpha = 1n;
  const startBeta = 1n;

  // For Ed25519, multiply by 1 is just the point itself, so we can skip the multiplication
  // This is a fast path that avoids expensive scalar multiplication
  const startPoint = G.add(Q);

  return {
    publicKey: publicKeyHex,
    iteration: 0,
    tortoisePoint: startPoint,
    tortoiseAlpha: startAlpha,
    tortoiseBeta: startBeta,
    harePoint: startPoint,
    hareAlpha: startAlpha,
    hareBeta: startBeta,
    Q,
  };
}

/**
 * Async version of initializeState - runs synchronously but wrapped in Promise.
 */
export async function initializeStateAsync(
  publicKeyHex: string,
  timeoutMs: number = 5000
): Promise<AlgorithmState> {
  console.log('[initializeStateAsync] Starting...');

  // Use setTimeout to allow UI to update
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      console.error('[initializeStateAsync] Timeout!');
      reject(new Error(`Initialization timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    // Defer execution to next tick
    setTimeout(() => {
      try {
        console.log('[initializeStateAsync] Calling initializeState...');
        const state = initializeState(publicKeyHex);
        clearTimeout(timeoutId);
        console.log('[initializeStateAsync] Success!');
        resolve(state);
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('[initializeStateAsync] Error:', error);
        reject(error);
      }
    }, 0);
  });
}

/**
 * Perform N iterations of the algorithm.
 * @param state - Current algorithm state
 * @param iterations - Number of iterations to perform
 * @returns Updated state and whether a collision was found
 */
export function performIterations(
  state: AlgorithmState,
  iterations: number
): { state: AlgorithmState; collision: boolean; privateKey: bigint | null } {
  let { tortoisePoint, tortoiseAlpha, tortoiseBeta, harePoint, hareAlpha, hareBeta, Q } = state;

  for (let i = 0; i < iterations; i++) {
    // Move tortoise 1 step
    const tortoiseResult = iterationStep(tortoisePoint, tortoiseAlpha, tortoiseBeta, Q);
    tortoisePoint = tortoiseResult.point;
    tortoiseAlpha = tortoiseResult.alpha;
    tortoiseBeta = tortoiseResult.beta;

    // Move hare 2 steps
    const hareResult1 = iterationStep(harePoint, hareAlpha, hareBeta, Q);
    harePoint = hareResult1.point;
    hareAlpha = hareResult1.alpha;
    hareBeta = hareResult1.beta;

    const hareResult2 = iterationStep(harePoint, hareAlpha, hareBeta, Q);
    harePoint = hareResult2.point;
    hareAlpha = hareResult2.alpha;
    hareBeta = hareResult2.beta;

    // Check for collision
    if (pointsEqual(tortoisePoint, harePoint)) {
      // Collision found! Try to solve for k
      const k = solveForK(tortoiseAlpha, tortoiseBeta, hareAlpha, hareBeta, Q);

      if (k !== null) {
        // Success!
        return {
          state: {
            ...state,
            iteration: state.iteration + i + 1,
            tortoisePoint,
            tortoiseAlpha,
            tortoiseBeta,
            harePoint,
            hareAlpha,
            hareBeta,
          },
          collision: true,
          privateKey: k,
        };
      }

      // Trivial collision, restart with different parameters
      const newStartAlpha = (tortoiseAlpha + 1n) % n;
      const startPoint = G.multiply(newStartAlpha).add(Q.multiply(tortoiseBeta));
      tortoisePoint = startPoint;
      harePoint = startPoint;
      tortoiseAlpha = newStartAlpha;
      hareAlpha = newStartAlpha;
    }
  }

  return {
    state: {
      ...state,
      iteration: state.iteration + iterations,
      tortoisePoint,
      tortoiseAlpha,
      tortoiseBeta,
      harePoint,
      hareAlpha,
      hareBeta,
    },
    collision: false,
    privateKey: null,
  };
}

/**
 * Convert algorithm state to compact serializable format for sharing.
 * Uses shortened field names to minimize URL length.
 */
export function stateToSerializable(state: AlgorithmState): PollardRhoState {
  return {
    publicKey: state.publicKey,
    iteration: state.iteration,
    tortoise: {
      pointX: state.tortoisePoint.toHex().slice(0, 64),
      pointY: state.tortoisePoint.toHex().slice(64, 128),
      alpha: state.tortoiseAlpha.toString(16),
      beta: state.tortoiseBeta.toString(16),
    },
    hare: {
      pointX: state.harePoint.toHex().slice(0, 64),
      pointY: state.harePoint.toHex().slice(64, 128),
      alpha: state.hareAlpha.toString(16),
      beta: state.hareBeta.toString(16),
    },
  };
}

/**
 * Convert to ultra-compact format for share links.
 * Removes JSON redundancy for maximum compression.
 */
export function stateToCompact(state: AlgorithmState, speed: number = 0): string {
  const parts = [
    state.publicKey.slice(2), // Remove 0x prefix (64 chars)
    state.iteration.toString(16), // Hex encoding (reliable)
    speed.toString(16), // Current speed in hex
    state.tortoisePoint.toHex(), // Compressed point (64 chars)
    state.tortoiseAlpha.toString(16), // Hex encoding
    state.tortoiseBeta.toString(16), // Hex encoding
    state.harePoint.toHex(), // Compressed point (64 chars)
    state.hareAlpha.toString(16), // Hex encoding
    state.hareBeta.toString(16), // Hex encoding
  ];
  return parts.join('|');
}

/**
 * Parse compact format back to algorithm state.
 * Compact format: publicKey|iteration|speed|tortoisePoint|tortoiseAlpha|tortoiseBeta|harePoint|hareAlpha|hareBeta
 */
export function stateFromCompact(compact: string): { state: AlgorithmState; speed: number } | null {
  try {
    const parts = compact.split('|');
    if (parts.length !== 9) return null;

    const [pubKeyHex, iterationStr, speedStr, tortoisePointHex, tortoiseAlphaStr, tortoiseBetaStr, harePointHex, hareAlphaStr, hareBetaStr] = parts;

    const Q = parsePublicKey('0x' + pubKeyHex);

    return {
      state: {
        publicKey: '0x' + pubKeyHex,
        iteration: parseInt(iterationStr, 16), // Hex decoding
        tortoisePoint: CURVE.fromHex(tortoisePointHex),
        tortoiseAlpha: BigInt('0x' + tortoiseAlphaStr),
        tortoiseBeta: BigInt('0x' + tortoiseBetaStr),
        harePoint: CURVE.fromHex(harePointHex),
        hareAlpha: BigInt('0x' + hareAlphaStr),
        hareBeta: BigInt('0x' + hareBetaStr),
        Q,
      },
      speed: parseInt(speedStr, 16), // Hex decoding
    };
  } catch (error) {
    console.error('stateFromCompact error:', error);
    return null;
  }
}

/**
 * Convert serializable state back to algorithm state.
 */
export function stateFromSerializable(serializable: PollardRhoState): AlgorithmState | null {
  try {
    const Q = parsePublicKey(serializable.publicKey);
    const tortoiseHex = serializable.tortoise.pointX + serializable.tortoise.pointY;
    const hareHex = serializable.hare.pointX + serializable.hare.pointY;

    return {
      publicKey: serializable.publicKey,
      iteration: serializable.iteration,
      tortoisePoint: CURVE.fromHex(tortoiseHex),
      tortoiseAlpha: BigInt('0x' + serializable.tortoise.alpha),
      tortoiseBeta: BigInt('0x' + serializable.tortoise.beta),
      harePoint: CURVE.fromHex(hareHex),
      hareAlpha: BigInt('0x' + serializable.hare.alpha),
      hareBeta: BigInt('0x' + serializable.hare.beta),
      Q,
    };
  } catch {
    return null;
  }
}

/**
 * Calculate the expected remaining time in years.
 */
export function calculateRemainingTime(
  iteration: number,
  opsPerSecond: number
): { years: number; text: string } {
  // Expected complexity: sqrt(pi*n/2) ≈ 2^126 operations
  const expectedOps = Math.sqrt(Math.PI * Number(n) / 2);
  const remainingOps = expectedOps - iteration;
  const remainingSeconds = remainingOps / opsPerSecond;
  const years = remainingSeconds / 31_557_600; // Seconds in a year

  let text: string;
  if (years < 1_000_000) {
    text = `约 ${years.toFixed(0)} 年`;
  } else if (years < 1e20) {
    const exp = Math.floor(Math.log10(years));
    const mantissa = years / Math.pow(10, exp);
    text = `约 ${mantissa.toFixed(2)} × 10^${exp} 年`;
  } else {
    const exp = Math.floor(Math.log10(years));
    const mantissa = years / Math.pow(10, exp);
    text = `约 ${mantissa.toFixed(2)} × 10^${exp} 年（比宇宙年龄还长！🌌）`;
  }

  return { years, text };
}

/**
 * Format iteration count in scientific notation.
 */
export function formatIteration(iteration: number): string {
  if (iteration < 1_000_000) {
    return iteration.toLocaleString();
  }
  const exp = Math.floor(Math.log10(iteration));
  const mantissa = iteration / Math.pow(10, exp);
  return `${mantissa.toFixed(2)} × 10^${exp}`;
}
