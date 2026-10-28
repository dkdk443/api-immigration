# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

「API入国審査局」: a Papers, Please–style browser game that teaches API token validation (JWT claims, signatures and kid, scopes, DPoP, PKCE, key rotation, RBAC/ABAC, FAPI), based on chapters 7, 8 and 10 of 『セキュアAPI』. The player is a new inspector for 6 days and also has to spot the hacker 「ファントム」.

## Structure

Everything is in `index.html`: inline CSS, markup and one inline `<script>`. There is no build step, package manager or test runner. Only Google Fonts (DotGothic16, M PLUS 1 Code) are loaded externally.

Key data at the top of the script:
- `DAYS`: per-day visitor count, shift seconds, title and summary
- `TOOLS`: inspection tools unlocked by day (LOUPE, SCAN, DPOP, HASH) and their keys
- `FLAWS`: the lies a token or code exchange can contain, with the day they unlock and the HTTP code (400/401/403)
- `CAST`, `CLIENTS`, `SP`: characters, visitor clients and pixel sprites (SVG paths on an 11×8 grid)

## Conventions

- Colors are CSS variables on `:root`. The booth is intentionally dark in both light and dark mode.
- All domains are fictional (`example.com` / `example.net` / `.org` and lookalikes). Keep it that way.
- Keyboard play must keep working: `A`, `1`–`0`, `P`, `L` `S` `D` `H`, `Enter`, `Esc`.
- To try it locally, open `index.html` in a browser or serve the folder statically.
