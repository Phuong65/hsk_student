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

export type StudentRole = 'student';

export type SysRoleName = StudentRole;

export const APP_REDIRECT_LINKS : InjectionToken<Map<SysRoleName , string>> = new InjectionToken<Map<SysRoleName , string>>( 'default redirect for each role' );

export const createAppRedirectLinks : () => Map<SysRoleName , string> = () : Map<SysRoleName , string> => {
	return new Map<SysRoleName , string>( [
		[ 'student' , '/student-info' ],
	] );
}