import { ChangeDetectorRef , Directive , inject , input , InputSignal } from '@angular/core';
import { AutoThemeConfig , PreviewFile , ThemeMode } from '../../types';
import { FileReaderResponse , FileReaderService , PreviewService } from "../../services";
import { firstValueFrom , Observable } from "rxjs";

@Directive( {
	standalone : true
} )
export abstract class BasePreviewComponent {
	//
	// protected abstract file : InputSignal<PreviewFile>;
	//
	// protected abstract themeMode : InputSignal<ThemeMode>;
	//
	// protected abstract autoThemeConfig : InputSignal<AutoThemeConfig>;

	public canDownload : InputSignal<boolean> = input<boolean>( true );

	public file : InputSignal<PreviewFile> = input<PreviewFile>( null );

	public themeMode : InputSignal<ThemeMode> = input<ThemeMode>( 'auto' );

	public autoThemeConfig : InputSignal<AutoThemeConfig> = input( null );

	protected fileReader : FileReaderService = inject( FileReaderService );

	protected previewService : PreviewService = inject( PreviewService );

	protected cdr : ChangeDetectorRef = inject( ChangeDetectorRef );

	get isLoading () : Observable<boolean> {
		return this.previewService.getLoadingObservable();
	}

	t ( key : string , ... args : ( string | number )[] ) : string {
		return this.previewService?.getLangParser()?.t( key , ... args );
	}

	protected async loadFile ( fileType? : 'arraybuffer' | 'text' | 'json' ) : Promise<void> {
		if ( ! this.file() ) return;
		this.startLoading();
		try {
			const content : FileReaderResponse = await firstValueFrom( this.fileReader.readFile( this.file() , fileType ) );
			await this.handleFileContent( content );
		}
		catch ( error ) {
			console.error( 'Failed to read file:' , error );
		}
		finally {
			this.stopLoading();
		}
	}

	protected abstract handleFileContent ( content : FileReaderResponse ) : Promise<any>;

	protected startLoading () : void {
		this.previewService.setLoading( true )
		this.cdr.markForCheck();
	}

	protected stopLoading () : void {
		this.previewService.setLoading( false )
		this.cdr.markForCheck();
	}
}
