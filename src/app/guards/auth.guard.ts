import { ActivatedRouteSnapshot , CanActivateFn , Router , RouterStateSnapshot , UrlTree } from '@angular/router';
import { inject } from '@angular/core';
import { AuthenticationService } from '@services/authentication.service';

export const authGuard : CanActivateFn = ( _ : ActivatedRouteSnapshot , state : RouterStateSnapshot ) : true | UrlTree => {
	const auth : AuthenticationService = inject( AuthenticationService );
	const router : Router              = inject( Router );
	return auth.userLoggedIn ? true : router.createUrlTree( [ 'auth/login' ] , {
		queryParams : {
			fallbackUrl : state.url
		}
	} );
};