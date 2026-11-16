// Emberkeep: tuning for every number the game runs on. One place to balance the
// whole game: the grid and the path, the three towers, the five enemies, the
// twelve waves and the economy. Nothing here touches the DOM or the canvas.
export const VIEW_WIDTH = 1280;
export const VIEW_HEIGHT = 720;
export const COLS = 12;
export const ROWS = 9;
export const CELL = 80;
export const FIELD_WIDTH = COLS * CELL; // 960: the playfield; the sidebar takes the rest
export const SIDEBAR_X = FIELD_WIDTH;
export const SIDEBAR_WIDTH = VIEW_WIDTH - FIELD_WIDTH;

export const START_GOLD = 175;
export const START_LIVES = 20;
export const TOTAL_WAVES = 12;
export const STEP = 1 / 60;
export const BEST_KEY = 'emberkeep-best';

// The road the ember-thieves walk, in grid cells, from the west gate to the
// Last Lantern at the east edge. Enemies spawn just off the left edge at the
// first cell's centre and leak off the right edge at the last one's.
export const PATH_CELLS = [
  [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1],
  [8, 2], [8, 3], [8, 4], [7, 4], [6, 4], [5, 4], [4, 4], [3, 4],
  [3, 5], [3, 6], [3, 7], [4, 7], [5, 7], [6, 7], [7, 7], [8, 7], [9, 7],
  [10, 7], [11, 7],
];
export const LANTERN_CELL = [11, 7];

// A tower type: what it costs, how far it reaches (in cells), how hard and how
// often it hits, and what it grows into. Level is 1..3; upgradeCost(level) is
// what level -> level + 1 costs.
export const TOWERS = {
  spire: {
    key: 'spire', name: 'Spark Spire', hotkey: '1', cost: 60,
    range: 2.3, damage: 9, rate: 2.4, projectileSpeed: 620,
    color: '#ffd166', glow: '#ff9f1c',
    blurb: 'Fast sparks. Cheap and quick.',
    levels: [
      { damage: 9, rate: 2.4, range: 2.3 },
      { damage: 15, rate: 2.8, range: 2.5 },
      { damage: 24, rate: 3.4, range: 2.7 },
    ],
  },
  frost: {
    key: 'frost', name: 'Frost Obelisk', hotkey: '2', cost: 90,
    range: 2.1, damage: 4, rate: 1.1, projectileSpeed: 480,
    color: '#8ecae6', glow: '#48cae4',
    blurb: 'Chills thieves, slowing them.',
    slow: 0.45, slowDuration: 1.6,
    levels: [
      { damage: 4, rate: 1.1, range: 2.1, slow: 0.45 },
      { damage: 8, rate: 1.2, range: 2.3, slow: 0.55 },
      { damage: 14, rate: 1.4, range: 2.5, slow: 0.65 },
    ],
  },
  cannon: {
    key: 'cannon', name: 'Ember Cannon', hotkey: '3', cost: 140,
    range: 2.6, damage: 32, rate: 0.7, projectileSpeed: 420,
    color: '#ff6b35', glow: '#ff4800',
    blurb: 'Slow, heavy, hits a crowd.',
    splash: 0.9,
    levels: [
      { damage: 32, rate: 0.7, range: 2.6, splash: 0.9 },
      { damage: 58, rate: 0.75, range: 2.8, splash: 1.1 },
      { damage: 100, rate: 0.8, range: 3.0, splash: 1.35 },
    ],
  },
};
export const TOWER_ORDER = ['spire', 'frost', 'cannon'];
export function upgradeCost(type, level) {
  return Math.round(TOWERS[type].cost * 1.0 * level);
}
export function sellRefund(tower) {
  return Math.floor(tower.invested * 0.7);
}

// An enemy type: health and speed grow with the wave, the reward pays for the
// next tower, and livesCost is what the Lantern loses when one slips through.
export const ENEMIES = {
  wisp: {
    key: 'wisp', name: 'Ember Wisp', hp: 34, hpGrowth: 0.38, speed: 66,
    reward: 5, livesCost: 1, radius: 13, color: '#ffb703', glow: '#fb8500',
  },
  imp: {
    key: 'imp', name: 'Cinder Imp', hp: 68, hpGrowth: 0.45, speed: 92,
    reward: 8, livesCost: 1, radius: 12, color: '#ef476f', glow: '#d90429',
  },
  golem: {
    key: 'golem', name: 'Stone Golem', hp: 250, hpGrowth: 0.5, speed: 40,
    reward: 18, livesCost: 2, radius: 18, color: '#adb5bd', glow: '#6c757d',
  },
  brute: {
    key: 'brute', name: 'Gloom Brute', hp: 2200, hpGrowth: 0, speed: 32,
    reward: 120, livesCost: 5, radius: 24, color: '#9d4edd', glow: '#7b2cbf',
  },
  nightmaw: {
    key: 'nightmaw', name: 'Nightmaw', hp: 9500, hpGrowth: 0, speed: 30,
    reward: 400, livesCost: 10, radius: 30, color: '#5a189a', glow: '#3c096c',
  },
};

export function enemyHp(type, wave) {
  const def = ENEMIES[type];
  return Math.round(def.hp * (1 + def.hpGrowth * (wave - 1)));
}
export function enemySpeed(type, wave) {
  const def = ENEMIES[type];
  return def.speed * (1 + Math.min(0.25, 0.02 * (wave - 1)));
}

// What marches in each wave: a list of [type, count] plus the bosses.
export function waveComposition(wave) {
  const list = [['wisp', 6 + wave * 2]];
  if (wave >= 3) list.push(['imp', 1 + wave]);
  if (wave >= 5) list.push(['golem', Math.floor(wave / 2)]);
  if (wave === 6) list.push(['brute', 1]);
  if (wave === 9) list.push(['brute', 1]);
  if (wave === 12) list.push(['nightmaw', 1]);
  return list;
}
export function waveSpawnInterval(wave) {
  return Math.max(0.3, 0.75 - wave * 0.04);
}
export function waveClearBonus(wave) {
  return 20 + wave * 4;
}
