// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (doubled at fast-forward speed), and the renderer paints
// what is there. The game moves between four screens: title, play, paused
// and game over.
//
// ?seed=N fixes the random pattern. ?shot=start|play|boss|win (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady (and the document title) for a screenshot.
import { BEST_KEY, CELL, COLS, ROWS, FIELD_WIDTH, STEP, TOWERS, TOWER_ORDER } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_KILL, EVENT_LEAK, EVENT_LOST, EVENT_WAVE_CLEAR, EVENT_WAVE_START, EVENT_WON } from './world.js';
import { createAudio } from './audio.js';
import { ACTION_CONFIRM, ACTION_DESELECT, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, ACTION_SELL, ACTION_SPEED, ACTION_UPGRADE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, shopCardRect, waveButtonRect } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, { buildType: null, selectedTower: null }, { x: -1, y: -1, inside: false }, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else {
      window.__shotReady = true;
      document.title = 'shot-ready';
    }
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let ui = { buildType: null, selectedTower: null };
  let accumulator = 0;
  let last = performance.now();
  let lastShootSound = 0;

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    ui = { buildType: null, selectedTower: null };
    screen = SCREEN_PLAY;
    announce('Playing. Defend the Last Lantern through 12 waves.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(world.state.status === 'won'
      ? `Victory. Score ${world.state.score}. Best ${best}.`
      : `The light goes out on wave ${world.state.wave}. Score ${world.state.score}. Best ${best}.`);
  }

  function handleEvents() {
    for (const event of world.state.events) {
      if (event.type === 'shoot') {
        const now = performance.now();
        if (now - lastShootSound > 70) {
          audio.shoot(event.kind);
          lastShootSound = now;
        }
      } else if (event.type === 'hit') audio.hit();
      else if (event.type === EVENT_KILL) audio.kill();
      else if (event.type === EVENT_LEAK) { audio.leak(); announce(`A thief reached the Lantern. ${world.state.lives} lives left.`); }
      else if (event.type === EVENT_WAVE_START) { audio.horn(); announce(`Wave ${event.wave} begins.`); }
      else if (event.type === EVENT_WAVE_CLEAR) { audio.waveClear(); announce(`Wave ${event.wave} cleared. Bonus ${event.bonus} gold.`); }
      else if (event.type === EVENT_WON) { audio.victory(); endGame(); }
      else if (event.type === EVENT_LOST) { audio.defeat(); endGame(); }
    }
    world.state.events.length = 0;
  }

  function inRect(x, y, rect) {
    return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
  }

  function handleClick(click) {
    audio.unlock();
    if (screen === SCREEN_TITLE) { startGame(); return; }
    if (screen === SCREEN_OVER) {
      if (inRect(click.x, click.y, waveButtonRect())) startGame();
      return;
    }
    if (screen === SCREEN_PAUSED) { screen = SCREEN_PLAY; return; }
    // Sidebar: the shop cards.
    for (let i = 0; i < TOWER_ORDER.length; i += 1) {
      if (inRect(click.x, click.y, shopCardRect(i))) {
        const key = TOWER_ORDER[i];
        ui.buildType = ui.buildType === key ? null : key;
        ui.selectedTower = null;
        audio.unlock();
        return;
      }
    }
    // Sidebar: the wave button.
    if (inRect(click.x, click.y, waveButtonRect())) {
      if (!world.state.waveActive) world.startWave();
      return;
    }
    // Field.
    if (click.x < FIELD_WIDTH) {
      const col = Math.floor(click.x / CELL);
      const row = Math.floor(click.y / CELL);
      if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
      if (ui.buildType) {
        if (world.placeTower(ui.buildType, col, row)) {
          audio.place();
          ui.buildType = null;
        } else {
          audio.error();
        }
        return;
      }
      const tower = world.towerAt(col, row);
      ui.selectedTower = tower;
    } else {
      ui.selectedTower = null;
    }
  }

  function handleAction(action) {
    if (action === ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
      return;
    }
    if (action === ACTION_RESTART) {
      if (screen !== SCREEN_TITLE) startGame();
      return;
    }
    if (screen === SCREEN_TITLE) {
      if (action === ACTION_CONFIRM) { audio.unlock(); startGame(); }
      return;
    }
    if (screen === SCREEN_OVER) {
      if (action === ACTION_CONFIRM) startGame();
      return;
    }
    if (action === ACTION_PAUSE) {
      screen = screen === SCREEN_PAUSED ? SCREEN_PLAY : SCREEN_PAUSED;
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    if (action === ACTION_SPEED) {
      world.state.speed = world.state.speed === 1 ? 2 : 1;
      return;
    }
    if (action === ACTION_CONFIRM) {
      audio.unlock();
      if (!world.state.waveActive) world.startWave();
      else world.state.speed = world.state.speed === 1 ? 2 : 1;
      return;
    }
    if (action === ACTION_UPGRADE && ui.selectedTower) {
      if (world.upgradeSelected(ui.selectedTower)) audio.place();
      else audio.error();
      return;
    }
    if (action === ACTION_SELL && ui.selectedTower) {
      if (world.sellSelected(ui.selectedTower)) { audio.coin(); ui.selectedTower = null; }
      return;
    }
    if (action === ACTION_DESELECT) {
      ui.buildType = null;
      ui.selectedTower = null;
      return;
    }
    if (typeof action === 'string' && action.startsWith('tower-')) {
      const key = action.slice('tower-'.length);
      if (TOWERS[key]) {
        ui.buildType = ui.buildType === key ? null : key;
        ui.selectedTower = null;
      }
    }
  }

  function frame(now) {
    const elapsed = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    for (const action of input.takePressed()) handleAction(action);
    for (const click of input.takeClicks()) handleClick(click);
    if (screen === SCREEN_PLAY) {
      accumulator += elapsed * world.state.speed;
      while (accumulator >= STEP) {
        world.step(STEP);
        accumulator -= STEP;
        if (world.state.status !== 'play') break;
      }
      handleEvents();
      if (world.state.status !== 'play' && screen === SCREEN_PLAY) endGame();
    }
    renderer.draw(world.state, screen, ui, input.mouse, best);
    requestAnimationFrame(frame);
  }

  announce('Emberkeep. Defend the Last Lantern through 12 waves. Click or press Enter to begin.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
