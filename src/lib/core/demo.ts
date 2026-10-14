/**
 * The demo: one real decision, filled in across every model.
 *
 * A senior backend engineer in Thao Dien (Thu Duc), Ho Chi Minh City, has an offer
 * from a payments company in Singapore. The figures are public ones as of October
 * 2026: senior engineer pay of 40–60 million VND a month in HCMC and S$9,000–15,000
 * in Singapore; a one-bedroom condo in Singapore at S$3,300 (transactions) to
 * S$4,200 (listings) a month, and 12–22 million VND in Thao Dien; the Employment
 * Pass minimum of S$5,600 for new applicants (S$6,000 from 2027); a Dependant Pass
 * holder needing a work pass of their own to work; SGN–SIN at about 2h20m, around
 * 3 million VND return on budget airlines; about 20,500 VND to the Singapore dollar.
 *
 * Inputs are raw, keyed by model id, and normalized on load like stored data, so a
 * model that changes its schema still loads, and a model added later starts empty.
 */
import { newDecision, newOption } from './decision';
import type { Decision, ModelId } from './types';

export function demo(now = Date.now()): { decision: Decision; inputs: Record<ModelId, unknown> } {
	const sg = newOption('Singapore');
	const hcm = newOption('Stay in HCMC');
	const [S, H] = [sg.id, hcm.id];
	const decision: Decision = {
		...newDecision(now),
		title: 'Take the job in Singapore?',
		options: [sg, hcm],
		notes:
			'Senior backend engineer, 7 years in, living in Thao Dien (Thu Duc). Offer: S$9,500 a month (about 195 million VND) ' +
			'at a payments company in Singapore, with an Employment Pass (new applicants need at least S$5,600). Now: 60 million VND a month. ' +
			'A one-bedroom condo in Singapore rents for S$3,300–4,200; ours here is 15 million VND. ' +
			'Partner teaches English in Thu Duc and would need a work pass of their own to work there. ' +
			'Parents live in Go Vap, both past 60. HCMC to Singapore is a 2h20m flight, around 3 million VND return on a budget airline. ' +
			'Answer due 31 October.'
	};

	const flip = (heads: string, tails: string, landed: string, reaction: string) => ({ heads, tails, landed, reaction });

	return {
		decision,
		inputs: {
			'six-hats': {
				weights: { red: 1, black: 1.5 },
				hats: {
					[S]: { white: 4, red: 4, black: 3, yellow: 5, green: 4, blue: 3 },
					[H]: { white: 3, red: 3, black: 2, yellow: 2, green: 2, blue: 4 }
				}
			},
			matrix: {
				criteria: [
					{ name: 'Savings after rent', weight: 9, scores: { [S]: { score: 9 }, [H]: { score: 5 } } },
					{ name: 'Career growth', weight: 8, scores: { [S]: { score: 9 }, [H]: { score: 4 } } },
					{ name: 'Near my parents', weight: 8, scores: { [S]: { score: 3 }, [H]: { score: 10 } } },
					{ name: 'Partner’s work', weight: 7, scores: { [S]: { score: 3 }, [H]: { score: 9 } } },
					{ name: 'Everyday life', weight: 5, scores: { [S]: { score: 7 }, [H]: { score: 8 } } }
				]
			},
			'pros-cons': {
				options: {
					[S]: {
						pros: [
							{ text: 'Pay more than triples: S$9,500 vs 60 million VND', impact: 3 },
							{ text: 'Regional payments team, real scale', impact: 3 },
							{ text: 'Save about S$3,000 a month after rent and living', impact: 2 }
						],
						cons: [
							{ text: 'A one-bedroom rents for S$3,300–4,200', impact: 2 },
							{ text: 'A flight away from my parents', impact: 3 },
							{ text: 'Partner needs a work pass of their own', impact: 3 }
						],
						min10: -1,
						months10: 2,
						years10: 4
					},
					[H]: {
						pros: [
							{ text: 'Half an hour from my parents in Go Vap', impact: 3 },
							{ text: 'Partner keeps a job they love', impact: 3 },
							{ text: 'Friends, food and a life already built', impact: 2 }
						],
						cons: [
							{ text: 'Same product for four years; growth has stalled', impact: 3 },
							{ text: 'Pay flat at 60 million VND', impact: 2 }
						],
						min10: 3,
						months10: 0,
						years10: -2
					}
				}
			},
			premortem: {
				options: {
					[S]: {
						failures: [
							{ reason: 'Partner can’t find work there and we live apart', likelihood: 3, severity: 5 },
							{ reason: 'A parent falls ill while I’m abroad', likelihood: 2, severity: 4 },
							{ reason: 'Team or manager is a bad fit; out within a year', likelihood: 2, severity: 3 },
							{ reason: 'Rent goes up and the savings go with it', likelihood: 2, severity: 2 }
						]
					},
					[H]: {
						failures: [
							{ reason: 'Two years on, still on the same product', likelihood: 4, severity: 3 },
							{ reason: 'No offer this good comes again', likelihood: 3, severity: 3 },
							{ reason: 'Burn out on the on-call rota', likelihood: 3, severity: 2 }
						]
					}
				}
			},
			fishbone: {
				problem: 'I feel stuck in my career.',
				causes: [
					{ text: 'No senior engineers left to learn from', category: 'people', impact: 'high', addressedBy: [S] },
					{ text: 'Same product for four years', category: 'process', impact: 'high', addressedBy: [S] },
					{ text: 'Pay below the regional market', category: 'money', impact: 'medium', addressedBy: [S] },
					{ text: 'On call every other week, no time to learn', category: 'environment', impact: 'medium', addressedBy: [S, H] },
					{ text: 'Never asked my manager for the lead role', category: 'people', impact: 'medium', addressedBy: [H] },
					{ text: 'Not sure what I want in five years', category: 'information', impact: 'low', addressedBy: [] }
				]
			},
			'coin-flip': {
				flips: [
					flip(S, H, S, 'relieved'),
					flip(H, S, H, 'disappointed'),
					flip(S, H, S, 'relieved'),
					flip(H, S, S, 'neutral')
				],
				regret: S
			}
		}
	};
}
