import { ActivatedRouteSnapshot , CanActivateChildFn , Router , RouterStateSnapshot , UrlTree } from '@angular/router';
import { AuthenticationService } from "@services/authentication.service";
import { inject } from "@angular/core";
import { IctuNavigation , IctuNavigationItem } from "@theme/types/navigation";

export const adminModuleChildGuard : CanActivateChildFn = ( _ : ActivatedRouteSnapshot , state : RouterStateSnapshot ) : true | UrlTree => {
	const auth : AuthenticationService = inject( AuthenticationService );
	const router : Router              = inject( Router );
	const rawPath : string             = state.url.split( '?' )[ 0 ].split( ':' )[ 0 ];
	return auth.userMenu.some( ( nav : IctuNavigation ) : boolean => nav.child ? nav.child.some( ( childRoute : IctuNavigationItem ) : boolean => rawPath === `/admin/${ childRoute.id }` ) : false ) || router.createUrlTree( [ 'admin/404' ] , {
		queryParams : {
			reason : 'access-denied' ,
			time   : Date.now()
		}
	} );
};
