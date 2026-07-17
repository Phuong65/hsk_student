import { Component , computed , effect , inject , InjectionToken , Signal , signal , WritableSignal } from '@angular/core';
import { RouterLink , RouterLinkActive , RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { Ripple } from 'primeng/ripple';
import { CollapsePanelComponent } from '@theme/components/collapse-panel.component';
import { NotificationService } from '@services/notification.service';

export interface PreviewHeading {
    heading : string,
    description? : string,
}

export interface PreviewCopyContent {
    value : string,
    body : string,
    heading? : string,
}

export const AppPreviewHeading : InjectionToken<WritableSignal<PreviewHeading>> = new InjectionToken<WritableSignal<PreviewHeading>>( '' );

export const AppPreviewCopyContentInjector : InjectionToken<WritableSignal<PreviewCopyContent>> = new InjectionToken<WritableSignal<PreviewCopyContent>>( '' );

interface AppPreviewMenu {
    routerLink : string;
    label : string;
}

@Component( {
    selector    : 'app-preview' ,
    imports     : [ RouterOutlet , RouterLink , RouterLinkActive , ButtonModule , Ripple , CollapsePanelComponent ] ,
    templateUrl : './preview.component.html' ,
    styleUrl    : './preview.component.css' ,
    providers   : [
        {
            provide    : AppPreviewHeading ,
            useFactory : () : WritableSignal<PreviewHeading> => signal<PreviewHeading>( { heading : '' } )
        } ,
        {
            provide    : AppPreviewCopyContentInjector ,
            useFactory : () : WritableSignal<PreviewCopyContent> => signal<PreviewCopyContent>( {
                value : '' ,
                body  : ''
            } )
        }
    ] ,
    host        : {
        class : 'app-preview d-block position-relative w-100' ,
        style : 'padding-top:60px'
    }
} )
export class PreviewComponent {

    heading : WritableSignal<PreviewHeading> = inject( AppPreviewHeading );

    private copyContent : WritableSignal<PreviewCopyContent> = inject( AppPreviewCopyContentInjector );

    private notification : NotificationService = inject( NotificationService );

    public menuList : AppPreviewMenu[] = [
        { label : 'Typography' , routerLink : 'typography' } ,
        { label : 'Color' , routerLink : 'color' } ,
        { label : 'Tabler icons' , routerLink : 'tabler-icons' } ,
        { label : 'Custom svg' , routerLink : 'custom-svg' } ,
        { label : 'Custom button' , routerLink : 'custom-button' } ,
        { label : 'Sample page' , routerLink : 'sample-page' } ,
        { label : 'Chart and table' , routerLink : 'chart-table' } ,
        { label : 'Fontawesome' , routerLink : 'fontawesome' }
    ];

    private copyContentCheck : Signal<string> = computed( () : string => {
        if ( this.copyContent().value ) {
            void this.__copyContent( this.copyContent().value , this.copyContent().body , this.copyContent().heading || 'Copied' );
        }
        return this.copyContent().value;
    } );


    private async __copyContent ( value : string , body : string , heading : string ) : Promise<void> {
        try {
            if ( value ) {
                this.notification.clearToast();
                await navigator.clipboard.writeText( value );
                this.notification.toastSuccess( body , heading );
            }
        }
        catch ( err ) {
            console.error( 'Failed to copy: ' , err );
        }
    }

    constructor () {
        effect( () : void => {
            this.copyContentCheck();
        } );
    }
}
