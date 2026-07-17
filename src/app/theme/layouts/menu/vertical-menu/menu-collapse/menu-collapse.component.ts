import { Component , Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavigationItem } from '@theme/types/navigation';
import { MenuItemComponent } from '../menu-item/menu-item.component';

@Component( {
	selector    : 'app-menu-collapse' ,
	imports     : [ MenuItemComponent , RouterModule , CommonModule ] ,
	templateUrl : './menu-collapse.component.html' ,
	styleUrls   : [ './menu-collapse.component.scss' ] ,
	standalone  : true
} )
export class MenuCollapseComponent {
	
	@Input() item! : NavigationItem;
	
	navCollapse ( e : MouseEvent ) : void {
		let parent : HTMLElement             = e.target as HTMLElement;
		parent                               = ( parent as HTMLElement ).parentElement as HTMLElement;
		const sections : NodeListOf<Element> = document.querySelectorAll( '.coded-hasmenu' );
		for ( let i : number = 0 ; i < sections.length ; i++ ) {
			if ( sections[ i ] !== parent ) {
				sections[ i ].classList.remove( 'coded-trigger' );
			}
		}
		let first_parent : HTMLElement | null = parent.parentElement;
		let pre_parent : HTMLElement          = ( ( parent as HTMLElement ).parentElement as HTMLElement ).parentElement as HTMLElement;
		if ( first_parent?.classList.contains( 'coded-hasmenu' ) ) {
			do {
				first_parent?.classList.add( 'coded-trigger' );
				first_parent = ( ( ( first_parent as HTMLElement ).parentElement as HTMLElement ).parentElement as HTMLElement )
					.parentElement as HTMLElement;
			}
			while ( first_parent?.classList.contains( 'coded-hasmenu' ) );
		}
		else if ( pre_parent.classList.contains( 'coded-submenu' ) ) {
			do {
				pre_parent?.parentElement?.classList.add( 'coded-trigger' );
				pre_parent = ( ( ( pre_parent as HTMLElement ).parentElement as HTMLElement ).parentElement as HTMLElement ).parentElement as HTMLElement;
			}
			while ( pre_parent.classList.contains( 'coded-submenu' ) );
		}
		parent.classList.toggle( 'coded-trigger' );
	}
}
