import { Pipe , PipeTransform } from '@angular/core';
import MarkdownIt from 'markdown-it';
import hljs from "highlight.js"

import { DomSanitizer } from '@angular/platform-browser';

@Pipe( { name : 'markdown' , standalone : true } )
export class MarkdownPipe implements PipeTransform {
	private md : MarkdownIt;

	constructor ( private sanitizer : DomSanitizer ) {
		this.md = new MarkdownIt( {
			html        : true ,
			linkify     : true ,
			typographer : true ,
			highlight   : function ( code : string , lang : string ) : string {
				if ( lang && hljs.getLanguage( lang ) ) {
					try {
						return hljs.highlight( code , { language : lang } ).value;
					}
					catch ( __ ) {
					}
				}
				return ''; // use external default escaping
			}
		} );
	}

	transform ( value : string ) : any {
		if ( ! value ) return '';
		const html : any = this.md.render( value );
		return this.sanitizer.bypassSecurityTrustHtml( html );
	}
}
