import { Component , inject , OnDestroy , OnInit , signal , WritableSignal } from '@angular/core';
import { AbstractControl , FormControl , FormGroup , ReactiveFormsModule , ValidationErrors , ValidatorFn , Validators } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { Subject , takeUntil } from 'rxjs';
import { AuthenticationService , ResetPasswordInfo } from '@services/authentication.service';
import { NotificationService } from '@services/notification.service';
import { ActivatedRoute , Router , RouterLink } from '@angular/router';
import { FormGroupType } from '@models/common';
import { passwordValidator } from '@utilities/validators';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { distinctUntilChanged } from 'rxjs/operators';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { MatButton } from '@angular/material/button';
import { NgScrollbar } from 'ngx-scrollbar';
import { SharedModule } from '@shared/shared.module';

interface ForgotPasswordFields {
	token : string;
	password : string;
	password_confirmation : string;
}

type ResetPasswordFormGroup = FormGroupType<ForgotPasswordFields>;

const RePasswordValidator : ValidatorFn = ( control : AbstractControl ) : ValidationErrors | null => control.valid && control.parent?.get( 'password' ).valid ? control.parent.get( 'password' ).value.trim() === control.value.trim() ? null : { passwordAndRePasswordNotMatch : true } : null;

@Component( {
	selector    : 'app-reset-password' ,
	imports     : [ LoadingProgressComponent , MatButton , NgScrollbar , ReactiveFormsModule , RouterLink , SharedModule ] ,
	templateUrl : './reset-password.component.html' ,
	styleUrls   : [ '../login/login.component.css' , './reset-password.component.css' ]
} )
export default class ResetPasswordComponent implements OnInit , OnDestroy {

	private title : Title = inject( Title );

	private auth : AuthenticationService = inject( AuthenticationService );

	private notification : NotificationService = inject( NotificationService );

	private router : Router = inject( Router );

	private activatedRoute : ActivatedRoute = inject( ActivatedRoute );

	protected readonly loading : WritableSignal<boolean> = signal<boolean>( false );

	protected readonly hidePassword : WritableSignal<boolean> = signal<boolean>( true );

	protected readonly hideConfirmPassword : WritableSignal<boolean> = signal<boolean>( true );

	protected readonly formGroup : ResetPasswordFormGroup = new FormGroup( {
		token                 : new FormControl<string>( '' , Validators.required ) ,
		password              : new FormControl<string>( '' , [ Validators.required , passwordValidator ] ) ,
		password_confirmation : new FormControl<string>( '' , [ Validators.required , RePasswordValidator ] )
	} );

	protected readonly tokenExpired : WritableSignal<boolean> = signal<boolean>( false );

	private section : number = 0;

	private destroyed$ : Subject<string> = new Subject<string>();

	private submitDataObserver : Subject<number> = new Subject<number>();

	constructor() {
		this.title.setTitle( '.:: Cập nhật khẩu - [AMS] ::.' );
		this.submitDataObserver.asObservable().pipe(
			takeUntilDestroyed() ,
			distinctUntilChanged()
		).subscribe( () : void => {
			this.submitData();
		} );
	}

	ngOnInit() : void {
		if ( this.activatedRoute.snapshot.queryParamMap.has( 'token' ) && this.activatedRoute.snapshot.queryParamMap.get( 'token' ) ) {
			this.getControl( 'token' ).setValue( this.activatedRoute.snapshot.queryParamMap.get( 'token' ) );
		} else {
			this.tokenExpired.set( true );
		}
	}

	protected getControl<K extends keyof ForgotPasswordFields>( key : K ) : FormControl<ForgotPasswordFields[K]> {
		return this.formGroup.controls[ key ];
	}

	protected eventSubmit() : void {
		if ( this.formGroup.valid ) {
			this.submitDataObserver.next( this.section );
		}
	}

	private submitData() : void {
		this.loading.set( true );
		const info : ResetPasswordInfo = {
			token                 : this.getControl( 'token' ).value ,
			password              : this.getControl( 'password' ).value.trim() ,
			password_confirmation : this.getControl( 'password_confirmation' ).value.trim()
		};
		this.auth.resetPassword( info ).pipe(
			takeUntil( this.destroyed$ )
		).subscribe( {
			next  : () : void => {
				this.loading.set( false );
				this.notification.toastSuccess( 'Cập nhật mật khẩu mới thành công' );
				void this.router.navigateByUrl( '/login' );
			} ,
			error : ( res : HttpErrorResponse ) : void => {
				this.section += 1;
				if ( res.error?.code === 'expired' ) {
					this.tokenExpired.set( true );
				}
				this.loading.set( false );
			}
		} );
	}

	protected focusToNextElement( event : Event , nextElement : HTMLInputElement ) : null {
		event.stopPropagation();
		event.preventDefault();
		nextElement.focus();
		return null;
	}

	protected togglePasswordVisibility( state : WritableSignal<boolean> ) : void {
		state.update( ( isVisible : boolean ) : boolean => !isVisible );
	}

	ngOnDestroy() : void {
		this.destroyed$.next( '' );
		this.destroyed$.complete();
	}
}
