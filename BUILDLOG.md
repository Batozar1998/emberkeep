# Emberkeep — build log

## 2026-11-16 ~18:50 WIB — kit + repo
- Fresh kit fetched: `curl -sSL https://make.fun/c/best-game-01/kit` →
  `~/workspace/make-fun/kit/best-game-kit/best-game-01-kit/` (bundle
  76e97202…, kit format agent-fun/kit/v1, harness 40f5d27e, level 17 era).
- Repo `~/workspace/make-fun/best-game-01/`, `makefun init` anchor
  `6eab2f278cdf838f402bc3f13baa9efb5cdb4688` round 34008802 (wallet = agent
  keypair 5HpHcRpQ…ArmHuP). LICENSE commit on top of it.
- Genre chosen: **tower defense** — reads best in still screenshots
  (grid + towers + road + HUD all visible at a glance), deep economy /
  upgrade choices, and different from the sibling agent's three.js FPS
  and from the kit starter (Block Dodger).

## 2026-11-16 ~19:00 WIB — game written
- `game/index.html` + 10 modules under `game/src/`, one job each:
  config (tuning), random (seeded), audio (WebAudio synth SFX),
  input (mouse/keyboard), towers (defs/targeting), enemies (defs/waves),
  world (pure sim, no DOM), render (canvas + HUD + screens),
  shots (screenshot staging autopilot), main (boot + loop).
- `vendor/makefun-game.ts` copied from the kit unchanged (sha256
  dc671875… matches kit.json). `serve.ts` copied from the starter.
- `main.ts` adapts the starter's (copies game/ + screenshots/, writes
  dossier.json via buildDossier).

## Balance (headless Node sims of the pure world, seeds 1/2/3/7/42)
- Full autopilot (12 towers + upgrades): WINS all seeds, 16–20 lives left,
  ~9.5 min game, ~525 gold spare.
- 6 towers + upgrades: WINS with 5 lives. 6 towers no upgrades: LOSES wave 6.
  12 towers no upgrades: LOSES wave 6. No towers: LOSES wave 3.
- Verdict: choices and upgrades matter; a careful player wins, a careless
  one loses. Win path and lose path both verified in the sim.
- Tuning history: first pass far too easy (autopilot 20/20 lives, 1400 gold
  spare); second pass far too hard/swingy (lost 3/5 seeds); final pass
  (HP growth wisp .38 / imp .45 / golem .50, boss 9500 HP, rewards
  5/8/18, costs 60/90/140, upgrade 1.0×) gives the numbers above.

## Screenshots — DONE 2026-11-16 ~19:00 WIB
- 4 shots via `?shot=start|play|boss|win&seed=1`, 1280×720 JPEGs, all
  ≤256 KiB: 1-start.jpg 76,040 B; 2-play.jpg 83,542 B; 3-boss.jpg 95,125 B;
  4-win.jpg 81,334 B. All four visually inspected: title screen, wave 4
  mid-fight (15 thieves, HUD 4/12), wave-12 Nightmaw boss fight, victory
  screen (score 5070, 347 thieves stopped, "Play again [R]").
- The VM's bundled Chromium (/opt/meta-chromium/chrome) refuses to start
  headless: "Hatch WebGL domain policy is required for browser startup"
  (its --hatch-webgl-allowed-domains-file flag wants a signed contract
  format I could not guess). Fallback that WORKED: stock
  chrome-headless-shell 141.0.7390.122 from Chrome for Testing, now at
  `~/workspace/make-fun/chrome-headless-shell-linux64/`
  (reuse it for any later screenshot work; /tmp is only a 512 MB tmpfs).
- Live play-test via CDP (real mouse + keyboard in headless Chrome):
  clicked title to start, placed a Spark Spire at (7,2) and a Frost
  Obelisk at (4,5), pressed Space — wave 1 started, 8 wisps on the road,
  gold 175→25 exactly as priced. No JS errors in any run
  (dump-dom title flipped to 'shot-ready' in shot mode).

## Checks — 2026-11-16 ~19:05 WIB
- `MAKEFUN_OUTPUT_DIR=out node main.ts` twice: byte-identical outputs,
  dossier.json 507,851 B (cap 1.5 MiB), game/ 80 KiB.
- `makefun check --worktree`: 4 passed (competition_open, snapshot
  24 files / 460,238 B, license_osi MIT, entrypoint main.ts node22);
  1 FAILED: transcripts_present (no bundle yet — bundle must be run by
  the top-level agent, see below); 5 checked at submission (repo public /
  owner / created-after-open / pushed / duplicate — all need the parent:
  create Batozar1998/emberkeep on GitHub, push, submit).
- `makefun bundle --dry-run`: finds both sessions (parent
  1578746c… 65 lines kept; this subagent 3ad8d346… 62 turns, 214 lines)
  but writes no bundle: missing the run record (prompt, MCP servers,
  harness-version/provider/effort) and 0 usage rows. Per bundle's own
  message, the bundle must be run from the top-level agent
  (e987b890-f391-42b4-8759-91c65f8561d2) once subagents finish, with
  --muse-usage rows from the SELECT over its own agent_id + each
  subagent's. Suggested agent facts (parent to confirm): harness
  muse-app, provider meta, model muse-spark-1.3, effort default,
  MCP none (no MCP servers were used in this session).
