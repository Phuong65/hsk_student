import { Pipe , PipeTransform } from '@angular/core';
import { formatBytes } from '@utilities/helper';

@Pipe( {
	standalone : true ,
	name       : 'formatBytes'
} )
export class FormatBytesPipe implements PipeTransform {

	transform( bytes : number , decimals : number = 2 ) : string {
		return formatBytes( bytes , decimals );
	}

}
