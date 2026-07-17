import { computed , Signal , signal , WritableSignal } from '@angular/core';
import { DtoObject , IctuPaginator } from '@models/dto';
import { Observable } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';

export interface IctuPaginatorConfig {
    pageLinkSize : number;
    showFirstLastIcon : boolean;
    rows : number;
}

export type PaginationRange = {
    startIndex : number;
    endIndex : number;
};

export class IctuPaginatorControl {

    readonly showFirstLastIcon : Signal<boolean>;

    readonly pageLinkSize : Signal<number>;

    readonly rows : Signal<number>;

    private _totalRecords : WritableSignal<number> = signal<number>( 0 );

    private _paged : WritableSignal<number> = signal<number>( 1 );

    readonly totalRecords : Signal<number> = computed( () : number => this._totalRecords() );

    public paged : Signal<number> = computed( () : number => this._paged() );

    readonly onPageChanges : Observable<number> = toObservable( this._paged );

    readonly startIndex : Signal<number> = computed( () : number => ( ( ( this.paged() * this.rows() ) - this.rows() ) + 1 ) );

    constructor ( { pageLinkSize , showFirstLastIcon , rows } : IctuPaginatorConfig ) {
        this.pageLinkSize      = signal<number>( Math.max( 3 , pageLinkSize ) );
        this.showFirstLastIcon = signal<boolean>( showFirstLastIcon );
        this.rows              = signal<number>( rows );
    }

    setupPaginator<T> ( response : IctuPaginator<T> | DtoObject<T[]> ) : T[] {
        const totalRecords : number = 'totalRecords' in response ? response.totalRecords : response.recordsFiltered;
        this.reset( totalRecords )
        return response.data
    }

    reset ( totalRecords : number = -1 ) : void {
        try {
            if ( -1 !== totalRecords ) {
                this._totalRecords.set( totalRecords );
            }
            this.changePage( 1 );
        }
        catch ( e ) {
            console.log( e )
        }
    }

    changePage ( page : number ) : void {
        this._paged.set( page );
    }

    getRange ( page : number ) : PaginationRange {
        const startIndex : number = Math.max( 0 , ( page - 1 ) ) * this.rows();
        const endIndex : number   = startIndex + this.rows() - 1;
        return { startIndex , endIndex };
    }

}
