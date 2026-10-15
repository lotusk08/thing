Things: a client-only SvelteKit (Svelte 5 runes, TS, Vite, adapter-static) app for weighing one decision with six frameworks. See README.md.

## Commands

```bash
npm run dev | npm test | npm run check | npm run lint | npm run build
```

All four of `npm test`, `npm run check`, `npm run lint` (ESLint and knip) and `npm run build` must pass before committing.

Deploys as the Cloudflare Worker `thing` on `thing.stevehoang.com` (`wrangler.jsonc`, static assets from `build/`): `npm run deploy`, or Cloudflare's Git build with `npx wrangler deploy`.

## Rules

- `src/lib/core/**` is plain TypeScript with no Svelte imports. All scoring logic lives there and is unit-tested.
- Models are plugins in `src/lib/core/models/` (file + test + entry in `index.ts`). Adding a model must not require changes outside that folder. If a model needs a new kind of input, extend the generic schema (`core/schema.ts` + `components/fields/Fields.svelte`). Don't add model-specific UI.
- `compute()` is pure, returns 0–100 per option on an absolute scale, and returns `null` when there isn't enough input yet.
- Components stay thin. State lives in `src/lib/state.svelte.ts`.
- The UI switches models, and each model's form or map, with `switchModel()` / `switchView()` (`src/lib/switch.ts`), never by setting `store.active` or `store.view`: they run the View Transition. The map switch is the first segment of the tab pill, its icon the view on screen (a list for the form, the map icon for the map), and stays on across models. The pill never outgrows the screen: on a phone the tabs scroll inside it, fade at an end with more past it, and a new selection glides to their middle.
- A model's map is its `diagram()`: pure, returning one of the generic kinds in `core/diagram.ts` (radar, matrix, weigh, risk, fishbone, coins), each drawn by one component in `components/diagrams`. No model-specific map UI. Editable marks carry a `Ref` and growable lists an `Add`, so the sheet edits the same inputs the form does; `diagram.test.ts` checks every one resolves.
- Chart colours live in `app.css`. Each option has its own SS hue, with a dash (`.opt-0`…`.opt-4`: the accent, `--accent-other`, purple, green, red), and whatever is an option's (a matrix column, a radar shape, a line) is drawn in it. What belongs to no option takes the accent light to bold (`--ramp-1`…`--ramp-5`, `--rise`). Fills stay light washes; lines are hairlines. No other chart colours; the hats' swatches only name the hats.
- Inputs stay generic. A short range (up to 11 steps, halves included; values snap to a step) is a wheel (`scaleSteps()` in `core/schema.ts`, `fields/Scale.svelte`: native radios on a snapping strip, the pick under a lens; a two-sided scale red below zero and green above), and a group of scales is a row each; a one-line text wraps and grows (`grow.ts`); numbers rated per option are one grid with a row per option; a list's items are compact (`Fields` `compact`).
- The demo (`core/demo.ts`) is raw inputs per model id, normalized on load, so a model needs no demo to work; `demo.test.ts` pins its verdict. The topbar button offers it only while the decision is blank (`store.blank`).
- Styles more than one component uses (segment buttons, the remove button, the option colours and badges, the chart ramp, the wheel's size) live in `src/app.css`.
- No runtime dependencies beyond `ss` (bundled at build): no UI component or chart libraries, no network calls. Dev-only: `opentype.js`, `wawoff2` and `@resvg/resvg-js` for `npm run logo`; ESLint and knip for `npm run lint`.
- Mobile-first (380px), light/dark via `prefers-color-scheme`, native controls, visible focus.
- The UI follows SS, Simple Style (the `ss` package, github:lotusk08/ss). Read `node_modules/ss/README.md` and `node_modules/ss/skills/ss/SKILL.md` before UI work.
  - Use SS roles and tokens (`--ss-*`), never raw colours, and use its components (`.ss-btn`, `.ss-input`, `.ss-segment`, `.ss-note`, `.ss-swap`, …) unchanged.
  - Hover rules go under `(hover: hover)` on `--ss-dur-hover`/`--ss-ease-hover`. Things that come and go use `.ss-move`.
  - Readable text uses `--ss-tx-2` or stronger (WCAG AA). `--ss-tx-3` is only for placeholders and marks.
  - Icons come from `src/lib/icons.ts` (SS single-file SVGs). Add a name there rather than importing a whole icon set.
  - The logo, icons, manifest and social card are generated (`npm run logo`): edit `scripts/logo.js`, not `static/logo.svg`, `static/favicon.svg`, the `static/*.png`, `static/manifest.webmanifest` or `src/lib/logo.ts`. The head's SEO (title, Open Graph, Twitter, JSON-LD) is static in `src/app.html`; keep its names in step with the models.
  - The title face (Domaine Display Narrow) is commercial. `scripts/fonts.js` fetches it into `static/fonts/` (gitignored) before `dev` and `build`. Never commit font files from stevehoang.com.
