import { Component , computed , inject , OnDestroy , Signal , signal , WritableSignal } from '@angular/core';
import { NavigationCancel , NavigationEnd , NavigationError , NavigationStart , Router , RouterModule } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';
import { AuthenticationService } from '@services/authentication.service';
import { NotificationService } from '@services/notification.service';
import { debounceTime , delay , fromEvent , map , merge , Observable , Observer , Subject } from 'rxjs';
import { ENVIRONMENT } from '@env';
import { currentUserTimeZone } from '@utilities/syscats';
import { Toast } from 'primeng/toast';
import { Ripple } from 'primeng/ripple';
import { ButtonDirective , ButtonIcon } from 'primeng/button';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { distinctUntilChanged } from 'rxjs/operators';

interface ScreenDimension {
    width : number;
    height : number;
}

@Component( {
    selector    : 'app-root' ,
    imports     : [ SharedModule , RouterModule , Toast , Ripple , ButtonDirective , ButtonIcon ] ,
    templateUrl : './app.component.html' ,
    styleUrls   : [ './app.component.css' ] ,
    standalone  : true ,
    host        : {
        class : 'ictu-app-root'
    }
} )
export class AppComponent implements OnDestroy {

    readonly isSpinnerVisible : WritableSignal<boolean> = signal<boolean>( true );

    readonly isInternetConnected : WritableSignal<boolean> = signal<boolean>( true );

    readonly userCloseNotice : WritableSignal<boolean> = signal<boolean>( false );

    readonly displayLostConnectionNotice : Signal<boolean> = computed( () : boolean => ( ! this.isInternetConnected() && ! this.userCloseNotice() ) );

    readonly appVersion : string = ENVIRONMENT.appVersion + ' ' + currentUserTimeZone;

    private router : Router = inject( Router );

    private auth : AuthenticationService = inject( AuthenticationService );

    private notification : NotificationService = inject( NotificationService );

    private destroyed$ : Subject<void> = new Subject<void>();

    // private observeWindowResize$ : Subject<string> = new Subject<string>();
    //
    // @HostListener( 'window:resize' ) onWindowResize () : void {
    //     this.observeWindowResize$.next( 'window:resize' );
    // }

    private screenSizeDetectionObserver : Subject<ScreenDimension> = new Subject();

    constructor () {
        this.router.events.subscribe( {
            next  : ( event ) : void => {
                if ( event instanceof NavigationStart ) {
                    this.isSpinnerVisible.set( true );
                }
                else if ( event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError ) {
                    this.isSpinnerVisible.set( false );
                }
            } ,
            error : () : void => {
                this.isSpinnerVisible.set( false );
            }
        } );
        // this.measureDeviceScreenSize();

        this.auth.onGetToLoginPage.pipe(
            debounceTime( 100 ) ,
            takeUntilDestroyed()
        ).subscribe( () : void => {
            void this.router.navigateByUrl( '/auth/login' );
        } );

        this.notification.onSignOut.pipe(
            debounceTime( 100 ) ,
            takeUntilDestroyed()
        ).subscribe( () : void => {
            this.auth.logout();
        } );

        merge(
            fromEvent<boolean>( window , 'offline' ).pipe(
                map( () : boolean => false )
            ) ,
            fromEvent<boolean>( window , 'online' ).pipe(
                map( () : boolean => true )
            ) ,
            new Observable<boolean>( ( subscribe : Observer<boolean> ) : void => {
                subscribe.next( navigator.onLine );
                subscribe.complete();
            } ).pipe(
                delay( 1000 )
            )
        ).pipe(
            takeUntilDestroyed()
        ).subscribe( ( isConnected : boolean ) : void => {
            this.isInternetConnected.set( isConnected );
            this.userCloseNotice.set( false );
        } );

        window.oncontextmenu = () : boolean => false;

        // this.observeWindowResize$.asObservable().pipe(
        //     debounceTime( 500 ) ,
        //     takeUntilDestroyed()
        // ).subscribe( () : void => {
        //     this.measureDeviceScreenSize();
        // } );

        this.screenSizeDetectionObserver.asObservable().pipe(
            takeUntilDestroyed() ,
            distinctUntilChanged( ( previous : ScreenDimension , current : ScreenDimension ) : boolean => previous?.width === current.width && previous?.height === current.height )
        ).subscribe( ( { width , height } : ScreenDimension ) : void => {
            document.body.style.setProperty( '--max-screen-height' , height + 'px' );
            document.body.style.setProperty( '--max-screen-width' , width + 'px' );
        } );

        if ( window.visualViewport ) {
            window.visualViewport.addEventListener( 'resize' , () : void => this.screenSizeDetection() );
            window.visualViewport.addEventListener( 'scroll' , () : void => this.screenSizeDetection() );
            window.addEventListener( 'orientationchange' , () : void => {
                setTimeout( () : void => this.screenSizeDetection() , 300 );
            } );
        }
        else {
            window.addEventListener( 'resize' , () : void => this.screenSizeDetection() );
        }

        this.screenSizeDetection();
    }

    closeLostConnectionNotice () : void {
        this.userCloseNotice.set( true );
    }

    // private measureDeviceScreenSize () : void {
    //     const _div : HTMLElement = Object.assign( document.createElement( 'div' ) , { classList : 'element-app-checker' } );
    //     document.body.appendChild( appendElementStyle( _div , {
    //         position : 'fixed' ,
    //         inset    : '0' ,
    //         zIndex   : '-999999' ,
    //         width    : '100%' ,
    //         height   : '100%'
    //     } ) );
    //     document.body.style.setProperty( '--device-height' , Math.min( _div.clientHeight , window.innerHeight ) + 'px' );
    //     document.body.style.setProperty( '--device-width' , Math.min( _div.clientWidth , window.innerWidth ) + 'px' );
    //
    //     setTimeout( () : void => _div.remove() , 500 );
    // }

    private screenSizeDetection () : void {
        let width : number  = window.innerWidth;
        let height : number = window.innerHeight;
        if ( window.visualViewport ) {
            width  = window.visualViewport.width;
            height = window.visualViewport.height;
        }
        this.screenSizeDetectionObserver.next( { width , height } );
    }

    ngOnDestroy () : void {
        this.destroyed$.next();
        this.destroyed$.complete();
        this.auth.disconnectSocket();
    }
}
