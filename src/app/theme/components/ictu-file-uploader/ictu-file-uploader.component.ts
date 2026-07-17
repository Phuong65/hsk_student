import { Component , inject , model , ModelSignal , OnDestroy , signal , WritableSignal } from '@angular/core';
import { FileIconPipe } from '@pipes/file-icon.pipe';
import { FormatBytesPipe } from '@pipes/format-bytes.pipe';
import { MatProgressBar } from '@angular/material/progress-bar';
import { SafeHtmlPipe } from '@pipes/safe-html.pipe';
import { MAT_DIALOG_DATA , MatDialogRef } from '@angular/material/dialog';
import { FileUploadAttributes , IctuFileService } from '@services/ictu-file.service';
import { debounceTime , merge , Subject , takeUntil } from 'rxjs';
import { ICTUStandardFile , isFile , UploadInfo } from '@models/file';
import { takeUntilDestroyed , toObservable } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';

export interface IctuFileUploaderDialogData {
    file : File;
    fileAttributes? : FileUploadAttributes;
    otherLink? : string;
}


export interface IctuFileUploaderDialogResponse {
    info : ICTUStandardFile,
    success : boolean,
}

type IctuFileUploaderState = 'waiting' | 'error' | 'uploading';

@Component( {
    selector    : 'app-ictu-file-uploader' ,
    imports     : [ FileIconPipe , FormatBytesPipe , MatProgressBar , SafeHtmlPipe ] ,
    templateUrl : './ictu-file-uploader.component.html' ,
    styleUrl    : './ictu-file-uploader.component.css'
} )
export class IctuFileUploaderComponent implements OnDestroy {

    private readonly fileService : IctuFileService = inject<IctuFileService>( IctuFileService );

    readonly dialogRef : MatDialogRef<IctuFileUploaderComponent , IctuFileUploaderDialogResponse> = inject<MatDialogRef<IctuFileUploaderComponent , IctuFileUploaderDialogResponse>>( MatDialogRef<IctuFileUploaderComponent , IctuFileUploaderDialogResponse> );

    readonly data : IctuFileUploaderDialogData = inject<IctuFileUploaderDialogData>( MAT_DIALOG_DATA );

    readonly file : ModelSignal<File> = model( this.data.file );

    readonly fileAttributes : ModelSignal<FileUploadAttributes | null> = model( this.data.fileAttributes );

    protected readonly state : WritableSignal<IctuFileUploaderState> = signal( 'waiting' );

    protected readonly downloadProgress : WritableSignal<number> = signal( 0 );

    private readonly destroy$ : Subject<void> = new Subject();

    private readonly uploadObserver$ : Subject<void> = new Subject<void>();

    private readonly reuploadObserver$ : Subject<void> = new Subject<void>();

    constructor () {
        merge<[ any , any ]>(
            toObservable( this.file ).pipe( filter( ( file : unknown ) : boolean => isFile( file ) ) ) ,
            this.reuploadObserver$.pipe( debounceTime( 500 ) )
        ).pipe(
            takeUntilDestroyed()
        ).subscribe( () : void => {
            this.upload( this.data.otherLink ?? null );
        } );
    }

    private upload ( otherLink? : string ) : void {
        this.uploadObserver$.next();
        this.state.set( 'uploading' );
        this.fileService.uploadWithProgress( this.file() , this.fileAttributes() , otherLink ).pipe(
            takeUntil( merge( this.destroy$ , this.uploadObserver$ ) )
        ).subscribe( {
            next  : ( response : UploadInfo ) : void => {
                this.downloadProgress.set( response.progress );
                if ( response.state === 'DONE' ) {
                    this.resultUploaded( response.response );
                }
            } ,
            error : () : void => {
                this.downloadProgress.set( 0 );
                this.state.set( 'error' );
            }
        } )
    }

    protected resultUploaded ( info : ICTUStandardFile ) : void {
        this.dialogRef.close( {
            info    : info ,
            success : true
        } );
    }

    protected btnClose () : void {
        this.dialogRef.close( {
            info    : null ,
            success : false
        } );
    }

    protected btnReupload () : void {
        this.state.set( 'uploading' );
        this.reuploadObserver$.next();
    }

    ngOnDestroy () : void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
