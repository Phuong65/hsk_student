import { Component , computed , forwardRef , inject , input , InputSignal , model , ModelSignal , OnDestroy , OnInit , Signal , signal , WritableSignal } from '@angular/core';
import { ControlValueAccessor , FormsModule , NG_VALUE_ACCESSOR , ReactiveFormsModule } from '@angular/forms';
import { debounceTime , Subject , takeUntil } from 'rxjs';
import { AppState } from '@models/app-state';
import { Employee , SimpleEmployee } from '@models/employee';
import { NgClass , NgOptimizedImage } from '@angular/common';
import { EmployeesService } from '@services/employees.service';
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from '@models/dto';
import { AuthenticationService } from '@services/authentication.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Select } from 'primeng/select';
import { IctuDropdownOption2 } from '@models/ictu-dropdown-option';
import { EmployeePhotoPipe } from '@pipes/employee-photo.pipe';

type StaffControlValueKey = 'id' | 'user_id';

type StaffControlLayout = 'full' | 'simple';

@Component( {
	selector    : 'staff-control' ,
	imports     : [ NgOptimizedImage , Select , ReactiveFormsModule , EmployeePhotoPipe , FormsModule , NgClass ] ,
	standalone  : true ,
	providers   : [ {
		provide     : NG_VALUE_ACCESSOR ,
		useExisting : forwardRef( () : typeof StaffControlComponent => StaffControlComponent ) ,
		multi       : true
	} ] ,
	templateUrl : './staff-control.component.html' ,
	styleUrl    : './staff-control.component.css'
} )
export class StaffControlComponent implements ControlValueAccessor , OnInit , OnDestroy {

	private employeesService : EmployeesService = inject( EmployeesService );

	private auth : AuthenticationService = inject( AuthenticationService );

	private destroyed$ : Subject<void> = new Subject<void>();

	employees : ModelSignal<SimpleEmployee[]> = model<SimpleEmployee[]>( [] );

	dropdownIcon : InputSignal<string> = input<string>( 'pi pi-user' );

	panelStyleClass : InputSignal<string> = input<string>( '' );

	emptyFilterMessage : InputSignal<string> = input<string>( 'Không tìm thấy giáo viên.' );

	emptyMessage : InputSignal<string> = input<string>( 'Không có giáo viên.' );

	placeholder : InputSignal<string> = input<string>( 'Chọn giáo viên' );

	showClear : InputSignal<boolean> = input<boolean>( false );

	filter : InputSignal<boolean> = input<boolean>( false );

	layout : InputSignal<StaffControlLayout> = input<StaffControlLayout>( 'full' );

	keyValue : InputSignal<StaffControlValueKey> = input<StaffControlValueKey>( 'user_id' ); // Định nghĩa trường nào của employee truyền vào value của control mặc định là user_id

	panelStyleClasses : Signal<string> = computed( () : string => [ 'staff-control-selector-panel' , this.panelStyleClass() ].filter( Boolean ).join( ' ' ) );

	readonly state : WritableSignal<AppState> = signal( 'loading' );

	readonly disabled : WritableSignal<boolean> = signal( false );

	value : number = 0;

	get donViID () : number {
		return this.auth.user?.donvi_id ?? 0;
	}

	private reloadObserver : Subject<void> = new Subject<void>();

	readonly options : Signal<IctuDropdownOption2<SimpleEmployee , number>[]> = computed( () : IctuDropdownOption2<SimpleEmployee , number>[] => {
		return this.employees().map( ( raw : SimpleEmployee ) : IctuDropdownOption2<SimpleEmployee , number> => ( { raw , value : raw[ this.keyValue() ] , label : raw.full_name , disabled : false } ) );
	} )

	constructor () {
		this.reloadObserver.asObservable().pipe(
			takeUntilDestroyed() ,
			debounceTime( 500 )
		).subscribe( () : void => {
			this.loadEmployees();
		} );
	}

	ngOnInit () : void {
		this.loadEmployees();
	}

	private loadEmployees () : void {
		if ( this.employees().length > 0 ) {
			this.state.set( 'success' );
		}
		else {
			const conditions : IctuConditionParam[] = [
				{ conditionName : 'donvi_id' , condition : IctuQueryCondition.equal , value : this.donViID.toString( 10 ) }
			];
			const queryParams : IctuQueryParams     = {
				select  : 'id,photo,user_id,email,phone,name,full_name,code,donvi_id,csdt_id,gender,dob' ,
				limit   : -1 ,
				paged   : 1 ,
				order   : 'ASC' ,
				orderby : 'name'
			};
			this.employeesService.query( conditions , queryParams , 'all' ).pipe(
				takeUntil( this.destroyed$ )
			).subscribe( {
				next  : ( response : DtoObject<Employee[]> ) : void => {
					this.employees.set( response.data );
					this.state.set( 'success' );
				} ,
				error : () : void => {
					this.state.set( 'error' );
				}
			} );
		}
	}

	private onChangeFn : ( _ : any ) => void = ( _ : any ) : void => {
	};

	private onTouchedFn : () => void = () : void => {
	};

	writeValue ( value : number ) : void {
		this.value = value;
	}

	registerOnChange ( fn : any ) : void {
		this.onChangeFn = fn;
	}

	registerOnTouched ( fn : any ) : void {
		this.onTouchedFn = fn;
	}

	setDisabledState ( isDisabled : boolean ) : void {
		this.disabled.set( isDisabled );
	}

	protected triggerChanges ( value : number ) : void {
		this.onChangeFn( value );
		this.onTouchedFn();
	}

	protected btnReload () : void {
		this.state.set( 'loading' );
		this.reloadObserver.next();
	}

	ngOnDestroy () : void {
		this.destroyed$.next();
		this.destroyed$.complete();
	}
}
