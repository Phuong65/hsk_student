import { IctuBaseModel } from '@models/ictu-base-model';

export interface Answer {
	id: number | string;
	value: string;
}

export interface Media {
	type: string;
	source: string;
	path: string;
	replay: number;
}

export interface QuestionParam {
	prepare: number;
	time: number;
}

export type QuestionType = 'radio' | 'checkbox' | 'select' | 'inputbox' | 'textarea'
	| 'record' | 'paragraph' | 'reorder-words' | 'grouping' | 'drag-drop'
	| 'group-radio' | 'group-input';

export interface BankQuestion extends IctuBaseModel {
	id: number;
	bank_id: number;
	group_id: number;
	part: number;
	question_type: QuestionType | string;
	question_direction: string;
	skill: string;
	shuff: string;
	answer_option: Answer[];
	answer_correct: any;
	hint: string;
	explain: string;
	status: number;
	question_number: string;
	media: Media | null;
	params: QuestionParam | null;
	children?: BankQuestion[];
	showCorrectAnswer?: boolean;
	code?: string;
}
