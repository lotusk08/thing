export type OptionId = string;
/** Models are plugins, so ids are open-ended strings (e.g. "six-hats"). */
export type ModelId = string;
export type Confidence = 'low' | 'medium' | 'high';

export interface Option {
	id: OptionId;
	label: string;
}

export interface Decision {
	id: string;
	/** e.g. "Take the job in Singapore?" */
	title: string;
	/** 2–5 options */
	options: Option[];
	notes?: string;
	createdAt: number;
}

export interface Estimate {
	model: ModelId;
	/** Normalized 0–100 per option. */
	perOption: Record<OptionId, number>;
	/** The model's pick, if it has a clear one. */
	lean?: OptionId;
	confidence: Confidence;
	/** One line. */
	summary: string;
}

export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 5;
