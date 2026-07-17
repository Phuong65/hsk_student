import { inject , Injectable } from '@angular/core';
import { User } from "@models/user";
import { HttpClient } from "@angular/common/http";
import { map , Observable } from "rxjs";
import { DtoObject } from "@models/dto";
import { getApiRouteLink } from "@env";

export type UserUpdatableFields = Pick<User , 'display_name' | 'phone' | 'email' | 'password'>

@Injectable( {
	providedIn : 'any'
} )
export class UserService {

	private readonly apiRegister : string = getApiRouteLink( 'register' );

	private readonly apiProfile : string = getApiRouteLink( 'profile' );

	private http : HttpClient = inject( HttpClient );

	update ( info : Partial<UserUpdatableFields> ) : Observable<number> {
		return this.http.put<DtoObject<number>>( this.apiProfile , info ).pipe( map( ( response : DtoObject<number> ) : number => response.data ) );
	}
}
