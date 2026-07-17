import { Pipe , PipeTransform } from '@angular/core';
import dayjs from 'dayjs';

@Pipe( {
	name       : 'date2text' ,
	standalone : true
} )
export class Date2textPipe implements PipeTransform {

	transform( value : Date | string , format : string , fallback : string = '' ) : string {
		try {
			return value ? dayjs( value ).format( format ) : fallback;
		} catch ( e ) {
			return fallback;
		}
	}

}
