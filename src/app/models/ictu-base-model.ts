import { Observable } from "rxjs";
import { DtoObject , IctuConditionParam , IctuQueryParams } from "@models/dto";
import { IctuPermissionInfo , UserPermission } from "@models/auth";
import { Signal } from "@angular/core";

export interface IctuBaseModel {
	id : number,
	is_deleted : number,
	deleted_by : number,
	deleted_at? : string, // sql date-time YYYY-MM-DD
	created_by : number,
	updated_by : number,
	created_at : string, // sql date-time YYYY-MM-DD
	updated_at : string, // sql date-time YYYY-MM-DD
}

export interface IctuBaseService<T> {
	create : ( info : Partial<T> ) => Observable<number>;
	update : ( id : number , info : Partial<T> ) => Observable<any>;
	delete : ( id : number ) => Observable<any>;
	query : ( conditions : IctuConditionParam[] , queryParams? : IctuQueryParams ) => Observable<DtoObject<T[]>>
}

export class IctuPermissionControl implements IctuPermissionInfo {
	private userPermission : UserPermission;

	get canView () : boolean {
		return this.userPermission.view;
	}

	get canCreate () : boolean {
		return this.userPermission.create;
	}

	get canUpdate () : boolean {
		return this.userPermission.update;
	}

	get canDelete () : boolean {
		return this.userPermission.delete;
	}

	constructor ( permission : UserPermission ) {
		this.userPermission = permission;
	}

}

export interface IctuBasePermission {
	permissionControl : Signal<IctuPermissionControl>;
}