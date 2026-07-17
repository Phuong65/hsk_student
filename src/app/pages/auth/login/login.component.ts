import { Component , computed , inject , OnDestroy , OnInit , Signal , signal , WritableSignal } from '@angular/core';
import { FormBuilder , FormControl , ReactiveFormsModule , Validators } from '@angular/forms';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatButton , MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatSuffix } from '@angular/material/form-field';
import { Title } from '@angular/platform-browser';
import { AuthenticationService } from '@services/authentication.service';
import { UserSignIn } from '@models/auth';
import { ActivatedRoute , Router , RouterLink } from '@angular/router';
import { APP_REDIRECT_LINKS , PickRole , SysRoleName } from '@models/role';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { NgScrollbar } from 'ngx-scrollbar';
import { debounceTime , map , Subject , takeUntil , timer } from 'rxjs';
import { currentUserTimeZone } from '@utilities/syscats';
import { ENVIRONMENT , getApiRouteLink } from '@env';
import { SignInWithThirdParty , SignInWithThirdPartyResponse } from '@pages/auth/interfaces/sign-in-with-third-party';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient , HttpParams } from '@angular/common/http';
import { NotificationService } from '@services/notification.service';
import { FormGroupType } from '@models/common';

type FormLogin = FormGroupType<UserSignIn>

@Component( {
	selector    : 'app-login' ,
	imports     : [ ReactiveFormsModule , MatCheckbox , MatButton , MatIcon , MatIconButton , MatSuffix , LoadingProgressComponent , NgScrollbar , RouterLink ] ,
	templateUrl : './login.component.html' ,
	styleUrl    : './login.component.css'
} )
export default class LoginComponent implements OnInit , OnDestroy {

	private notification : NotificationService = inject( NotificationService );

	private http : HttpClient = inject( HttpClient );

	private fb : FormBuilder = inject( FormBuilder );

	private title : Title = inject( Title );

	private activatedRoute : ActivatedRoute = inject( ActivatedRoute );

	private router : Router = inject( Router );

	private auth : AuthenticationService = inject( AuthenticationService );

	private redirectLinks : Map<SysRoleName , string> = inject( APP_REDIRECT_LINKS );

	hide : boolean = true;

	protected readonly formGroup : FormLogin = this.fb.group( {
		username : [ '' , [ Validators.required , Validators.minLength( 3 ) ] ] ,
		password : [ '' , [ Validators.required , Validators.minLength( 6 ) ] ]
	} );

	loading : WritableSignal<boolean> = signal<boolean>( true );

	private destroyed$ : Subject<void> = new Subject<void>();

	readonly appVersion : WritableSignal<string> = signal( `V${ ENVIRONMENT.appVersion } ${ currentUserTimeZone }` );

	readonly enableSignInWithGoogle : Signal<boolean> = signal<boolean>( ENVIRONMENT.deployment.enableSignInWithGoogle );

	readonly enableSignInWithMicrosoft : Signal<boolean> = signal<boolean>( ENVIRONMENT.deployment.enableSignInWithMicrosoft );

	readonly enableSignInWithThirdParty : Signal<boolean> = computed( () : boolean => this.enableSignInWithGoogle() || this.enableSignInWithMicrosoft() );

	private signInWithThirdPartyObserver : Subject<SignInWithThirdParty> = new Subject<SignInWithThirdParty>();

	constructor() {
		this.signInWithThirdPartyObserver.asObservable().pipe(
			debounceTime( 200 ) ,
			takeUntilDestroyed()
		).subscribe( ( source : SignInWithThirdParty ) : void => {
			this.handleSignInWithThirdPartyAccounts( source );
		} );
	}

	ngOnInit() : void {
		if ( this.auth.userLoggedIn ) {
			void this.redirectAfterAuthenticated();
		} else {
			this.title.setTitle( '.:: Đăng nhập - [AMS] ::.' );
			setTimeout( () : void => this.loading.set( false ) , 500 );
		}
	}

	enterOnUsernameField( event : Event , passwordInputField : HTMLInputElement ) : null {
		event.stopPropagation();
		event.preventDefault();
		passwordInputField.focus();
		return null;
	}

