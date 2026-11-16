// The screenshot scenes behind ?shot=start|play|boss|win. Each one plays the
// real rules forward from a fresh world, steered by a simple autopilot that
// buys towers in a fixed order and upgrades them between waves, so the frame
// is what a real game looks like and the same seed always gives the same frame.
import { STEP, TOTAL_WAVES } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

// Where the autopilot builds, in order: corners and bends where one tower
// covers the most road.
const BUILD_ORDER = [
  ['spire', 7, 2], ['spire', 4, 5], ['frost', 9, 6],
  ['cannon', 2, 2], ['frost', 2, 6], ['cannon', 6, 3],
  ['spire', 10, 6], ['cannon', 4, 3], ['spire', 9, 2],
  ['frost', 6, 6], ['cannon', 5, 2], ['spire', 1, 3],
];

function spendGold(world) {
  const state = world.state;
  for (const [type, col, row] of BUILD_ORDER) {
    if (!world.towerAt(col, row) && world.placeTower(type, col, row)) return true;
  }
  // Then raise what stands: cannons first, then spires, then frost.
  const order = { cannon: 0, spire: 1, frost: 2 };
  const towers = [...state.towers].sort((a, b) => order[a.type] - order[b.type] || a.level - b.level);
  for (const tower of towers) {
    if (world.upgradeSelected(tower)) return true;
  }
  return false;
}

function runSteps(world, seconds) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (world.state.status !== 'play') break;
    while (spendGold(world)) { /* spend everything it can */ }
    if (!world.state.waveActive && world.state.wave < TOTAL_WAVES) world.startWave();
    world.step(STEP);
  }
}

/**
 * Set `world` to the named scene and return the screen to draw over it and
 * the best score to show. Unknown names stage the title.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'start') {
    for (let i = 0; i < 4 / STEP; i += 1) {
      world.ambientEmber();
      for (const p of world.state.particles) { p.y += p.vy * STEP; p.life -= STEP; }
      world.state.particles = world.state.particles.filter((p) => p.life > 0);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'play') {
    // Play to the middle of wave 4: towers up, the road busy, gold and score
    // already moving — the game at its most readable.
    let guard = 0;
    while (world.state.status === 'play' && guard < 3000) {
      runSteps(world, 2);
      guard += 1;
      if (world.state.wave === 4 && world.state.waveActive && world.state.enemies.length >= 5) break;
    }
    runSteps(world, 6);
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'boss') {
    // Fight through to the final wave, then wait until the Nightmaw itself
    // is on the road before taking the frame.
    let guard = 0;
    while (world.state.status === 'play' && world.state.wave < TOTAL_WAVES && guard < 2400) {
      runSteps(world, 5);
      guard += 1;
    }
    guard = 0;
    while (world.state.status === 'play' && guard < 1200
      && !world.state.enemies.some((e) => e.type === 'nightmaw')) {
      runSteps(world, 1);
      guard += 1;
    }
    runSteps(world, 5);
    return { screen: world.state.status === 'play' ? SCREEN_PLAY : SCREEN_OVER, best: world.state.score };
  }
  if (name === 'win') {
    let guard = 0;
    while (world.state.status === 'play' && guard < 4000) {
      runSteps(world, 5);
      guard += 1;
    }
    return { screen: SCREEN_OVER, best: world.state.score };
  }
  return { screen: SCREEN_TITLE, best: 0 };
}
