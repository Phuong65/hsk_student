import { Component , inject } from '@angular/core';
import { SharedModule } from '@shared/shared.module';
import { AppPreviewHeading } from "@pages/preview/preview.component";

@Component( {
	selector    : 'app-typography' ,
	imports     : [ SharedModule ] ,
	templateUrl : './typography.component.html' ,
	styleUrls   : [ './typography.component.scss' ]
} )
export default class TypographyComponent {
	
	constructor () {
		inject( AppPreviewHeading ).set( { heading : 'Typography' } );
	}
}
