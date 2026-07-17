import { Component , Inject , inject , model , ModelSignal , OnDestroy , signal , WritableSignal } from '@angular/core';
import { FileIconPipe } from "@pipes/file-icon.pipe";
import { FormatBytesPipe } from "@pipes/format-bytes.pipe";
import { MatProgressBar } from "@angular/material/progress-bar";
import { SafeHtmlPipe } from "@pipes/safe-html.pipe";
import { Download , IctuBasicFile , ICTUStandardFile } from "@models/file";
import { IctuFileService } from "@services/ictu-file.service";
import { MAT_DIALOG_DATA , MatDialogRef } from "@angular/material/dialog";
import { debounceTime , merge , Observable , Subject , takeUntil } from "rxjs";
import { Saver , SAVER } from "@app/providers/saver.provider";
import { takeUntilDestroyed , toObservable } from "@angular/core/rxjs-interop";
import { filter } from "rxjs/operators";

export interface IctuFileDownloaderDialogData {
	info : IctuBasicFile | ICTUStandardFile;
}

type IctuFileDownloaderState = 'waiting' | 'error' | 'loading';

@Component( {
	selector    : 'app-ictu-file-downloader' ,
	imports     : [ FileIconPipe , FormatBytesPipe , MatProgressBar , SafeHtmlPipe ] ,
	templateUrl : './ictu-file-downloader.component.html' ,
	styleUrl    : './ictu-file-downloader.component.css'
} )
export class IctuFileDownloaderComponent implements OnDestroy {

	private fileService : IctuFileService = inject<IctuFileService>( IctuFileService );

	readonly dialogRef : MatDialogRef<IctuFileDownloaderComponent , boolean> = inject<MatDialogRef<IctuFileDownloaderComponent , boolean>>( MatDialogRef<IctuFileDownloaderComponent , boolean> );

	readonly data : IctuFileDownloaderDialogData = inject<IctuFileDownloaderDialogData>( MAT_DIALOG_DATA );

	readonly info : ModelSignal<IctuBasicFile | ICTUStandardFile> = model( this.data.info );

	private readonly destroy$ : Subject<void> = new Subject<void>();

	private readonly loadingObserver$ : Subject<void> = new Subject<void>();

	private readonly reloadObserver$ : Subject<void> = new Subject<void>();

	protected readonly downloadProgress : WritableSignal<number> = signal( 0 );

	protected readonly state : WritableSignal<IctuFileDownloaderState> = signal( 'waiting' );

	constructor (
		@Inject( SAVER ) private save : Saver
	) {
		toObservable( this.info ).pipe(
			filter( ( info : IctuBasicFile | ICTUStandardFile ) : boolean => !! info ) ,
			takeUntilDestroyed()
		).subscribe( () : void => this.downloadFile() );

		this.reloadObserver$.pipe(
			takeUntilDestroyed() ,
			debounceTime( 1000 )
		).subscribe( () : void => {
			this.downloadFile();
		} )
	}

	private downloadFile () : void {
		this.state.set( 'loading' );
		this.loadingObserver$.next();
		const requestDownload : Observable<Download> = this.info().location === 'aws' ? this.fileService.downloadAwsFile( this.info().id.toString( 10 ) ) : this.fileService.downloadLocalFile( this.info().id );
		requestDownload.pipe(
			takeUntil( merge( this.loadingObserver$ , this.destroy$ ) )
		).subscribe( {
			next  : ( response : Download ) : void => {
				if ( response.state === 'DONE' ) {
					this.downloadProgress.set( 100 );
					this.save( response.content , this.info().title );
					this.close( true );
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

	protected close ( result : boolean ) : void {
		this.dialogRef.close( result );
	}

	protected btnCancel () : void {
		this.close( false );
	}

	protected btnReload () : void {
		this.state.set( 'loading' );
		this.reloadObserver$.next();
	}

	ngOnDestroy () : void {
		this.destroy$.next();
		this.destroy$.complete();
	}
}
