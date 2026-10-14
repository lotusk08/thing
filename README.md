<h1><img src="static/logo.svg" alt="Things" height="56"></h1>

Make one hard decision with six classic frameworks. Enter the decision and its options once, switch between models, and compare their estimates side by side on a scoreboard. Each model also has a map: its own classic diagram, drawn from what you entered and edited in place.

Local-first: no backend, no account, no analytics. Everything lives in your browser's `localStorage` (key `things:v1`).

By [Steve Hoang](https://stevehoang.com). Version 1.0.1.

| Model | Estimate (0–100 per option) |
| --- | --- |
| **Six Thinking Hats** | Weighted sum of six 1–5 ratings. Black (risks) is inverted; red and black weights are editable. |
| **Weighted Decision Matrix** | Weighted average of 1–10 scores across 3–7 criteria, mapped 1→0, 10→100. |
| **Pros/Cons + 10-10-10** | `50 + 25·balance + 25·horizon`. Balance = (pros − cons) / (pros + cons) by impact; horizon = mean of the 10 min / 10 months / 10 years feelings ÷ 5. |
| **Pre-mortem** | `100 × Π(1 − L·S/25)` over failure reasons. Each reason is an expected-damage fraction, and they compound. |
| **Fishbone (Ishikawa)** | % of high-impact causes the option resolves. If no cause is high-impact, it falls back to impact-weighted coverage of all causes (low confidence). |
| **Regret / Coin Flip** | Relief rate: your gut sided with the option when you felt relieved that it won or disappointed that it lost (neutral counts half). The 5-year regret answer breaks ties and moves confidence up or down. |

Each model also reports a **lean** (its pick, if there's no tie), a **confidence** (mainly from the gap between the top two options, capped when inputs are thin), and a one-line **summary**.

The **verdict** names the option with the highest average across filled models and how many models agree with it. Confidence is high when 3+ models are filled, ≥75% agree, and the lead is ≥10 points. It is medium with 2+ models, ≥50% agreement, and a lead ≥5. Otherwise it is low. **Copy Markdown** exports the table, the verdict, and each model's summary.

**Demo:** on a blank decision the topbar button reads **Load demo**, with a soft accent sheen drifting through the label to invite a first try (still under reduced motion). It loads one real decision with every model filled in: a senior backend engineer in Thao Dien (Thu Duc), Ho Chi Minh City, weighing a S$9,500-a-month offer from a payments company in Singapore against 60 million VND at home, with parents in Go Vap and a partner who would need a work pass of their own. Singapore leads (avg 65), 4 of 6 models agree, medium confidence; the Matrix and the Pre-mortem side with staying. Once anything is written, the same button reads **New decision**, and it asks before clearing. The figures are public ones as of October 2026 (`src/lib/core/demo.ts` lists them):

- Senior engineer pay: 40–60 million VND a month in HCMC ([ITviec-based guides](https://employsome.sda.company/?p=6791)), S$9,000–15,000 in Singapore ([Second Talent](https://www.secondtalent.com/developer-rate-card/singapore/), [Kaopiz](https://kaopiz.com/en/articles/software-developer-salary-singapore/)).
- Employment Pass minimum for new applicants: S$5,600, rising to S$6,000 in 2027 ([BritCham, Budget 2026](https://britcham.org.sg/news/budget-2026-salary-threshold-new-employment-pass-applicants-be-raised-6000-2027)).
- One-bedroom rent: S$3,300 (transactions, [EdgeProp](https://buddy.edgeprop.sg/discover/what-are-the-typical-monthly-rental-prices-for-a-1-bedroom-condominium-in-affordable-areas-like-8852eee9-df48-4dd8-b7fc-f2b14cad5e95)) to S$4,200 (listings, [Cove](https://blog.cove.sg/cost-to-rent-in-singapore/)) in Singapore; 12–22 million VND in Thao Dien ([AffordWhere](https://affordwhere.com/vietnam/ho-chi-minh/neighborhood/district-2-thao-dien)).
- SGN–SIN: about 2h20m, budget fares around 3 million VND return ([HappyFares](https://www.happyfares.in/flights/ho-chi-minh-city-singapore-cheap-airtickets)); about 20,500 VND to the Singapore dollar ([OFX](https://www.ofx.com/en-us/exchange-rates/sgd-to-vnd/)).

The **map** switch, the first segment of the tab pill, shows each model's map in place of its form and stays on as you switch models. Its icon shows what is on screen: a list for the form, the map icon for the map. Each model is drawn in its framework's own diagram:

| Model | Its map |
| --- | --- |
| Six Thinking Hats | a hexagon radar, one axis per hat in the hat's colour, one shape per option; the black hat is drawn as "few risks", so bigger is better on every axis |
| Weighted Decision Matrix | a heat-map table: criteria down, options across, each cell a flat wash of its option's colour, as strong as its score, showing score × weight, with the weighted score under each option |
| Pros/Cons + 10-10-10 | Franklin's T per option (pros left, cons right, each with its weight) and a balance that tips to the heavier side; under them, a line per option over 10 minutes, months and years (values beside the points for two options, in the legend for more) |
| Pre-mortem | a 5 × 5 risk matrix, likelihood across and severity up, each failure placed as its option's letter and number, then listed worst first |
| Fishbone | an Ishikawa diagram: the problem as the head, six category bones into the spine, each cause a rib with the options that resolve it (dashed if none does) |
| Regret / Coin Flip | each flip a coin showing where it landed, lit by how it felt; how often your gut sided with each option; and the five-year regret answer |

- Tap anything to edit it in a sheet with the same inputs the form uses, or remove a list item. The **+** beside a list adds to it in place: a cause under its bone, a failure for its option.
- It is the same data as the form: an edit on the map shows in the form and the scoreboard at once.
- Each option is a letter on a disc of its colour, no outline (A, B, C…), the same on every map and form.
- On a phone the fishbone turns top to bottom (the head on top, the spine down the left), and the other maps keep their shape at the screen's width.

## Design

The UI is built on **SS, Steve's Style** ([lotusk08/ss](https://github.com/lotusk08/ss), installed as the `ss` package). It uses SS's own tokens, fonts, icons and components and adds no palette of its own.

- **Surface:** Desk, the SS default for working tools: near-white or near-black ground with near-black or near-white ink. There is one accent, blue by day and ember by night, and it marks what you can act on.
- **Charts:** each option has its own SS hue (`.opt-0` … `.opt-4` in `src/app.css`): A the accent, B the other accent (ember by day, blue by night), so two options are always blue against ember, then purple, green and red. Each also has its own dash, so they read apart without colour. The matrix's cells are a flat wash of their option's colour, as strong as the score. What belongs to no option (the risk grid, the fishbone's bones, the scoreboard's meters) takes the accent from light to bold: `--ramp-1` (a wash) to `--ramp-5` (the accent), and `--rise` for a bar. Fills are light washes: shapes faint at the middle and fuller at the edge, the 10-10-10 areas faint at zero. Lines are hairlines. The hats keep their own colours as swatches, since those name the hats.
- **Type:** the decision title and the logo use the SS title face, Domaine Display Narrow regular italic, in the Vietnamese (SVN) cut. Everything else uses the system sans, then Inter Display. Figures use the figure face with tabular digits.
- **Logo:** the wordmark is "Things" in Domaine regular italic. The dot of the *i* is its one bright thing: the SS accent, blue by day and ember by night, like the option you end up choosing. The mark is "T." in the same face; its full stop is the same dot.
  - The glyphs are outlined, so no font ships with the logo.
  - `npm run logo` (`scripts/logo.js`) redraws everything drawn from the face, colours from SS's roles: `static/logo.svg`, `static/favicon.svg` (light and dark), `src/lib/logo.ts` (the paths the top bar uses), the icons (`apple-touch-icon.png`, the mark at 140px on the Desk ground, 180px square; `icon-192.png`, `icon-512.png` and `icon-maskable.png`, inside the safe circle), `manifest.webmanifest`, and the social card `og.png`.
  - The social card is 1200 × 630, kept simple: the wordmark, "One hard decision, six classic frameworks, side by side." in SS's Inter Display, and a radar of two options, A blue and B ember, as the maps draw them. Every glyph is outlined, and the PNGs are drawn from the same paths with resvg, so no font is needed to render them.
- **Title font:** Domaine is commercial, so it is never committed. The build uses the blog's own `svn-domaine-display-narrow-regular-italic.woff2`.
  - `scripts/fonts.js` runs before `dev` and `build` and fetches it from stevehoang.com into `static/fonts/` (gitignored), as SS's own site does. The page preloads it.
  - `SS_PRIVATE_FONTS=<stevehoang.com>/public/assets/fonts` reads it from a local checkout instead.
  - If neither works, the build warns and uses Newsreader italic, the SS fallback.
- **Components** (used as SS ships them):
  - `.ss-topbar` and the `.ss-mode` disc that turns into a crescent (`modeIcon()`, `initMode`/`toggleMode`).
  - `.ss-chip` for options and `.ss-segment` for the model tabs with the map switch first, and choices of up to three states; larger choices use a menu.
  - `.ss-input` underlines, `.ss-check`, `.ss-btn`, and `.ss-note` for each model's estimate (tip/info/warning for high/medium/low confidence).
  - Ratings are wheels (`fields/Scale.svelte`): the numbers on a strip that scrolls sideways and snaps, five in view and fading at both ends, the pick big and bold under a fixed lens in the middle. No borders: the lens is a soft gradient filling toward its foot, lifted by a small shadow in its colour, over a faint glow strongest in the middle of the wheel. Swipe or scroll it, tap a number, or use the arrow keys; under it are native radios. A hairline tick under each number reads like a ruler, fuller as the value grows. The lens is the accent or, in an option's row or column, the option's colour; a two-sided scale (−5…+5) is SS red below zero and SS green above, ticks and lens alike, grey at 0.
  - `.ss-swap` for the map switch (a list icon turns to the map icon), the scoreboard toggle and the copy button (copy turns to a check), `.ss-tip`, `.ss-toast` and `.ss-dot`.
  - The map's sheet is a `<dialog class="ss-pop ss-move up">` (it rises and blurs the page behind).
  - SS line icons, and its solid note icons on the estimates.
- **Layout:** hairlines instead of cards.
- **Motion:**
  - The header rises once on load (`.ss-enter`), and the scoreboard table opens in place (`.ss-move.tall`).
  - Switching models: the tabs' highlight is one pill that slides to the new tab (`--ss-dur-small`, `--ss-ease-out`); on a phone, where the tabs scroll inside the pill, the new tab glides to its middle. The panel fades through, as a View Transition (`src/lib/switch.ts`): the old one out over `--ss-dur-micro`, the new one in over `--ss-dur-enter`. Without View Transitions it switches at once.
  - Turning the map on or off is the same fade: a model's form and its map trade places where they stand, so nothing slides. Loading the demo or starting over fades too.
  - **Load demo** has a soft text shimmer: an accent sheen passes through the label every few seconds (`--ss-ease-hover`); none under reduced motion or forced colours.
  - A list's item comes and goes as SS's `.ss-move.tall.up` (`enter`/`leave` from `ss/motion`): it fades and rises while it opens in place, so the items below make room rather than jump, and closes its gap as it leaves. A new item's words take the focus once it shows.
  - A wheel glides to its pick; the pick grows into place, and its colour eases (red to grey to green across zero) through the registered `--pick` colour.
  - Hovers are the one SS motion and sit under `(hover: hover)`.
  - Under reduced motion nothing moves: the pill jumps, the sheet only fades, an item only fades in and out, a wheel jumps to its pick at its size, and only the fades between screens (and colour) remain.
- **Mode:** follows the system. A choice of the other mode is kept in `localStorage`, as SS does.
- **Contrast:** SS's faint ink (`--ss-tx-3`, 3.2:1) is only used for placeholders and marks. Hints, labels and captions use `--ss-tx-2` so they clear WCAG AA.

## Commands

```bash
npm install
npm run dev       # http://localhost:5173 (fetches the title font first)
npm test          # vitest: every compute(), schema, scoreboard, markdown
npm run check     # svelte-check, strict TS
npm run lint      # ESLint (type-checked TS and Svelte) and knip (unused files, exports, dependencies)
npm run build     # static site in build/, title font included (deploy to any static host)
npm run preview
```

## Deploy

Things deploys to **[thing.stevehoang.com](https://thing.stevehoang.com)** as a Cloudflare Worker named `thing` that serves `build/` as static assets, the same way `ss` and `write` are deployed. `wrangler.jsonc` holds the custom domain (`thing.stevehoang.com`, `custom_domain: true`), so the deploy itself attaches the domain to the stevehoang.com zone.

- **From Git** (Workers & Pages → Create → Import a repository → `lotusk08/thing`):
  - Build command `npm run build`.
  - Deploy command `npx wrangler deploy`.
  - Every push to `main` then redeploys.
- **From a machine:** `npx wrangler login`, then `npm run deploy`.

`static/_headers` gives the hashed `/_app/immutable/*` files a one-year immutable cache and sets `nosniff` and a referrer policy. Unknown paths fall back to the app.

**Search and sharing** (`src/app.html`, static, so a crawler that runs no script reads it): a descriptive title and description, the canonical address, Open Graph and Twitter cards with `og.png` (1200 × 630, with its size and alt), a `WebApplication` JSON-LD block (name, description, the six frameworks, free, by Steve Hoang), the SVG favicon with the PNG icons and `manifest.webmanifest` for a home screen, and `robots.txt` pointing at `sitemap.xml`.

The build downloads the title font from stevehoang.com (see Design), so the build host needs to reach it. Otherwise the title falls back to Newsreader.

## Architecture

```
src/
  app.css, app.html
  routes/+layout.ts            ssr = false, prerender = true (adapter-static, single page)
  routes/+page.svelte          composes the components
  ss.d.ts                      types for the parts of `ss` used (mode, modeIcon)
  lib/
    state.svelte.ts            $state / $derived store, localStorage persistence via $effect
    switch.ts                  switchModel() / switchView(): every switch is one View Transition
    icons.ts                   the SS icons used, from its single-file SVGs
    components/                thin UI on SS classes: header, tabs, panel, map, sheet, scoreboard
      diagrams/                one component per diagram kind, and Mark (an option's letter)
      fields/Fields.svelte     renders ANY inputsSchema (recursive)
      fields/ListInput.svelte
    core/                      plain TS, no Svelte imports
      types.ts                 Decision, Option, Estimate
      schema.ts                field builders, Values<> type inference, normalizeInputs()
      model.ts                 Model interface, defineModel(), lean/confidence helpers
      scoreboard.ts            averages, agreement, verdict
      diagram.ts               the diagram kinds a model's map is drawn as; Ref, Add, slotOf()
      demo.ts                  the demo decision: raw inputs per model, normalized on load
      markdown.ts              Markdown export
      decision.ts              new/parse decision
      testing.ts               test helpers (decision(), run(), seeded rng, randomInputs())
      models/                  one file per model + its test; index.ts is the registry
```

Models are plugins. A model declares its inputs with a small schema, and the UI renders that schema generically, so models ship no UI code. `normalizeInputs()` always hands `compute()` complete, valid, typed inputs, including after options are added or removed and when `localStorage` holds stale data.

```ts
interface Model {
  id: string; name: string; short: string; description: string;
  inputsSchema: Field[];
  compute(decision, inputs): Estimate | null; // null = not enough input yet → empty scoreboard cell
  diagram?(decision, inputs): Diagram;        // its map, from the same inputs
}
```

### Schema fields

| Builder | Value | Renders as |
| --- | --- | --- |
| `field.number(key, label, { min, max, step?, default, ends?, signed?, help? })` | `number` | a wheel for a short range (up to 11 steps: 1–3, 1–5, 1–10, −5…+5, 0–3 in halves shown as ½; `scaleSteps()`), else a slider; a stored value is put on the nearest step |
| `field.text(key, label, { placeholder?, multiline? })` | `string` | one line that wraps and grows (`grow.ts`; Enter submits) / textarea |
| `field.choice(key, label, choices \| (decision) => choices, { default })` | `string` (`''` = unanswered) | pill radio group |
| `field.optionSet(key, label)` | `OptionId[]` | checkbox per decision option |
| `field.hidden(key, default)` | any JSON | nothing (stored only) |
| `field.group(key, label, fields)` | object | fieldset; all scales: a row each, label then scale, shared end words once |
| `field.perOption(key, label, fields)` | `Record<OptionId, …>` | all numbers: one grid, each question once with a row per option; otherwise a column per option |
| `field.list(key, label, fields, { itemLabel, addLabel?, max?, create?, itemTitle? })` | `Array<{ id } & …>` | add/remove list; each item compact: its words full width beside its ×, each other input on a row with its label |

`list.create(ctx)` seeds new items, and it can be random (the coin flip uses it). `list.itemTitle(item, i, decision)` sets each item's heading.

### Maps

A model draws its map with `diagram(decision, inputs)`, a pure function returning one of six kinds (`core/diagram.ts`): `radar`, `matrix`, `weigh`, `risk`, `fishbone` or `coins`. Each kind is drawn by one component in `components/diagrams`, the way each field kind is drawn by `Fields`, so a model ships no map UI.

- Every mark that can be edited carries a `Ref`: the path to it in the model's inputs (with `id` for a list item), the fields the sheet shows, and its title. The sheet binds the same `Fields` the form uses to that place (`slotOf()`).
- Every place that can grow carries an `Add`: the list's path, the list field, any fields set in advance (a cause's category), and whether the list is full.
- `diagram.test.ts` fuzzes every model with random inputs for 2, 3 and 5 options and checks that each `Ref` and `Add` leads back to its inputs.

## How to add a model

You only touch `src/lib/core/models/`.

**1. Create `src/lib/core/models/gut-check.ts`:**

```ts
import { confidenceFromMargin, defineModel, leanOf, marginOf, score100 } from '../model';
import { field } from '../schema';
import { optionLabel } from '../util';

export const gutCheck = defineModel({
  id: 'gut-check',
  name: 'Gut Check',
  short: 'Gut', // scoreboard column
  description: 'Rate how right each option feels right now, without overthinking.',
  inputsSchema: [
    field.perOption('feel', 'How does it feel?', [
      field.number('score', 'Gut feeling', { min: 0, max: 10, default: 5, ends: ['wrong', 'right'] })
    ])
  ],
  // `feel` is inferred as Record<OptionId, { score: number }>
  compute(decision, { feel }) {
    const perOption: Record<string, number> = {};
    for (const o of decision.options) perOption[o.id] = score100((feel[o.id]?.score ?? 5) * 10);
    const lean = leanOf(perOption);
    return {
      model: 'gut-check',
      perOption,
      lean,
      confidence: confidenceFromMargin(marginOf(perOption)),
      summary: lean ? `${optionLabel(decision, lean)} feels most right.` : 'Nothing stands out yet.'
    };
  }
});
```

**2. Test it in `src/lib/core/models/gut-check.test.ts`:**

```ts
import { describe, expect, it } from 'vitest';
import { decision, run } from '../testing';
import { gutCheck } from './gut-check';

describe('gut check', () => {
  it('picks the option that feels right', () => {
    // run() normalizes partial raw inputs the same way the app does
    const e = run(gutCheck, decision('A', 'B'), { feel: { a: { score: 9 }, b: { score: 3 } } })!;
    expect(e.perOption).toEqual({ a: 90, b: 30 });
    expect(e.lean).toBe('a');
  });
});
```

**3. Register it in `src/lib/core/models/index.ts`:**

```ts
export const models = [sixHats, matrix, prosCons, premortem, fishbone, coinFlip, gutCheck];
```

That's it. The model gets a tab, an input panel, a scoreboard column, and a Markdown column. It starts empty in the demo; to fill it there, add its raw inputs under its id in `src/lib/core/demo.ts`. To give it a map, add a `diagram()` that returns one of the diagram kinds (see Maps). It is also covered by `registry.test.ts`, which fuzzes every registered model with random valid inputs for 2, 3, and 5 options and checks the result: one score per option, all in 0–100, a valid lean, and a summary.

Guidelines:

- Return `null` until the inputs say something. A model that hasn't been touched is never computed.
- Normalize to an absolute 0–100 scale, not relative to the other options, so averages across models mean something.
- Use `minConfidence()` to cap confidence when inputs are thin.
- Keep `compute()` pure. Randomness belongs in `list.create()`, which receives an injectable `random`.

## Quality

- `npm run check`: 0 errors, 0 warnings (strict, `noUncheckedIndexedAccess`).
- `npm run lint`: ESLint and knip clean.
- `npm test`: 85 tests across 13 files.
- Lighthouse (mobile, production build): Performance 92–97 (it moves with the machine: about 20 wheels load on the first screen), Accessibility 100, Best Practices 100, SEO 100.
- axe: no violations on any model's form or map (with the demo loaded), or with an item's sheet open (a new one included), at 380px and 1100px, in light and dark.
- Browser checks (Playwright, production build): end to end, motion and reduced motion, the demo, every model's map, each diagram's contents and fishbone geometry, the map's add, edit and remove, keyboard, the phone layout and tab strip, the inputs (the wheel's pick under its lens after a tap, an arrow key or a swipe; red and green either side of zero; the end words spoken; halves as ½; words that wrap and grow; each question once; finger-sized numbers on a touch phone), the shimmer. No console errors or warnings.
- Keyboard: arrow keys, Home and End move through the tabs; every control is native (range, radio, checkbox, button) and has a visible `:focus-visible` ring. Scoreboard cells are buttons that jump to their model.
- Works at 380px wide with no horizontal page scroll. The tabs scroll inside their pill, which keeps the screen's width with the map switch at its start and fades out at whichever end has more tabs past it, and the scoreboard scrolls inside its own container.
