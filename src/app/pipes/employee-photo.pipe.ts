import { inject , Pipe , PipeTransform } from '@angular/core';
import { DomSanitizer , SafeUrl } from '@angular/platform-browser';
import { Employee } from '@models/employee';

@Pipe( {
	name       : 'employeePhoto' ,
	standalone : true
} )
export class EmployeePhotoPipe implements PipeTransform {

	private sanitizer : DomSanitizer = inject( DomSanitizer );

	transform( employee : Pick<Employee , 'id' | 'photo'> , placeholder : string = '' ) : string | SafeUrl {
		return employee && employee.photo ? this.sanitizer.bypassSecurityTrustUrl( employee.photo ) : placeholder || this.getEmployeeDefaultPhoto( employee );
	}

	private getEmployeeDefaultPhoto( employee : Pick<Employee , 'id' | 'photo'> ) : string {
		if ( !employee || !employee.id ) {
			return 'images/user/avatar-1.jpg';
		} else {
			const id : string = employee.id.toString( 10 ).split( '' ).pop();
			return `images/user/avatar-${ id === '0' ? '10' : id }.jpg`;
		}
	}
}