	onEnter( event : Event ) : null {
		event.stopPropagation();
		event.preventDefault();
		void this.submit();
		return null;
	}

	protected getControl<K extends keyof UserSignIn>( key : K ) : FormControl<UserSignIn[K]> {
		return this.formGroup.controls[ key ];
	}

	async submit() : Promise<void> {
		if ( this.formGroup.valid ) {
			this.loading.set( true );
			const signIn : UserSignIn = {
				username : this.getControl( 'username' ).value.trim() ,
				password : this.getControl( 'password' ).value.trim()
			};
			try {
				const successful : boolean = await this.auth.signIn( signIn );
				if ( successful ) {
					timer( 1000 ).pipe(
						takeUntil( this.destroyed$ )
					).subscribe( () : void => {
						this.loading.set( false );
						void this.redirectAfterAuthenticated();
					} );
				} else {
					this.loading.set( false );
				}
			} catch ( e ) {
				this.loading.set( false );
			}
		}
	}

	private async redirectAfterAuthenticated() : Promise<void> {
		let fallbackUrl : string = this.activatedRoute.snapshot.queryParamMap.has( 'fallbackUrl' ) ? decodeURIComponent( <string> this.activatedRoute.snapshot.queryParamMap.get( 'fallbackUrl' ) ) : '';
		if ( fallbackUrl ) {
			try {
				void this.router.navigate( [ fallbackUrl ] );
			} catch ( e ) {
				alert( e );
			}

		} else {
			const maxPowerRoleUser : PickRole | undefined = this.auth.maxPowerRoleUser();
			const redirectLink : string                   = maxPowerRoleUser ? this.redirectLinks.has( maxPowerRoleUser.name ) ? this.redirectLinks.get( maxPowerRoleUser.name ) : '' : '';
			if ( redirectLink ) {
				try {
					await this.router.navigate( [ redirectLink ] );
				} catch ( e ) {
					void this.router.navigate( [ 'throw-error' ] , {
						queryParams : {
							fallbackUrl : 'login' ,
							reason      : 'redirectLinkFailed' ,
							time        : Date.now()
						}
					} );
				}
			} else {
				// cause : user have no valid roles
				void this.router.navigate( [ 'unauthorized' ] , {
					queryParams : {
						time : Date.now()
					}
				} );
			}
		}

	}

	protected btnSignInWithThirdPartyAccounts( source : SignInWithThirdParty ) : void {
		this.loading.set( true );
		this.signInWithThirdPartyObserver.next( source );
	}

	private handleSignInWithThirdPartyAccounts( source : SignInWithThirdParty ) : void {
		const _baseUrl : URL = new URL( location.href );
		const endpoint : URL = new URL( _baseUrl.origin );
		endpoint.pathname    = 'auth/redirect-uri-call-back';
		endpoint.searchParams.set( 'redirect-uri-source' , source );
		const params : HttpParams = new HttpParams( {
			fromObject : {
				redirect_uri : endpoint.toString()
			}
		} );
		const _api : string       = getApiRouteLink( [ 'login' , source ].join( '-' ) );
		this.http.get<SignInWithThirdPartyResponse>( _api , { params } ).pipe(
			map( ( response : SignInWithThirdPartyResponse ) : string => {
				return response.data && ( /[(http(s)?):\/\/(www\.)?a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/ig ).test( response.data ) ? response.data : null;
			} ) ,
			takeUntil( this.destroyed$ )
		).subscribe( {
			next  : ( url : string ) : void => {
				if ( url ) {
					location.assign( url );
					setTimeout( () : void => {
						if ( this.loading ) {
							this.loading.set( false );
						}
					} , 500 );
				} else {
					this.loading.set( false );
					this.notification.toastError( 'Định dạng đường dẫn đăng nhập không đúng' );
				}
			} ,
			error : () : void => {
				this.loading.set( false );
			}
		} );
	}

	ngOnDestroy() : void {
		this.destroyed$.next();
		this.destroyed$.complete();
	}
}
