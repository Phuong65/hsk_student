import { Component , Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA , MatDialogModule , MatDialogRef } from '@angular/material/dialog';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { Button , BUTTON_CLOSE , ButtonBase } from "@models/button";
import { SafeHtmlPipe } from "@app/pipes/safe-html.pipe";

export interface ConfirmDialogData {
	heading? : string;
	message? : string;
	buttons : Button[];
}

@Component( {
	selector    : 'app-confirm' ,
	standalone  : true ,
	imports     : [ CommonModule , MatDialogModule , ButtonModule , RippleModule , SafeHtmlPipe ] ,
	templateUrl : './confirm.component.html' ,
	styleUrls   : [ './confirm.component.css' ]
} )
export class ConfirmComponent {

	buttons : ButtonBase[] = [];
	heading : string       = '';
	message : string       = '';

	constructor (
		public dialogRef : MatDialogRef<ConfirmComponent> ,
		@Inject( MAT_DIALOG_DATA ) public data : ConfirmDialogData
	) {
		const arrButtons : Button[] = this.data.buttons && this.data.buttons.length ? this.data.buttons : [ BUTTON_CLOSE ];
		this.buttons                = arrButtons.reduce( ( reducer : ButtonBase[] , button : Partial<ButtonBase> , index : number ) : ButtonBase[] => [
			... reducer , Object.assign( {
				label    : '' ,
				icon     : '' ,
				class    : '' ,
				readonly : false ,
				name     : 'btn_' + index
			} , button )
		] , new Array<ButtonBase>() );
		this.heading                = data.heading || '';
		this.message                = data.message || '';
	}
}
