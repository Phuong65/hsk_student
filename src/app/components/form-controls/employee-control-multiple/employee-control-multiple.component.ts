import { Component , inject , input , InputSignal , OnDestroy , Signal , signal , viewChild , WritableSignal } from '@angular/core';
import { MatMenuTrigger } from "@angular/material/menu";
import { SharedModule } from "@shared/shared.module";
import { FormControl } from "@angular/forms";
import { map , merge , of , Subject , takeUntil , timer } from "rxjs";
import { AppState } from "@models/app-state";
import { IctuPaginatorControl } from "@theme/components/ictu-paginator/ictu-paginator-control";
import { AuthenticationService } from "@services/authentication.service";
import { EmployeesService } from "@services/employees.service";
import { takeUntilDestroyed , toObservable } from "@angular/core/rxjs-interop";
import { distinctUntilChanged , filter } from "rxjs/operators";
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from "@models/dto";
import { Employee } from "@models/employee";
import { EMPLOYEE_PREVIEW_FIELDS , EmployeePreview } from "@components/form-controls/employee-control-2/employee-control-2.component";
import { IctuPaginatorComponent } from "@theme/components/ictu-paginator/ictu-paginator.component";
import { InputText } from "primeng/inputtext";
import { NgClass , NgOptimizedImage , NgTemplateOutlet } from "@angular/common";
import { SysRoleName } from "@models/role";
import { Tooltip } from "primeng/tooltip";
import { CdkDrag , CdkDragDrop , CdkDragHandle , CdkDropList , moveItemInArray } from "@angular/cdk/drag-drop";

@Component( {
    selector    : 'employee-control-multiple' ,
    imports     : [ SharedModule , IctuPaginatorComponent , InputText , NgOptimizedImage , Tooltip , CdkDropList , CdkDrag , CdkDragHandle , NgClass , NgTemplateOutlet ] ,
    templateUrl : './employee-control-multiple.component.html' ,
    styleUrls   : [ '../employee-control-2/employee-control-2.component.css' , './employee-control-multiple.component.css' ]
} )
export class EmployeeControlMultipleComponent implements OnDestroy {

    formControlObj : InputSignal<FormControl<number[]>> = input.required<FormControl<number[]>>();

    previewEmployees : InputSignal<EmployeePreview[]> = input<EmployeePreview[]>( [] );

    placeholder : InputSignal<string> = input<string>( '-- Chọn nhân sự --' );

    objectLabel : InputSignal<string> = input<string>( 'nhân viên' );

    filterByRole : InputSignal<SysRoleName | ''> = input( '' );

    showDeleteButton : InputSignal<boolean> = input<boolean>( true );

    protected readonly employees : WritableSignal<EmployeePreview[]> = signal<EmployeePreview[]>( [] );

    private destroy$ : Subject<void> = new Subject<void>();

    private observerOnChanges$ : Subject<void> = new Subject<void>();

    private employeeSearchObserver : Subject<void> = new Subject<void>();

    protected readonly state : WritableSignal<AppState | 'empty'> = signal( 'loading' );

    protected readonly selectedEmployees : WritableSignal<EmployeePreview[]> = signal( [] );

    readonly formSearchState : WritableSignal<AppState> = signal( 'loading' );

    readonly menuTrigger : Signal<MatMenuTrigger> = viewChild( MatMenuTrigger );

    readonly paginator : IctuPaginatorControl = new IctuPaginatorControl( { pageLinkSize : 3 , rows : 10 , showFirstLastIcon : false } );

    private _temp : { paged : number, resetPaginator : boolean } = { paged : 1 , resetPaginator : true };

    readonly formSearchText : WritableSignal<string> = signal( '' );

    private auth : AuthenticationService = inject( AuthenticationService );

    private employeesService : EmployeesService = inject( EmployeesService );

    get donviID () : number {
        return this.auth.user?.donvi_id ?? 0;
    }

