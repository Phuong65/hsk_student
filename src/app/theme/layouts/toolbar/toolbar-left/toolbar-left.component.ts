import { Component , inject } from '@angular/core';
import { LayoutService } from '@theme/services/layout.service';
import { SharedModule } from '@app/shared/shared.module';

@Component( {
	selector    : 'app-nav-left' ,
	imports     : [ SharedModule ] ,
	templateUrl : './toolbar-left.component.html' ,
	styleUrls   : [ './toolbar-left.component.scss' ]
} )
export class NavLeftComponent {
	private layoutService : LayoutService = inject( LayoutService );
	
	toggleMenu () : void {
		this.layoutService.toggleSideDrawer();
	}
}
