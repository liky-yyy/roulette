let state = 0x6d2b79f5;
let activeSeed = 'default';
let visualState = 1;
const nativeRandom = Math.random.bind(Math);

function hashSeed(seed: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0 || 0x6d2b79f5;
}

export function setRandomSeed(seed: string) {
  activeSeed = seed || 'default';
  state = hashSeed(activeSeed);
}

export function getRandomSeed() {
  return activeSeed;
}

export function setVisualSeed(seed: string) {
  visualState = hashSeed(`${seed}:visual`);
}

/** 시각 효과가 물리 난수열을 소비하지 않도록 별도 난수열을 쓴다. */
export function visualRandom(): number {
  visualState = (Math.imul(visualState, 1664525) + 1013904223) >>> 0;
  return visualState / 4294967296;
}

/** Mulberry32: deterministic PRNG, returns [0, 1). */
export function random(): number {
  state = (state + 0x6d2b79f5) >>> 0;
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * The original project uses Math.random in physics, skills and effects.
 * Installing the seeded stream here makes those calls reproducible too.
 */
export function installSeededMathRandom() {
  Math.random = random;
}

export function restoreNativeMathRandom() {
  Math.random = nativeRandom;
}

export function createSeed(): string {
  if (globalThis.crypto?.getRandomValues) {
    const values = new Uint32Array(2);
    globalThis.crypto.getRandomValues(values);
    return `${values[0].toString(36)}${values[1].toString(36)}`;
  }
  return `${Date.now().toString(36)}-${Math.floor(nativeRandom() * 0xffffffff).toString(36)}`;
}
