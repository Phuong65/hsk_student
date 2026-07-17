import { Component , computed , inject , input , InputSignal , OnDestroy , Signal , signal , WritableSignal } from '@angular/core';
import { Employee } from '@models/employee';
import { AuthenticationService } from '@services/authentication.service';
import { AppState } from '@models/app-state';
import { takeUntilDestroyed , toObservable } from '@angular/core/rxjs-interop';
import { map , merge , Subject , takeUntil } from 'rxjs';
import { NgClass , NgOptimizedImage } from '@angular/common';
import { EmployeesService } from '@services/employees.service';
import { EmployeePhotoPipe } from '@pipes/employee-photo.pipe';
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from '@models/dto';
import { isArray } from 'lodash-es';

type EmployeeCardSize = 'small' | 'medium' | 'large';

@Component( {
    selector    : 'employee-card' ,
    imports     : [ NgOptimizedImage , NgClass , EmployeePhotoPipe ] ,
    templateUrl : './employee-card.component.html' ,
    styleUrl    : './employee-card.component.css'
} )
export class EmployeeCardComponent implements OnDestroy {

    private employeesService : EmployeesService = inject( EmployeesService );

    private auth : AuthenticationService = inject( AuthenticationService );

    employeeID : InputSignal<number> = input<number>( 0 , { alias : 'id' } );

    userID : InputSignal<number> = input<number>( 0 , { alias : 'user_id' } );

    size : InputSignal<EmployeeCardSize> = input<EmployeeCardSize>( 'medium' );

    employee : WritableSignal<Employee> = signal( null );

    readonly state : WritableSignal<AppState> = signal( 'loading' );

    readonly canLoadData : Signal<boolean> = signal<boolean>( this.auth.userHasRole( [ 'admin' , 'general_management' , 'training_management' , 'ceo' ] ) )

    readonly avatar : Signal<string> = computed( () : string => {
        return this.employee()?.photo ? this.employee().photo : 'images/user/avatar-placeholder.jpg';
    } );

    readonly fullName : Signal<string> = computed( () : string => {
        return this.employee()?.full_name ?? 'No name';
    } );

    readonly email : Signal<string> = computed( () : string => {
        return this.employee()?.email ?? 'No email';
    } );

    private loadDataObserver : Subject<void> = new Subject<void>();

    private reloadDataObserver : Subject<void> = new Subject<void>();

    private destroyed$ : Subject<void> = new Subject<void>();

    constructor () {
        merge<any>(
            toObservable( this.employeeID ) ,
            toObservable( this.userID ) ,
            this.reloadDataObserver.asObservable()
        ).pipe(
            takeUntilDestroyed()
        ).subscribe( () : void => {
            this.loadData();
        } );
    }

    private loadData () : void {
        this.state.set( 'loading' );
        this.loadDataObserver.next();
        const conditions : IctuConditionParam[] = [];
        if ( this.userID() ) {
            conditions.push( { conditionName : 'user_id' , condition : IctuQueryCondition.equal , value : this.userID().toString( 10 ) } )
        }
        else if ( this.employeeID() ) {
            conditions.push( { conditionName : 'id' , condition : IctuQueryCondition.equal , value : this.employeeID().toString( 10 ) } )
        }
        const queryParams : IctuQueryParams = {
            select : 'id,full_name,photo,email,user_id' ,
            limit  : 1 ,
            paged  : 1
        };
        this.employeesService.query( conditions , queryParams , 'all' ).pipe(
            takeUntil( merge( this.destroyed$ , this.loadDataObserver ) ) ,
            map( ( res : DtoObject<Employee[]> ) : Employee => isArray( res.data ) ? res.data.shift() : null )
        ).subscribe( {
            next  : ( employee : Employee ) : void => {
                this.employee.set( employee )
                this.state.set( 'success' );
            } ,
            error : () : void => {
                this.state.set( 'error' );
            }
        } );
    }

    protected reload ( event : MouseEvent ) : void {
        event.preventDefault();
        event.stopPropagation();
        this.reloadDataObserver.next();
    }

    ngOnDestroy () : void {
        this.destroyed$.next();
        this.destroyed$.complete();
    }
}
