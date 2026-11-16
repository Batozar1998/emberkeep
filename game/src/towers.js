// Towers: what a placed tower is, what it costs to raise one, and how it
// picks and shoots at a target. The world owns the list; this file owns the
// per-tower rules.
import { CELL, TOWERS, upgradeCost } from './config.js';

export function createTower(type, col, row) {
  const def = TOWERS[type];
  return {
    type,
    col,
    row,
    x: (col + 0.5) * CELL,
    y: (row + 0.5) * CELL,
    level: 1,
    invested: def.cost,
    cooldown: 0,
    angle: -Math.PI / 2,
    kills: 0,
  };
}

export function towerStats(tower) {
  return TOWERS[tower.type].levels[tower.level - 1];
}

export function towerRangePx(tower) {
  return towerStats(tower).range * CELL;
}

export function canUpgrade(tower) {
  return tower.level < 3;
}

export function upgradeTower(tower) {
  if (!canUpgrade(tower)) return false;
  tower.invested += upgradeCost(tower.type, tower.level);
  tower.level += 1;
  return true;
}

// The target a tower wants: the enemy furthest along the road that is still
// inside its range. Returns null when nothing is in reach.
export function pickTarget(tower, enemies) {
  const range = towerRangePx(tower);
  let best = null;
  let bestDist = -1;
  for (let i = 0; i < enemies.length; i += 1) {
    const enemy = enemies[i];
    if (enemy.hp <= 0) continue;
    const dx = enemy.x - tower.x;
    const dy = enemy.y - tower.y;
    if (dx * dx + dy * dy > range * range) continue;
    if (enemy.dist > bestDist) {
      bestDist = enemy.dist;
      best = enemy;
    }
  }
  return best;
}

// One tower's tick: cool down, aim, and fire a projectile when ready.
// Returns the projectile it fired, or null.
export function towerTick(tower, dt, enemies, newProjectile) {
  tower.cooldown -= dt;
  if (tower.cooldown > 0) return null;
  const target = pickTarget(tower, enemies);
  if (!target) return null;
  const stats = towerStats(tower);
  tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x);
  tower.cooldown = 1 / stats.rate;
  return newProjectile(tower, target, stats);
}
