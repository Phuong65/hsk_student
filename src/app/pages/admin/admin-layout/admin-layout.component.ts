import { Component , computed , inject , OnDestroy , OnInit , signal , Signal , viewChild , WritableSignal } from '@angular/core';
import { IctuVerticalMenuComponent } from '@theme/layouts/menu/ictu-vertical-menu/ictu-vertical-menu.component';
import { MatButton } from '@angular/material/button';
import { MatDrawer , MatDrawerContainer , MatDrawerMode } from '@angular/material/sidenav';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AuthenticationService } from '@services/authentication.service';
import { IctuNavigation } from '@theme/types/navigation';
import { ENVIRONMENT } from '@env';
import { BreakpointObserver , BreakpointState } from '@angular/cdk/layout';
import { LayoutService } from '@theme/services/layout.service';
import { staticResource } from '@utilities/helper';
import { merge , retry , Subject , takeUntil } from 'rxjs';
import { Button } from '@models/button';
import { ConfirmDialogData } from '@theme/components/confirm/confirm.component';
import { NotificationService } from '@services/notification.service';
import { SysConfigsService } from '@services/sys-configs.service';
import { SystemConfig } from '@models/system-config';
import { IctuConditionParam , IctuQueryCondition , IctuQueryParams } from '@models/dto';
import { filter } from 'rxjs/operators';
import { Title } from '@angular/platform-browser';

interface NavResizeStyle {
    width : NavResizeState;
}

type NavResizeState = '280px' | '80px';

@Component( {
    selector    : 'app-admin-layout' ,
    imports     : [ CommonModule , IctuVerticalMenuComponent , MatButton , MatDrawer , MatDrawerContainer , NgOptimizedImage , RouterOutlet ] ,
    templateUrl : './admin-layout.component.html' ,
    styleUrl    : './admin-layout.component.scss'
} )
export class AdminLayoutComponent implements OnInit , OnDestroy {

    sidebar : Signal<MatDrawer | undefined> = viewChild<MatDrawer>( MatDrawer );

    private auth : AuthenticationService = inject( AuthenticationService );

    menus : IctuNavigation[] = [ ... this.auth.userMenu ];

    drawerMode : WritableSignal<MatDrawerMode> = signal( 'side' );

    currentApplicationVersion : Signal<string> = signal<string>( ENVIRONMENT.appVersion );

    private breakpointObserver : BreakpointObserver = inject( BreakpointObserver );

    private layoutService : LayoutService = inject( LayoutService );

    logo : Signal<string> = staticResource( `images/client/${ ENVIRONMENT.deployment.client }/admin-logo.png` );

    hostname : Signal<string> = signal<string>( location.hostname );

    resizeStyle : WritableSignal<NavResizeStyle> = signal<NavResizeStyle>( { width : '280px' } );

    sidebarCollapsed : Signal<boolean> = computed( () : boolean => {
        return this.drawerMode() === 'side' && this.resizeStyle().width !== '280px';
    } );

    private destroyed$ : Subject<void> = new Subject();

    private observeCompareVersions : Subject<void> = new Subject();

    private notification : NotificationService = inject( NotificationService );

    private sysConfigsService : SysConfigsService = inject( SysConfigsService );

    private title : Title = inject<Title>( Title );

    ngOnInit () : void {
        this.title.setTitle( 'Hệ thống quản lý trung tâm đào tạo - [AMS]' );

        this.breakpointObserver.observe( [ '(min-width: 1025px)' , '(max-width: 1024.98px)' ] ).pipe(
            takeUntil( this.destroyed$ )
        ).subscribe( ( result : BreakpointState ) : void => {
            if ( result.breakpoints[ '(max-width: 1024.98px)' ] ) {
                this.drawerMode.set( 'over' );
                this.resizeStyle.update( () : NavResizeStyle => ( { width : '280px' } ) );
            }
            else if ( result.breakpoints[ '(min-width: 1025px)' ] ) {
                this.drawerMode.set( 'side' );
            }
        } );

        this.layoutService.layoutState.pipe(
            takeUntil( this.destroyed$ )
        ).subscribe( () : void => {
            if ( this.drawerMode() === 'side' ) {
                this.resizeStyle.update( () : NavResizeStyle => ( { width : this.sidebar()?._getWidth() < 100 ? '280px' : '80px' } ) );
            }
            else {
                void this.sidebar()?.toggle();
            }
        } );

        this.compareVersions();
    }

    toggleMenu () : void {
        this.layoutService.toggleSideDrawer();
    }

    private compareVersions () : void {
        const version : string = ENVIRONMENT.appVersion.replace( /\./gmi , '' );
        this.observeCompareVersions.next();
        const conditions : IctuConditionParam[] = [
            { conditionName : 'config_key' , condition : IctuQueryCondition.equal , value : '__APP_VERSION' } ,
            { conditionName : 'value' , condition : IctuQueryCondition.greaterThan , value : version , orWhere : 'and' }
        ];
        const queryParams : IctuQueryParams     = { paged : 1 , limit : 1 , select : 'value,title' }
        this.sysConfigsService.query<SystemConfig>( conditions , queryParams ).pipe(
            takeUntil( merge( this.observeCompareVersions , this.destroyed$ ) ) ,
            filter( ( res : SystemConfig[] ) : boolean => res.length > 0 ) ,
            retry( 2 )
        ).subscribe( ( res : SystemConfig[] ) : void => {
            this.showNoticeVersionUpdates( res[ 0 ].title );
        } )
    }

    private showNoticeVersionUpdates ( newVersion : string ) : void {
        const CONFIRM_UPDATE_BUTTON : Button = {
            label    : 'CẬP NHẬT' ,
            icon     : 'pi pi-sync' ,
            readonly : false ,
            ngStyle  : {
                'font-size'     : '13px' ,
                'padding'       : '10px 15px' ,
                'outline'       : 'none' ,
                'box-shadow'    : 'none' ,
                '--p-icon-size' : '13px'
            }
        };

        const data : ConfirmDialogData = {
            heading : 'THÔNG BÁO CẬP NHẬT PHIÊN BẢN' ,
            message : `<p class="m-0 text-secondary f-15">Ứng dụng đã có phiên bản mới <span class="text-warning">${ newVersion }</span></p> <p class="m-0 text-secondary f-15">Vui lòng nhấn <span class="text-primary">CẬP NHẬT</span> để nâng cấp lên phiên bản mới nhất.</p>` ,
            buttons : [ CONFIRM_UPDATE_BUTTON ]
        };

        this.notification.confirm( data ).subscribe( () : void => {
            const url : URL = new URL( window.location.href );
            url.searchParams.set( 'version' , newVersion );
            window.location.assign( url.toString() );
        } );
    }

    ngOnDestroy () : void {
        this.destroyed$.next();
        this.destroyed$.complete();
    }

}
