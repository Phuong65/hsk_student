import { Component , computed , inject , model , ModelSignal , OnDestroy , Signal , signal , WritableSignal } from '@angular/core';
import { MAT_DIALOG_DATA , MatDialogRef } from "@angular/material/dialog";
import { PlyrComponent } from '@module/ngx-plyr/public_api';
import { takeUntilDestroyed , toObservable } from "@angular/core/rxjs-interop";
import { filter } from "rxjs/operators";
import { canFilePreview , IctuBasicFile , ICTUStandardFile } from "@models/file";
import { IctuFileService } from "@services/ictu-file.service";
import { merge , Subject , takeUntil } from "rxjs";
import { SafeHtmlPipe } from "@pipes/safe-html.pipe";
import { VideoAutoFitDirective } from "@theme/directives/video-auto-fit.directive";
import { Options , Source } from "plyr";

export interface IctuMediaPlayerDialogData {
	title : string;
	sources : Source[];
	options : Options;
	aspectRatio : string;
	file : IctuBasicFile;
}

type IctuMediaPlayerState = 'waiting' | 'loading' | 'error' | 'loaded' | 'invalid';

@Component( {
	selector    : 'app-ictu-media-player' ,
	imports     : [ PlyrComponent , SafeHtmlPipe , VideoAutoFitDirective ] ,
	templateUrl : './ictu-media-player.component.html' ,
	styleUrl    : './ictu-media-player.component.css'
} )
export class IctuMediaPlayerComponent implements OnDestroy {

	readonly dialogRef : MatDialogRef<IctuMediaPlayerComponent> = inject<MatDialogRef<IctuMediaPlayerComponent>>( MatDialogRef<IctuMediaPlayerComponent> );

	readonly data : IctuMediaPlayerDialogData = inject<IctuMediaPlayerDialogData>( MAT_DIALOG_DATA );

	readonly sources : ModelSignal<Source[]> = model( this.data.sources );

	readonly options : ModelSignal<Options> = model( this.data.options );

	readonly title : ModelSignal<string> = model( this.data.title );

	readonly aspectRatio : ModelSignal<string> = model( this.data.aspectRatio );

	readonly file : ModelSignal<IctuBasicFile | ICTUStandardFile> = model( this.data.file );

	protected readonly fileExtensionError : Signal<string> = computed( () : string => [ 'Định dạng file' , this.file()?.ext ? `<mark class="f-13 bg-transparent text-primary">${ this.file()?.ext }</mark>` : '' , 'chưa được hỗ trợ xem trước!' ].filter( Boolean ).join( ' ' ) );

	protected readonly state : WritableSignal<IctuMediaPlayerState> = signal<IctuMediaPlayerState>( 'loading' );

	private readonly fileService : IctuFileService = inject<IctuFileService>( IctuFileService );

	private readonly destroy$ : Subject<void> = new Subject<void>();

	private readonly loadingObserver : Subject<void> = new Subject<void>();

	constructor () {
		toObservable( this.file ).pipe(
			filter( ( file : IctuBasicFile | ICTUStandardFile ) : boolean => !! file ) ,
			takeUntilDestroyed()
		).subscribe( ( file : IctuBasicFile | ICTUStandardFile ) : void => {
			if ( this.validateFile( file ) ) {
				this.preloadFile();
			}
			else {
				this.state.set( 'invalid' );
			}
		} )
		toObservable( this.sources ).pipe(
			filter( ( sources : Source[] ) : boolean => sources && sources.length > 0 ) ,
			takeUntilDestroyed()
		).subscribe( () : void => {
			this.state.set( 'loaded' );
		} )
	}

	private validateFile ( file : IctuBasicFile | ICTUStandardFile ) : boolean {
		return file.ext && canFilePreview( file );
	}

	private preloadFile () : void {
		this.state.set( 'loading' );
		this.loadingObserver.next();
		this.fileService.getLinkFile( this.file() ).pipe(
			takeUntil( merge( this.loadingObserver , this.destroy$ ) )
		).subscribe( {
			next  : ( link : string ) : void => {
				if ( link ) {
					this.sources.set( [ { src : link , provider : 'html5' , type : this.file().type } ] );
				}
				else {
					this.state.set( 'invalid' );
				}
			} ,
			error : () : void => {
				this.state.set( 'error' );
			}
		} );
	}

	protected btnClose () : void {
		this.dialogRef.close();
	}

	protected btnReload () : void {
		this.preloadFile();
	}

	ngOnDestroy () : void {
		this.destroy$.next();
		this.destroy$.complete();
	}
}
