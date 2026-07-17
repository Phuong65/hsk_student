import { Component , inject , input , InputSignal , OnInit } from '@angular/core';
import { Location , LocationStrategy } from '@angular/common';
import { NavigationItem } from '@theme/types/navigation';
import { MenuItemComponent } from '../menu-item/menu-item.component';
import { MenuCollapseComponent } from '../menu-collapse/menu-collapse.component';

@Component( {
	selector    : 'app-menu-group-vertical' ,
	imports     : [ MenuItemComponent , MenuCollapseComponent ] ,
	templateUrl : './menu-group.component.html' ,
	styleUrls   : [ './menu-group.component.scss' ] ,
	standalone  : true
} )
export class MenuGroupVerticalComponent implements OnInit {
	item : InputSignal<NavigationItem>          = input.required<NavigationItem>();
	private location : Location                 = inject( Location );
	private locationStrategy : LocationStrategy = inject( LocationStrategy );
	
	
	ngOnInit () : void {
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
}
