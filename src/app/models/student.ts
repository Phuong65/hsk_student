import { IctuBaseModel } from '@models/ictu-base-model';

export interface Student extends IctuBaseModel {
	id: number;
	full_name: string;
	name: string;
	dob: string;
	gender: string;
	email: string;
	phone: string;
	address: string;
	avatar: string;
	status: number;
	student_code: string;
	user_id: number;
	creator_id: number;
}
