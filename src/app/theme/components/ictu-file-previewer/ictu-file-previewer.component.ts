import { Component , computed , ElementRef , inject , model , ModelSignal , OnDestroy , Signal , signal , viewChild , WritableSignal } from '@angular/core';
import { MAT_DIALOG_DATA , MatDialogRef } from '@angular/material/dialog';
import { Download , IctuBasicFile , ICTUStandardFile } from '@models/file';
import { debounceTime , merge , Observable , Subject , takeUntil } from 'rxjs';
import { takeUntilDestroyed , toObservable } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { PreviewDirective , PreviewFileInput } from '@module/ngx-file-preview';
import { IctuFileService } from '@services/ictu-file.service';
import { MatProgressBar } from '@angular/material/progress-bar';
import { Helper } from '@utilities/helper';
import { ThemeService } from '@module/ngx-file-preview/lib/services/theme.service';
import { PreviewService } from '@module/ngx-file-preview/lib/services';

export interface IctuFilePreviewerDialogData {
    info : IctuBasicFile[] | ICTUStandardFile[];
    files : File[];
}

type IctuFilePreviewState = 'waiting' | 'loading' | 'error' | 'loaded';

interface IctuFilePreviewerDownload {
    downloaded : boolean;
    index : number;
    info : IctuBasicFile | ICTUStandardFile;
    file : File;
}

@Component( {
    selector    : 'app-ictu-file-previewer' ,
    imports     : [ MatProgressBar , PreviewDirective ] ,
    providers   : [ ThemeService , PreviewService ] ,
    templateUrl : './ictu-file-previewer.component.html' ,
    styleUrl    : './ictu-file-previewer.component.css'
} )
export class IctuFilePreviewerComponent implements OnDestroy {

    private fileService : IctuFileService = inject<IctuFileService>( IctuFileService );

    readonly dialogRef : MatDialogRef<IctuFilePreviewerComponent> = inject<MatDialogRef<IctuFilePreviewerComponent>>( MatDialogRef<IctuFilePreviewerComponent> );

    readonly data : IctuFilePreviewerDialogData = inject<IctuFilePreviewerDialogData>( MAT_DIALOG_DATA );

    readonly files : ModelSignal<File[]> = model( this.data.files );

    readonly info : ModelSignal<IctuBasicFile[] | ICTUStandardFile[]> = model( this.data.info );

    protected readonly fileInput : WritableSignal<PreviewFileInput> = signal( null );

    private readonly destroyed$ : Subject<void> = new Subject<void>();

    private readonly loadingObserver$ : Subject<void> = new Subject<void>();

    private readonly reloadObserver$ : Subject<void> = new Subject<void>();

    protected readonly state : WritableSignal<IctuFilePreviewState> = signal( 'waiting' );

    private preview : Signal<ElementRef<HTMLDivElement>> = viewChild<ElementRef<HTMLDivElement>>( 'preview' );

    protected readonly loadingAnimation : WritableSignal<boolean> = signal( true );

    private readonly _downloadQueue : WritableSignal<IctuFilePreviewerDownload[]> = signal( [] );

    protected readonly totalElements : Signal<number> = computed( () : number => this._downloadQueue().length );

    protected readonly totalDownloadedElements : Signal<number> = computed( () : number => this._downloadQueue().reduce( ( reducer : number , item : IctuFilePreviewerDownload ) : number => reducer + ( item.downloaded ? 1 : 0 ) , 0 ) );

    protected readonly downloadProgress : WritableSignal<number> = signal( 0 );

    constructor () {
        toObservable<File[]>( this.files ).pipe(
            filter( ( files : File[] ) : boolean => Array.isArray( files ) && files.length > 0 ) ,
            takeUntilDestroyed()
        ).subscribe( ( files : File[] ) : void => {
            this.fileInput.set( files );
        } );

        toObservable<IctuBasicFile[] | ICTUStandardFile[]>( this.info ).pipe(
            filter( ( files : IctuBasicFile[] | ICTUStandardFile[] ) : boolean => Array.isArray( files ) && files.length > 0 ) ,
            takeUntilDestroyed()
        ).subscribe( ( files : IctuBasicFile[] | ICTUStandardFile[] ) : void => {
            this._downloadQueue.set( [ ... files ].map( ( info : IctuBasicFile | ICTUStandardFile , index : number ) : IctuFilePreviewerDownload => {
                return { index , info : Helper.cloneObject<IctuBasicFile | ICTUStandardFile>( info ) , file : null , downloaded : false }
            } ) )
            this._downloadFiles();
        } )

        toObservable<PreviewFileInput>( this.fileInput ).pipe(
            filter( ( input : PreviewFileInput ) : boolean => !! input ) ,
            debounceTime( 1000 ) ,
            takeUntilDestroyed()
        ).subscribe( () : void => {
            this.preview()?.nativeElement.click();
        } );

        this.reloadObserver$.pipe(
            takeUntilDestroyed() ,
            debounceTime( 1000 )
        ).subscribe( () : void => {
            this._startDownloadIndividualFiles();
        } )
    }

    private _downloadFiles () : void {
        this.state.set( 'loading' );
        this.loadingObserver$.next();
        this._startDownloadIndividualFiles();
    }

    private _startDownloadIndividualFiles () : void {
        const _downloadQueue : IctuFilePreviewerDownload[] = [ ... this._downloadQueue() ];
        const index : number                               = _downloadQueue.findIndex( ( q : IctuFilePreviewerDownload ) : boolean => ! q.downloaded );
        if ( -1 === index ) {
            this.fileInput.set( this._downloadQueue().map( ( q : IctuFilePreviewerDownload ) : File => q.file ) );
            this.state.set( 'loaded' );
        }
        else {
            const request$ : Observable<Download> = _downloadQueue[ index ].info.location === 'aws' ? this.fileService.downloadAwsFile( _downloadQueue[ index ].info.id.toString( 10 ) ) : this.fileService.downloadLocalFile( _downloadQueue[ index ].info.id );
            request$.pipe(
                takeUntil( merge( this.loadingObserver$ , this.destroyed$ ) )
            ).subscribe( {
                next  : ( response : Download ) : void => {
                    if ( response.state === 'DONE' ) {
                        this.downloadProgress.set( 100 );
                        _downloadQueue[ index ].downloaded = true;
                        _downloadQueue[ index ].file       = Helper.blobToFile( response.content , _downloadQueue[ index ].info.title );
                        this._downloadQueue.set( _downloadQueue );
                        this._startDownloadIndividualFiles();
                    }
                    else {
                        this.downloadProgress.set( response.progress );
                    }
                } ,
                error : () : void => {
                    this.state.set( 'error' );
                }
            } )
        }
    }

    protected btnClose () : void {
        this.dialogRef.close();
    }

    protected onClosePreview () : void {
        this.btnClose();
    }

    protected btnReload () : void {
        this.state.set( 'loading' );
        this.loadingObserver$.next();
        this.reloadObserver$.next();
    }

    protected previewVisible ( isVisible : boolean ) : void {
        if ( isVisible ) {
            this.loadingAnimation.set( false );
            this.btnClose()
        }
        // this.loadingAnimation.set( ! isVisible );
    }

    ngOnDestroy () : void {
        this.destroyed$.next();
        this.destroyed$.complete();
    }
}
