import { Component , computed , inject , OnDestroy , Signal , signal , WritableSignal } from '@angular/core';
import { AppState } from '@models/app-state';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { InputText } from 'primeng/inputtext';
import { AbstractControl , FormControl , FormGroup , ReactiveFormsModule , ValidationErrors , ValidatorFn , Validators } from '@angular/forms';
import { NgClass } from '@angular/common';
import { map , Subject , takeUntil } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import { MatButton } from '@angular/material/button';
import { NotificationService } from '@services/notification.service';
import { ConfirmDialogData } from '@theme/components/confirm/confirm.component';
import { BUTTON_NO , BUTTON_YES , ButtonBase } from '@models/button';
import { UserService } from '@services/user.service';

export type PasswordCriteria = 'length' | 'uppercase' | 'lowercase' | 'number' | 'specialCharacter' | 'whitespace';

type PasswordGuide = {
    [T in PasswordCriteria]? : boolean
};

export type PasswordCriteriaCheck = Record<PasswordCriteria , ( input : string ) => boolean>;

type PasswordInputFieldType = 'password' | 'text';

type PasswordInputField = 'password' | 'confirm_password'

type FromResetPassword = Record<PasswordInputField , FormControl<string>>

export const REACTIVE_PASSWORD_VALIDATOR : ( control : AbstractControl ) => ValidationErrors | null = ( control : AbstractControl ) : ValidationErrors | null => {
    if ( ! control.value ) {
        return null;
    }
    const _checker : PasswordCriteriaCheck = {
        length           : ( str : string ) : boolean => /.{8,30}/.test( str ) ,
        uppercase        : ( str : string ) : boolean => /[A-Z]/.test( str ) ,
        lowercase        : ( str : string ) : boolean => /[a-z]/.test( str ) ,
        number           : ( str : string ) : boolean => /\d/.test( str ) ,
        whitespace       : ( str : string ) : boolean => ! /\s/.test( str ) ,
        specialCharacter : ( str : string ) : boolean => /[#?!@$%^&*-]/.test( str )
    };

    const passwordMatchValidator : PasswordGuide | null = Object.keys( _checker ).reduce( ( reducer , criteria ) => {
        if ( ! _checker[ criteria ]( control.value ) ) {
            reducer[ criteria ] = false;
        }
        return reducer;
    } , {} );

    return Object.keys( passwordMatchValidator ).length ? { passwordMatchValidator } : null;
}

const passwordCriteriaCheck2String : ( obj : PasswordGuide , separator : string ) => string = ( obj : PasswordGuide , separator : string ) : string => {
    return obj ? Object.keys( obj ).reduce( ( reducer : string[] , key : string ) : string[] => {
        reducer.push( `${ key }:${ obj[ key ] }` );
        return reducer;
    } , [] ).join( separator ) : '';
}

function passwordMatchValidator () : ValidatorFn {
    return ( form : FormGroup<FromResetPassword> ) : ( ValidationErrors | null ) => {
        if ( form.controls.password.valid && form.controls.confirm_password.valid ) {
            return form.controls.password.value === form.controls.confirm_password.value ? null : { passwordFieldsIsNotMatches : true };
        }
        else {
            return null;
        }
    }
}

@Component( {
    selector    : 'app-password' ,
    imports     : [ LoadingProgressComponent , InputText , ReactiveFormsModule , NgClass , MatButton ] ,
    templateUrl : './password.component.html' ,
    styleUrl    : './password.component.css'
} )
export default class PasswordComponent implements OnDestroy {

    readonly state : WritableSignal<AppState>                              = signal<AppState>( 'success' );
    readonly passwordInputField : WritableSignal<PasswordInputFieldType>   = signal<PasswordInputFieldType>( 'password' );
    readonly rePasswordInputField : WritableSignal<PasswordInputFieldType> = signal<PasswordInputFieldType>( 'password' );
    private readonly _passwordGuide : WritableSignal<PasswordGuide>        = signal<PasswordGuide>( { length : false , uppercase : false , lowercase : false , number : false , whitespace : false , specialCharacter : false } );
    readonly passwordMatchedLength : Signal<boolean>                       = computed<boolean>( () : boolean => this._passwordGuide().length );
    readonly passwordMatchedUppercase : Signal<boolean>                    = computed<boolean>( () : boolean => this._passwordGuide().uppercase );
    readonly passwordMatchedLowercase : Signal<boolean>                    = computed<boolean>( () : boolean => this._passwordGuide().lowercase );
    readonly passwordMatchedNumber : Signal<boolean>                       = computed<boolean>( () : boolean => this._passwordGuide().number );
    readonly passwordMatchedWhitespace : Signal<boolean>                   = computed<boolean>( () : boolean => this._passwordGuide().whitespace );
    readonly passwordMatchedSpecialCharacter : Signal<boolean>             = computed<boolean>( () : boolean => this._passwordGuide().specialCharacter );

    readonly formGroup : FormGroup = new FormGroup<FromResetPassword>( {
        password         : new FormControl( '' , [ Validators.required , REACTIVE_PASSWORD_VALIDATOR ] ) ,
        confirm_password : new FormControl( '' , [ Validators.required , REACTIVE_PASSWORD_VALIDATOR ] )
    } , { validators : passwordMatchValidator() } );

    get f () : Record<PasswordInputField , AbstractControl<string>> {
        return this.formGroup.controls as Record<PasswordInputField , AbstractControl<string>>;
    }

    private destroy$ : Subject<void> = new Subject<void>();

    private requestSubmit$ : Subject<void> = new Subject<void>();

    private notificationService : NotificationService = inject( NotificationService );

    private userService : UserService = inject( UserService );

    constructor () {
        this.f.password.valueChanges.pipe(
            takeUntil( this.destroy$ ) ,
            map( () : PasswordGuide | null => this.f.password.getError( 'passwordMatchValidator' ) ?? null ) ,
            distinctUntilChanged( ( previous : PasswordGuide , current : PasswordGuide ) : boolean => previous && current && ( passwordCriteriaCheck2String( previous , '|' ) === passwordCriteriaCheck2String( current , '|' ) ) )
        ).subscribe( ( value : PasswordGuide | null ) : void => this._passwordGuide.update( () : PasswordGuide => {
            return value ? Object.assign<PasswordGuide , PasswordGuide>( {
                length           : true ,
                uppercase        : true ,
                lowercase        : true ,
                number           : true ,
                whitespace       : true ,
                specialCharacter : true
            } , value ) : {
                length           : this.f.password.valid ,
                uppercase        : this.f.password.valid ,
                lowercase        : this.f.password.valid ,
                number           : this.f.password.valid ,
                whitespace       : this.f.password.valid ,
                specialCharacter : this.f.password.valid
            }
        } ) );

        this.requestSubmit$.pipe(
            takeUntil( this.destroy$ )
        ).subscribe( () : void => this.confirmUpdatePassword() )
    }

    public changeViewMode ( passwordInputField : WritableSignal<PasswordInputFieldType> ) : void {
        passwordInputField.update( ( value : PasswordInputFieldType ) : PasswordInputFieldType => value === 'password' ? 'text' : 'password' );
    }

    public btnSubmit () : void {
        if ( this.formGroup.valid ) {
            this.requestSubmit$.next();
        }
    }

    private confirmUpdatePassword () : void {
        const confirmTemplate : ConfirmDialogData = {
            heading : 'Xác nhận cập nhật' ,
            message : '<p>Bạn có chăc chắn muốn cập nhật mật khẩu không?</p>' ,
            buttons : [ BUTTON_YES , BUTTON_NO ]
        };
        this.notificationService.confirm( confirmTemplate ).pipe(
            takeUntil( this.destroy$ )
        ).subscribe( ( btn : ButtonBase ) : void => {
            if ( btn.name === BUTTON_YES.name ) {
                this.updatePassword();
            }
        } )
    }

    private updatePassword () : void {
        this.state.set( 'loading' );
        this.userService.update( { password : this.f.password.value } ).pipe(
            takeUntil( this.destroy$ )
        ).subscribe( {
            next  : () : void => {
                this.formGroup.reset( { password : '' , confirm_password : '' } );
                this.notificationService.toastSuccess( 'Cập nhật mật khẩu thành công' );
                this.state.set( 'success' );
            } ,
            error : () : void => {
                this.state.set( 'success' );
            }
        } );
    }

    ngOnDestroy () : void {
        this.destroy$.next();
        this.destroy$.complete();
    }

}
