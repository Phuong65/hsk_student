import { Component , OnInit , signal , WritableSignal } from '@angular/core';
import { ActivatedRoute , Router } from "@angular/router";
import { AppState } from "@models/app-state";
import { MatButton } from "@angular/material/button";
import { AuthenticationService } from "@services/authentication.service";
import { timer } from "rxjs";
import { LoadingProgressComponent } from "@theme/components/loading-progress/loading-progress.component";

@Component( {
	selector    : 'app-unauthorized' ,
	imports     : [
		MatButton ,
		LoadingProgressComponent
	] ,
	templateUrl : './unauthorized.component.html' ,
	styleUrl    : './unauthorized.component.css'
} )
export class UnauthorizedComponent implements OnInit {

	readonly state : WritableSignal<AppState> = signal<AppState>( 'loading' );

	private getTime () : number {
		const time : number = this.activatedRoute.snapshot.queryParamMap.has( 'time' ) ? parseInt( this.activatedRoute.snapshot.queryParamMap.get( 'time' ) , 10 ) : NaN;
		return Number.isNaN( time ) ? 0 : time;
	}

	constructor (
		private router : Router ,
		private activatedRoute : ActivatedRoute ,
		private auth : AuthenticationService
	) {
	}

	ngOnInit () : void {
		const time : number = this.getTime();
		let valid : boolean = false;
		if ( time ) {
			const now : number      = new Date().getTime();
			const distance : number = now - time;
			valid                   = Math.abs( distance ) < ( 5 * 1000 );
			this.state.set( 'success' );
		}
		if ( ! valid ) {
			this.getToLoginAfterOneSecond();
		}
	}

	btnLogin () : void {
		this.auth.logout();
		this.getToLoginAfterOneSecond();
	}

	private getToLoginAfterOneSecond () : void {
		timer( 1000 ).subscribe( () : void => {
			void this.router.navigate( [ '/login' ] );
		} )
	}
}
