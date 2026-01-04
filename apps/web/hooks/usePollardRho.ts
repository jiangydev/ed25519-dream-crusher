/**
 * Custom hook for executing Pollard's Rho algorithm in chunks.
 *
 * This hook manages the algorithm execution in a way that prevents
 * browser crashes by using requestAnimationFrame to yield control
 * back to the main thread after each chunk of iterations.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  AlgorithmState,
  initializeStateAsync,
  performIterations,
  stateToSerializable,
  stateFromSerializable,
  calculateRemainingTime,
  formatIteration,
} from '@/lib/pollard-rho';
import { generateShareLink as createShareLink } from '@/lib/share';

export type SpeedLevel = 'slow' | 'medium' | 'fast' | 'ultra';

interface SpeedConfig {
  level: SpeedLevel;
  opsPerFrame: number;
  name: string;
}

const SPEED_CONFIGS: Record<SpeedLevel, SpeedConfig> = {
  slow: { level: 'slow', opsPerFrame: 1, name: '慢速' },
  medium: { level: 'medium', opsPerFrame: 100, name: '中速' },
  fast: { level: 'fast', opsPerFrame: 500, name: '快速' },
  ultra: { level: 'ultra', opsPerFrame: 1_000, name: '极快' },
};

export interface LogEntry {
  id: number;
  timestamp: Date;
  iteration: number;
  speed: number;
  remainingTime: string;
  message: string;
}

export interface UsePollardRhoReturn {
  // State
  isRunning: boolean;
  isPaused: boolean;
  iteration: number;
  speed: number; // ops/sec
  speedLevel: SpeedLevel;
  logs: LogEntry[];
  hasFoundKey: boolean;
  privateKey: string | null;

  // Actions
  start: (publicKey: string) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  setSpeedLevel: (level: SpeedLevel) => void;
  generateShareLink: () => string;
  restoreFromState: (data: { state: AlgorithmState; speed: number }) => void;

  // Computed
  formattedIteration: string;
  remainingTime: string;
  progress: number;
}

const STORAGE_KEY = 'pollard-rho-state';
const LOG_INTERVAL = 5000; // 5 seconds
const UI_UPDATE_INTERVAL = 500; // Update UI every 500ms

export function usePollardRho(): UsePollardRhoReturn {
  // Algorithm state - kept in ref to avoid re-renders
  const algorithmStateRef = useRef<AlgorithmState | null>(null);

  // UI state - updated less frequently
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speedLevel, setSpeedLevelState] = useState<SpeedLevel>('medium');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [hasFoundKey, setHasFoundKey] = useState(false);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [uiIteration, setUiIteration] = useState(0);
  const [uiSpeed, setUiSpeed] = useState(0);

  // Performance tracking refs
  const speedRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const fpsRef = useRef<number>(60);
  const lastLogTimeRef = useRef<number>(0);
  const lastUiUpdateRef = useRef<number>(0);
  const logIdCounterRef = useRef<number>(0);
  const speedAccumulatedIterationsRef = useRef<number>(0);
  const speedAccumulatedTimeRef = useRef<number>(0);
  const lastSpeedCalcTimeRef = useRef<number>(0);

  // Refs for animation frame and config
  const requestRef = useRef<number | undefined>(undefined);
  const opsPerFrameRef = useRef<number>(SPEED_CONFIGS.medium.opsPerFrame);
  const isRunningRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  const executeChunkRef = useRef<(() => void) | null>(null);

  // Keep refs in sync
  opsPerFrameRef.current = SPEED_CONFIGS[speedLevel].opsPerFrame;
  isRunningRef.current = isRunning;
  isPausedRef.current = isPaused;

  /**
   * Add a log entry
   */
  const addLog = useCallback((entry: Omit<LogEntry, 'id' | 'timestamp'>) => {
    logIdCounterRef.current += 1;
    const newId = logIdCounterRef.current;
    setLogs(prev => [...prev, { ...entry, id: newId, timestamp: new Date() }]);
  }, []);

  /**
   * Update UI state (called periodically, not every frame)
   */
  const updateUI = useCallback((iteration: number, speed: number) => {
    setUiIteration(iteration);
    setUiSpeed(speed);
  }, []);

  /**
   * Initialize the algorithm with a public key
   */
  const start = useCallback(async (publicKey: string) => {
    try {
      // Use async initialization with timeout protection
      const state = await initializeStateAsync(publicKey, 5000);
      algorithmStateRef.current = state;
      setIsRunning(true);
      setIsPaused(false);
      setHasFoundKey(false);
      setPrivateKey(null);
      setLogs([]);
      setUiIteration(0);
      setUiSpeed(0);
      speedRef.current = 0;
      lastFrameTimeRef.current = performance.now();
      frameCountRef.current = 0;
      fpsRef.current = 60;
      lastLogTimeRef.current = Date.now();
      lastUiUpdateRef.current = Date.now();
      speedAccumulatedIterationsRef.current = 0;
      speedAccumulatedTimeRef.current = 0;
      lastSpeedCalcTimeRef.current = performance.now();

      // Initial log
      addLog({
        iteration: 0,
        speed: 0,
        remainingTime: calculateRemainingTime(0, 1).text,
        message: '🚀 破解已启动！龟龟和兔兔开始冒险～ 🐢🐇',
      });
    } catch (error) {
      console.error('[usePollardRho.start] Error:', error);
      setIsRunning(false);
      addLog({
        iteration: 0,
        speed: 0,
        remainingTime: '未知',
        message: `❌ 错误：${error instanceof Error ? error.message : '未知错误'}`,
      });
    }
  }, [addLog]);

  /**
   * Pause the algorithm
   */
  const pause = useCallback(() => {
    setIsPaused(true);
    if (requestRef.current !== undefined) {
      cancelAnimationFrame(requestRef.current);
    }
    const iteration = algorithmStateRef.current?.iteration ?? 0;
    addLog({
      iteration,
      speed: speedRef.current,
      remainingTime: calculateRemainingTime(iteration, speedRef.current).text,
      message: '⏸️ 已暂停。龟龟和兔兔休息中... 💤',
    });
  }, [addLog]);

  /**
   * Resume the algorithm
   */
  const resume = useCallback(() => {
    setIsPaused(false);
    lastFrameTimeRef.current = performance.now();
    const iteration = algorithmStateRef.current?.iteration ?? 0;
    addLog({
      iteration,
      speed: speedRef.current,
      remainingTime: calculateRemainingTime(iteration, speedRef.current).text,
      message: '▶️ 继续前进！龟龟和兔兔醒来了～ 🐢🐇',
    });
  }, [addLog]);

  /**
   * Reset the algorithm
   */
  const reset = useCallback(() => {
    setIsRunning(false);
    setIsPaused(false);
    algorithmStateRef.current = null;
    setLogs([]);
    setHasFoundKey(false);
    setPrivateKey(null);
    setUiIteration(0);
    setUiSpeed(0);
    speedRef.current = 0;
    logIdCounterRef.current = 0;
    if (requestRef.current !== undefined) {
      cancelAnimationFrame(requestRef.current);
    }
  }, []);

  /**
   * Set speed level
   */
  const setSpeedLevel = useCallback((level: SpeedLevel) => {
    setSpeedLevelState(level);
    opsPerFrameRef.current = SPEED_CONFIGS[level].opsPerFrame;
  }, []);

  /**
   * Generate a shareable link with current algorithm state
   */
  const generateShareLink = useCallback(() => {
    const state = algorithmStateRef.current;
    if (!state) {
      return window.location.href;
    }
    return createShareLink(state, speedRef.current);
  }, []);

  /**
   * Restore algorithm state from a parsed share link
   */
  const restoreFromState = useCallback((data: { state: AlgorithmState; speed: number }) => {
    algorithmStateRef.current = data.state;
    setUiIteration(data.state.iteration);
    setUiSpeed(data.speed);
    speedRef.current = data.speed;
    // Don't auto-start, let user decide
  }, []);

  /**
   * Execute one chunk of iterations
   */
  const executeChunk = useCallback(() => {
    console.log('[executeChunk] Called');
    // Save ref to self for recursive calls
    executeChunkRef.current = executeChunk;

    const running = isRunningRef.current;
    const paused = isPausedRef.current;
    const state = algorithmStateRef.current;

    console.log('[executeChunk] isRunning:', running, 'isPaused:', paused, 'hasState:', !!state);

    if (!state || paused) {
      console.log('[executeChunk] Early return: no state or paused');
      return;
    }

    console.log('[executeChunk] Starting iterations');

    // Perform iterations and measure time
    const startTime = performance.now();
    const result = performIterations(state, opsPerFrameRef.current);
    const endTime = performance.now();
    const elapsed = endTime - startTime;

    console.log('[executeChunk] Iterations completed');
    const newIteration = result.state.iteration;
    const iterationsThisChunk = newIteration - state.iteration;
    console.log('[executeChunk] New iteration:', newIteration, 'iterations this chunk:', iterationsThisChunk);

    // Update algorithm state ref (no re-render)
    algorithmStateRef.current = result.state;

    // Accumulate iterations and time for accurate speed calculation
    speedAccumulatedIterationsRef.current += iterationsThisChunk;
    speedAccumulatedTimeRef.current += elapsed;

    // Calculate speed every 5 seconds using accumulated data
    const timeSinceLastCalc = endTime - lastSpeedCalcTimeRef.current;
    if (timeSinceLastCalc >= 5000) {
      const avgSpeed = Math.round((speedAccumulatedIterationsRef.current / speedAccumulatedTimeRef.current) * 1000);
      speedRef.current = avgSpeed;
      speedAccumulatedIterationsRef.current = 0;
      speedAccumulatedTimeRef.current = 0;
      lastSpeedCalcTimeRef.current = endTime;
    }

    // Calculate FPS (for informational purposes only, no auto-slowdown)
    frameCountRef.current++;
    const timeSinceLastFrame = endTime - lastFrameTimeRef.current;
    if (timeSinceLastFrame >= 1000) {
      fpsRef.current = Math.round((frameCountRef.current * 1000) / timeSinceLastFrame);
      frameCountRef.current = 0;
      lastFrameTimeRef.current = endTime;
    }

    // Check for collision
    if (result.collision && result.privateKey) {
      setHasFoundKey(true);
      setPrivateKey('0x' + result.privateKey.toString(16).padStart(64, '0'));
      setIsRunning(false);
      updateUI(newIteration, speedRef.current);
      addLog({
        iteration: newIteration,
        speed: speedRef.current,
        remainingTime: '0 秒',
        message: `🎉🎉🎉 不可能的事件发生了！你破解了 Ed25519！快去买彩票！🎫`,
      });
      return;
    }

    // Update UI periodically (every 500ms) to avoid excessive re-renders
    const now = Date.now();
    if (now - lastUiUpdateRef.current >= UI_UPDATE_INTERVAL) {
      lastUiUpdateRef.current = now;
      updateUI(newIteration, speedRef.current);
    }

    // Add log every 5 seconds
    if (now - lastLogTimeRef.current >= LOG_INTERVAL) {
      lastLogTimeRef.current = now;
      const remainingTime = calculateRemainingTime(newIteration, speedRef.current);
      addLog({
        iteration: newIteration,
        speed: speedRef.current,
        remainingTime: remainingTime.text,
        message: getRandomTip(newIteration),
      });
    }

    // Schedule next chunk using ref to get latest function
    if (isRunningRef.current && !isPausedRef.current && executeChunkRef.current) {
      requestRef.current = requestAnimationFrame(executeChunkRef.current);
    }
  }, [speedLevel, addLog, updateUI]);

  // Start execution when running
  useEffect(() => {
    console.log('[useEffect] isRunning:', isRunning, 'isPaused:', isPaused, 'hasState:', !!algorithmStateRef.current);
    if (isRunning && !isPaused && algorithmStateRef.current) {
      console.log('[useEffect] Scheduling executeChunk');
      requestRef.current = requestAnimationFrame(executeChunk);
    }
    return () => {
      console.log('[useEffect] Cleanup');
      if (requestRef.current !== undefined) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isRunning, isPaused, executeChunk, speedLevel]);

  // Computed values
  const formattedIteration = formatIteration(uiIteration);
  const { text: remainingTime } = calculateRemainingTime(uiIteration, uiSpeed || 1);
  const progress = (uiIteration / Math.sqrt(Math.PI * Number(0x10000000000000000000000000000000000000000000000000000000000000000n) / 2)) * 100;

  return {
    isRunning,
    isPaused,
    iteration: uiIteration,
    speed: uiSpeed,
    speedLevel,
    logs,
    hasFoundKey,
    privateKey,
    start,
    pause,
    resume,
    reset,
    setSpeedLevel,
    generateShareLink,
    restoreFromState,
    formattedIteration,
    remainingTime,
    progress,
  };
}

/**
 * Get a random tip message based on iteration count
 */
function getRandomTip(iteration: number): string {
  const tips = [
    '💡 小贴士：量子计算机还没出生，别急着等私钥哦～',
    '🌟 宇宙的年龄约 1.38 × 10¹⁰ 年，而你需要的时间比这还长！',
    '☕ 建议去泡杯咖啡，或者干脆睡一觉...',
    '📱 你的手机比超级计算机还慢，但这已经是最快的方案了！',
    '🎮 与其等待，不如去玩局游戏？',
    '🐢 龟龟说："慢慢来，比较快"',
    '🐇 兔兔说："我跑得快，但终点在 2¹²⁶ 步之外"',
    '🔢 科学计数法是人类理解大数的最后希望',
    '💭 现在的你，比任何时候都更理解"指数级复杂度"的含义',
    '🌌 即使是宇宙热寂，这个算法可能还没跑完',
  ];
  const index = Math.floor(Math.random() * tips.length);
  return tips[index];
}
