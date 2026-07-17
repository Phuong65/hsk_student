import { Injectable , Renderer2 } from '@angular/core';
import { BehaviorSubject , Observable } from 'rxjs';
import { AutoThemeConfig , ThemeMode } from '../types/theme.types';

@Injectable()
export class ThemeService {
	private readonly THEME_KEY : string                = 'fp-theme-mode';
	private themeSubject$ : BehaviorSubject<ThemeMode> = new BehaviorSubject<ThemeMode>( 'dark' );
	private autoConfig : AutoThemeConfig               = {
		dark : { start : 18 , end : 6 }
	};

	private autoChangeTimer : any;
	systemThemeQuery : MediaQueryList | null                                     = null;
	private systemThemeListener : ( ( e : MediaQueryListEvent ) => void ) | null = null;
	private localDomElement : HTMLElement | null                                 = null;

	constructor ( private renderer : Renderer2 ) {
	}

	bindElement ( domElement : HTMLElement ) : void {
		this.localDomElement = domElement;
	}

	ngOnInit () : void {
		if ( window.matchMedia ) {
			this.systemThemeQuery    = window.matchMedia( '(prefers-color-scheme: dark)' );
			this.systemThemeListener = () : void => {
				if ( this.theme === 'auto' ) {
					this.checkAndApplyAutoTheme();
				}
			};
			this.systemThemeQuery.addEventListener( 'change' , this.systemThemeListener );
		}
		this.applyTheme( 'dark' );
	}

	get theme () : ThemeMode {
		return this.themeSubject$.getValue();
	}

	getThemeObservable () : Observable<ThemeMode> {
		return this.themeSubject$.asObservable();
	}

	setMode ( mode : ThemeMode ) : void {
		this.themeSubject$.next( mode );
		if ( mode === 'auto' ) {
			this.startAutoCheck();
		}
		else {
			this.stopAutoCheck();
			this.applyTheme( mode );
		}
	}

	setAutoConfig ( config : AutoThemeConfig ) : void {
		this.autoConfig = { ... this.autoConfig , ... config };
		if ( this.themeSubject$.getValue() === 'auto' ) {
			this.checkAndApplyAutoTheme();
		}
	}

	private startAutoCheck () : void {
		this.checkAndApplyAutoTheme();
		this.autoChangeTimer = setInterval( () : void => {
			this.checkAndApplyAutoTheme();
		} , 60000 );
	}

	private stopAutoCheck () : void {
		if ( this.autoChangeTimer ) {
			clearInterval( this.autoChangeTimer );
			this.autoChangeTimer = null;
		}
	}

	private checkAndApplyAutoTheme () : void {
		const hour : number   = new Date().getHours();
		const { start , end } = this.autoConfig.dark;

		const isDarkTime : boolean = start > end ? ( hour >= start || hour < end ) : ( hour >= start && hour < end );

		const prefersDark : boolean = this.systemThemeQuery?.matches ?? false;
		this.applyTheme( isDarkTime || prefersDark ? 'dark' : 'light' );
	}

	private applyTheme ( theme : 'light' | 'dark' ) : void {
		this.themeSubject$.next( theme );
		if ( this.localDomElement ) {
			this.renderer.removeAttribute( this.localDomElement , 'data-nfp-theme' );
			if ( theme === 'dark' ) {
				this.renderer.setAttribute( this.localDomElement , 'data-nfp-theme' , 'dark' );
			}
			else {
				this.renderer.setAttribute( this.localDomElement , 'data-nfp-theme' , 'light' );
			}
		}
		localStorage.setItem( this.THEME_KEY , theme );
	}

	toggleTheme () : void {
		const newTheme : ThemeMode = this.theme === 'light' ? 'dark' : 'light';
		this.setMode( newTheme );
	}

	ngOnDestroy () : void {
		this.stopAutoCheck();
		if ( this.systemThemeQuery && this.systemThemeListener ) {
			this.systemThemeQuery.removeEventListener( 'change' , this.systemThemeListener );
		}
	}
}
