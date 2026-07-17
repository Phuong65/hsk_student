import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import { Employee , EmployeeQueryParams , EmployeeSelectOption , SimpleEmployee , SimpleEmployeeQuerySelect } from '@models/employee';
import { map , Observable , of } from 'rxjs';
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from '@models/dto';
import { Is } from '@utilities/is';
import { User } from '@models/user';
import { HttpParams } from '@angular/common/http';
import { paramsConditionBuilder } from '@app/utilities/helper';
import { ENVIRONMENT } from '@env';
import { IctuDropdownOption } from '@models/ictu-dropdown-option';

@Injectable( {
    providedIn : 'any'
} )
export class EmployeesService extends IctuBaseServiceClass<Employee> {
    constructor () {
        super( 'employees' );
    }

    getEmployeeInfo ( { id , donvi_id } : User ) : Observable<Employee> {
        const conditions : IctuConditionParam[] = [
            {
                conditionName : 'user_id' ,
                condition     : IctuQueryCondition.equal ,
                value         : id.toString( 10 )
            } ,
            {
                conditionName : 'donvi_id' ,
                condition     : IctuQueryCondition.equal ,
                value         : donvi_id.toString( 10 ) ,
                orWhere       : 'and'
            }
        ];
        const queryParams : IctuQueryParams     = {
            paged : 1 ,
            limit : 1
        };
        return this.query( conditions , queryParams ).pipe(
            map(
                ( response : DtoObject<Employee[]> ) : Employee =>
                    response.data &&
                    Is.array( response.data ) &&
                    response.data.length
                    ? response.data[ 0 ]
                    : null
            )
        );
    }

    getEmployeeByUserId ( user_id : number , queryParams? : IctuQueryParams ) : Observable<Employee> {
        const conditions : IctuConditionParam[] = [
            {
                conditionName : 'user_id' ,
                condition     : IctuQueryCondition.equal ,
                value         : user_id.toString( 10 )
            }
        ];
        const _queryParams : IctuQueryParams    = Object.assign<
            IctuQueryParams ,
            IctuQueryParams
        >( { paged : 1 , limit : 1 } , queryParams );
        return this.query( conditions , _queryParams ).pipe(
            map(
                ( response : DtoObject<Employee[]> ) : Employee =>
                    response.data &&
                    Is.array( response.data ) &&
                    response.data.length
                    ? response.data[ 0 ]
                    : null
            )
        );
    }

