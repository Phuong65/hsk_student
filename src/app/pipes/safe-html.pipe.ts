import { inject , Pipe , PipeTransform } from '@angular/core';
import { DomSanitizer , SafeHtml } from '@angular/platform-browser';

@Pipe( {
	standalone : true ,
	name       : 'safeHtml'
} )
export class SafeHtmlPipe implements PipeTransform {

	private sanitizer : DomSanitizer = inject( DomSanitizer );

	transform( value : string ) : SafeHtml {
		return this.sanitizer.bypassSecurityTrustHtml( value );
	}
}
