import { IctuBaseModel } from "@models/ictu-base-model";

export interface User extends IctuBaseModel {
	id : number;
	username : string;
	display_name : string;
	phone : string;
	email : string;
	password : string;
	avatar : string;
	donvi_id : number;
	realms : string[];
	role_ids : string[];
	status : number;
}

// export type ConstructUser = Pick<User , 'username' | 'display_name' | 'phone' | 'email' | 'password'>
//
// export type StudentSocialName = 'facebook' | 'twitter' | 'instagram' | 'linkedin'
//
// export type StudentSocials = Record<StudentSocialName , string>;
//
// export interface Student {
// 	id : number;
// 	user_id : number;
// 	email : string;
// 	student_code : string; // neu la sinh vien ==> luu ma sinh vien
// 	full_name : string;
// 	full_name_slug : string;
// 	name : string; //ten nay dung de sap xep theo A-Z
// 	birthday : string;
// 	gender : string;
// 	address : string;
// 	social_link : StudentSocials;
// 	created_at : string;
// 	updated_at : string;
// }
//
// export type PickStudent = Pick<Student , 'user_id' | 'student_code' | 'email' | 'full_name' | 'full_name_slug' | 'name' | 'birthday' | 'gender' | 'address'>;


export interface UserSignIn {
	username : string;
	password : string;
}

export interface GoogleSignIn {
	clientId : string;
	client_id : string;
	credential : string;
	select_by : string;
}
