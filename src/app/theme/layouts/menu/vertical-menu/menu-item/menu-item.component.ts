import { Component , Input , inject } from '@angular/core';
import { DomSanitizer , SafeUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavigationItem } from '@theme/types/navigation';
import { LayoutService } from '@theme/services/layout.service';

@Component( {
	selector    : 'app-menu-item' ,
	imports     : [ CommonModule , RouterModule ] ,
	templateUrl : './menu-item.component.html' ,
	styleUrls   : [ './menu-item.component.scss' ] ,
	standalone  : true
} )
export class MenuItemComponent {
	// public props
	@Input() item! : NavigationItem;
	private layoutService : LayoutService = inject( LayoutService );
	private sanitizer : DomSanitizer      = inject( DomSanitizer );
	
	// public method
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
}
