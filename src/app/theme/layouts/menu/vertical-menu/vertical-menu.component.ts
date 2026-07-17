import { Component , inject , input , InputSignal , ViewChild } from '@angular/core';
import { CommonModule , Location , LocationStrategy } from '@angular/common';
import { NavigationItem } from '@theme/types/navigation';
import { SharedModule } from '@shared/shared.module';
import { MenuItemComponent } from './menu-item/menu-item.component';
import { MenuCollapseComponent } from './menu-collapse/menu-collapse.component';
import { MenuGroupVerticalComponent } from './menu-group/menu-group.component';
import { CollapseDirective , CollapseState } from "@theme/directives/collapse.directive";

@Component( {
	selector    : 'app-vertical-menu' ,
	imports     : [ SharedModule , MenuItemComponent , MenuCollapseComponent , MenuGroupVerticalComponent , CommonModule , CollapseDirective ] ,
	templateUrl : './vertical-menu.component.html' ,
	styleUrls   : [ './vertical-menu.component.scss' ]
} )
export class VerticalMenuComponent {
	
	menuCollapseState : CollapseState = 'collapse';
	
	menus : InputSignal<NavigationItem[]>             = input.required<NavigationItem[]>();
	accountList : { icon : string, title : string }[] = [
		{
			icon  : 'ti ti-user' ,
			title : 'My Account'
		} ,
		{
			icon  : 'ti ti-settings' ,
			title : 'Settings'
		} ,
		{
			icon  : 'ti ti-lock' ,
			title : 'Lock Screen'
		} ,
		{
			icon  : 'ti ti-power' ,
			title : 'Logout'
		}
	];
	
	@ViewChild( CollapseDirective , { static : true } ) collapseMenu? : CollapseDirective;
	
	private location : Location                 = inject( Location );
	private locationStrategy : LocationStrategy = inject( LocationStrategy );
	
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
	
	toggleMenu () : void {
		this.collapseMenu?.toggle();
	}
}
