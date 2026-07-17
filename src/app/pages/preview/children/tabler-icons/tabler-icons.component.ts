import { Component , computed , inject , Signal , signal , WritableSignal } from '@angular/core';
import { AppPreviewCopyContentInjector , AppPreviewHeading , PreviewCopyContent , PreviewHeading } from '@pages/preview/preview.component';
import { IconClasses } from '@pages/preview/children/tabler-icons/tabler-icons';
import { SharedModule } from '@shared/shared.module';
import { InputText } from 'primeng/inputtext';
import { NgClass } from '@angular/common';

@Component( {
    selector    : 'app-tabler-icons' ,
    imports     : [ SharedModule , InputText , NgClass ] ,
    templateUrl : './tabler-icons.component.html' ,
    styleUrl    : './tabler-icons.component.scss'
} )
export default class TablerIconsComponent {

    icons : Signal<string[]> = computed( () : string[] => ( this.filter() && this.filter().trim() ? IconClasses.filter( ( icon : string ) : boolean => icon.includes( this.filter() ) ) : IconClasses ) );

    heading : WritableSignal<PreviewHeading> = inject( AppPreviewHeading );

    filter : Signal<string> = signal( '' );

    bodyHeading : Signal<string> = computed( () : string => ( this.filter() && this.filter().trim() ? `Search results for "${ this.filter().trim() }"` : 'All icons' ) );

    private copyContent : WritableSignal<PreviewCopyContent> = inject( AppPreviewCopyContentInjector );

    constructor () {
        this.heading.set( {
            heading : 'Tabler Icons'
            // description : 'version 3.30.0'
        } );
    }

    copyIcon ( icon : string ) : void {
        const tagHtml : string = `<i class="ti ${ icon }"></i>`;
        this.copyContent.set( {
            value : tagHtml ,
            body  : tagHtml
        } )
    }
}

