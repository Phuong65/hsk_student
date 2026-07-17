import { Component , ElementRef , inject , input , InputSignal , OnInit } from '@angular/core';
import { appendElementStyle } from "@utilities/helper";
import { MatProgressBar } from "@angular/material/progress-bar";
import { NgClass } from "@angular/common";

@Component( {
	selector    : 'app-loading-progress' ,
	imports     : [ MatProgressBar , NgClass ] ,
	templateUrl : './loading-progress.component.html' ,
	styleUrl    : './loading-progress.component.scss' ,
	host        : {
		'class' : 'app-loading-progress position-absolute d-flex align-items-center justify-content-center' ,
		'style' : 'top:0; right:0; width:100%; height:100%; z-index: 10; user-select: none;'
	} ,
	standalone  : true
} )
export class LoadingProgressComponent implements OnInit {

	heading : InputSignal<string> = input<string>( 'Loading' );

	overlayColor : InputSignal<string> = input<string>( 'rgba(255,255,255,0.5)' );

	backdropFilter : InputSignal<string> = input<string>( 'blur(8px)' );

	transparent : InputSignal<boolean> = input<boolean>( false );

	private elementRef : ElementRef = inject( ElementRef );

	ngOnInit () : void {
		appendElementStyle( this.elementRef.nativeElement , {
			backgroundColor : this.overlayColor() ,
			backdropFilter  : this.backdropFilter()
		} )
	}

}
