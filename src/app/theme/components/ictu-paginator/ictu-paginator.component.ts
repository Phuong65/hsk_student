import { Component , computed , input , InputSignal , output , OutputEmitterRef , Signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { IctuPaginatorControl } from '@theme/components/ictu-paginator/ictu-paginator-control';

@Component( {
    selector    : 'ictu-paginator' ,
    imports     : [ NgClass , MatButton ] ,
    templateUrl : './ictu-paginator.component.html' ,
    styleUrl    : './ictu-paginator.component.css' ,
    host        : {
        class : 'ictu-paginator w-100 d-flex align-items-center justify-content-center' ,
        style : `
		--mat-button-filled-label-text-font: "Roboto", sans-serif;
		--mat-button-filled-label-text-size: 14px;
		--mat-button-filled-label-text-tracking: normal;
		--mat-button-filled-label-text-weight: 400;
		--mat-button-filled-label-text-transform: none;
		--mat-button-filled-container-height:35px;
		--p-icon-size:14px;
		`
    } ,
    standalone  : true
} )
export class IctuPaginatorComponent {

    control : InputSignal<IctuPaginatorControl> = input.required<IctuPaginatorControl>();

    onChangePage : OutputEmitterRef<number> = output<number>();

    pageCount : Signal<number> = computed<number>( () : number => ( Math.ceil( this.control().totalRecords() / this.control().rows() ) ) );

    empty : Signal<boolean> = computed<boolean>( () : boolean => this.control().totalRecords() === 0 );

    isFirstPage : Signal<boolean> = computed<boolean>( () : boolean => this.control().paged() === 1 );

    isLastPage : Signal<boolean> = computed<boolean>( () : boolean => ( this.control().paged() === this.pageCount() ) );

    elements : Signal<number[]> = computed<number[]>( () : number[] => {
        const numberOfPages : number = this.pageCount();
        const visiblePages : number  = Math.min( Math.max( ( this.control().pageLinkSize() - 1 ) , 2 ) , numberOfPages );

        //calculate range, keep current in middle if necessary
        let start : number = Math.max( 1 , Math.ceil( this.control().paged() - visiblePages / 2 ) );
        const end : number = Math.min( numberOfPages , start + visiblePages );

        //check when approaching to last page
        const delta : number = this.control().pageLinkSize() - ( end - start + 1 );
        start                = Math.max( 1 , start - delta );

        const pageLinks : Array<number> = [];

        for ( let i : number = start ; i <= end ; i++ ) {
            pageLinks.push( i );
        }
        return pageLinks;
    } );

    changePageToFirst ( event : MouseEvent ) : void {
        if ( ! this.isFirstPage() ) {
            this.changePage( 1 );
        }
        event.preventDefault();
    }

    changePageToPrev ( event : MouseEvent ) : void {
        this.changePage( this.control().paged() - 1 );
        event.preventDefault();
    }

    changePageToNext ( event : MouseEvent ) : void {
        this.changePage( this.control().paged() + 1 );
        event.preventDefault();
    }

    changePageToLast ( event : MouseEvent ) : void {
        if ( ! this.isLastPage() ) {
            this.changePage( this.pageCount() );
        }
        event.preventDefault();
    }

    changePage ( pageNumber : number , event? : MouseEvent ) : void {
        if ( pageNumber >= 1 && pageNumber <= this.pageCount() && pageNumber !== this.control().paged() ) {
            // this.control().changePage( pageNumber );
            this.onChangePage.emit( pageNumber );
        }
        if ( event ) {
            event.preventDefault();
        }
    }
}

