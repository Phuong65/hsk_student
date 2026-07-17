import { Component , computed , inject , input , InputSignal , OnDestroy , OnInit , Signal , signal , WritableSignal } from '@angular/core';
import { SharedModule } from "@shared/shared.module";
import { CommonModule, Location, LocationStrategy, NgOptimizedImage } from "@angular/common";
import { IctuNavigation } from "@theme/types/navigation";
import { IctuMenuItemComponent } from "@theme/layouts/menu/ictu-vertical-menu/ictu-menu-item/ictu-menu-item.component";
import { NotificationService } from "@services/notification.service";
import { ActivatedRoute , Event , NavigationEnd , Router , RouterLink , RouterLinkActive } from "@angular/router";
import { MatMenuTrigger } from "@angular/material/menu";
import { User } from "@models/user";
import { AuthenticationService } from "@services/authentication.service";
import { Subject , takeUntil } from "rxjs";
import { SafeUrlPipe } from "@pipes/safe-url.pipe";
import { filter } from "rxjs/operators";

@Component( {
	selector    : 'ictu-vertical-menu' ,
	imports     : [ SharedModule , CommonModule , IctuMenuItemComponent , NgOptimizedImage , SafeUrlPipe , RouterLink , RouterLinkActive ] ,
	templateUrl : './ictu-vertical-menu.component.html' ,
	styleUrl    : './ictu-vertical-menu.component.scss'
} )
export class IctuVerticalMenuComponent implements OnInit , OnDestroy {

	collapsed : InputSignal<boolean> = input.required<boolean>();

	menus : InputSignal<IctuNavigation[]> = input.required<IctuNavigation[]>();

	private location : Location = inject( Location );

	private notification : NotificationService = inject( NotificationService );

	private locationStrategy : LocationStrategy = inject( LocationStrategy );

	private auth : AuthenticationService = inject( AuthenticationService );

	menuActivated : WritableSignal<IctuNavigation | undefined> = signal<undefined>( undefined );

	collapsedMenuChild : WritableSignal<IctuNavigation | undefined> = signal<undefined>( undefined );

	private activatedRoute : ActivatedRoute = inject( ActivatedRoute );

	private router : Router = inject( Router );

	private timedOutCloser : any;

	private _menuTrigger : MatMenuTrigger;

	get activatedMenuTrigger () : MatMenuTrigger {
		return this._menuTrigger;
	}

	set activatedMenuTrigger ( trigger : MatMenuTrigger ) {
		trigger.openMenu();
		this._menuTrigger = trigger;
	}

	readonly user : WritableSignal<User> = signal<User>( null );

	readonly avatar : Signal<string> = computed( () : string => this.user() ? this.user().avatar : 'assets/images/user/avatar-2.jpg' );

	readonly displayName : Signal<string> = computed( () : string => this.user() ? this.user().display_name : 'Empty display name' );

	readonly email : Signal<string> = computed( () : string => this.user() ? this.user().email : 'Empty email' );

	private destroy$ : Subject<void> = new Subject<void>();

	constructor () {
		this.auth.onUserSetup.pipe(
			takeUntil( this.destroy$ )
		).subscribe( ( user : User ) : void => {
			this.user.set( user );
		} );
	}

	ngOnInit () : void {
		// const _menuId : string | undefined      = this.activatedRoute.snapshot.children[ 0 ].routeConfig?.path;
		// const menu : IctuNavigation | undefined = _menuId ? this.menus().find( ( i : IctuNavigation ) : boolean => i.id === _menuId ) : undefined;
		// if ( menu ) {
		// 	this.menuActivated.set( menu );
		// }

		this.router.events.pipe(
			takeUntil( this.destroy$ ) ,
			filter( ( event : Event ) : boolean => event instanceof NavigationEnd )
		).subscribe( ( router : NavigationEnd ) : void => {
			this.tryActiveMenuByRouting( router.url ? router.url.replace( /\/?admin\//gmi , '' ).split( '/' ).shift() : null );
		} );

		const _currentMenuId : string | undefined = this.activatedRoute.snapshot.children[ 0 ].routeConfig?.path;
		this.tryActiveMenuByRouting( _currentMenuId );
	}


	private tryActiveMenuByRouting ( router : string | undefined | null ) : void {
		const menu : IctuNavigation | undefined = router ? this.menus().find( ( i : IctuNavigation ) : boolean => i.id === router ) : undefined;
		if ( menu ) {
			this.menuActivated.set( menu );
		}
	}

	fireOutClick () : void {
		let current_url : string = this.location.path();
		const baseHref : string  = this.locationStrategy.getBaseHref();
		if ( baseHref ) {
			current_url = baseHref + this.location.path();
		}
		const link : string        = "a.nav-link[ href='" + current_url + "' ]";
		const ele : Element | null = document.querySelector( link );
		if ( ele !== null && ele !== undefined ) {
			const parent : HTMLElement | null                  = ele.parentElement;
			const up_parent : HTMLElement | null | undefined   = parent?.parentElement?.parentElement;
			const last_parent : HTMLElement | null | undefined = up_parent?.parentElement;
			if ( parent?.classList.contains( 'coded-hasmenu' ) ) {
				parent.classList.add( 'coded-trigger' );
				parent.classList.add( 'active' );
			}
			else if ( up_parent?.classList.contains( 'coded-hasmenu' ) ) {
				up_parent.classList.add( 'coded-trigger' );
				up_parent.classList.add( 'active' );
			}
			else if ( last_parent?.classList.contains( 'coded-hasmenu' ) ) {
				last_parent.classList.add( 'coded-trigger' );
				last_parent.classList.add( 'active' );
			}
		}
	}

	async activeMenu ( menu : IctuNavigation ) : Promise<void> {
		const _child : IctuNavigation | undefined = menu.child ? menu.child.find( ( node : IctuNavigation ) : boolean => !! node.url ) : undefined;
		if ( _child ) {
			try {
				await this.router.navigate( [ [ 'admin' , _child.url ].join( '/' ) ] );
			}
			catch ( e ) {
				alert( e );
			}
		}
		this.menuActivated.set( menu );
	}

	async showChildMenu ( menu : IctuNavigation , event? : MouseEvent ) : Promise<void> {
		if ( event ) {
			event.preventDefault();
		}
		if ( this.collapsed() ) {
			this.collapsedMenuChild.set( menu );
		}
	}

	confirmSignOut () : void {
		this.notification.confirmSignOut();
	}

	mouseEnter ( trigger : MatMenuTrigger , menu? : IctuNavigation , event? : MouseEvent ) : void {
		if ( menu ) {
			void this.showChildMenu( menu , event );
		}
		if ( this.timedOutCloser ) {
			clearTimeout( this.timedOutCloser );
		}
		this.activatedMenuTrigger = trigger;
	}

	mouseLeave ( trigger : MatMenuTrigger ) : void {
		this.timedOutCloser = setTimeout( () : void => {
			trigger.closeMenu();
		} , 50 );
	}

	activeCurrentParent () : void {
		this.menuActivated.set( this.collapsedMenuChild() );
	}

	clickPreventDefault ( event : MouseEvent ) : void {
		event.stopPropagation();
		event.preventDefault();
	}

	ngOnDestroy () : void {
		this.destroy$.next();
		this.destroy$.complete();
	}

}
