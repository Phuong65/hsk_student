import { Component , inject } from '@angular/core';
import { Event , NavigationEnd , Router , RouterModule } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { NavigationItem } from '../../types/navigation';
import { menus } from '@sample/menu';

interface TitleType {
	url : string | boolean | any | undefined;
	title : string;
	breadcrumbs : unknown;
	type : string;
}

@Component( {
	selector    : 'app-breadcrumb' ,
	imports     : [ RouterModule ] ,
	templateUrl : './breadcrumb.component.html' ,
	styleUrls   : [ './breadcrumb.component.scss' ]
} )
export class BreadcrumbComponent {
	navigations : NavigationItem[];
	navigationList! : TitleType[];
	private route : Router   = inject( Router );
	private appTitle : Title = inject( Title );
	
	constructor () {
		this.navigations = menus;
		this.setBreadcrumb();
	}
	
	setBreadcrumb () : void {
		this.route.events.subscribe( ( router : Event ) : void => {
			if ( router instanceof NavigationEnd ) {
				const activeLink : string          = router.url;
				const breadcrumbList : TitleType[] = this.filterNavigation( this.navigations , activeLink );
				this.navigationList                = breadcrumbList;
				const title : string               = breadcrumbList[ breadcrumbList.length - 1 ]?.title || 'Welcome';
				this.appTitle.setTitle( title );
			}
		} );
	}
	
	filterNavigation ( navItems : NavigationItem[] , activeLink : string ) : TitleType[] {
		for ( const navItem of navItems ) {
			if ( navItem.type === 'item' && 'url' in navItem && navItem.url === activeLink ) {
				return [
					{
						url         : 'url' in navItem ? navItem.url : false ,
						title       : navItem.title ,
						breadcrumbs : 'breadcrumbs' in navItem ? navItem.breadcrumbs : true ,
						type        : navItem.type
					}
				];
			}
			if ( ( navItem.type === 'group' || navItem.type === 'collapse' ) && 'children' in navItem ) {
				const breadcrumbList : TitleType[] = this.filterNavigation( navItem.children! , activeLink );
				if ( breadcrumbList.length > 0 ) {
					breadcrumbList.unshift( {
						url         : 'url' in navItem ? navItem.url : false ,
						title       : navItem.title ,
						breadcrumbs : 'breadcrumbs' in navItem ? navItem.breadcrumbs : true ,
						type        : navItem.type
					} );
					return breadcrumbList;
				}
			}
		}
		return [];
	}
}
