import { Injectable } from '@angular/core';
import { catchError , mergeMap , Observable , of , Subject , take , throwError } from "rxjs";
import { HttpClient } from "@angular/common/http";
import { filter } from "rxjs/operators";
import { getApiRouteLink } from "@env";
import { refreshTokenGetter , tokenSetter } from "@app/app.config";

interface RefreshTokenResponse {
	data : string
}

const REFRESH_TOKEN_KEY_NAME : string = '__9Zra%b_wK97X9ONTL9';

@Injectable( {
	providedIn : 'root'
} )
export class RefreshTokenService {
	
	onReceivingNewToken : Subject<string> = new Subject<string>();
	
	constructor ( private http : HttpClient ) {
		this.isRefreshing = false;
	}
	
	get isRefreshing () : boolean {
		return Boolean( sessionStorage.getItem( REFRESH_TOKEN_KEY_NAME ) )
	}
	
	set isRefreshing ( set : boolean ) {
		if ( set ) {
			sessionStorage.setItem( REFRESH_TOKEN_KEY_NAME , 'on_air' );
		}
		else {
			sessionStorage.removeItem( REFRESH_TOKEN_KEY_NAME );
		}
	}
	
	refreshToken () : Observable<string> {
		return this.isRefreshing ? this.waitForTokenRefreshed() : this.requestRefreshToken()
	}
	
	requestRefreshToken () : Observable<string> {
		this.isRefreshing = true;
		return this.http.post<RefreshTokenResponse>( getApiRouteLink( 'refresh-token' ) , { 'refresh_token' : refreshTokenGetter() } ).pipe(
			mergeMap( ( response : RefreshTokenResponse ) : Observable<string> => {
				const newToken : string = tokenSetter( response.data );
				this.onReceivingNewToken.next( newToken );
				this.onReceivingNewToken.complete();
				this.isRefreshing = false;
				return of( newToken );
			} ) ,
			catchError( ( error : any ) : Observable<never> => {
				this.isRefreshing = false;
				this.onReceivingNewToken.error( error );
				return throwError( () : any => error )
			} )
		);
	}
	
	private waitForTokenRefreshed () : Observable<string> {
		if ( this.onReceivingNewToken.closed ) {
			this.onReceivingNewToken = new Subject<string>();
		}
		return this.onReceivingNewToken.asObservable().pipe(
			filter( ( token : string ) : boolean => !! token ) ,
			take( 1 ) ,
			// catchError( () : Observable<never> => throwError( () : any => ( { error : new ErrorEvent(
			// 'RefreshTokenFail' ) } ) ) )
			catchError( ( error : any ) : Observable<never> => throwError( () : any => error ) )
		)
	}
}
