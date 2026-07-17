import { Component , computed , inject , Signal , signal , WritableSignal } from '@angular/core';
import { AppPreviewCopyContentInjector , AppPreviewHeading , PreviewCopyContent } from '@pages/preview';
import { FontAwesomePackName , fontawesomeProV710 } from '@pages/preview/children/fontawesome/fontawesome-pro-v7.1.0';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed , toObservable } from '@angular/core/rxjs-interop';
import { debounceTime , map , merge } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import { orderBy , uniqBy } from 'lodash-es';
import { IctuPaginatorControl } from '@theme/components/ictu-paginator/ictu-paginator-control';
import { DecimalPipe } from '@angular/common';
import { AppState } from '@models/app-state';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';

interface FontawesomeSearchObject {
    packs : FontAwesomePackName[],
    search : string;
}

interface FontAwesomeIcon {
    id : string,
    title : string,
    name : string,
    cssClass : string,
    packName : FontAwesomePackName,
    style : string,
}

@Component( {
    selector    : 'app-fontawesome' ,
    imports     : [ FormsModule , DecimalPipe , LoadingProgressComponent ] ,
    templateUrl : './fontawesome.component.html' ,
    styleUrl    : './fontawesome.component.css'
} )
export default class FontawesomeComponent {

    protected readonly filterByPackNames : WritableSignal<FontAwesomePackName[]> = signal( [] );

    protected readonly searchByName : WritableSignal<string> = signal( '' );

    private readonly searchInfo : Signal<FontawesomeSearchObject> = computed( () : FontawesomeSearchObject => ( {
        packs  : this.filterByPackNames() ,
        search : this.searchByName()?.trim().toLowerCase()
    } ) );

    protected readonly data : WritableSignal<FontAwesomeIcon[]> = signal( [] );

    protected readonly filteredData : WritableSignal<FontAwesomeIcon[]> = signal( [] );

    private readonly _icons : Signal<FontAwesomeIcon[]> = signal( ( () : FontAwesomeIcon[] => {
        return Object.keys( fontawesomeProV710 ).reduce( ( reducer : FontAwesomeIcon[] , packName : FontAwesomePackName ) : FontAwesomeIcon[] => {
            return Object.keys( fontawesomeProV710[ packName ].styles ).reduce( ( reducer2 : FontAwesomeIcon[] , style : string ) : FontAwesomeIcon[] => {
                reducer2.push( ... fontawesomeProV710[ packName ].icons.map( ( icon : string ) : FontAwesomeIcon => ( {
                    packName ,
                    style ,
                    name     : icon.replace( 'fa-' , '' ) ,
                    title    : icon.replace( 'fa-' , '' ).replace( /-/g , ' ' ) ,
                    cssClass : `${ fontawesomeProV710[ packName ].styles[ style ] } ${ icon }` ,
                    id       : [ packName , style , icon ].join( '-' )
                } ) ) )
                return reducer2;
            } , reducer );
        } , [] );
    } )() );

    protected readonly paginator : IctuPaginatorControl = new IctuPaginatorControl( {
        pageLinkSize      : 3 ,
        showFirstLastIcon : true ,
        rows              : 180
    } );

    protected readonly pageCount : Signal<number> = computed<number>( () : number => ( Math.ceil( this.paginator.totalRecords() / this.paginator.rows() ) ) );

    protected readonly isFirstPage : Signal<boolean> = computed<boolean>( () : boolean => this.paginator.paged() === 1 );

    protected readonly isLastPage : Signal<boolean> = computed<boolean>( () : boolean => ( this.paginator.paged() === this.pageCount() ) );

    protected readonly showLastPageNav : Signal<boolean> = computed<boolean>( () : boolean => ( this.pageCount() - this.paginator.paged() >= 2 ) );

    protected readonly showFirstPageNav : Signal<boolean> = computed<boolean>( () : boolean => ( this.paginator.paged() >= 3 ) );

    protected readonly navigationElements : Signal<number[]> = computed<number[]>( () : number[] => {
        const numberOfPages : number = this.pageCount();
        const visiblePages : number  = Math.min( Math.max( ( this.paginator.pageLinkSize() - 1 ) , 2 ) , numberOfPages );

        //calculate range, keep current in middle if necessary
        let start : number = Math.max( 1 , Math.ceil( this.paginator.paged() - visiblePages / 2 ) );
        const end : number = Math.min( numberOfPages , start + visiblePages );

        //check when approaching to last page
        const delta : number = this.paginator.pageLinkSize() - ( end - start + 1 );
        start                = Math.max( 1 , start - delta );

        const pageLinks : Array<number> = [];

        for ( let i : number = start ; i <= end ; i++ ) {
            pageLinks.push( i );
        }
        return pageLinks;
    } );

