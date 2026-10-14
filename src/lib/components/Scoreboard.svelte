<script lang="ts">
	import { optionLabel } from '$lib/core/util';
	import { NOTES } from '$lib/icons';
	import { store } from '$lib/state.svelte';
	import Icon from './Icon.svelte';

	let { onjump }: { onjump: (modelId: string) => void } = $props();

	let open = $state(matchMedia('(min-width: 40rem)').matches);
	let copied = $state(false);
	let fallback = $state('');
	let toast = $state('');
	let timer: ReturnType<typeof setTimeout> | undefined;

	const verdict = $derived(store.board.verdict);
	const leaderAverage = $derived(store.board.rows.find((r) => r.isLeader)?.average ?? 0);
	const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

	async function copy() {
		const md = store.markdown();
		clearTimeout(timer);
		try {
			await navigator.clipboard.writeText(md);
			fallback = '';
			copied = true;
			timer = setTimeout(() => (copied = false), 2000);
		} catch {
			fallback = md;
			open = true;
			toast = 'Clipboard blocked. Copy the Markdown below.';
			timer = setTimeout(() => (toast = ''), 4000);
		}
	}

	function selectAll(node: HTMLTextAreaElement) {
		node.focus();
		node.select();
	}
</script>

{#snippet score(value: number | null)}
	{#if value === null}
		<span class="none">–</span>
	{:else}
		<span class="num ss-figure">{Math.round(value)}</span>
		<span class="meter"><span style:width="{value}%"></span></span>
	{/if}
{/snippet}

<aside class="board" aria-label="Scoreboard">
	<div class="wrap inner">
		<div class="bar">
			<button
				type="button"
				class="ss-swap toggle"
				aria-expanded={open}
				aria-controls="board-table"
				aria-label="Scoreboard"
				title={open ? 'Hide scoreboard' : 'Show scoreboard'}
				onclick={() => (open = !open)}
			>
				<span data-state="closed" class:on={!open}><Icon name="chevron-up" /></span>
				<span data-state="open" class:on={open}><Icon name="chevron-down" /></span>
			</button>

			<p class="verdict">
				{#if verdict.filled === 0}
					<span class="ss-faint">Fill in any model to see a verdict.</span>
				{:else if verdict.leader}
					<span><strong>{optionLabel(store.decision, verdict.leader)}</strong> leads</span>
					<span class="part"><span class="ss-dot"></span><span class="ss-figure">avg {Math.round(leaderAverage)}</span></span>
					<span class="part"><span class="ss-dot"></span>{verdict.agree} of {plural(verdict.filled, 'model')} agree</span>
					<span class="part confidence"><span class="ss-dot"></span><i class="pip {NOTES[verdict.confidence].type}"></i>{verdict.confidence} confidence</span>
				{:else}
					<span><strong>{verdict.tied.map((id) => optionLabel(store.decision, id)).join(' and ')}</strong> are tied</span>
					<span class="part"><span class="ss-dot"></span>{plural(verdict.filled, 'model')}</span>
				{/if}
			</p>

			<span class="ss-tip">
				<button
					type="button"
					class="ss-swap copy"
					class:status={copied}
					aria-label={copied ? 'Copied' : 'Copy as Markdown'}
					onclick={copy}
				>
					<span data-state="copy" class:on={!copied}><Icon name="copy" /></span>
					<span data-state="done" class:on={copied}><Icon name="check" /></span>
				</button>
				<span role="tooltip">{copied ? 'Copied' : 'Copy as Markdown'}</span>
			</span>
		</div>

		<!-- SS's .ss-move.tall: opens in place and pushes the page; its content is one child. -->
		<div class="ss-move tall body" class:show={open} id="board-table">
			<div>
				<div class="table-wrap">
					<table>
						<caption class="sr-only">Estimate per option (0–100) by model. Select a cell to open that model.</caption>
						<thead>
							<tr>
								<th scope="col" class="opt">Option</th>
								{#each store.models as m (m.id)}
									<th scope="col" title={m.name}>{m.short}</th>
								{/each}
								<th scope="col" class="avg">Avg</th>
							</tr>
						</thead>
						<tbody>
							{#each store.board.rows as row (row.option.id)}
								<tr class:leader={row.isLeader}>
									<th scope="row" class="opt">{row.label}</th>
									{#each row.cells as cell (cell.model.id)}
										<td>
											<button
												type="button"
												class="cell"
												class:lean={cell.isLean}
												aria-label="{cell.model.name}, {row.label}: {cell.value === null
													? 'not filled in yet'
													: `${Math.round(cell.value)} of 100${cell.isLean ? ', this model’s pick' : ''}`}. Open model."
												onclick={() => onjump(cell.model.id)}
											>
												{@render score(cell.value)}
											</button>
										</td>
									{/each}
									<td class="avg">
										{@render score(row.average)}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				{#if fallback}
					<label for="md-fallback" class="sr-only">Markdown export</label>
					<textarea id="md-fallback" class="ss-input md" readonly rows="6" value={fallback} use:selectAll></textarea>
				{/if}
			</div>
		</div>
	</div>
</aside>

{#if toast}
	<div class="ss-toast error" role="alert">{toast}</div>
{/if}

<style>
	.board {
		view-transition-name: board;
		position: sticky;
		z-index: var(--ss-z-bar);
		bottom: 0;
		border-top: var(--ss-hairline) solid var(--ss-ui);
		background: color-mix(in srgb, var(--ss-bg) 88%, transparent);
		-webkit-backdrop-filter: blur(16px) saturate(160%);
		backdrop-filter: blur(16px) saturate(160%);
	}

	.inner {
		padding-block: var(--ss-space-3) calc(var(--ss-space-3) + env(safe-area-inset-bottom, 0px));
	}

	.bar {
		display: flex;
		align-items: center;
		gap: var(--ss-space-3);
	}

	.verdict {
		display: flex;
		flex: 1;
		flex-wrap: wrap;
		align-items: center;
		gap: 0 var(--ss-space-1);
		min-width: 0;
		margin: 0;
		color: var(--ss-tx-2);
		font-size: var(--ss-text-sm);
		line-height: var(--ss-leading-ui);
	}

	.verdict strong {
		color: var(--ss-tx);
		font-weight: 600;
	}

	/* Each separator dot travels with the words after it, so none dangles at a line end. */
	.part {
		display: inline-flex;
		align-items: center;
		white-space: nowrap;
	}

	.confidence .pip {
		margin-right: 6px;
	}

	/* The copy button sits at the right edge: anchor its tooltip (and its growth) there. */
	.ss-tip > [role='tooltip'] {
		right: 0;
		left: auto;
		transform: scale(var(--s, 1));
		transform-origin: calc(100% - 0.875rem) 100%;
	}

	.ss-tip > [role='tooltip']::after {
		right: 0.875rem;
		left: auto;
		transform: translateX(50%);
	}

	.body {
		margin-top: var(--ss-space-3);
	}

	.table-wrap {
		position: relative;
		max-height: min(45vh, 22rem);
		overflow: auto;
		scrollbar-width: thin;
	}

	table {
		width: 100%;
		border-collapse: separate;
		border-spacing: 0;
	}

	th,
	td {
		padding: 0;
		vertical-align: middle;
		border-bottom: var(--ss-hairline) solid var(--ss-ui);
		font-size: var(--ss-text-sm);
		text-align: center;
	}

	thead th {
		position: sticky;
		z-index: 1;
		top: 0;
		padding: 0.35rem 0.4rem;
		border-bottom-color: var(--ss-ui-2);
		background: var(--ss-bg);
		color: var(--ss-tx-2);
		font-size: var(--ss-text-xs);
		font-weight: 500;
		white-space: nowrap;
	}

	.opt {
		position: sticky;
		z-index: 1;
		left: 0;
		max-width: 9rem;
		padding: 0.35rem 0.75rem 0.35rem 0;
		overflow: hidden;
		background: var(--ss-bg);
		color: var(--ss-tx-2);
		font-weight: 500;
		text-align: left;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	thead .opt {
		z-index: 2;
	}

	tr.leader .opt {
		color: var(--ss-tx);
		font-weight: 600;
	}

	.cell {
		display: grid;
		align-content: center;
		justify-items: center;
		gap: 4px;
		width: 100%;
		min-width: 3.5rem;
		min-height: var(--ss-tap-target);
		padding: 0.35rem 0.4rem;
		border: 0;
		border-radius: var(--ss-radius-md);
		background: none;
		color: var(--ss-tx-2);
		cursor: pointer;
		transition: background var(--ss-dur-hover) var(--ss-ease-hover);
	}

	@media (hover: hover) {
		.cell:hover {
			background: var(--ss-ui-3);
		}
	}

	.cell:active {
		background: var(--ss-ui-3);
		transition-duration: 0s;
	}

	.cell.lean {
		color: var(--ss-tx);
	}

	.cell.lean .num {
		font-weight: 700;
	}

	.avg {
		min-width: 3.5rem;
		padding: 0.35rem 0.4rem;
		color: var(--ss-tx);
		font-weight: 600;
	}

	.num {
		display: block;
		line-height: 1.2;
	}

	.none {
		color: var(--ss-tx-2);
	}

	.meter {
		display: block;
		width: 100%;
		max-width: 3rem;
		height: 2px;
		margin-inline: auto;
		overflow: hidden;
		border-radius: 1px;
		background: var(--ss-ui);
	}

	.meter > span {
		display: block;
		height: 100%;
		background: var(--ss-tx-3);
	}

	.avg .meter > span {
		background: var(--ss-tx-2);
	}

	.lean .meter > span,
	tr.leader .avg .meter > span {
		background: var(--ss-tx);
	}

	.md {
		margin-top: var(--ss-space-3);
		font-family: var(--ss-font-mono);
		font-size: var(--ss-text-xs);
	}
</style>