    constructor () {
        toObservable( this.formControlObj ).pipe(
            takeUntilDestroyed()
        ).subscribe( ( control : FormControl<number[]> ) : void => {
            this.observerOnChanges$.next();
            merge( of( control.value ) , control.valueChanges ).pipe(
                takeUntil( merge( this.destroy$ , this.observerOnChanges$ ) ) ,
                distinctUntilChanged()
            ).subscribe( ( value : number[] ) : void => {
                this.previewSelectedEmployee( value );
            } )
        } )

        toObservable( this.menuTrigger ).pipe(
            filter( ( menu : MatMenuTrigger ) : boolean => !! menu ) ,
            takeUntilDestroyed()
        ).subscribe( ( menu : MatMenuTrigger ) : void => {
            menu.menuOpened.subscribe( () : void => {
                this.formSearchText.set( '' );
                this.loadEmployeeData( 1 , true );
            } );
        } );

        toObservable( this.previewEmployees ).pipe(
            takeUntilDestroyed()
        ).subscribe( () : void => {

        } );
    }

    private previewSelectedEmployee ( value : number[] ) : void {
        if ( this.selectedEmployees().length && JSON.stringify( value ) === JSON.stringify( this.selectedEmployees().map( ( item : EmployeePreview ) : number => item.user_id ) ) ) {
            return;
        }
        this.state.set( 'loading' );
        const userIDs : number[] = value || [];
        // const uniqueIds : number[] = ids.length ? [ ... new Set( ids ) ] : [];
        if ( userIDs.length ) {
            const _employees : EmployeePreview[] = userIDs.reduce( ( reducer : EmployeePreview[] , _id : number ) : EmployeePreview[] => {
                const employee : EmployeePreview = this.employees().find( ( { user_id } : EmployeePreview ) : boolean => user_id === _id );
                if ( employee ) {
                    reducer.push( employee );
                }
                return reducer;
            } , [] );
            if ( _employees.length === userIDs.length ) {
                this.selectedEmployees.set( _employees );
                this.state.set( 'success' );
            }
            else {
                this.selectedEmployees.set( [] );
                this.employeeSearchObserver.next();
                const conditions : IctuConditionParam[] = [
                    { conditionName : 'donvi_id' , condition : IctuQueryCondition.equal , value : this.donviID.toString( 10 ) }
                ];
                const queryParams : IctuQueryParams     = {
                    select     : EMPLOYEE_PREVIEW_FIELDS.join( ',' ) ,
                    limit      : -1 ,
                    include    : userIDs.join( ',' ) ,
                    include_by : 'user_id' ,
                    paged      : 1
                };
                this.employeesService.query( conditions , queryParams , 'all' ).pipe(
                    takeUntil( merge( this.employeeSearchObserver , this.destroy$ ) ) ,
                    map( ( res : DtoObject<Employee[]> ) : EmployeePreview[] => res.data.length ? res.data : [] )
                ).subscribe( {
                    next  : ( _selectedEmployees : EmployeePreview[] ) : void => {
                        this.selectedEmployees.set( userIDs.reduce( ( reducer : EmployeePreview[] , _id : number ) : EmployeePreview[] => {
                            const employee : EmployeePreview = _selectedEmployees.find( ( { user_id } : EmployeePreview ) : boolean => user_id === _id );
                            if ( employee ) {
                                reducer.push( employee );
                            }
                            return reducer;
                        } , [] ) );
                        this.state.set( 'success' );
                    } ,
                    error : () : void => {
                        this.state.set( 'error' );
                    }
                } )
            }
        }
        else {
            this.selectedEmployees.set( [] );
            this.state.set( 'empty' );
        }
    }

    protected setEmployee ( employee : EmployeePreview ) : void {
        if ( this.formControlObj() ) {
            const ids : number[] = this.formControlObj().value ?? [];
            if ( ! ids.length || ! ids.includes( employee.user_id ) ) {
                this.selectedEmployees.update( ( list : EmployeePreview[] ) : EmployeePreview[] => [ ... list , employee ] );
                this.formControlObj().setValue( [ ... new Set( ids ) , employee.user_id ] );
                this.formControlObj().markAsTouched();
            }
        }
        this.closeMenu();
    }

    protected reloadPreview ( event : MouseEvent ) : void {
        event.preventDefault();
        event.stopPropagation();
    }

    protected avoidCloseMenuByClicking ( event : MouseEvent | KeyboardEvent ) : void {
        event.preventDefault();
        event.stopPropagation();
    }

