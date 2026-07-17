import { Component , computed , ElementRef , inject , Signal , signal , WritableSignal } from '@angular/core';
import { AppPreviewCopyContentInjector , AppPreviewHeading , PreviewCopyContent } from '@pages/preview/preview.component';
import { HttpClient } from '@angular/common/http';
import { appendElementStyle , linkStaticResource } from '@utilities/helper';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { AppState } from '@models/app-state';
import { FormsModule } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { MatButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';

@Component( {
    selector    : 'app-custom-svg' ,
    imports     : [ LoadingProgressComponent , FormsModule , InputText , MatButton , MatTooltip ] ,
    templateUrl : './custom-svg.component.html' ,
    styleUrl    : './custom-svg.component.scss'
} )
export default class CustomSvgComponent {

    private http : HttpClient = inject( HttpClient );

    state : WritableSignal<AppState> = signal<AppState>( 'loading' );

    icons : Signal<string[]> = computed( () : string[] => ( this.filter() && this.filter().trim() ? this.iconLibrary.filter( ( icon : string ) : boolean => icon.includes( this.filter() ) ) : this.iconLibrary ) );

    filter : WritableSignal<string> = signal( '' );

    bodyHeading : Signal<string> = computed( () : string => ( this.filter() && this.filter().trim() ? `Search results for "${ this.filter().trim() }"` : 'All items' ) );

    private iconLibrary : string[] = [];

    private copyContent : WritableSignal<PreviewCopyContent> = inject( AppPreviewCopyContentInjector );

    constructor () {
        const elementRef : ElementRef = inject( ElementRef );
        inject( AppPreviewHeading ).set( { heading : 'Custom Svg' } );

        appendElementStyle( elementRef.nativeElement , {
            width     : '100%' ,
            minHeight : 'calc(100vh - 60px - 25px - 25px)' ,
            display   : 'block'
        } )
        this.load();
    }

    load () : void {
        this.state.set( 'loading' );
        this.http.get( linkStaticResource( 'fonts/custom-icon.svg' ) + '?code=' + Date.now() , {
            responseType : 'text'
        } ).subscribe( {
            next  : ( response : string ) : void => {
                this.iconLibrary = response.match( /id=["'][^"^']*['"]/gmi )?.map( ( str : string ) : string => str.toLowerCase().replace( /id=['"]/gmi , '' ).replace( /['"]/g , '' ) ) ?? [];
                this.state.set( 'success' );
                this.filter.set( '' );
            } ,
            error : () : void => {
                this.state.set( 'error' );
            }
        } )
    }

    copySvgId ( id : string ) : void {
        const svgTag : string = `<svg><use href="fonts/custom-icon.svg#${ id }"></use></svg>`;
        this.copyContent.set( {
            value : svgTag ,
            body  : id
        } )
    }
}
