import { Component } from '@angular/core';
import { ComingSoonComponent } from "@components/coming-soon/coming-soon.component";

@Component( {
	selector    : 'app-profile' ,
	imports     : [ ComingSoonComponent ] ,
	templateUrl : './profile.component.html' ,
	styleUrl    : './profile.component.css'
} )
export default class ProfileComponent {

}