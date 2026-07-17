import { Pipe , PipeTransform } from '@angular/core';

@Pipe( {
	name       : 'str2date' ,
	standalone : true
} )
export class Str2datePipe implements PipeTransform {

	transform( value : string ) : Date {
		return value ? new Date( value ) : new Date();
	}

}
