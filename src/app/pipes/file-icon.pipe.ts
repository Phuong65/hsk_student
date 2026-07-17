import { Pipe , PipeTransform } from '@angular/core';
import { getFileIcon , IctuBasicFile , IctuFile , ICTUStandardFile } from '@models/file';

@Pipe( {
	name       : 'fileIcon' ,
	standalone : true
} )
export class FileIconPipe implements PipeTransform {

	transform( fileOrName : File | string | IctuBasicFile | ICTUStandardFile | IctuFile ) : string {
		return `<svg aria-hidden="true" class="fp-svg-icon" style="width: 40px; height: 40px;"><use xlink:href="#nfp-${ getFileIcon( fileOrName ) }"></use></svg>`;
	}

}
