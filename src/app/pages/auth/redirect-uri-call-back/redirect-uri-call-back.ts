import { ApplicationRef , Component , computed , inject , OnDestroy , OnInit , Signal , signal , WritableSignal } from '@angular/core';
import { ActivatedRoute , ParamMap , Router } from '@angular/router';
import { SIGN_IN_WITH_THIRD_PARTY_VALUES , SignInWithThirdParty } from '@pages/auth/interfaces/sign-in-with-third-party';
import { AuthenticationService } from '@services/authentication.service';
import { NotificationService } from '@services/notification.service';
import { HttpClient , HttpErrorResponse } from '@angular/common/http';
import { merge , Observable , Subject , switchMap , takeUntil , timer } from 'rxjs';
import { getApiRouteLink } from '@env';
import { Token } from '@models/auth';
import { APP_REDIRECT_LINKS , PickRole , SysRoleName } from '@models/role';
import { ProgressBar } from 'primeng/progressbar';

const isRedirectFromSupportedThirdParty : ( value : unknown ) => boolean = ( value : unknown ) : value is SignInWithThirdParty => {
    return SIGN_IN_WITH_THIRD_PARTY_VALUES.includes( value as SignInWithThirdParty );
}

type RedirectUriCallBackState = 'checking' | 'loading' | 'invalid' | 'error' | 'success';

@Component( {
    selector    : 'app-redirect-uri-call-back' ,
    imports     : [ ProgressBar ] ,
    templateUrl : './redirect-uri-call-back.html' ,
    styleUrl    : './redirect-uri-call-back.css'
} )
export default class RedirectUriCallBack implements OnInit , OnDestroy {

    private auth : AuthenticationService = inject( AuthenticationService );

    private router : Router = inject( Router );

    private activatedRoute : ActivatedRoute = inject( ActivatedRoute );

    private notification : NotificationService = inject( NotificationService );

    private http : HttpClient = inject( HttpClient );

    private redirectLinks : Map<SysRoleName , string> = inject( APP_REDIRECT_LINKS );

    readonly state : WritableSignal<RedirectUriCallBackState> = signal( 'checking' );

    readonly heading : Signal<string> = computed( () : string => {
        switch ( this.state() ) {
            case 'loading':
                return 'Loading...';
            case 'invalid':
                return 'Invalid';
            case 'error':
                return 'Không thể kết nối với máy chủ.';
            default:
                return 'Processing...';
        }
    } );

    private sendingObserver : Subject<void> = new Subject();

    private destroy$ : Subject<void> = new Subject();

    ngOnInit () : void {
        this.validateParams();
    }

    private validateParams () : void {
        const queryParamMap : ParamMap      = this.activatedRoute.snapshot.queryParamMap;
        const source : SignInWithThirdParty = queryParamMap.has( 'redirect-uri-source' ) && isRedirectFromSupportedThirdParty( queryParamMap.get( 'redirect-uri-source' ) ) ? ( queryParamMap.get( 'redirect-uri-source' ) as SignInWithThirdParty ) : null;
        if ( source && queryParamMap.get( 'code' ) ) {
            this.sendCode( queryParamMap.get( 'code' ) , source );
        }
        else {
            switch ( true ) {
                case queryParamMap.has( 'error' ):
                    void this.router.navigateByUrl( '/auth/login' );
                    break;
                default:
                    this.notification.toastError( 'Mã xác thực không hợp lệ.' , 'Xác thực không thành công' );
                    void this.router.navigateByUrl( '/auth/login' );
                    break;
            }
        }
    }

    private sendCode ( code : string , source : SignInWithThirdParty ) : void {
        this.state.set( 'loading' );
        this.sendingObserver.next();
        const _api : string  = getApiRouteLink( [ 'login' , source ].join( '-' ) );
        const _baseUrl : URL = new URL( location.href );
        const endpoint : URL = new URL( _baseUrl.origin );
        endpoint.pathname    = 'auth/redirect-uri-call-back';
        endpoint.searchParams.set( 'redirect-uri-source' , source );
        this.http.post<Token>( _api , {
            code         : code ,
            redirect_uri : endpoint.toString()
        } ).pipe(
            switchMap( ( response : Token ) : Observable<boolean> => this.auth.startSession( response ) ) ,
            takeUntil(
                merge( this.destroy$ , this.sendingObserver )
            )
        ).subscribe( {
            next  : ( success : boolean ) : void => {
                if ( success ) {
                    this.notification.toastSuccess( 'Đăng nhập thành công' , 'Thông báo' );
                    // this.iOnlineSocket.online( this.appRef );
                    this.redirectAfterLoggedIn( 500 );
                }
                else {
                    this.notification.toastError( 'Quá trình xác thực bị gián đoạn' , 'Xác thực không thành công' );
                    void this.router.navigateByUrl( '/auth/login' );
                }
            } ,
            error : ( error : HttpErrorResponse ) : void => {
                switch ( error.status ) {
                    case 500:
                        this.notification.toastError( 'Máy chủ không phản hồi.' , 'Lỗi xác thực' );
                        void this.router.navigateByUrl( '/auth/login' );
                        break;
                    case 401:
                        this.notification.toastError( 'Mã xác thực đã hết hạn.' , 'Lỗi xác thực' );
                        void this.router.navigateByUrl( '/auth/login' );
                        break;
                    default:
                        void this.router.navigateByUrl( '/auth/login' );
                        break;
                }
            }
        } )
    }

    private redirectAfterLoggedIn ( delay : number = 0 ) : void {
        timer( delay ).pipe(
            takeUntil( this.destroy$ )
        ).subscribe( () : void => {
            void this.getToDashboard();
        } );
    }

    private async getToDashboard () : Promise<void> {
        const highestRole : PickRole | undefined = this.auth.maxPowerRoleUser();
        const redirectLink : string                   = highestRole ? this.redirectLinks.has( highestRole.name ) ? this.redirectLinks.get( highestRole.name ) : '' : ''
        if ( redirectLink ) {
            try {
                await this.router.navigateByUrl( redirectLink );
            }
            catch ( e ) {
                void this.router.navigate( [ 'throw-error' ] , {
                    queryParams : {
                        fallbackUrl : 'login' ,
                        reason      : 'redirectLinkFailed' ,
                        time        : Date.now()
                    }
                } );
            }
        }
        else {
            // cause : user have no valid roles
            void this.router.navigate( [ 'unauthorized' ] , {
                queryParams : {
                    time : Date.now()
                }
            } );
        }
    }

    ngOnDestroy () : void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
