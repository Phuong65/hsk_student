import { Component , inject , signal , Signal } from '@angular/core';
import { SharedModule } from '@shared/shared.module';
import { AppPreviewHeading } from '@pages/preview/preview.component';
import { CollapsePanelComponent } from '@theme/components/collapse-panel.component';
import { IctuPaginatorComponent } from '@theme/components/ictu-paginator/ictu-paginator.component';
import { IctuPaginatorControl } from '@theme/components/ictu-paginator/ictu-paginator-control';
import { FormBuilder , FormGroup } from '@angular/forms';
import { IctuEditorComponent } from '@theme/components/ictu-editor/ictu-editor.component';
import { FlipBookComponent } from '@theme/components/flip-book.component';

@Component( {
    selector    : 'app-sample-page' ,
    imports     : [ SharedModule , CollapsePanelComponent , IctuPaginatorComponent , IctuEditorComponent , FlipBookComponent ] ,
    templateUrl : './sample-page.component.html' ,
    styleUrls   : [ './sample-page.component.scss' ]
} )
export default class SamplePageComponent {

    paginatorControl : Signal<IctuPaginatorControl> = signal<IctuPaginatorControl>( new IctuPaginatorControl( {
        pageLinkSize      : 5 ,
        rows              : 20 ,
        showFirstLastIcon : true
    } ) );

    readonly formGroup : FormGroup = this.fb.group( {
        user_id : [ 0 ]
    } );

    public get donviId () : number {
        return 1;
    }

    readonly images : string[];

    constructor (
        private fb : FormBuilder
    ) {
        inject( AppPreviewHeading ).set( {
            heading : 'Sample Page'
        } );

        setTimeout( () : void => {
            // this.paginatorControl().setupPaginator( { totalRecords : 147 , rows : 20 , data : [] } )
        } , 1000 );

        const url : URL = new URL( location.origin );
        this.images     = [ 1 , 2 , 3 , 4 , 5 , 6 ].map( ( num : number ) : string => {
            url.pathname = `images/flip-book/${ num }.png`;
            return url.toString();
        } );
    }
}
