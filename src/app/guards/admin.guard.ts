import { ActivatedRouteSnapshot , CanActivateFn , Router , RouterStateSnapshot , UrlTree } from '@angular/router';
import { AuthenticationService } from "@services/authentication.service";
import { inject } from "@angular/core";

export const adminGuard : CanActivateFn = ( _ : ActivatedRouteSnapshot , state : RouterStateSnapshot ) : true | UrlTree => {
	const auth : AuthenticationService = inject( AuthenticationService );
	const router : Router              = inject( Router );
	return auth.userLoggedIn ?
	       auth.userMenu.length > 0 ? true : router.createUrlTree( [ '/unauthorized' ] , {
		       queryParams : {
			       reason : 'access-denied' ,
			       time   : Date.now()
		       }
	       } ) :
	       router.createUrlTree( [ '/auth/login' ] , {
		       queryParams : {
			       fallbackUrl : state.url
		       }
	       } );
};