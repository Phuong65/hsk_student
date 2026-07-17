import { Component , inject , OnDestroy , OnInit , signal , WritableSignal } from '@angular/core';
import { AuthenticationService } from "@services/authentication.service";
import { NotificationService } from "@services/notification.service";
import { debounceTime , Subject , takeUntil } from "rxjs";
import { Employee , EmployeeFormSocial , SocialMedia } from "@models/employee";
import { FormControl , FormGroup , ReactiveFormsModule , Validators } from "@angular/forms";
import { InputText } from "primeng/inputtext";
import { Textarea } from "primeng/textarea";
import { MatButton } from "@angular/material/button";
import { AppState } from "@models/app-state";
import { EmployeesService } from "@services/employees.service";

type AboutMeFormGroup = FormGroup<{
	bio : FormControl<string | null>;
	social_media : FormGroup<EmployeeFormSocial>
}>

type AboutMeInfo = Pick<Employee , 'bio' | 'social_media'>

@Component( {
	selector    : 'app-info-form-about-me' ,
	imports     : [ ReactiveFormsModule , InputText , Textarea , MatButton ] ,
	templateUrl : './info-form-about-me.component.html' ,
	styleUrl    : './info-form-about-me.component.css'
} )
export class InfoFormAboutMeComponent implements OnInit , OnDestroy {

	private auth : AuthenticationService = inject( AuthenticationService );

	private notification : NotificationService = inject<NotificationService>( NotificationService );

	private employeesService : EmployeesService = inject( EmployeesService );

	private destroy$ : Subject<void> = new Subject<void>();

	private submitObserver : Subject<AboutMeInfo> = new Subject<AboutMeInfo>();

	protected readonly state : WritableSignal<AppState> = signal<AppState>( 'success' );

	protected readonly formGroup : AboutMeFormGroup = new FormGroup( {
		bio          : new FormControl<string>( '' , [ Validators.maxLength( 250 ) ] ) ,
		social_media : new FormGroup<EmployeeFormSocial>( {
			facebook  : new FormControl<string>( '' , Validators.maxLength( 100 ) ) ,
			instagram : new FormControl<string>( '' , Validators.maxLength( 100 ) ) ,
			tiktok    : new FormControl<string>( '' , Validators.maxLength( 100 ) ) ,
			linkedIn  : new FormControl<string>( '' , Validators.maxLength( 100 ) ) ,
			youtube   : new FormControl<string>( '' , Validators.maxLength( 100 ) )
		} )
	} );

	ngOnInit () : void {
		if ( this.auth.employee ) {
			this.formGroup.reset( {
				bio          : this.auth.employee.bio ,
				social_media : Object.assign<SocialMedia , SocialMedia>( { facebook : '' , instagram : '' , tiktok : '' , linkedIn : '' , youtube : '' } , this.auth.employee.social_media )
			} )
		}

		this.submitObserver.pipe(
			takeUntil( this.destroy$ ) ,
			debounceTime( 1000 )
		).subscribe( ( data : AboutMeInfo ) : void => {
			this.submitData( data );
		} )
	}

	private submitData ( data : AboutMeInfo ) : void {
		this.employeesService.update( this.auth.employee.id , data ).pipe(
			takeUntil( this.destroy$ )
		).subscribe( {
			next  : () : void => {
				this.state.set( 'success' );
				this.notification.toastSuccess( 'Cập nhật thành công' );
			} ,
			error : () : void => {
				this.state.set( 'success' );
				this.notification.toastError( 'Cập nhật thất bại' );
			}
		} );
	}

	protected getControl<K extends keyof AboutMeFormGroup> ( key : K ) : FormControl<AboutMeFormGroup[K]> {
		return this.formGroup.get( key as string ) as FormControl<AboutMeFormGroup[K]>;
	}

	protected btnSave ( event : Event ) : void {
		event.preventDefault();
		event.stopPropagation();
		if ( this.formGroup.valid ) {
			this.state.set( 'loading' );
			this.submitObserver.next( <AboutMeInfo> this.formGroup.value );
		}
	}

	protected preventKeyDown ( event : Event ) : void {
		event.preventDefault();
		event.stopPropagation();
	}

	ngOnDestroy () : void {
		this.destroy$.next();
		this.destroy$.complete();
	}
}
