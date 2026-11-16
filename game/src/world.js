// The world: the whole game state and its rules, with no DOM and no canvas
// in it, so it can be stepped headlessly (tests, screenshots) exactly as it
// plays. Fixed 1/60 s steps. Events pile into state.events for the main loop
// to turn into sound and announcements, then are drained.
import {
  CELL, COLS, ROWS, PATH_CELLS, START_GOLD, START_LIVES, TOTAL_WAVES,
  TOWERS, ENEMIES, waveClearBonus,
} from './config.js';
import { createTower, towerStats, towerTick, upgradeTower, canUpgrade } from './towers.js';
import { buildSpawnQueue, createEnemy, enemyTick, roadWaypoints } from './enemies.js';
import { upgradeCost, sellRefund } from './config.js';

export const EVENT_KILL = 'kill';
export const EVENT_LEAK = 'leak';
export const EVENT_WAVE_CLEAR = 'wave-clear';
export const EVENT_WON = 'won';
export const EVENT_LOST = 'lost';
export const EVENT_WAVE_START = 'wave-start';
export const EVENT_PLACE = 'place';
export const EVENT_UPGRADE = 'upgrade';
export const EVENT_SELL = 'sell';

const pathSet = new Set(PATH_CELLS.map(([c, r]) => `${c},${r}`));
export function isPathCell(col, row) {
  return pathSet.has(`${col},${row}`);
}

