import { NgModule } from '@angular/core';
import { RouterModule , Routes } from '@angular/router';

const routes : Routes = [
	{
		path     : '' ,
		children : [
			{
				path          : 'login' ,
				loadComponent : () : Promise<any> => import('./login/login.component')
			} ,
			{
				path          : 'redirect-uri-call-back' ,
				loadComponent : () : Promise<any> => import('./redirect-uri-call-back/redirect-uri-call-back')
			} ,
			{
				path          : 'forgot-password' ,
				loadComponent : () : Promise<any> => import('./forgot-password/forgot-password.component')
			} ,
			{
				path          : 'unauthorized' ,
				loadComponent : () : Promise<any> => import('./unauthorized/unauthorized.component')
			} ,
			{
				path          : 'reset-password' ,
				loadComponent : () : Promise<any> => import('./reset-password/reset-password.component')
			} ,
			{
				path       : '**' ,
				redirectTo : 'login' ,
				pathMatch  : 'prefix'
			}
		]
	}
];

@NgModule( {
	imports : [ RouterModule.forChild( routes ) ] ,
	exports : [ RouterModule ]
} )
export class AuthRoutingModule {
}
