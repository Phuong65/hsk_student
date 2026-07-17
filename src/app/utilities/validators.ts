import { AbstractControl , FormGroup , ValidationErrors , ValidatorFn } from '@angular/forms';
import dayjs from 'dayjs';
import { PasswordCriteriaCheck } from '@pages/admin/children/account/children/password/password.component';

type RegValidatorFn<T> = ( value : T ) => boolean;

const matchPassword : RegValidatorFn<string> = ( value : string ) : boolean => {
	const PASSWORD_REGEX : RegExp = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?!.*?\s)(?=.*?[#?!@$%^&*-]).{8,30}$/;
	return PASSWORD_REGEX.test( value );
};

export const USER_NAME_REGEX : RegExp = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/gm;

export const PHONE_REGEX : RegExp = /^[+]*[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/;

export const EMAIL_REGEX : RegExp = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

export const DDMMYYYYDateFormatValidator : ValidatorFn = ( control : AbstractControl ) : ValidationErrors | null => ( !control.value || dayjs( control.value , 'DD/MM/YYYY' , true ).isValid() ) ? null : { theDateDoesNotExist : true };

export const PhoneNumberValidator : ValidatorFn = ( control : AbstractControl ) : ValidationErrors | null => control.value ? PHONE_REGEX.test( control.value ) ? null : { invalidPhoneNumberStructure : true } : null;

export const EmailValidator : ValidatorFn = ( control : AbstractControl ) : ValidationErrors | null => !control.value || EMAIL_REGEX.test( control.value ) ? null : { invalidEmail : true };

export const UserNameValidator : ValidatorFn = ( control : AbstractControl ) : ValidationErrors | null => !control.value || USER_NAME_REGEX.test( control.value ) ? null : { invalidUserName : true };

export const passwordValidator : ValidatorFn = ( control : AbstractControl ) : ValidationErrors | null => !control.value || matchPassword( control.value ) ? null : { invalidPassword : true };

export const slugValidator : ValidatorFn = ( control : AbstractControl ) : ValidationErrors | null => {
	const validated : boolean = Boolean( control.value ) ? /^[a-z0-9]+(?:[-_]+[a-z0-9]+)*$/gm.test( control.value ) : true;
	return validated ? null : { invalidSlugFormat : true };
};

export const passwordMatchValidator : ValidatorFn = ( control : FormGroup ) : ValidationErrors | null => {
	const password : AbstractControl<string>        = control.get( 'password' );
	const confirmPassword : AbstractControl<string> = control.get( 'confirmPassword' );

	if ( password && confirmPassword && password.value !== confirmPassword.value ) {
		return { 'passwordMismatch' : true };
	}

	return null;
};

export type PasswordCriteria = 'length' | 'uppercase' | 'lowercase' | 'number' | 'specialCharacter' | 'whitespace';

type PasswordGuide = {
	[T in PasswordCriteria]? : boolean
};

export const REACTIVE_PASSWORD_VALIDATOR : ( control : AbstractControl ) => ValidationErrors | null = ( control : AbstractControl ) : ValidationErrors | null => {
	if ( !control.value ) {
		return null;
	}
	const _checker : PasswordCriteriaCheck = {
		length           : ( str : string ) : boolean => /.{8,30}/.test( str ) ,
		uppercase        : ( str : string ) : boolean => /[A-Z]/.test( str ) ,
		lowercase        : ( str : string ) : boolean => /[a-z]/.test( str ) ,
		number           : ( str : string ) : boolean => /\d/.test( str ) ,
		whitespace       : ( str : string ) : boolean => !/\s/.test( str ) ,
		specialCharacter : ( str : string ) : boolean => /[#?!@$%^&*-]/.test( str )
	};

	const passwordMatchValidator : PasswordGuide | null = Object.keys( _checker ).reduce( ( reducer , criteria ) => {
		if ( !_checker[ criteria ]( control.value ) ) {
			reducer[ criteria ] = false;
		}
		return reducer;
	} , {} );

	return Object.keys( passwordMatchValidator ).length ? { passwordMatchValidator } : null;
};
