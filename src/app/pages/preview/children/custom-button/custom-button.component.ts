import { Component , computed , inject , Signal , signal , WritableSignal } from '@angular/core';
import { AppPreviewCopyContentInjector , AppPreviewHeading , PreviewCopyContent } from '@pages/preview/preview.component';
import { MatTooltip } from '@angular/material/tooltip';
import { NgClass } from '@angular/common';
import { CardComponent } from '@theme/components/card/card.component';
import { MatButton } from '@angular/material/button';
import { CircleProgressComponent , CircleProgressFill } from '@theme/components/circle-progress/circle-progress.component';
import { InputText } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';

@Component( {
    selector    : 'app-custom-button' ,
    imports     : [ MatTooltip , NgClass , CardComponent , MatButton , CircleProgressComponent , InputText , FormsModule ] ,
    templateUrl : './custom-button.component.html' ,
    styleUrl    : './custom-button.component.css'
} )
export default class CustomButtonComponent {

    readonly colors : Signal<string[]> = signal<string[]>( [ 'light' , 'gradient' , 'ghost' ] );

    readonly styles : Signal<string[]> = signal<string[]>( [ 'primary' , 'secondary' , 'warning' , 'info' , 'success' , 'danger' , 'purple' , 'teal' , 'orange' ] );

    private _copyContent : WritableSignal<PreviewCopyContent> = inject( AppPreviewCopyContentInjector );

    readonly badges : Signal<string[]> = signal<string[]>( [ 'primary' , 'secondary' , 'warning' , 'info' , 'success' , 'danger' , 'light' , 'dark' , 'orange' , 'pink' , 'teal' , 'purple' ] );

    readonly modelValue : WritableSignal<number> = signal( 0 );

    readonly value : Signal<number> = computed( () : number => Math.max( 0 , Math.min( 1 , this.modelValue() ) ) );

    readonly fill : Signal<CircleProgressFill> = computed( () : CircleProgressFill => {
        return { color : 0.2 > this.value() ? '#d82222' : 0.7 > this.value() ? '#0d59cf' : '#16a34a' }
    } );

    constructor () {
        inject( AppPreviewHeading ).set( { heading : 'Custom button' } );
    }

    copyButton ( id : string ) : void {
        const svgTag : string = `<button class="btn ${ id }">button</button>`;
        this._copyContent.set( { value : svgTag , body : id } );
    }

    copyBadge ( badge : string ) : void {
        const spanTag : string = `<span class="ictu-badge ictu-badge--${ badge }">${ badge }</span>`;
        this._copyContent.set( { value : spanTag , body : badge } );
    }

    copyBadgeButton ( id : string ) : void {
        const svgTag : string = `<button mat-flat-button class="btn ${ id }">button</button>`;
        this._copyContent.set( { value : svgTag , body : id } );
    }
}
