// The renderer: every pixel of Emberkeep, drawn on one canvas. The playfield
// on the left (12x9 cells), the HUD and tower shop in the sidebar on the
// right, and the title, pause, victory and defeat screens over the top.
// Nothing here changes the game state; it only paints what the world holds.
import {
  CELL, COLS, ROWS, FIELD_WIDTH, SIDEBAR_X, SIDEBAR_WIDTH, VIEW_WIDTH,
  VIEW_HEIGHT, PATH_CELLS, LANTERN_CELL, TOWERS, TOWER_ORDER, ENEMIES,
  TOTAL_WAVES,
} from './config.js';
import { isPathCell } from './world.js';
import { towerRangePx, towerStats, canUpgrade } from './towers.js';
import { upgradeCost, sellRefund } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const SHOP_Y = 218;
const SHOP_CARD_H = 74;
const WAVE_BUTTON = { x: SIDEBAR_X + 16, y: 600, w: SIDEBAR_WIDTH - 32, h: 52 };

export function shopCardRect(index) {
  return { x: SIDEBAR_X + 16, y: SHOP_Y + index * (SHOP_CARD_H + 8), w: SIDEBAR_WIDTH - 32, h: SHOP_CARD_H };
}
export function waveButtonRect() {
  return WAVE_BUTTON;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawMeadow() {
    const gradient = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
    gradient.addColorStop(0, '#16281c');
    gradient.addColorStop(1, '#0e1a12');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, FIELD_WIDTH, VIEW_HEIGHT);
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        if ((col + row) % 2 === 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.025)';
          ctx.fillRect(col * CELL, row * CELL, CELL, CELL);
        }
      }
    }
    // The road: warm stone tiles.
    for (const [col, row] of PATH_CELLS) {
      ctx.fillStyle = '#5d4a33';
      ctx.fillRect(col * CELL + 2, row * CELL + 2, CELL - 4, CELL - 4);
      ctx.fillStyle = '#6f5a3e';
      ctx.fillRect(col * CELL + 8, row * CELL + 8, CELL - 16, CELL - 16);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.strokeRect(col * CELL + 8, row * CELL + 8, CELL - 16, CELL - 16);
    }
  }

  function drawLantern(state, time) {
    const [col, row] = LANTERN_CELL;
    const x = (col + 0.5) * CELL;
    const y = (row + 0.5) * CELL;
    const pulse = 0.75 + Math.sin(time * 2.2) * 0.25;
    const glow = ctx.createRadialGradient(x, y, 6, x, y, 110 * pulse);
    glow.addColorStop(0, 'rgba(255, 214, 102, 0.55)');
    glow.addColorStop(1, 'rgba(255, 214, 102, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 120, y - 120, 240, 240);
    ctx.fillStyle = '#3a2c18';
    ctx.fillRect(x - 8, y + 6, 16, 34);
    ctx.fillStyle = '#ffd166';
    roundRect(x - 16, y - 26, 32, 36, 6);
    ctx.fill();
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.arc(x, y - 8, 7 + Math.sin(time * 3) * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a2c18';
    ctx.beginPath();
    ctx.moveTo(x - 18, y - 26);
    ctx.lineTo(x, y - 40);
    ctx.lineTo(x + 18, y - 26);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LAST LANTERN', x - 6, y + 58);
  }

  function drawTower(tower, time) {
    const def = TOWERS[tower.type];
    const stats = towerStats(tower);
    ctx.save();
    ctx.translate(tower.x, tower.y);
    ctx.shadowColor = def.glow;
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#2b2118';
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    if (tower.type === 'spire') {
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.moveTo(0, -20);
      ctx.lineTo(13, 8);
      ctx.lineTo(-13, 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.arc(0, -4, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (tower.type === 'frost') {
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.moveTo(0, -22);
      ctx.lineTo(12, 0);
      ctx.lineTo(0, 22);
      ctx.lineTo(-12, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#e0fbfc';
      ctx.beginPath();
      ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.rotate(tower.angle);
      ctx.fillStyle = '#3a2c18';
      roundRect(-6, -7, 34, 14, 5);
      ctx.fill();
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // Level pips.
    for (let i = 0; i < tower.level; i += 1) {
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.arc(tower.x - 12 + i * 12, tower.y + 30, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    void stats;
    void time;
  }

  function drawEnemy(enemy, time) {
    const def = ENEMIES[enemy.type];
    const bob = Math.sin(time * 4 + enemy.wobblePhase) * 2;
    ctx.save();
    ctx.translate(enemy.x, enemy.y + bob);
    ctx.shadowColor = def.glow;
    ctx.shadowBlur = 16;
    if (enemy.type === 'wisp') {
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.arc(-4, -3, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(4, -3, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (enemy.type === 'imp') {
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.moveTo(-9, -8);
      ctx.lineTo(-13, -18);
      ctx.lineTo(-4, -11);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(9, -8);
      ctx.lineTo(13, -18);
      ctx.lineTo(4, -11);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffe66d';
      ctx.beginPath();
      ctx.arc(-4, -2, 2.5, 0, Math.PI * 2);
      ctx.arc(4, -2, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (enemy.type === 'golem') {
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6c757d';
      ctx.beginPath();
      ctx.arc(-6, -6, 5, 0, Math.PI * 2);
      ctx.arc(7, 5, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff4800';
      ctx.beginPath();
      ctx.arc(-5, -2, 2.5, 0, Math.PI * 2);
      ctx.arc(5, -2, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Brute and Nightmaw: big horned shadows with burning eyes.
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a0b2e';
      ctx.beginPath();
      ctx.moveTo(-enemy.radius + 4, -enemy.radius + 10);
      ctx.lineTo(-enemy.radius - 6, -enemy.radius - 12);
      ctx.lineTo(-enemy.radius + 14, -enemy.radius + 2);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(enemy.radius - 4, -enemy.radius + 10);
      ctx.lineTo(enemy.radius + 6, -enemy.radius - 12);
      ctx.lineTo(enemy.radius - 14, -enemy.radius + 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = enemy.type === 'nightmaw' ? '#ffea00' : '#ff6b35';
      ctx.beginPath();
      ctx.arc(-8, -4, 4, 0, Math.PI * 2);
      ctx.arc(8, -4, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    if (enemy.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${Math.min(0.8, enemy.flash * 6)})`;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y + bob, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    // Health bar.
    const w = enemy.radius * 2;
    const ratio = Math.max(0, enemy.hp / enemy.maxHp);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(enemy.x - w / 2, enemy.y - enemy.radius - 10, w, 5);
    ctx.fillStyle = ratio > 0.5 ? '#80ed99' : ratio > 0.25 ? '#ffd166' : '#ef476f';
    ctx.fillRect(enemy.x - w / 2, enemy.y - enemy.radius - 10, w * ratio, 5);
  }

  function drawSidebar(state, ui, time) {
    ctx.fillStyle = '#101c14';
    ctx.fillRect(SIDEBAR_X, 0, SIDEBAR_WIDTH, VIEW_HEIGHT);
    ctx.fillStyle = '#1b2f22';
    ctx.fillRect(SIDEBAR_X, 0, SIDEBAR_WIDTH, 64);
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 26px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText('EMBERKEEP', SIDEBAR_X + 16, 28);
    ctx.fillStyle = '#c9d6c5';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText('Defend the Last Lantern', SIDEBAR_X + 16, 50);

    const stats = [
      ['WAVE', state.wave === 0 ? '—' : `${state.wave} / ${TOTAL_WAVES}`, '#ffd166'],
      ['GOLD', `${state.gold}`, '#ffd166'],
      ['LIVES', `${state.lives}`, state.lives <= 5 ? '#ef476f' : '#80ed99'],
      ['SCORE', `${state.score}`, '#e0fbfc'],
    ];
    stats.forEach(([label, value, color], i) => {
      const x = SIDEBAR_X + 16 + (i % 2) * 152;
      const y = 84 + Math.floor(i / 2) * 52;
      ctx.fillStyle = '#22392a';
      roundRect(x, y, 140, 44, 8);
      ctx.fill();
      ctx.fillStyle = '#8fae97';
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillText(label, x + 10, y + 16);
      ctx.fillStyle = color;
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillText(value, x + 10, y + 37);
    });

    ctx.fillStyle = '#c9d6c5';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText('BUILD  —  click a tower, then a grass tile', SIDEBAR_X + 16, SHOP_Y - 10);
    TOWER_ORDER.forEach((key, index) => {
      const def = TOWERS[key];
      const rect = shopCardRect(index);
      const selected = ui.buildType === key;
      const afford = state.gold >= def.cost;
      ctx.fillStyle = selected ? '#3a2c18' : '#22392a';
      roundRect(rect.x, rect.y, rect.w, rect.h, 10);
      ctx.fill();
      ctx.strokeStyle = selected ? def.color : 'rgba(255,255,255,0.12)';
      ctx.lineWidth = selected ? 2 : 1;
      roundRect(rect.x, rect.y, rect.w, rect.h, 10);
      ctx.stroke();
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.arc(rect.x + 26, rect.y + 26, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText(`${def.name}  [${def.hotkey}]`, rect.x + 48, rect.y + 22);
      ctx.fillStyle = afford ? '#ffd166' : '#ef476f';
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.fillText(`${def.cost} gold`, rect.x + 48, rect.y + 44);
      ctx.fillStyle = '#8fae97';
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillText(def.blurb, rect.x + 48, rect.y + 63);
    });

    // Selected tower panel.
    const sel = ui.selectedTower;
    const panelY = SHOP_Y + 3 * (SHOP_CARD_H + 8) + 8;
    ctx.fillStyle = '#22392a';
    roundRect(SIDEBAR_X + 16, panelY, SIDEBAR_WIDTH - 32, 92, 10);
    ctx.fill();
    if (sel) {
      const def = TOWERS[sel.type];
      const stats = towerStats(sel);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText(`${def.name}  ·  level ${sel.level}`, SIDEBAR_X + 28, panelY + 24);
      ctx.fillStyle = '#c9d6c5';
      ctx.font = '13px system-ui, sans-serif';
      ctx.fillText(`Damage ${stats.damage}   ·   ${stats.rate.toFixed(1)}/s   ·   range ${stats.range}`, SIDEBAR_X + 28, panelY + 46);
      if (canUpgrade(sel)) {
        ctx.fillStyle = state.gold >= upgradeCost(sel.type, sel.level) ? '#ffd166' : '#ef476f';
        ctx.fillText(`[U] Upgrade — ${upgradeCost(sel.type, sel.level)} gold`, SIDEBAR_X + 28, panelY + 68);
      } else {
        ctx.fillStyle = '#80ed99';
        ctx.fillText('Max level reached', SIDEBAR_X + 28, panelY + 68);
      }
      ctx.fillStyle = '#8fae97';
      ctx.fillText(`[X] Sell — ${sellRefund(sel)} gold back`, SIDEBAR_X + 168, panelY + 68);
    } else {
      ctx.fillStyle = '#8fae97';
      ctx.font = '13px system-ui, sans-serif';
      ctx.fillText('Click one of your towers to', SIDEBAR_X + 28, panelY + 30);
      ctx.fillText('upgrade it or sell it.', SIDEBAR_X + 28, panelY + 52);
      ctx.fillText('Grass tiles glow when building.', SIDEBAR_X + 28, panelY + 74);
    }

    // Wave button.
    const btn = WAVE_BUTTON;
    const running = state.waveActive;
    ctx.fillStyle = running ? '#2b3a2f' : '#b45309';
    roundRect(btn.x, btn.y, btn.w, btn.h, 10);
    ctx.fill();
    ctx.fillStyle = running ? '#8fae97' : '#fff7e0';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    if (state.status === 'won' || state.status === 'lost') ctx.fillText('Play again  [R]', btn.x + btn.w / 2, btn.y + 33);
    else if (running) ctx.fillText(`Wave ${state.wave} in progress…  [F] fast`, btn.x + btn.w / 2, btn.y + 33);
    else if (state.wave === 0) ctx.fillText('Start Wave 1  [Space]', btn.x + btn.w / 2, btn.y + 33);
    else if (state.wave >= TOTAL_WAVES) ctx.fillText('All waves cleared!', btn.x + btn.w / 2, btn.y + 33);
    else ctx.fillText(`Start Wave ${state.wave + 1}  [Space]`, btn.x + btn.w / 2, btn.y + 33);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#5f7a66';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('1/2/3 build · U upgrade · X sell · F speed', SIDEBAR_X + 16, 676);
    ctx.fillText('P pause · M mute · R restart', SIDEBAR_X + 16, 694);
    if (state.speed === 2 && state.waveActive) {
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillText('» FAST FORWARD ×2', SIDEBAR_X + 16, 660 - 8);
    }
    void time;
  }

  function drawHover(state, ui, mouse) {
    if (!mouse.inside || mouse.x >= FIELD_WIDTH) return;
    const col = Math.floor(mouse.x / CELL);
    const row = Math.floor(mouse.y / CELL);
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
    if (ui.buildType) {
      const ok = state.status === 'play' && !isPathCell(col, row) && !state.towers.some((t) => t.col === col && t.row === row);
      ctx.fillStyle = ok ? 'rgba(255, 209, 102, 0.25)' : 'rgba(239, 71, 111, 0.25)';
      ctx.fillRect(col * CELL + 2, row * CELL + 2, CELL - 4, CELL - 4);
      const def = TOWERS[ui.buildType];
      ctx.strokeStyle = def.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc((col + 0.5) * CELL, (row + 0.5) * CELL, def.range * CELL, 0, Math.PI * 2);
      ctx.stroke();
    } else if (ui.selectedTower) {
      ctx.strokeStyle = 'rgba(255, 209, 102, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(ui.selectedTower.x, ui.selectedTower.y, towerRangePx(ui.selectedTower), 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawOverlay(title, lines, accent) {
    ctx.fillStyle = 'rgba(6, 12, 8, 0.72)';
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    ctx.fillStyle = accent;
    ctx.font = 'bold 54px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, VIEW_WIDTH / 2, 250);
    ctx.fillStyle = '#e8f0e6';
    ctx.font = '19px system-ui, sans-serif';
    lines.forEach((line, i) => ctx.fillText(line, VIEW_WIDTH / 2, 300 + i * 32));
    ctx.textAlign = 'left';
  }

  return {
    draw(state, screen, ui, mouse, best) {
      const time = state.time;
      drawMeadow();
      drawLantern(state, time);
      for (const tower of state.towers) drawTower(tower, time);
      for (const enemy of state.enemies) drawEnemy(enemy, time);
      for (const projectile of state.projectiles) {
        ctx.fillStyle = TOWERS[projectile.kind].color;
        ctx.shadowColor = TOWERS[projectile.kind].glow;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(projectile.x, projectile.y, projectile.kind === 'cannon' ? 7 : 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      for (const particle of state.particles) {
        ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      for (const float of state.floats) {
        ctx.globalAlpha = Math.max(0, float.life);
        ctx.fillStyle = float.color;
        ctx.font = 'bold 15px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(float.text, float.x, float.y);
      }
      ctx.globalAlpha = 1;
      ctx.textAlign = 'left';
      drawSidebar(state, ui, time);
      if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawHover(state, ui, mouse);
      if (state.waveActive && state.enemies.length > 0) {
        ctx.fillStyle = '#c9d6c5';
        ctx.font = 'bold 14px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`Wave ${state.wave} — ${state.enemies.length} thieves on the road`, 16, 24);
      }
      if (screen === SCREEN_TITLE) {
        drawOverlay('EMBERKEEP', [
          'Night is falling. Ember-thieves march on the Last Lantern.',
          'Build Spark Spires, Frost Obelisks and Ember Cannons on the grass.',
          'Stop all 12 waves — if a thief reaches the Lantern, you lose a life.',
          '',
          'Click or press Enter to begin',
        ], '#ffd166');
      } else if (screen === SCREEN_PAUSED) {
        drawOverlay('PAUSED', ['Press P or click to keep defending.'], '#e0fbfc');
      } else if (screen === SCREEN_OVER && state.status === 'won') {
        drawOverlay('THE LANTERN STILL BURNS', [
          `All 12 waves turned back.  Score ${state.score}  ·  ${state.kills} thieves stopped`,
          `Lives left: ${state.lives}  ·  Gold earned: ${state.earned}  ·  Best: ${best}`,
          '',
          'Press R or click Play again for another night',
        ], '#ffd166');
      } else if (screen === SCREEN_OVER && state.status === 'lost') {
        drawOverlay('THE LIGHT GOES OUT', [
          `The thieves reached the Lantern on wave ${state.wave}.`,
          `Score ${state.score}  ·  ${state.kills} thieves stopped  ·  Best: ${best}`,
          '',
          'Press R or click Play again to try again',
        ], '#ef476f');
      }
    },
  };
}
