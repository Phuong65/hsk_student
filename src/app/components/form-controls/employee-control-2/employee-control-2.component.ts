import { Component , inject , input , InputSignal , OnDestroy , Signal , signal , viewChild , WritableSignal } from '@angular/core';
import { FormControl } from "@angular/forms";
import { map , merge , of , Subject , takeUntil } from "rxjs";
import { toObservable } from "@angular/core/rxjs-interop";
import { Employee } from "@models/employee";
import { AppState } from "@models/app-state";
import { NgOptimizedImage } from "@angular/common";
import { IctuPaginatorComponent } from "@theme/components/ictu-paginator/ictu-paginator.component";
import { InputText } from "primeng/inputtext";
import { MatMenu , MatMenuItem , MatMenuTrigger } from "@angular/material/menu";
import { SharedModule } from "@shared/shared.module";
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from "@models/dto";
import { IctuPaginatorControl } from "@theme/components/ictu-paginator/ictu-paginator-control";
import { AuthenticationService } from "@services/authentication.service";
import { EmployeesService } from "@services/employees.service";
import { distinctUntilChanged , filter } from "rxjs/operators";
import { SysRoleName } from "@models/role";

export type EmployeePreview = Pick<Employee , 'id' | 'dob' | 'positions' | 'email' | 'full_name' | 'address' | 'phone' | 'gender' | 'code' | 'linhvuc_id' | 'nationality' | 'user_id' | 'photo' | 'name'>

export const EMPLOYEE_PREVIEW_FIELDS : ( keyof EmployeePreview )[] = [ 'id' , 'dob' , 'positions' , 'email' , 'full_name' , 'address' , 'phone' , 'gender' , 'code' , 'linhvuc_id' , 'nationality' , 'user_id' , 'photo' , 'name' ];

@Component( {
	selector    : 'employee-control-2' ,
	imports : [ NgOptimizedImage , IctuPaginatorComponent , InputText , MatMenu , MatMenuItem , SharedModule ] ,
	templateUrl : './employee-control-2.component.html' ,
	styleUrl    : './employee-control-2.component.css'
} )
export class EmployeeControl2Component implements OnDestroy {

	formControlObj : InputSignal<FormControl<number>> = input.required<FormControl<number>>();

	placeholder : InputSignal<string> = input<string>( '-- Chọn nhân sự --' );

	objectLabel : InputSignal<string> = input<string>( 'nhân viên' );

	filterByRole : InputSignal<SysRoleName | ''> = input( '' );

	showDeleteButton : InputSignal<boolean> = input<boolean>( true );

	protected readonly employees : WritableSignal<EmployeePreview[]> = signal<EmployeePreview[]>( [] );

	private destroy$ : Subject<void> = new Subject<void>();

	private observerOnChanges$ : Subject<void> = new Subject<void>();

	private employeeSearchObserver : Subject<void> = new Subject<void>();

	protected readonly state : WritableSignal<AppState | 'empty'> = signal( 'loading' );

	protected readonly selected : WritableSignal<EmployeePreview> = signal<EmployeePreview>( null );

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
			takeUntil( this.destroy$ )
		).subscribe( ( control : FormControl<number> ) : void => {
			this.observerOnChanges$.next();
			merge( of( control.value ) , control.valueChanges ).pipe(
				takeUntil( merge( this.destroy$ , this.observerOnChanges$ ) ) ,
				distinctUntilChanged()
			).subscribe( ( user_id : number ) : void => this.previewSelectedEmployee( user_id ) )
		} )

		toObservable( this.menuTrigger ).pipe(
			takeUntil( this.destroy$ ) ,
			filter( ( menu : MatMenuTrigger ) : boolean => !! menu )
		).subscribe( ( menu : MatMenuTrigger ) : void => {
			menu.menuOpened.subscribe( () : void => {
				this.formSearchText.set( '' );
				this.loadEmployeeData( 1 , true );
			} );
		} );
	}

	private previewSelectedEmployee ( user_id : number ) : void {
		this.state.set( 'loading' );
		if ( user_id ) {
			const _selected : EmployeePreview = this.employees().find( ( e : EmployeePreview ) : boolean => e.user_id === user_id );
			if ( _selected ) {
				this.selected.set( _selected );
				this.state.set( 'success' );
			}
			else {
				this.selected.set( null );
				this.employeeSearchObserver.next();
				const conditions : IctuConditionParam[] = [
					{ conditionName : 'user_id' , condition : IctuQueryCondition.like , value : user_id.toString( 10 ) }
				];
				const queryParams : IctuQueryParams     = {
					select     : EMPLOYEE_PREVIEW_FIELDS.join( ',' ) ,
					limit      : 1 ,
					include    : this.donviID ,
					include_by : 'donvi_id' ,
					paged      : 1
				};
				this.employeesService.query( conditions , queryParams ).pipe(
					takeUntil( merge( this.employeeSearchObserver , this.destroy$ ) ) ,
					map( ( res : DtoObject<Employee[]> ) : EmployeePreview => res.data.length ? res.data[ 0 ] : null )
				).subscribe( {
					next  : ( employee : EmployeePreview ) : void => {
						this.selected.set( employee );
						this.state.set( 'success' );
					} ,
					error : () : void => {
						this.state.set( 'error' );
					}
				} )
			}
		}
		else {
			this.selected.set( null );
			this.state.set( 'empty' );
		}
	}

	protected setEmployee ( employee : EmployeePreview ) : void {
		if ( this.formControlObj() ) {
			if ( employee.user_id !== this.formControlObj().value ) {
				this.formControlObj().setValue( employee.user_id );
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
		this.employeesService.query( conditions , queryParams ).pipe(
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

	protected removeSelected () : void {
		if ( this.formControlObj() ) {
			this.formControlObj().setValue( 0 );
			this.formControlObj().markAsTouched();
		}
	}

	ngOnDestroy () : void {
		this.destroy$.next();
		this.destroy$.complete();
	}
}
