<script lang="ts">
	import { store } from '$lib/state.svelte';

	let { onjump }: { onjump: (modelId: string) => void } = $props();

	let open = $state(matchMedia('(min-width: 40rem)').matches);
	let status = $state('');
	let fallback = $state('');
	let timer: ReturnType<typeof setTimeout> | undefined;

	const verdict = $derived(store.board.verdict);
	const round = (v: number) => Math.round(v);

	async function copy() {
		const md = store.markdown();
		clearTimeout(timer);
		try {
			await navigator.clipboard.writeText(md);
			fallback = '';
			status = 'Copied as Markdown';
		} catch {
			fallback = md;
			status = 'Clipboard blocked — copy the text below';
			open = true;
		}
		timer = setTimeout(() => (status = ''), 2500);
	}

	function selectAll(node: HTMLTextAreaElement) {
		node.focus();
		node.select();
	}
</script>

<aside class="board" aria-label="Scoreboard">
	<div class="inner">
		<div class="bar">
			<button type="button" class="toggle" aria-expanded={open} aria-controls="board-table" onclick={() => (open = !open)}>
				<svg class="chev" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M2 8l4-4 4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
				Scoreboard
			</button>
			<p class="verdict">
				{#if verdict.filled}<span class="badge" data-level={verdict.confidence}>{verdict.confidence}</span>{/if}
				{verdict.text}
			</p>
			<button type="button" class="copy" onclick={copy}>{status === 'Copied as Markdown' ? 'Copied ✓' : 'Copy Markdown'}</button>
			<span class="sr-only" role="status">{status}</span>
		</div>

		<div class="table-wrap" id="board-table" hidden={!open}>
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
											: `${round(cell.value)} of 100${cell.isLean ? ', this model’s pick' : ''}`}. Open model."
										onclick={() => onjump(cell.model.id)}
									>
										{#if cell.value === null}
											<span class="none">–</span>
										{:else}
											<span class="num">{round(cell.value)}</span>
											<span class="meter"><span style:width="{cell.value}%"></span></span>
										{/if}
									</button>
								</td>
							{/each}
							<td class="avg">
								{#if row.average === null}
									<span class="none">–</span>
								{:else}
									<span class="num">{round(row.average)}</span>
									<span class="meter"><span style:width="{row.average}%"></span></span>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
			{#if fallback}
				<label for="md-fallback" class="sr-only">Markdown export</label>
				<textarea id="md-fallback" readonly rows="6" value={fallback} use:selectAll></textarea>
			{/if}
		</div>
	</div>
</aside>

<style>
	.board {
		position: sticky;
		bottom: 0;
		z-index: 10;
		background: var(--surface);
		border-top: 1px solid var(--border);
		box-shadow: var(--shadow);
	}

	.inner {
		max-width: var(--max);
		margin-inline: auto;
		padding: 0.5rem 1rem calc(0.5rem + env(safe-area-inset-bottom));
	}

	.bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem 0.75rem;
	}

	.toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-weight: 700;
		border-color: transparent;
		background: transparent;
		padding-inline: 0.25rem;
	}

	.chev {
		transition: transform 0.15s;
	}

	[aria-expanded='true'] .chev {
		transform: rotate(180deg);
	}

	.verdict {
		flex: 1 1 14rem;
		order: 3;
		font-size: 0.95rem;
		padding-bottom: 0.25rem;
	}

	@media (min-width: 40rem) {
		.verdict {
			order: 0;
			padding: 0;
		}
	}

	.copy {
		margin-left: auto;
		font-size: 0.9rem;
	}

	.badge {
		display: inline-block;
		margin-right: 0.35rem;
		padding: 0 0.5rem;
		border-radius: 999px;
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		border: 1px solid currentColor;
		vertical-align: 0.1em;
	}

	.badge[data-level='high'] {
		color: var(--good);
	}

	.badge[data-level='medium'] {
		color: var(--warn);
	}

	.badge[data-level='low'] {
		color: var(--bad);
	}

	.table-wrap {
		position: relative;
		overflow: auto;
		max-height: min(45vh, 22rem);
		margin-top: 0.5rem;
		scrollbar-width: thin;
	}

	.table-wrap[hidden] {
		display: none;
	}

	table {
		border-collapse: separate;
		border-spacing: 0;
		width: 100%;
		font-variant-numeric: tabular-nums;
	}

	th,
	td {
		padding: 0;
		text-align: center;
		font-size: 0.85rem;
		border-bottom: 1px solid var(--border);
	}

	thead th {
		position: sticky;
		top: 0;
		z-index: 1;
		background: var(--surface);
		color: var(--muted);
		font-weight: 600;
		padding: 0.3rem 0.4rem;
		white-space: nowrap;
	}

	.opt {
		position: sticky;
		left: 0;
		z-index: 1;
		background: var(--surface);
		text-align: left;
		padding: 0.3rem 0.6rem 0.3rem 0;
		max-width: 9rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-weight: 600;
	}

	thead .opt {
		z-index: 2;
	}

	.cell {
		display: grid;
		justify-items: center;
		gap: 0.2rem;
		width: 100%;
		min-width: 3.5rem;
		min-height: 2.75rem;
		padding: 0.3rem 0.4rem;
		border: 0;
		border-radius: 6px;
		background: transparent;
	}

	.cell:hover {
		background: var(--surface-2);
	}

	.cell.lean .num {
		color: var(--accent);
		font-weight: 800;
	}

	.avg {
		min-width: 3.5rem;
		padding: 0.3rem 0.4rem;
		background: var(--surface-2);
		font-weight: 700;
	}

	tr.leader .opt,
	tr.leader .avg .num {
		color: var(--accent);
	}

	.num {
		display: block;
		font-weight: 600;
	}

	.none {
		color: var(--muted);
	}

	.meter {
		display: block;
		width: 100%;
		max-width: 3.5rem;
		height: 4px;
		margin-inline: auto;
		border-radius: 2px;
		background: var(--surface-2);
		overflow: hidden;
	}

	.avg .meter {
		background: var(--border);
	}

	.meter > span {
		display: block;
		height: 100%;
		background: var(--meter);
	}

	textarea {
		margin-top: 0.5rem;
		font-family: ui-monospace, monospace;
		font-size: 0.8rem;
	}
</style>
