import { Routes } from '@angular/router';
import { PreviewComponent , previewRoutes } from "@pages/preview";
import { adminGuard } from "@guards/admin.guard";
import { authGuard } from "@guards/auth.guard";

export const routes : Routes = [
	{
		path         : 'admin' ,
		canActivate  : [ adminGuard ] ,
		loadChildren : () : Promise<any> => import('@pages/admin/admin.module').then( m => m.AdminModule )
	} ,
	{
		path         : 'auth' ,
		loadChildren : () : Promise<any> => import('@pages/auth/auth.module').then( m => m.AuthModule )
	} ,
	{
		path          : 'student-info' ,
		canActivate   : [ authGuard ] ,
		loadComponent : () : Promise<any> => import('@pages/student-info/student-info.component')
	} ,
	{
		path          : 'exam/:shiftId' ,
		canActivate   : [ authGuard ] ,
		loadComponent : () : Promise<any> => import('@pages/exam-commitment/exam-commitment.component')
	} ,
	{
		path          : 'exam/:shiftId/:skill' ,
		canActivate   : [ authGuard ] ,
		loadComponent : () : Promise<any> => import('@pages/exam-play/exam-play.component').then(c => c.ExamPlayComponent)
	} ,
	{
		path          : 'throw-error' ,
		loadComponent : () : Promise<any> => import('@pages/throw-error/throw-error.component').then( c => c.ThrowErrorComponent )
	} ,
	{
		path          : 'unauthorized' ,
		loadComponent : () : Promise<any> => import('@pages/unauthorized/unauthorized.component').then( c => c.UnauthorizedComponent )
	} ,
	{
		path      : 'preview' ,
		component : PreviewComponent ,
		children  : previewRoutes
	} ,
	{
		path       : '**' ,
		redirectTo : '/auth/login' ,
		pathMatch  : 'full'
	}
];
