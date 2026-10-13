# Decision Tools

Make one hard decision with six classic frameworks. Enter the decision and its options once, switch between models, and compare their estimates side by side on a scoreboard.

Local-first: no backend, no account, no analytics. Everything lives in your browser's `localStorage` (key `decision-tools:v1`).

| Model | Estimate (0–100 per option) |
| --- | --- |
| **Six Thinking Hats** | Weighted sum of six 1–5 ratings. Black (risks) is inverted; red and black weights are editable. |
| **Weighted Decision Matrix** | Weighted average of 1–10 scores across 3–7 criteria, mapped 1→0, 10→100. |
| **Pros/Cons + 10-10-10** | `50 + 25·balance + 25·horizon`. Balance = (pros − cons) / (pros + cons) by impact; horizon = mean of the 10 min / 10 months / 10 years sliders ÷ 5. |
| **Pre-mortem** | `100 × Π(1 − L·S/25)` over failure reasons. Each reason is an expected-damage fraction, and they compound. |
| **Fishbone (Ishikawa)** | % of high-impact causes the option resolves. If no cause is high-impact, it falls back to impact-weighted coverage of all causes (low confidence). |
| **Regret / Coin Flip** | Relief rate: your gut sided with the option when you felt relieved that it won or disappointed that it lost (neutral counts half). The 5-year regret answer breaks ties and moves confidence up or down. |

Each model also reports a **lean** (its pick, if there's no tie), a **confidence** (mainly from the gap between the top two options, capped when inputs are thin), and a one-line **summary**.

The **verdict** names the option with the highest average across filled models and how many models agree with it. Confidence is high when 3+ models are filled, ≥75% agree, and the lead is ≥10 points. It is medium with 2+ models, ≥50% agreement, and a lead ≥5. Otherwise it is low. **Copy Markdown** exports the table, the verdict, and each model's summary.

## Commands

```bash
npm install
npm run dev       # http://localhost:5173
npm test          # vitest: every compute(), schema, scoreboard, markdown
npm run check     # svelte-check, strict TS
npm run build     # static site in build/ (deploy to any static host)
npm run preview
```

## Architecture

```
src/
  app.css, app.html
  routes/+layout.ts            ssr = false, prerender = true (adapter-static, single page)
  routes/+page.svelte          composes the components
  lib/
    state.svelte.ts            $state / $derived store, localStorage persistence via $effect
    components/                thin UI: header, tabs, panel, scoreboard
      fields/Fields.svelte     renders ANY inputsSchema (recursive)
      fields/ListInput.svelte
    core/                      plain TS, no Svelte imports
      types.ts                 Decision, Option, Estimate
      schema.ts                field builders, Values<> type inference, normalizeInputs()
      model.ts                 Model interface, defineModel(), lean/confidence helpers
      scoreboard.ts            averages, agreement, verdict
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
}
```

### Schema fields

| Builder | Value | Renders as |
| --- | --- | --- |
| `field.number(key, label, { min, max, step?, default, ends?, signed?, help? })` | `number` | slider |
| `field.text(key, label, { placeholder?, multiline? })` | `string` | input / textarea |
| `field.choice(key, label, choices \| (decision) => choices, { default })` | `string` (`''` = unanswered) | pill radio group |
| `field.optionSet(key, label)` | `OptionId[]` | checkbox per decision option |
| `field.hidden(key, default)` | any JSON | nothing (stored only) |
| `field.group(key, label, fields)` | object | fieldset |
| `field.perOption(key, label, fields)` | `Record<OptionId, …>` | one card per option |
| `field.list(key, label, fields, { itemLabel, addLabel?, max?, inline?, create?, itemTitle? })` | `Array<{ id } & …>` | add/remove list |

`list.create(ctx)` seeds new items, and it can be random (the coin flip uses it). `list.itemTitle(item, i, decision)` sets each item's heading.

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

That's it. The model gets a tab, an input panel, a scoreboard column, and a Markdown column. It is also covered by `registry.test.ts`, which fuzzes every registered model with random valid inputs for 2, 3, and 5 options and checks the result: one score per option, all in 0–100, a valid lean, and a summary.

Guidelines:

- Return `null` until the inputs say something. A model that hasn't been touched is never computed.
- Normalize to an absolute 0–100 scale, not relative to the other options, so averages across models mean something.
- Use `minConfidence()` to cap confidence when inputs are thin.
- Keep `compute()` pure. Randomness belongs in `list.create()`, which receives an injectable `random`.

## Quality

- `npm run check`: 0 errors, 0 warnings (strict, `noUncheckedIndexedAccess`).
- `npm test`: 57 tests across 9 files.
- Lighthouse (mobile, production build): Performance 99, Accessibility 100, Best Practices 100, SEO 100.
- Keyboard: arrow keys, Home and End move through the tabs; every control is native (range, radio, checkbox, button) and has a visible `:focus-visible` ring. Scoreboard cells are buttons that jump to their model.
- Works at 380px wide with no horizontal page scroll. The tab bar and scoreboard scroll inside their own containers.
