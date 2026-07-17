import { NgModule } from '@angular/core';
import { CommonModule , NgOptimizedImage } from '@angular/common';
import { AdminRoutingModule } from './admin-routing.module';
import { IctuVerticalMenuComponent } from '@theme/layouts/menu/ictu-vertical-menu/ictu-vertical-menu.component';
import { MatDrawer , MatDrawerContainer } from '@angular/material/sidenav';
import { NavBarComponent } from '@theme/layouts/toolbar/toolbar.component';
import { MatButton } from '@angular/material/button';
import { ROLE_PROVIDER } from '@app/providers/admin-role.provider';

@NgModule( {
    imports   : [
        CommonModule ,
        AdminRoutingModule ,
        IctuVerticalMenuComponent ,
        MatDrawer ,
        MatDrawerContainer ,
        NavBarComponent ,
        NgOptimizedImage ,
        MatButton
    ] ,
    providers : [ ROLE_PROVIDER.parents ]
} )
export class AdminModule {
}
