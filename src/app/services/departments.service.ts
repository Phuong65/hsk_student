import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from "@models/ictu-base-service.class";
import { Department } from "@models/department";

@Injectable( {
	providedIn : 'any'
} )
export class DepartmentsService extends IctuBaseServiceClass<Department> {

	constructor () {
		super( 'departments' );
	}
}
