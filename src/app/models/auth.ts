import { User } from '@models/user';
import { PickRole } from '@models/role';
import { IctuNavigation } from "@theme/types/navigation";

export interface Oauth {
	expires : string;
	session_id : string;
	data : User;
}

export interface Token {
	access_token : string;
	refresh_token : string;
}

export interface Permission {
	nonce : string;
	data : {
		menus : IctuNavigation[];
		roles : PickRole[];
	};
}

export interface UserSignIn {
	username : string,
	password : string,
}

export interface GoogleSignIn {
	clientId : string;
	client_id : string;
	credential : string;
	select_by : string;
}

export interface IctuPermissionInfo {
	canView : boolean;
	canUpdate : boolean;
	canDelete : boolean;
	canCreate : boolean;
}

export type UserPermissionName = 'view' | 'update' | 'delete' | 'create';

export type UserPermission = Record<UserPermissionName , boolean>
