import { Routes } from '@angular/router';

export const previewRoutes : Routes = [
    {
        path          : 'tabler-icons' ,
        loadComponent : () : Promise<any> => import('./children/tabler-icons/tabler-icons.component')
    } ,
    {
        path          : 'typography' ,
        loadComponent : () : Promise<any> => import('./children/typography/typography.component')
    } ,
    {
        path          : 'color' ,
        loadComponent : () : Promise<any> => import('./children/color/color.component')
    } ,
    {
        path          : 'sample-page' ,
        loadComponent : () : Promise<any> => import('./children/sample-page/sample-page.component')
    } ,
    {
        path          : 'chart-table' ,
        loadComponent : () : Promise<any> => import('./children/chart-table/chart-table.component')
    } ,
    {
        path          : 'custom-svg' ,
        loadComponent : () : Promise<any> => import('./children/custom-svg/custom-svg.component')
    } ,
    {
        path          : 'custom-button' ,
        loadComponent : () : Promise<any> => import('./children/custom-button/custom-button.component')
    } ,
    {
        path          : 'fontawesome' ,
        loadComponent : () : Promise<any> => import('./children/fontawesome/fontawesome.component')
    } ,
    {
        path       : '**' ,
        redirectTo : 'color' ,
        pathMatch  : 'prefix'
    }
]
