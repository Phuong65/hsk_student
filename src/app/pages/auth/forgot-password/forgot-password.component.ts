import { Component , inject , OnDestroy , signal , WritableSignal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { FormBuilder , FormControl , ReactiveFormsModule , Validators } from '@angular/forms';
import { SharedModule } from '@shared/shared.module';
import { Title } from '@angular/platform-browser';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthenticationService } from '@services/authentication.service';
import { NotificationService } from '@services/notification.service';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { Subject , takeUntil } from 'rxjs';
import { FormGroupType } from '@models/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { distinctUntilChanged } from 'rxjs/operators';
import { ENVIRONMENT } from '@env';
import { currentUserTimeZone } from '@utilities/syscats';
import { RouterLink } from '@angular/router';

type forgotPasswordState = 'waiting' | 'loading' | 'success';

interface ForgotPasswordFields {
	email : string;
}

type ForgotPasswordFormGroup = FormGroupType<ForgotPasswordFields>

@Component( {
	selector    : 'app-forgot-password' ,
	imports     : [ MatButton , ReactiveFormsModule , SharedModule , LoadingProgressComponent , RouterLink ] ,
	templateUrl : './forgot-password.component.html' ,
	styleUrls   : [ '../login/login.component.css' , './forgot-password.component.css' ]
} )
export default class ForgotPasswordComponent implements OnDestroy {

	protected readonly state : WritableSignal<forgotPasswordState> = signal( 'waiting' );

	readonly appVersion : WritableSignal<string> = signal( `V${ ENVIRONMENT.appVersion } ${ currentUserTimeZone }` );

	private fb : FormBuilder = inject( FormBuilder );

	private title : Title = inject( Title );

	private auth : AuthenticationService = inject( AuthenticationService );

	private notification : NotificationService = inject( NotificationService );

	private readonly destroyed$ : Subject<void> = new Subject();

	private readonly submitObserver : Subject<number> = new Subject();

	private section : number = 0;

	formGroup : ForgotPasswordFormGroup = this.fb.group( {
		email : [ '' , [ Validators.required , Validators.email ] ]
	} );

	get errorMessage() : string {
		return this.getControl( 'email' ).hasError( 'required' ) ? 'Vui lòng nhập địa chỉ email' : this.getControl( 'email' ).hasError( 'email' ) ? 'Địa chỉ email không hợp lệ' : '';
	}

	constructor() {
		this.title.setTitle( '.:: Quên mật khẩu - [AMS] ::.' );
		this.submitObserver.asObservable().pipe(
			takeUntilDestroyed() ,
			distinctUntilChanged()
		).subscribe( () : void => {
			this.submitData();
		} );
	}

	protected getControl<K extends keyof ForgotPasswordFields>( key : K ) : FormControl<ForgotPasswordFields[K]> {
		return this.formGroup.controls[ key ];
	}

	private submitData() : void {
		this.state.set( 'loading' );
		this.auth.forgetPassword( this.getControl( 'email' ).value.trim() ).pipe(
			takeUntil( this.destroyed$ )
		).subscribe( {
			next  : () : void => {
				this.state.set( 'success' );
				this.section += 1;
			} ,
			error : ( error : HttpErrorResponse ) : void => {
				this.state.set( 'waiting' );
				this.section += 1;
				if ( !error.status ) {
					this.notification.toastError( 'Mất kết nối với máy chủ' );
				}
			}
		} );
	}

	protected eventSubmit( event? : Event ) : void {
		if ( event ) {
			event.preventDefault();
			event.stopPropagation();
		}
		if ( this.formGroup.valid ) {
			this.submitObserver.next( this.section );
		}
	}

	ngOnDestroy() : void {
		this.destroyed$.next();
		this.destroyed$.complete();
	}
}
