import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from '@models/dto';
import { map , Observable } from 'rxjs';
import { Locations } from '@models/location';
import { IctuDropdownOption } from '@models/ictu-dropdown-option';
import { HttpParams } from "@angular/common/http";
import { paramsConditionBuilder } from "@utilities/helper";
import { ENVIRONMENT } from "@env";

@Injectable( {
	providedIn : 'any'
} )
export class LocationService extends IctuBaseServiceClass<Locations> {
	constructor () {
		super( 'cities' );
	}

	loadTinh (
		_queryParams? : Partial<IctuQueryParams>
	) : Observable<IctuDropdownOption<number>[]> {
		const queryParams : IctuQueryParams = Object.assign<
			IctuQueryParams ,
			IctuQueryParams
		>(
			{
				limit   : -1 ,
				order   : 'ASC' ,
				orderby : 'name'
			} ,
			_queryParams
		);

		const conditions : IctuConditionParam[] = [];

		return this.queryLocation( conditions , queryParams , 'cities' ).pipe(
			map(
				( {
					data
				} : DtoObject<Locations[]> ) : IctuDropdownOption<number>[] =>
					data.map(
						( csdt : Locations ) : IctuDropdownOption<number> => ( {
							value : csdt.id ,
							label : csdt.name
						} )
					)
			)
		);
	}

	loadHuyen (
		parent_id : number ,
		_queryParams? : Partial<IctuQueryParams>
	) : Observable<DtoObject<Locations[]>> {
		const queryParams : IctuQueryParams = Object.assign<
			IctuQueryParams ,
			IctuQueryParams
		>(
			{
				limit   : -1 ,
				paged   : 1 ,
				order   : 'ASC' ,
				orderby : 'name'
			} ,
			_queryParams
		);

		const conditions : IctuConditionParam[] = [];
		if ( parent_id ) {
			conditions.push( {
				conditionName : 'parent_id' ,
				value         : `${ parent_id }` ,
				condition     : IctuQueryCondition.equal
			} );
		}
		return this.queryLocation( conditions , queryParams , 'districts' );
	}

	loadXa (
		parent_id : number ,
		_queryParams? : Partial<IctuQueryParams>
	) : Observable<DtoObject<Locations[]>> {
		const queryParams : IctuQueryParams = Object.assign<
			IctuQueryParams ,
			IctuQueryParams
		>(
			{
				limit   : -1 ,
				paged   : 1 ,
				order   : 'ASC' ,
				orderby : 'name'
			} ,
			_queryParams
		);

		const conditions : IctuConditionParam[] = [];
		if ( parent_id ) {
			conditions.push( {
				conditionName : 'parent_id' ,
				value         : `${ parent_id }` ,
				condition     : IctuQueryCondition.equal
			} );
		}
		return this.queryLocation( conditions , queryParams , 'wards' );
	}

	loadAllhuyenxa (
		tabel : string ,
		include : string ,
		_queryParams? : Partial<IctuQueryParams>
	) : Observable<DtoObject<Locations[]>> {
		const queryParams : IctuQueryParams = Object.assign<
			IctuQueryParams ,
			IctuQueryParams
		>(
			{
				limit      : -1 ,
				paged      : 1 ,
				include    : include ,
				include_by : 'id' ,
				order      : 'ASC' ,
				orderby    : 'name'
			} ,
			_queryParams
		);

		const conditions : IctuConditionParam[] = [];

		return this.queryLocation( conditions , queryParams , tabel );
	}

	public queryLocation ( conditions : IctuConditionParam[] , queryParams? : IctuQueryParams , table? : string ) : Observable<DtoObject<Locations[]>> {
		const params : HttpParams = paramsConditionBuilder( conditions , new HttpParams( { fromObject : queryParams || {} } ) );
		return this.http.get<DtoObject<Locations[]>>( ''.concat( ENVIRONMENT.deployment.api , table.replace( /\//g , '' ).trim() , '/' ) , { params } );
	}
}
