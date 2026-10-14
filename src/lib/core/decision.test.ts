import { describe, expect, it } from 'vitest';
import { isBlank, newDecision, newOption } from './decision';

describe('isBlank', () => {
	it('is true for a new decision', () => {
		expect(isBlank(newDecision())).toBe(true);
	});

	it('is false once anything is written', () => {
		const d = newDecision();
		expect(isBlank({ ...d, title: 'Move?' })).toBe(false);
		expect(isBlank({ ...d, notes: 'Due Friday' })).toBe(false);
		expect(isBlank({ ...d, options: [{ ...d.options[0]!, label: 'Go' }, d.options[1]!] })).toBe(false);
		expect(isBlank({ ...d, options: [...d.options, newOption()] })).toBe(false);
	});

	it('ignores whitespace in the title and notes', () => {
		expect(isBlank({ ...newDecision(), title: '  ', notes: '\n' })).toBe(true);
	});
});
