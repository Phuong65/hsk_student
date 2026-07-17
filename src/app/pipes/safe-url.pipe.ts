import { inject , Pipe , PipeTransform } from '@angular/core';
import { DomSanitizer , SafeUrl } from '@angular/platform-browser';

@Pipe( {
	name       : 'safeUrl' ,
	standalone : true
} )
export class SafeUrlPipe implements PipeTransform {

	private sanitizer : DomSanitizer = inject( DomSanitizer );

	transform( value : string ) : SafeUrl {
		return this.sanitizer.bypassSecurityTrustUrl( value );
	}
}
