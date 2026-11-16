// Enemies: what a thief is, how a wave's march is laid out, and how one walks
// the road. The world owns the list; this file owns the per-enemy rules.
import { CELL, ENEMIES, PATH_CELLS, enemyHp, enemySpeed, waveComposition, waveSpawnInterval } from './config.js';

// Pixel waypoints along the road: cell centres, entered from off the west edge
// and leaving off the east edge, where the Last Lantern stands.
export function roadWaypoints() {
  const points = [{ x: -CELL * 0.6, y: (PATH_CELLS[0][1] + 0.5) * CELL }];
  for (const [col, row] of PATH_CELLS) points.push({ x: (col + 0.5) * CELL, y: (row + 0.5) * CELL });
  const last = PATH_CELLS[PATH_CELLS.length - 1];
  points.push({ x: CELL * 12 + CELL * 0.6, y: (last[1] + 0.5) * CELL });
  return points;
}

export function createEnemy(type, wave, waypoints, wobble) {
  const def = ENEMIES[type];
  return {
    type,
    hp: enemyHp(type, wave),
    maxHp: enemyHp(type, wave),
    speed: enemySpeed(type, wave),
    x: waypoints[0].x,
    y: waypoints[0].y + wobble,
    waypoint: 1,
    dist: 0,
    reward: def.reward,
    livesCost: def.livesCost,
    radius: def.radius,
    slowUntil: 0,
    slowFactor: 0,
    wobblePhase: wobble,
    flash: 0,
  };
}

// The spawn queue for a wave: shuffled groups of thieves, one every interval,
// bosses at the very end so the player sees them coming.
export function buildSpawnQueue(wave, random) {
  const queue = [];
  for (const [type, count] of waveComposition(wave)) {
    if (type === 'brute' || type === 'nightmaw') continue;
    for (let i = 0; i < count; i += 1) queue.push(type);
  }
  for (let i = queue.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random.next() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }
  for (const [type, count] of waveComposition(wave)) {
    if (type === 'brute' || type === 'nightmaw') {
      for (let i = 0; i < count; i += 1) queue.push(type);
    }
  }
  return { types: queue, interval: waveSpawnInterval(wave) };
}

// Walk one enemy toward its next waypoint. Returns 'leaked' when it reaches
// the Lantern's edge, 'dead' never (death is the world's job), else null.
export function enemyTick(enemy, dt, time, waypoints) {
  if (enemy.flash > 0) enemy.flash -= dt;
  const target = waypoints[enemy.waypoint];
  if (!target) return 'leaked';
  let speed = enemy.speed;
  if (time < enemy.slowUntil) speed *= (1 - enemy.slowFactor);
  const dx = target.x - enemy.x;
  const dy = target.y - enemy.y;
  const d = Math.hypot(dx, dy);
  const step = speed * dt;
  if (d <= step) {
    enemy.x = target.x;
    enemy.y = target.y;
    enemy.dist += d;
    enemy.waypoint += 1;
    if (enemy.waypoint >= waypoints.length) return 'leaked';
  } else {
    enemy.x += (dx / d) * step;
    enemy.y += (dy / d) * step;
    enemy.dist += step;
  }
  return null;
}
