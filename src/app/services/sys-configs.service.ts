import { Injectable } from '@angular/core';
import { HttpClient , HttpParams } from '@angular/common/http';
import { map , Observable } from 'rxjs';
import { Dto , DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from '@models/dto';
import { getApiRouteLink } from "@env";
import { SystemConfig } from "@models/system-config";
import { paramsConditionBuilder } from "@utilities/helper";

@Injectable( {
	providedIn : 'any'
} )
export class SysConfigsService {
	
	private readonly api : string = getApiRouteLink( 'configs/' );
	
	constructor ( private http : HttpClient ) {
	}
	
	getAppConfigs ( select : string = '' ) : Observable<SystemConfig[]> {
		const fromObject : IctuQueryParams = select ? Object.assign<IctuQueryParams , IctuQueryParams>( {
			limit : -1 ,
			paged : 1
		} , { select } ) : { limit : -1 , paged : 1 };
		return this.http.get<DtoObject<SystemConfig[]>>( this.api , { params : new HttpParams( { fromObject } ) } ).pipe( map( ( res : DtoObject<SystemConfig[]> ) : SystemConfig[] => res.data ) );
	}
	
	getConfigSettingByConfigKey ( key : string , select : string = '' ) : Observable<SystemConfig> {
		const conditions : IctuConditionParam[] = [
			{
				conditionName : 'config_key' ,
				condition     : IctuQueryCondition.equal ,
				value         : key
			}
		];
		const queryParams : IctuQueryParams     = {
			limit : 1 ,
			paged : 1
		};
		if ( select ) {
			queryParams[ 'select' ] = select;
		}
		const params : HttpParams = paramsConditionBuilder( conditions , new HttpParams( { fromObject : queryParams } ) );
		return this.http.get<Dto>( this.api , { params } ).pipe( map( ( res : Dto ) => res.data.length ? res.data[ 0 ] : null ) );
	}
	
	query<T> ( conditions : IctuConditionParam[] , queryParams? : IctuQueryParams ) : Observable<T[]> {
		const params : HttpParams = paramsConditionBuilder( conditions , new HttpParams( { fromObject : queryParams } ) );
		return this.http.get<Dto>( this.api , { params } ).pipe( map( ( res : Dto ) => res.data ) );
	}
	
}
