import { describe, expect, it } from 'vitest';
import { figure } from './util';

describe('figure', () => {
	it('shows a number as it is, with a + on a two-sided scale above zero', () => {
		expect([3, 0, -2].map((n) => figure(n))).toEqual(['3', '0', '-2']);
		expect([3, 0, -2].map((n) => figure(n, { signed: true }))).toEqual(['+3', '0', '-2']);
	});

	it('shows halves as ½ when asked', () => {
		expect([0.5, 1.5, 2, -0.5, -1.5].map((n) => figure(n, { halves: true }))).toEqual(['½', '1½', '2', '-½', '-1½']);
		expect(figure(1.5, { signed: true, halves: true })).toBe('+1½');
		expect(figure(1.5)).toBe('1.5');
	});
});
