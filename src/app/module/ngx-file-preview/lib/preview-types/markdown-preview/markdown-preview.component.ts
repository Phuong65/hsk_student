import { ChangeDetectionStrategy , Component , input , InputSignal , OnDestroy , OnInit } from '@angular/core';
import { BasePreviewComponent } from "@module/ngx-file-preview/lib/preview-types";
import { MarkdownPipe } from "./markdown.pipe";
import { PreviewIconComponent } from '@module/ngx-file-preview/lib/components/preview-icon';
import { FileReaderResponse } from "../../services";
import { I18nPipe } from "../../i18n";
import { Observable , Subject , takeUntil } from "rxjs";
import { toObservable } from "@angular/core/rxjs-interop";
import { AutoThemeConfig , PreviewFile , ThemeMode } from "@module/ngx-file-preview";
import { filter } from "rxjs/operators";

@Component( {
	selector        : 'ngx-markdown-preview' ,
	standalone      : true ,
	imports         : [ PreviewIconComponent , MarkdownPipe , I18nPipe ] ,
	templateUrl     : './markdown-preview.component.html' ,
	styleUrls       : [ '../../styles/_theme.scss' , './markdown-preview.component.scss' ] ,
	changeDetection : ChangeDetectionStrategy.OnPush
} )
export class MarkdownPreviewComponent extends BasePreviewComponent implements OnInit , OnDestroy {



	content : string = "";

	scale : number = 1;

	private readonly SCALE_STEP : number = 0.1;

	private readonly MAX_SCALE : number = 3;

	private readonly MIN_SCALE : number = 0.1;

	private readonly DEFAULT_SCALE : number = 1;

	private destroy$ : Subject<void> = new Subject();

	private fileChanges : Observable<PreviewFile> = toObservable( this.file );

	ngOnInit () : void {
		this.fileChanges.pipe(
			filter( ( file : PreviewFile ) : boolean => !! file ) ,
			takeUntil( this.destroy$ )
		).subscribe( () : void => {
			void this.loadFile( "text" );
		} );
	}

	protected override async handleFileContent ( content : FileReaderResponse ) : Promise<any> {
		const { text = "" } = content;
		this.content        = text;
	}

	zoomIn () : void {
		if ( this.scale < this.MAX_SCALE ) {
			this.scale = Math.min( this.MAX_SCALE , this.scale + this.SCALE_STEP );
			this.cdr.markForCheck();
		}
	}

	zoomOut () : void {
		if ( this.scale > this.MIN_SCALE ) {
			this.scale = Math.max( this.MIN_SCALE , this.scale - this.SCALE_STEP );
			this.cdr.markForCheck();
		}
	}

	resetZoom () : void {
		this.scale = this.DEFAULT_SCALE;
		this.cdr.markForCheck();
	}

	toggleFullscreen () : void {
		if ( ! document.fullscreenElement ) {
			void document.documentElement.requestFullscreen();
		}
		else {
			void document.exitFullscreen();
		}
	}

	ngOnDestroy () : void {
		this.destroy$.next();
		this.destroy$.complete();
	}

}
