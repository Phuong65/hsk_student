import { InjectionToken } from "@angular/core";

export interface Role {
	id : number,
	description : string,
	name : SysRoleName,
	ordering : number,
	title : string
	realm : string,
	ucase_ids : UseCasePermission[],
	provider : RolePermission[],
	is_default : number,
	status : number,
	created_at? : string,
	updated_at? : string,
}

export type PickRole = Pick<Role , 'id' | 'description' | 'name' | 'ordering' | 'title'>;

export interface UseCasePermission {
	id : string, // UseCase name : 'he-thong/thong-tin-tai-khoan'
	pms : string // 1.1.1.1 = access.read.update.delete
}

export interface RolePermission {
	id : string, // router : 'users'
	pms : string // 1.1.1.1 = access.read.update.delete
}

export type AdminRole = 'admin';

export type CeoRole = 'ceo';

export type TeacherRole = 'teacher';

export type TeachingAssistantRole = 'teaching_assistant';

export type TrainingManagementRole = 'training_management';

export type GeneralManagementRole = 'general_management';

export type SalesRole = 'sales';

export type AccountantRole = 'accountant';

export type SupporterRole = 'supporter';

export type ParentRole = 'parents';

export type StudentRole = 'student';

export type MarketingRole = 'marketing';

export type ModeratorMedia = 'mod_media';

export type ModeratorComments = 'mod_comments';

export type SysRoleName = AdminRole | CeoRole | TeacherRole | TrainingManagementRole | GeneralManagementRole | SalesRole | AccountantRole | SupporterRole | TeachingAssistantRole | ModeratorMedia | ModeratorComments | ParentRole | StudentRole | MarketingRole;

export const APP_REDIRECT_LINKS : InjectionToken<Map<SysRoleName , string>> = new InjectionToken<Map<SysRoleName , string>>( 'default redirect for each role' );

export const createAppRedirectLinks : () => Map<SysRoleName , string> = () : Map<SysRoleName , string> => {
	return new Map<SysRoleName , string>( [
		[ 'admin' , '/admin/administrator' ] ,
		[ 'ceo' , '/admin/ceo' ] ,
		[ 'general_management' , '/admin/general-management' ] ,
		[ 'training_management' , '/admin/training-management' ] ,
		[ 'teacher' , '/admin/teacher' ] ,
		[ 'accountant' , '/admin/accountant' ] ,
		[ 'teaching_assistant' , '/admin/teaching-assistant' ] ,
		[ 'sales' , '/admin/sales' ] ,
		[ 'supporter' , '/admin/supporter' ] ,
		[ 'parents' , '/admin/parents' ] ,
		[ 'student' , '/admin/student' ],
		[ 'marketing' , '/admin/marketing' ],
		[ 'mod_media' , '/admin/moderation' ],
		[ 'mod_comments' , '/admin/moderation' ],
	] );
}

export const ARRAY_EMPLOYEE_ROLES : Omit<SysRoleName , StudentRole | ParentRole>[] = [ 'admin' , 'ceo' , 'teacher' , 'teaching_assistant' , 'training_management' , 'general_management' , 'sales' , 'accountant' , 'supporter' ] as const;
