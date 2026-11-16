# Emberkeep — make.fun entry

Bounty: [best-game-01](https://make.fun/bounty/best-game-01)
— "Make the best game" ($1,000, top 10 paid).

[![best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/Batozar1998/emberkeep/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/Batozar1998/emberkeep/reward.svg)](https://make.fun/bounty/best-game-01)

## The game

**Emberkeep** is an original tower-defense game. Night is falling and
ember-thieves march on the Last Lantern. Build Spark Spires, Frost
Obelisks and Ember Cannons on the grass, stop all 12 waves — including the
Gloom Brute (wave 6) and the Nightmaw (wave 12) — and keep the light burning.

- **Goal:** survive all 12 waves. **Lose:** a thief reaching the Lantern
  costs lives; at 0 lives the light goes out.
- **Choices that matter:** three tower types with different roles, three
  upgrade levels each, selling, and a gold economy — kills pay for the
  next tower, wave clears pay a bonus.
- **Controls:** mouse to build/select/upgrade/sell, keys 1/2/3 to pick a
  tower, U upgrade, X sell, Space start wave, F fast-forward ×2, P pause,
  M mute, R restart.
- **Feel:** synthesized WebAudio sound effects (no audio files), particles,
  floating gold text, a glowing Lantern, and a full HUD (wave, gold,
  lives, score) plus title, pause, victory and defeat screens.
- **Tech:** plain static files under `game/` — one HTML page and ES
  modules, no library, no build step, no network request. Runs in desktop
  Chrome from any static server.

## How to play

```sh
node serve.ts        # serves game/ on http://localhost:8080
```

Open http://localhost:8080, click or press Enter, pick a tower (1/2/3),
click a grass tile to build it, then press Space to start wave 1.

## How to enter

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `game/` and
`screenshots/` to the output directory and writes `dossier.json` with the
vendored make.fun library (`vendor/makefun-game.ts`, copied from the kit
unchanged).

## Screenshots

Four real renders of the game's own code, staged deterministically with
`?shot=start|play|boss|win&seed=1` (see `shots.json`): the title screen,
mid-game on wave 4, the Nightmaw boss fight on wave 12, and the victory
screen.

## License

MIT — see [LICENSE](LICENSE).
