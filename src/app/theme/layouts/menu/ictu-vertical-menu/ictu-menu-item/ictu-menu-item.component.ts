import { Component , inject , Input , output , OutputEmitterRef } from '@angular/core';
import { IctuNavigation } from "@theme/types/navigation";
import { LayoutService } from "@theme/services/layout.service";
import { DomSanitizer , SafeUrl } from "@angular/platform-browser";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";

@Component( {
	selector    : 'app-ictu-menu-item' ,
	imports     : [ CommonModule , RouterModule ] ,
	templateUrl : './ictu-menu-item.component.html' ,
	styleUrl    : './ictu-menu-item.component.css'
} )
export class IctuMenuItemComponent {
	
	@Input() item! : IctuNavigation;
	
	onActiveChange : OutputEmitterRef<string> = output<string>();
	
	private layoutService : LayoutService = inject( LayoutService );
	
	private sanitizer : DomSanitizer = inject( DomSanitizer );
	
	toggleMenu ( event : MouseEvent ) : void {
		if ( window.innerWidth < 1025 ) {
			this.layoutService.toggleSideDrawer();
		}
		const ele = event.target as HTMLElement;
		if ( ele !== null && ele !== undefined ) {
			const parent                           = ele.parentElement as HTMLElement;
			const up_parent                        = ( ( parent.parentElement as HTMLElement ).parentElement as HTMLElement ).parentElement as HTMLElement;
			const last_parent : HTMLElement | null = up_parent.parentElement;
			const sections : NodeListOf<Element>   = document.querySelectorAll( '.coded-hasmenu' );
			for ( let i : number = 0 ; i < sections.length ; i++ ) {
				sections[ i ].classList.remove( 'active' );
				sections[ i ].classList.remove( 'coded-trigger' );
			}
			if ( parent.classList.contains( 'coded-hasmenu' ) ) {
				parent.classList.add( 'coded-trigger' );
				parent.classList.add( 'active' );
			}
			else if ( up_parent.classList.contains( 'coded-hasmenu' ) ) {
				up_parent.classList.add( 'coded-trigger' );
				up_parent.classList.add( 'active' );
			}
			else if ( last_parent?.classList.contains( 'coded-hasmenu' ) ) {
				last_parent.classList.add( 'coded-trigger' );
				last_parent.classList.add( 'active' );
			}
		}
	}
	
	sanitizeURL ( url : string ) : SafeUrl {
		return this.sanitizer.bypassSecurityTrustUrl( url );
	}
	
	onRouterLinkActive ( isActiveChange : boolean ) : void {
		if ( isActiveChange ) {
			this.onActiveChange.emit( 'change' )
		}
	}
}