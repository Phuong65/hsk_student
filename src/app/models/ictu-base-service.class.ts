import { HttpClient , HttpParams } from '@angular/common/http';
import { inject } from '@angular/core';
import { ENVIRONMENT } from '@env';
import { map , Observable } from 'rxjs';
import { Dto , DtoObject , IctuConditionParam , IctuQueryParams } from '@models/dto';
import { Helper , paramsConditionBuilder } from '@utilities/helper';
import { IctuBaseService } from '@models/ictu-base-model';

export class IctuBaseServiceClass<T> implements IctuBaseService<T> {

    readonly api : string;

    readonly http : HttpClient = inject( HttpClient );

    constructor ( router : string ) {
        this.api = ''.concat( ENVIRONMENT.deployment.api , router.replace( /\//g , '' ).trim() , '/' );
    }

    public get ( id : number , queryParams : IctuQueryParams = null ) : Observable<T> {
        const params : HttpParams = new HttpParams( { fromObject : queryParams || {} } );
        return this.http.get<DtoObject<T>>( ''.concat( this.api , id.toString( 10 ) ) , { params } ).pipe( map( ( r : DtoObject<T> ) : T => r.data ) );
    }

    public create ( info : Partial<T> ) : Observable<number> {
        return this.http.post<DtoObject<number>>( this.api , info ).pipe( map( ( r : Dto ) : number => r.data ) );
    }

    public update ( id : number , info : Partial<T> ) : Observable<any> {
        return this.http.put<DtoObject<any>>( ''.concat( this.api , id.toString( 10 ) ) , info ).pipe( map( ( r : Dto ) : any => r.data ) );
    }

    public delete ( id : number ) : Observable<any> {
        return this.http.delete<DtoObject<any>>( ''.concat( this.api , id.toString( 10 ) ) ).pipe( map( ( r : Dto ) : any => r.data ) );
    }

    public query ( conditions : IctuConditionParam[] , queryParams? : IctuQueryParams , subpath : string = '' ) : Observable<DtoObject<T[]>> {
        const params : HttpParams = paramsConditionBuilder( conditions , new HttpParams( { fromObject : queryParams || {} } ) );
        const route : string      = subpath ? [ this.api , subpath ].join( '' ) : this.api;
        return this.http.get<DtoObject<T[]>>( Helper.removeLastSlashes( route ) , { params } );
    }
}
