import { Pipe , PipeTransform } from '@angular/core';
import { Helper } from '@utilities/helper';

@Pipe( {
	name       : 'stripHtml' ,
	standalone : true
} )
export class StripHtmlPipe implements PipeTransform {

	transform( value : string ) : string {
		return Helper.stripHtml( value );
	}

}