export function createWorld(random) {
  const state = {
    random,
    time: 0,
    gold: START_GOLD,
    lives: START_LIVES,
    score: 0,
    kills: 0,
    earned: 0,
    wave: 0,
    waveActive: false,
    spawnQueue: null,
    spawnTimer: 0,
    towers: [],
    enemies: [],
    projectiles: [],
    particles: [],
    floats: [],
    status: 'title', // title | play | won | lost
    speed: 1,
    events: [],
    waypoints: roadWaypoints(),
  };
  return {
    state,
    reset() {
      state.time = 0;
      state.gold = START_GOLD;
      state.lives = START_LIVES;
      state.score = 0;
      state.kills = 0;
      state.earned = 0;
      state.wave = 0;
      state.waveActive = false;
      state.spawnQueue = null;
      state.spawnTimer = 0;
      state.towers = [];
      state.enemies = [];
      state.projectiles = [];
      state.particles = [];
      state.floats = [];
      state.status = 'play';
      state.speed = 1;
      state.events = [];
    },
    towerAt(col, row) {
      return state.towers.find((t) => t.col === col && t.row === row) ?? null;
    },
    canPlace(col, row) {
      if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
      if (isPathCell(col, row)) return false;
      return !this.towerAt(col, row);
    },
    placeTower(type, col, row) {
      const def = TOWERS[type];
      if (!def || state.gold < def.cost || !this.canPlace(col, row)) return false;
      state.gold -= def.cost;
      state.towers.push(createTower(type, col, row));
      state.events.push({ type: EVENT_PLACE });
      return true;
    },
    upgradeSelected(tower) {
      if (!tower || !canUpgrade(tower)) return false;
      const cost = upgradeCost(tower.type, tower.level);
      if (state.gold < cost) return false;
      state.gold -= cost;
      upgradeTower(tower);
      state.events.push({ type: EVENT_UPGRADE });
      return true;
    },
    sellSelected(tower) {
      if (!tower) return false;
      state.gold += sellRefund(tower);
      state.towers = state.towers.filter((t) => t !== tower);
      state.events.push({ type: EVENT_SELL });
      return true;
    },
    startWave() {
      if (state.waveActive || state.wave >= TOTAL_WAVES || state.status !== 'play') return false;
      state.wave += 1;
      state.spawnQueue = buildSpawnQueue(state.wave, state.random);
      state.spawnTimer = 0.5;
      state.waveActive = true;
      state.events.push({ type: EVENT_WAVE_START, wave: state.wave });
      return true;
    },
    step(dt) {
      if (state.status !== 'play') return;
      state.time += dt;

      // Spawn the wave's march, one thief at a time.
      if (state.waveActive && state.spawnQueue) {
        state.spawnTimer -= dt;
        while (state.spawnTimer <= 0 && state.spawnQueue.types.length > 0) {
          const type = state.spawnQueue.types.shift();
          const wobble = state.random.range(-14, 14);
          state.enemies.push(createEnemy(type, state.wave, state.waypoints, wobble));
          state.spawnTimer += state.spawnQueue.interval;
        }
      }

      // Towers shoot.
      for (const tower of state.towers) {
        const projectile = towerTick(tower, dt, state.enemies, (t, target, stats) => {
          const def = TOWERS[t.type];
          return {
            x: t.x, y: t.y - 14,
            target,
            lastX: target.x, lastY: target.y,
            speed: def.projectileSpeed,
            damage: stats.damage,
            splash: stats.splash ?? 0,
            slow: stats.slow ?? 0,
            slowDuration: def.slowDuration ?? 0,
            kind: t.type,
          };
        });
        if (projectile) {
          state.projectiles.push(projectile);
          state.events.push({ type: 'shoot', kind: projectile.kind });
        }
      }

      // Projectiles home in and land.
      for (const projectile of state.projectiles) {
        const target = projectile.target;
        if (target && target.hp > 0) {
          projectile.lastX = target.x;
          projectile.lastY = target.y;
        }
        const dx = projectile.lastX - projectile.x;
        const dy = projectile.lastY - projectile.y;
        const d = Math.hypot(dx, dy);
        const step = projectile.speed * dt;
        if (d <= Math.max(step, 10)) {
          projectile.hit = true;
          this.applyHit(projectile);
        } else {
          projectile.x += (dx / d) * step;
          projectile.y += (dy / d) * step;
        }
      }
      state.projectiles = state.projectiles.filter((p) => !p.hit);

      // Thieves walk; leaks cost lives.
      for (const enemy of state.enemies) {
        const result = enemyTick(enemy, dt, state.time, state.waypoints);
        if (result === 'leaked') {
          enemy.leaked = true;
          state.lives -= enemy.livesCost;
          state.events.push({ type: EVENT_LEAK, lives: enemy.livesCost });
          this.burst(enemy.x - 20, enemy.y, '#ff4800', 14);
        }
      }
      state.enemies = state.enemies.filter((e) => !e.leaked && e.hp > 0);

      // A wave ends when the march is spent and the road is empty.
      if (state.waveActive && state.spawnQueue && state.spawnQueue.types.length === 0 && state.enemies.length === 0) {
        state.waveActive = false;
        const bonus = waveClearBonus(state.wave);
        state.gold += bonus;
        state.earned += bonus;
        state.events.push({ type: EVENT_WAVE_CLEAR, wave: state.wave, bonus });
        if (state.wave >= TOTAL_WAVES) {
          state.status = 'won';
          state.score += state.lives * 100;
          state.events.push({ type: EVENT_WON });
        }
      }

      if (state.lives <= 0) {
        state.lives = 0;
        state.status = 'lost';
        state.events.push({ type: EVENT_LOST });
      }

      // Particles and floating gold text fade out.
      for (const particle of state.particles) {
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.life -= dt;
      }
      state.particles = state.particles.filter((p) => p.life > 0);
      for (const float of state.floats) {
        float.y -= 28 * dt;
        float.life -= dt;
      }
      state.floats = state.floats.filter((f) => f.life > 0);
    },
    applyHit(projectile) {
      const hitEnemies = [];
      if (projectile.splash > 0) {
        const radius = projectile.splash * CELL;
        for (const enemy of state.enemies) {
          const d = Math.hypot(enemy.x - projectile.lastX, enemy.y - projectile.lastY);
          if (d <= radius + enemy.radius) hitEnemies.push(enemy);
        }
      } else if (projectile.target && projectile.target.hp > 0) {
        hitEnemies.push(projectile.target);
      }
      for (const enemy of hitEnemies) {
        enemy.hp -= projectile.damage;
        enemy.flash = 0.12;
        if (projectile.slow > 0) {
          enemy.slowUntil = Math.max(enemy.slowUntil, this.state.time + projectile.slowDuration);
          enemy.slowFactor = Math.max(enemy.slowFactor, projectile.slow);
        }
        if (enemy.hp <= 0) {
          const def = ENEMIES[enemy.type];
          state.gold += def.reward;
          state.earned += def.reward;
          state.score += 10;
          state.kills += 1;
          state.floats.push({ x: enemy.x, y: enemy.y - 10, text: `+${def.reward}`, life: 0.9, color: '#ffd166' });
          this.burst(enemy.x, enemy.y, def.glow, enemy.type === 'nightmaw' ? 40 : 14);
          state.events.push({ type: EVENT_KILL });
        }
      }
      if (hitEnemies.length > 0) state.events.push({ type: 'hit' });
      if (projectile.kind === 'cannon') this.burst(projectile.lastX, projectile.lastY, '#ff6b35', 8);
    },
    burst(x, y, color, count) {
      for (let i = 0; i < count; i += 1) {
        const angle = state.random.next() * Math.PI * 2;
        const speed = state.random.range(30, 160);
        state.particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 30,
          life: state.random.range(0.3, 0.8),
          maxLife: 0.8,
          color,
          size: state.random.range(2, 5),
        });
      }
    },
    // Gold text and embers for the title screen's backdrop.
    ambientEmber() {
      state.particles.push({
        x: state.random.range(0, CELL * COLS),
        y: CELL * ROWS,
        vx: state.random.range(-8, 8),
        vy: state.random.range(-40, -16),
        life: state.random.range(2, 4),
        maxLife: 4,
        color: state.random.pick(['#ffb703', '#ff9f1c', '#ffd166']),
        size: state.random.range(1.5, 3.5),
      });
    },
  };
}
