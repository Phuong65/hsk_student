import { Pipe , PipeTransform } from '@angular/core';
import { Helper } from '@utilities/helper';

@Pipe( {
	standalone : true ,
	name       : 'formatVndPipe'
} )
export class FormatVndPipe implements PipeTransform {
	transform( number : number ) : string {
		return Helper.formatVndCurrency( number );
	}

}
