# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

「API入国審査局」: a Papers, Please–style browser game that teaches API token validation (JWT claims, signatures and kid, scopes, DPoP, PKCE, key rotation, RBAC/ABAC, FAPI), based on chapters 7, 8 and 10 of 『セキュアAPI』. The player is a new inspector for 6 days and also has to spot the hacker 「ファントム」.

It started as a single self-contained HTML file and was ported to TypeScript + Vite without changing behavior. There is no framework: screens are static markup in `index.html`, and the code fills them with `innerHTML` and toggles `hidden`.

## Commands

- Dev server: `npm run dev` (Vite, port 5173)
- Build (type-checks with `tsc -b`, then bundles to `dist`): `npm run build`
- Lint: `npm run lint` (oxlint)
- No test runner. To check a change, build, run `npx vite preview` and play it (Playwright works headless)

## Structure

```
index.html            # all screen markup (start, notice, game, cine, dialogs, coach)
src/main.ts           # wires listeners and global keyboard input
src/app.ts            # app.state: the running game (null on the title screen)
src/types.ts          # Case (JwtCase | CodeCase), Spec, GameState, ...
src/data/world.ts     # DAYS, TOOLS, FLAWS, CAST, CLIENTS: game rules and balance
src/data/story.ts     # morning briefings, prologue/epilogue, endings
src/data/learn.ts     # 学べること / 本日の学び / tool explanations
src/data/sprites.ts   # 11×8 pixel sprites as SVG paths
src/game/cases.ts     # visitor generation (buildDay, makeCase) and explanations
src/game/flow.ts      # rendering, tools, decide/advance, day start/end, finish, quit
src/game/tutorial.ts  # scripted training cases and the coach overlay
src/ui/               # dialogue, cinematic, learn modal, start screen
src/lib/util.ts       # $, random helpers, SHA-256, diff, localStorage, typeText
src/style.css         # all styles
```

Key data:
- `DAYS`: per-day visitor count, shift seconds, title and summary
- `TOOLS`: inspection tools unlocked by day (LOUPE, SCAN, DPOP, HASH) and their keys
- `FLAWS`: the lies a token or code exchange can contain, with the day they unlock and the HTTP code (400/401/403)
- `ROW_FLAW` in `cases.ts`: which sheet row is the evidence for which flaw

## Conventions

- Colors are CSS variables on `:root`. The booth is intentionally dark in both light and dark mode.
- All domains are fictional (`example.com` / `example.net` / `.org` and lookalikes). Keep it that way.
- Keyboard play must keep working: `A`, `1`–`0`, `P`, `L` `S` `D` `H`, `Enter`, `Esc`.
- `app.state` can become null at any time (quit to title), so re-check it inside `setTimeout` and after `await`.
- Progress and high score live in localStorage (`api-immig-save`, `api-immig-best`). Wrap access in `store`.