    checkEmail ( email : string ) : Observable<boolean> {
        const params : HttpParams = paramsConditionBuilder(
            [] ,
            new HttpParams( { fromObject : {} } )
        );
        const api                 = ''.concat(
            ENVIRONMENT.deployment.api ,
            'employees'.replace( /\//g , '' ).trim() ,
            '/check-email/' ,
            email
        );
        return this.http.get<boolean>( api , { params } );
    }

    updatePassword ( user_id : number , password : string ) : Observable<any> {
        const params : HttpParams = paramsConditionBuilder(
            [] ,
            new HttpParams( { fromObject : {} } )
        );
        const api                 = ''.concat(
            ENVIRONMENT.deployment.api ,
            ''.replace( /\//g , '' ).trim() ,
            '/users/' ,
            user_id.toString()
        );
        return this.http.put<any>( api , { password : password } , { params } );
    }

    loadAll ( donvi_id : number , searchInfo : EmployeeQueryParams , _queryParams? : Partial<IctuQueryParams> ) : Observable<DtoObject<Employee[]>> {
        const api                           = ''.concat(
            ENVIRONMENT.deployment.api ,
            'employees'.replace( /\//g , '' ).trim() ,
            '/all/'
        );
        const queryParams : IctuQueryParams = Object.assign<
            IctuQueryParams ,
            IctuQueryParams
        >(
            {
                limit      : 20 ,
                paged      : 1 ,
                include    : donvi_id ,
                include_by : 'donvi_id' ,
                order      : 'ASC' ,
                orderby    : 'name'
            } ,
            _queryParams
        );

        const conditions : IctuConditionParam[] = [];

        if ( searchInfo.csdt_id != null ) {
            conditions.push( {
                conditionName : 'csdt_id' ,
                condition     : IctuQueryCondition.equal ,
                value         : searchInfo.csdt_id.toString() ,
                orWhere       : 'and'
            } );
        }

        if ( searchInfo.search != null && searchInfo.search != '' ) {
            conditions.push( {
                conditionName : 'full_name' ,
                condition     : IctuQueryCondition.like ,
                value         : `%${ searchInfo.search }%` ,
                orWhere       : 'and'
            } );
        }

        const params : HttpParams = paramsConditionBuilder(
            conditions ,
            new HttpParams( { fromObject : queryParams || {} } )
        );

        return this.http.get<DtoObject<Employee[]>>( api , { params } ).pipe(
            map(
                ( response ) : DtoObject<Employee[]> => ( {
                    ... response ,
                    data :
                        response.data && Is.array( response.data )
                        ? response.data
                        : []
                } )
            )
        );
    }

    profile () : Observable<Employee> {
        return this.http.get<DtoObject<Employee>>( [ this.api , 'profile' ].join( '' ) ).pipe( map( ( res : DtoObject<Employee> ) : Employee => res.data ) );
    }

    loadSelectedEmployee ( userIds : number[] , emptyLabel : string = 'Nhân viên không còn tồn tại' ) : Observable<EmployeeSelectOption[]> {
        if ( ! userIds.length ) {
            return of( [] );
        }
        const params : IctuQueryParams = {
            limit      : -1 ,
            paged      : 1 ,
            select     : SimpleEmployeeQuerySelect ,
            include    : userIds.join( ',' ) ,
            include_by : 'user_id'
        };
        return this.query( [] , params , 'all' ).pipe( map( ( res : DtoObject<SimpleEmployee[]> ) : EmployeeSelectOption[] => userIds.reduce( ( reducer : EmployeeSelectOption[] , user_id : number ) : EmployeeSelectOption[] => {
                const employee : SimpleEmployee = res.data.find( ( em : Employee ) : boolean => em.user_id === user_id );
                reducer.push( { value : user_id , label : employee ? employee.full_name : emptyLabel , info : employee } )
                return reducer;
            } , [] ) )
        );
    }

    loadEmployeeSelectOptions ( donvi_id : number , defaultOption? : EmployeeSelectOption ) : Observable<EmployeeSelectOption[]> {
        const result : EmployeeSelectOption[]   = defaultOption ? [ defaultOption ] : [];
        const conditions : IctuConditionParam[] = [ {
            conditionName : 'donvi_id' ,
            value         : donvi_id.toString( 10 ) ,
            condition     : IctuQueryCondition.equal
        } ];
        const params : IctuQueryParams          = {
            limit   : -1 ,
            paged   : 1 ,
            select  : SimpleEmployeeQuerySelect ,
            order   : 'ASC' ,
            orderby : 'full_name'

        };
        return this.query( conditions , params ).pipe(
            map( ( res : DtoObject<SimpleEmployee[]> ) : IctuDropdownOption<number>[] => {
                return [ ... result , ... res.data.map( ( info : SimpleEmployee ) : EmployeeSelectOption => ( { value : info.id , label : info.full_name , info } ) ) ];
            } )
        );
    }

    load ( info : EmployeeQueryParams , donvi_id : number , _queryParams? : Partial<IctuQueryParams> ) : Observable<DtoObject<Employee[]>> {
        const queryParams : IctuQueryParams = Object.assign<IctuQueryParams , IctuQueryParams>( {
            limit      : 20 ,
            paged      : 1 ,
            include    : donvi_id ,
            include_by : 'donvi_id' ,
            order      : 'ASC' ,
            orderby    : 'name'
        } , _queryParams );

        if ( info.csdt_id ) {
            queryParams.include    = info.csdt_id;
            queryParams.include_by = 'csdt_id';
        }
        const conditions : IctuConditionParam[] = [];
        if ( info.search ) {
            conditions.push(
                {
                    conditionName : 'hoten' ,
                    value         : `%${ info.search }%` ,
                    condition     : IctuQueryCondition.like
                } ,
                {
                    conditionName : 'maso' ,
                    value         : `%${ info.search }%` ,
                    condition     : IctuQueryCondition.like ,
                    orWhere       : 'or'
                }
            )
        }

        return this.query( conditions , queryParams );
    }
}
