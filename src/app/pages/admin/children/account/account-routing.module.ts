import { NgModule } from '@angular/core';
import { RouterModule , Routes } from '@angular/router';
import { adminModuleChildGuard } from "@app/guards";

const routes : Routes = [ {
	path             : '' ,
	canActivateChild : [ adminModuleChildGuard ] ,
	children         : [
		{
			path       : '' ,
			redirectTo : 'profile' ,
			pathMatch  : 'prefix'
		} ,
		{
			path          : 'profile' ,
			loadComponent : () : Promise<any> => import('./children/profile/profile.component')
		} ,
		{
			path          : 'password' ,
			loadComponent : () : Promise<any> => import('./children/password/password.component')
		} ,
		{
			path          : 'activities-logs' ,
			loadComponent : () : Promise<any> => import('./children/activities-logs/activities-logs.component')
		} ,
		{
			path          : 'info' ,
			loadComponent : () : Promise<any> => import('./children/info/info.component')
		}
	]
} ];

@NgModule( {
	imports : [ RouterModule.forChild( routes ) ] ,
	exports : [ RouterModule ]
} )
export class AccountRoutingModule {}
