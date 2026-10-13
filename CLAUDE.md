Decision Tools: a client-only SvelteKit (Svelte 5 runes, TS, Vite, adapter-static) app for weighing one decision with six frameworks. See README.md.

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
- No runtime dependencies, UI libraries, chart libraries, or network calls.
- Mobile-first (380px), light/dark via `prefers-color-scheme`, native controls, visible focus.
