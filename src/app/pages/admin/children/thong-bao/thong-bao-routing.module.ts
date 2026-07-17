import { NgModule } from '@angular/core';
import { RouterModule , Routes } from '@angular/router';
import { adminModuleChildGuard } from "@guards/admin-module-child.guard";

const routes : Routes = [
	{
		path             : '' ,
		canActivateChild : [ adminModuleChildGuard ] ,
		children         : [
			{
				path          : 'thong-ke' ,
				loadComponent : () : Promise<any> => import('./children/tb-thong-ke/tb-thong-ke.component')
			} ,
			{
				path          : 'danh-sach-thong-bao' ,
				loadComponent : () : Promise<any> => import('./children/tb-danh-sach-thong-bao/tb-danh-sach-thong-bao.component')
			} ,
			{
				path          : 'danh-sach-phan-hoi' ,
				loadComponent : () : Promise<any> => import('./children/tb-danh-sach-phan-hoi/tb-danh-sach-phan-hoi.component')
			} ,
			{
				path          : 'tao-phan-hoi' ,
				loadComponent : () : Promise<any> => import('./children/tb-tao-phan-hoi/tb-tao-phan-hoi.component')
			} ,
			{
				path       : '' ,
				redirectTo : 'thong-ke' ,
				pathMatch  : 'prefix'
			} ,
			{
				path       : '**' ,
				redirectTo : 'admin/404' ,
				pathMatch  : 'full'
			}
		]
	}
];

@NgModule( {
	imports : [ RouterModule.forChild( routes ) ] ,
	exports : [ RouterModule ]
} )
export class ThongBaoRoutingModule {
}
