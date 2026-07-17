import { Component , computed , inject , input , InputSignal , OnDestroy , OnInit , Signal , signal , viewChild , WritableSignal } from '@angular/core';
import { AbstractControl , FormsModule , ReactiveFormsModule } from "@angular/forms";
import { AppState } from "@models/app-state";
import { Employee , EMPLOYEE_SELECT_OPTION_FIELDS } from "@models/employee";
import { EmployeesService } from "@services/employees.service";
import { debounceTime , map , merge , Observable , of , Subject , takeUntil } from "rxjs";
import { toObservable } from "@angular/core/rxjs-interop";
import { MatButton } from "@angular/material/button";
import { distinctUntilChanged , filter } from "rxjs/operators";
import { MatMenu , MatMenuItem , MatMenuTrigger } from "@angular/material/menu";
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from "@models/dto";
import { IctuPaginatorComponent } from "@theme/components/ictu-paginator/ictu-paginator.component";
import { IctuPaginatorControl } from "@theme/components/ictu-paginator/ictu-paginator-control";
import { InputText } from "primeng/inputtext";

type EmployeeControlPanelLayout = 'popup' | 'dropdown';

@Component( {
	selector    : 'employee-control' ,
	imports     : [ MatButton , MatMenu , MatMenuItem , ReactiveFormsModule , MatMenuTrigger , IctuPaginatorComponent , InputText , FormsModule ] ,
	templateUrl : './employee-control.component.html' ,
	styleUrl    : './employee-control.component.css'
} )
export class EmployeeControlComponent implements OnInit , OnDestroy {

	donviId : InputSignal<number> = input.required<number>( { alias : 'donvi_id' } );

	formControl : InputSignal<AbstractControl> = input.required<AbstractControl>( { alias : 'formControlObject' } );

	placeholder : InputSignal<string> = input<string>( '-- Chọn nhân viên --' );

	layout : InputSignal<EmployeeControlPanelLayout> = input.required<EmployeeControlPanelLayout>( { alias : 'layout' } );

	readonly state : WritableSignal<AppState> = signal( 'loading' );

	readonly employees : WritableSignal<Employee[]> = signal<Employee[]>( [] );

	private readonly select : WritableSignal<Employee> = signal<Employee>( null );

	private employeesService : EmployeesService = inject( EmployeesService );

	private valueChangesObserver : Subject<void> = new Subject<void>();

	private employeeSearchObserver : Subject<void> = new Subject<void>();

	private destroy$ : Subject<void> = new Subject<void>();

	readonly candidateName : Signal<string> = computed( () : string => {
		return this.select()?.full_name ?? 'No name';
	} );

	readonly candidateEmail : Signal<string> = computed( () : string => {
		return this.select()?.email ?? 'No email';
	} );

	readonly candidatePhone : Signal<string> = computed( () : string => {
		return this.select()?.phone ?? 'No phone number';
	} );

	readonly selected : Signal<boolean> = computed( () : boolean => !! this.select() );

	readonly formSearchState : WritableSignal<AppState> = signal( 'loading' );

	readonly menuTrigger : Signal<MatMenuTrigger> = viewChild( MatMenuTrigger );

	readonly paginator : IctuPaginatorControl = new IctuPaginatorControl( { pageLinkSize : 3 , rows : 10 , showFirstLastIcon : false } );

	private _temp : { paged : number, resetPaginator : boolean } = { paged : 1 , resetPaginator : true };

	readonly formSearchText : WritableSignal<string> = signal( '' );

	constructor () {
		toObservable<AbstractControl>( this.formControl ).pipe(
			takeUntil( this.destroy$ )
		).subscribe( ( control : AbstractControl ) : void => {
			this.valueChangesObserver.next();
			const observeFormValeChanges : Observable<number> = merge( ( control?.valueChanges ?? of( 0 ) ) , of( control?.value ?? 0 ) );
			observeFormValeChanges.pipe(
				distinctUntilChanged() ,
				debounceTime( 100 ) ,
				takeUntil( merge( this.valueChangesObserver , this.destroy$ ) )
			).subscribe( ( user_id : number ) : void => {
				this.loadSelectedEmployeeInfo( user_id );
			} )
		} );

		toObservable( this.menuTrigger ).pipe(
			takeUntil( this.destroy$ ) ,
			filter( ( menu : MatMenuTrigger ) : boolean => !! menu )
		).subscribe( ( menu : MatMenuTrigger ) : void => {
			menu.menuOpened.subscribe( () : void => {
				this.formSearchText.set( '' );
				this.loadEmployeeData( 1 , true );
			} );
			// menu.menuClosed.subscribe( () : void => {
			//
			// } )
		} );
	}

	ngOnInit () : void {

	}

	private loadSelectedEmployeeInfo ( user_id : number ) : void {
		if ( user_id ) {
			this.state.set( 'loading' );
			this.employeesService.getEmployeeByUserId( user_id , { select : EMPLOYEE_SELECT_OPTION_FIELDS } ).subscribe( {
				next  : ( employee : Employee ) : void => {
					this.select.set( employee );
					this.state.set( 'success' );
				} ,
				error : () : void => {
					this.state.set( 'error' );
				}
			} )
		}
		else {
			this.select.set( null );
			this.state.set( 'success' );
		}
	}

	public reloadSelectedEmployeeInfo ( event : Event ) : void {
		event.preventDefault();
		event.stopPropagation();
		this.loadSelectedEmployeeInfo( this.formControl().value );
	}

	public setEmployee ( employee : Employee ) : void {
		if ( this.formControl() ) {
			if ( employee.user_id !== this.formControl().value ) {
				this.formControl().setValue( employee.user_id );
				this.formControl().markAsTouched();
			}
		}
		this.closeMenu();
	}

	public avoidCloseMenuByClicking ( event : MouseEvent | KeyboardEvent ) : void {
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
			include    : this.donviId() ,
			include_by : 'donvi_id' ,
			paged
		};

		if ( this.formSearchText() ) {
			conditions.push(
				{ conditionName : 'full_name' , condition : IctuQueryCondition.like , value : `%${ this.formSearchText() }%` } ,
				{ conditionName : 'email' , condition : IctuQueryCondition.like , value : `%${ this.formSearchText() }%` , orWhere : "or" }
			)
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

	public reloadEmployeeData ( event : Event ) : void {
		event.preventDefault();
		event.stopPropagation();
		this.loadEmployeeData( this._temp.paged , this._temp.resetPaginator );
	}

	public onEmployeeControlSearch ( event : Event ) : void {
		event.preventDefault();
		event.stopPropagation();
		this.loadEmployeeData( 1 , true );
	}

	closeMenu () : void {
		this.menuTrigger()?.closeMenu();
	}

	onChangePage ( paged : number ) : void {
		this.loadEmployeeData( paged , false );
	}

	ngOnDestroy () : void {
		this.destroy$.next();
		this.destroy$.complete();
	}
}