    private loadEmployeeData ( paged : number = 1 , resetPaginator : boolean = true ) : void {
        this._temp = { paged , resetPaginator };
        this.formSearchState.set( 'loading' );
        const conditions : IctuConditionParam[] = [];
        const queryParams : IctuQueryParams     = {
            limit      : this.paginator.rows() ,
            order      : 'ASC' ,
            orderby    : 'name' ,
            include    : this.donviID ,
            include_by : 'donvi_id' ,
            paged
        };
        if ( this.filterByRole() ) {
            if ( this.formSearchText() ) {
                conditions.push(
                    { conditionName : 'full_name' , condition : IctuQueryCondition.like , value : `%${ this.formSearchText() }%` } ,
                    { conditionName : 'positions' , condition : IctuQueryCondition.like , value : `%${ this.filterByRole() }%` , orWhere : "and" } ,
                    { conditionName : 'email' , condition : IctuQueryCondition.like , value : `%${ this.formSearchText() }%` , orWhere : "or" } ,
                    { conditionName : 'positions' , condition : IctuQueryCondition.like , value : `%${ this.filterByRole() }%` , orWhere : "and" }
                )
            }
            else {
                conditions.push(
                    { conditionName : 'positions' , condition : IctuQueryCondition.like , value : `%${ this.filterByRole() }%` }
                )
            }
        }
        else {
            if ( this.formSearchText() ) {
                conditions.push(
                    { conditionName : 'full_name' , condition : IctuQueryCondition.like , value : `%${ this.formSearchText() }%` } ,
                    { conditionName : 'email' , condition : IctuQueryCondition.like , value : `%${ this.formSearchText() }%` , orWhere : "or" }
                )
            }
        }
        this.employeeSearchObserver.next();
        this.employeesService.query( conditions , queryParams , 'all' ).pipe(
            takeUntil( merge( this.employeeSearchObserver , this.destroy$ ) ) ,
            map( ( res : DtoObject<Employee[]> ) : Employee[] => {
                if ( resetPaginator ) {
                    return this.paginator.setupPaginator( res );
                }
                else {
                    this.paginator.changePage( paged );
                    return res.data;
                }
            } )
        ).subscribe( {
            next  : ( employees : Employee[] ) : void => {
                this.employees.set( employees );
                this.formSearchState.set( 'success' );
            } ,
            error : () : void => {
                this.formSearchState.set( 'error' );
            }
        } )
    }

    protected reloadEmployeeData ( event : Event ) : void {
        event.preventDefault();
        event.stopPropagation();
        this.loadEmployeeData( this._temp.paged , this._temp.resetPaginator );
    }

    protected onEmployeeControlSearch ( event : Event ) : void {
        event.preventDefault();
        event.stopPropagation();
        this.loadEmployeeData( 1 , true );
    }

    protected closeMenu () : void {
        this.menuTrigger()?.closeMenu();
    }

    protected onChangePage ( paged : number ) : void {
        this.loadEmployeeData( paged , false );
    }

    protected removeSelected ( employee : EmployeePreview ) : void {
        if ( this.formControlObj() ) {
            this.selectedEmployees.update( ( list : EmployeePreview[] ) : EmployeePreview[] => [ ... list.filter( ( { user_id } : EmployeePreview ) : boolean => user_id !== employee.user_id ) ] );
            this.formControlObj().setValue( this.formControlObj().value.filter( ( _user_id : number ) : boolean => _user_id !== employee.user_id ) );
            this.formControlObj().markAsTouched();
        }
    }

    protected drop ( event : CdkDragDrop<EmployeePreview[]> ) : void {
        const result : EmployeePreview[] = [ ... this.selectedEmployees() ];
        moveItemInArray( result , event.previousIndex , event.currentIndex );
        this.selectedEmployees.update( () : EmployeePreview[] => result );
        timer( 200 ).pipe(
            takeUntil( this.destroy$ )
        ).subscribe( () => {
            this.formControlObj().setValue( result.map( ( item : EmployeePreview ) : number => item.user_id ) );
            this.formControlObj().markAsTouched();
        } )
    }

    ngOnDestroy () : void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