    protected readonly state : WritableSignal<AppState> = signal( 'loading' );

    private _copyContent : WritableSignal<PreviewCopyContent> = inject( AppPreviewCopyContentInjector );

    constructor () {
        inject( AppPreviewHeading ).set( { heading : 'Fontawesome Pro v7.1.0' } );
        toObservable( this.searchInfo ).pipe(
            takeUntilDestroyed() ,
            debounceTime( 500 ) ,
            distinctUntilChanged( ( previous : FontawesomeSearchObject , current : FontawesomeSearchObject ) : boolean => previous.search === current.search && previous.packs.join( '_' ) === current.packs.join( '_' ) )
        ).subscribe( ( searchInfo : FontawesomeSearchObject ) : void => {
            this.findIcons( searchInfo );
        } );

        merge<[ number , number ]>(
            toObservable( this.data ).pipe( map( () : number => 1 ) ) ,
            toObservable( this.paginator.paged )
        ).pipe(
            takeUntilDestroyed() ,
            debounceTime( 500 )
        ).subscribe( ( page : number ) : void => {
            this._fillData( page );
        } );
    }

    protected btnToggleSelectPackNames ( packName : FontAwesomePackName ) : void {
        this.filterByPackNames.update( ( _packs : FontAwesomePackName[] ) : FontAwesomePackName[] => {
            if ( _packs.includes( packName ) ) {
                return [ ... _packs.filter( ( _p : FontAwesomePackName ) : boolean => _p !== packName ) ];
            }
            else {
                return orderBy( [ ... _packs , packName ] );
            }
        } );
    }

    protected btnClearSearchByName () : void {
        this.searchByName.set( '' );
    }

    protected btnRemoveFilterByPackName ( e : MouseEvent ) : void {
        e.preventDefault();
        this.filterByPackNames.set( [] );
    }

    protected btnClearAllFilters () : void {
        this.searchByName.set( '' );
        this.filterByPackNames.set( [] );
    }

    protected changePage ( page : number ) : void {
        this.paginator.changePage( Math.min( Math.max( 1 , page ) , this.pageCount() ) );
        this.scrollToTop();
    }

    private scrollToTop () : void {
        document.querySelector( '.components-sample-layout' ).scroll( {
            top      : 0 ,
            behavior : 'smooth' // 'smooth' or 'auto' for instant jump
        } );
    }

    private findIcons ( searchInfo : FontawesomeSearchObject ) : void {
        this.state.set( 'loading' );
        let _icons : FontAwesomeIcon[] = [];
        if ( searchInfo.packs.length ) {
            _icons = this._icons().filter( ( i : FontAwesomeIcon ) : boolean => searchInfo.packs.includes( i.packName ) )
        }
        else {
            _icons = this._icons();
        }
        if ( searchInfo.search ) {
            _icons = uniqBy( [
                ... orderBy( _icons.filter( ( i : FontAwesomeIcon ) : boolean => i.title.trim() === searchInfo.search ) , [ 'name' , 'packName' , 'style' ] ) ,
                ... orderBy( _icons.filter( ( i : FontAwesomeIcon ) : boolean => i.title.includes( searchInfo.search ) ) , [ 'name' , 'packName' , 'style' ] )
            ] , 'id' );
        }
        else {
            _icons = orderBy( _icons , [ 'name' , 'packName' , 'style' ] );
        }
        this.data.set( _icons );
        if ( this.data().length ) {
            this.paginator.reset( this.data().length );
            this.paginator.changePage( 1 );
        }
        else {
            this.paginator.reset( 0 );
            this.filteredData.set( [] );
            this.state.set( 'success' );
        }
    }

    private _fillData ( page : number ) : void {
        const firstIndex : number = Math.max( 0 , ( page - 1 ) ) * this.paginator.rows();
        const lastIndex : number  = firstIndex + this.paginator.rows() - 1;
        this.filteredData.set( this.data().filter( ( _ : FontAwesomeIcon , index : number ) : boolean => index >= firstIndex && index <= lastIndex ) );
        this.state.set( 'success' );
    }

    protected btnCopyIcon ( icon : FontAwesomeIcon ) : void {
        const iconTag : string = `<i class="${ icon.cssClass }"></i>`;
        this._copyContent.set( { value : iconTag , body : `${ icon.packName } | ${ icon.style } | ${ icon.name }` } );
    }
}
