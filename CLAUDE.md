Things: a client-only SvelteKit (Svelte 5 runes, TS, Vite, adapter-static) app for weighing one decision with six frameworks. See README.md.

## Commands

```bash
npm run dev | npm test | npm run check | npm run build
```

All three of `npm test`, `npm run check` and `npm run build` must pass before committing.

## Rules

- `src/lib/core/**` is plain TypeScript with no Svelte imports. All scoring logic lives there and is unit-tested.
- Models are plugins in `src/lib/core/models/` (file + test + entry in `index.ts`). Adding a model must not require changes outside that folder. If a model needs a new kind of input, extend the generic schema (`core/schema.ts` + `components/fields/Fields.svelte`). Don't add model-specific UI.
- `compute()` is pure, returns 0–100 per option on an absolute scale, and returns `null` when there isn't enough input yet.
- Components stay thin. State lives in `src/lib/state.svelte.ts`.
- No runtime dependencies beyond `ss` (bundled at build): no UI component or chart libraries, no network calls. Dev-only: `opentype.js` and `wawoff2` for `npm run logo`.
- Mobile-first (380px), light/dark via `prefers-color-scheme`, native controls, visible focus.
- The UI follows SS, Steve's Style (the `ss` package, github:lotusk08/ss). Read `node_modules/ss/README.md` and `node_modules/ss/skills/ss/SKILL.md` before UI work.
  - Use SS roles and tokens (`--ss-*`), never raw colours, and use its components (`.ss-btn`, `.ss-input`, `.ss-segment`, `.ss-note`, `.ss-swap`, …) unchanged.
  - Hover rules go under `(hover: hover)` on `--ss-dur-hover`/`--ss-ease-hover`. Things that come and go use `.ss-move`.
  - Readable text uses `--ss-tx-2` or stronger (WCAG AA). `--ss-tx-3` is only for placeholders and marks.
  - Icons come from `src/lib/icons.ts` (SS single-file SVGs). Add a name there rather than importing a whole icon set.
  - The logo is generated (`npm run logo`): edit `scripts/logo.js`, not `static/logo.svg`, `static/favicon.svg` or `src/lib/logo.ts`.
  - The title face (Domaine Display Narrow) is commercial. `scripts/fonts.js` fetches it into `static/fonts/` (gitignored) before `dev` and `build`. Never commit font files from stevehoang.com.
