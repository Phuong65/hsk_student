import { FormArray , FormControl , FormGroup } from '@angular/forms';
import Decimal from 'decimal.js';

export type FormGroupType<T> = FormGroup<{
	[K in keyof T] : FormControl<T[K]>;
}>;

// export type FormGroupTypeUnity<T> = FormGroup<{
// 	[K in keyof T] : FormControl<T[K]> | FormArray<FormControl<T[K]>>;
// }>;

export type FormGroupTypeUnity<T> =
	T extends ( infer U )[] // Nếu là mảng
	? FormArray<FormGroupTypeUnity<U>>
	: T extends object // Nếu là object
	  ? FormGroup<{ [K in keyof T] : FormGroupTypeUnity<T[K]> }>
	  : FormControl<T>; // Nếu là primitive

export type Numeric = number | string | Decimal;
