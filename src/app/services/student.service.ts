import { Injectable } from '@angular/core';
import { Student } from '@models/student';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';

@Injectable({
	providedIn: 'any'
})
export class StudentService extends IctuBaseServiceClass<Student> {
	constructor() {
		super('students');
	}
}
