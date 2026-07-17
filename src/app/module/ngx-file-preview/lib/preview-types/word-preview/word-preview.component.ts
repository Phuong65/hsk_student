import { ChangeDetectionStrategy , Component , ElementRef , input , InputSignal , OnDestroy , OnInit , ViewChild } from '@angular/core';

import { PreviewIconComponent } from '@module/ngx-file-preview/lib/components/preview-icon';
import { renderAsync } from 'docx-preview';
import { FileReaderResponse } from "../../services";
import { I18nPipe } from "../../i18n";
import { BasePreviewComponent } from "@module/ngx-file-preview/lib/preview-types";
import { filter } from "rxjs/operators";
import { AutoThemeConfig , PreviewFile , ThemeMode } from "@module/ngx-file-preview";
import { Observable , Subject , takeUntil } from "rxjs";
import { toObservable } from "@angular/core/rxjs-interop";

@Component( {
	selector        : 'ngx-word-preview' ,
	standalone      : true ,
	imports: [PreviewIconComponent, I18nPipe] ,
	template        : `
		<div class="word-container">
			<div class="toolbar">
				<div class="left-controls">
					<button (click)="zoomOut()" [disabled]="scale <= MIN_SCALE" class="tool-btn">
						<preview-icon [themeMode]="themeMode()" [title]="'preview.toolbar.zoomOut'|i18n" name="zoom-out"></preview-icon>
					</button>
					<span (click)="resetZoom()" [title]="'preview.toolbar.resetZoom'|i18n" class="zoom-text">{{ (scale * 100).toFixed(0) }}%</span>
					<button (click)="zoomIn()" [disabled]="scale >= MAX_SCALE" class="tool-btn">
						<preview-icon [themeMode]="themeMode()" [title]="'preview.toolbar.zoomIn'|i18n" name="zoom-in"></preview-icon>
					</button>
				</div>
				<div class="right-controls">
					<button (click)="toggleFullscreen()" class="tool-btn">
						<preview-icon [themeMode]="themeMode()" [title]="'preview.toolbar.fullscreen'|i18n" name="fullscreen"></preview-icon>
					</button>
				</div>
			</div>

			<div #previewContainer (pointerdown)="startDrag($event)" (pointermove)="onDrag($event)" (pointerup)="stopDrag($event)" (wheel)="handleWheel($event)" [class.dragging]="isDragging" class="preview-container">
				<div class="content-wrapper">
					<div #content [style.transform]="'scale(' + scale + ')'" class="preview-content"></div>
				</div>
			</div>
		</div>
	` ,
	styleUrls       : [ "../../styles/_theme.scss" , "word-preview.component.scss" ] ,
	changeDetection : ChangeDetectionStrategy.OnPush
} )
export class WordPreviewComponent extends BasePreviewComponent implements OnInit , OnDestroy {



	@ViewChild( 'content' ) content! : ElementRef<HTMLDivElement>;

	@ViewChild( 'previewContainer' ) previewContainer! : ElementRef<HTMLDivElement>;

	protected readonly MIN_SCALE : number = 0.25;

	protected readonly MAX_SCALE : number = 4;

	protected readonly SCALE_STEP : number = 0.1;

	protected readonly DEFAULT_SCALE : number = 1;

	protected scale : number = 1;

	protected isDragging : boolean = false;

	private startX : number = 0;

	private startY : number = 0;

	private scrollLeft : number = 0;

	private scrollTop : number = 0;

	private destroy$ : Subject<void> = new Subject();

	private fileChanges : Observable<PreviewFile> = toObservable( this.file );

	ngOnInit () : void {
		this.fileChanges.pipe(
			filter( ( file : PreviewFile ) : boolean => !! file ) ,
			takeUntil( this.destroy$ )
		).subscribe( () : void => {
			void this.loadFile()
		} )
	}

	override async handleFileContent ( content : FileReaderResponse ) : Promise<void> {
		try {
			await renderAsync( content.data , this.content.nativeElement , undefined , {
				className    : 'docx-content' ,
				inWrapper    : false ,
				ignoreWidth  : false ,
				ignoreHeight : false ,
				ignoreFonts  : false ,
				breakPages   : true ,
				useBase64URL : true
			} );
		}
		catch ( error ) {
			console.log( "error" , error )
		}
		this.cdr.markForCheck();
	}

	handleWheel ( event : WheelEvent ) : void {
		if ( event.ctrlKey || event.metaKey ) {
			event.preventDefault();
			const delta : number = event.deltaY < 0 ? 1 : -1;
			if ( delta > 0 ) {
				this.zoomIn();
			}
			else {
				this.zoomOut();
			}
		}
	}

	startDrag ( event : PointerEvent ) : void {
		if ( event.button !== 0 ) return;
		this.isDragging                  = true;
		const container : HTMLDivElement = this.previewContainer.nativeElement;
		this.startX                      = event.clientX;
		this.startY                      = event.clientY;
		this.scrollLeft                  = container.scrollLeft;
		this.scrollTop                   = container.scrollTop;
		container.setPointerCapture( event.pointerId );
		event.preventDefault();
	}

	onDrag ( event : PointerEvent ) : void {
		if ( ! this.isDragging ) return;

		const container : HTMLDivElement = this.previewContainer.nativeElement;
		const deltaX : number            = event.clientX - this.startX;
		const deltaY : number            = event.clientY - this.startY;
		container.scrollLeft             = this.scrollLeft - deltaX;
		container.scrollTop              = this.scrollTop - deltaY;
	}

	stopDrag ( event : PointerEvent ) : void {
		if ( ! this.isDragging ) return;

		this.isDragging = false;
		this.previewContainer.nativeElement.releasePointerCapture( event.pointerId );
	}

	zoomIn () : void {
		if ( this.scale < this.MAX_SCALE ) {
			this.scale = Math.min( this.MAX_SCALE , this.scale + this.SCALE_STEP );
			this.applyZoom();
		}
	}

	zoomOut () : void {
		if ( this.scale > this.MIN_SCALE ) {
			this.scale = Math.max( this.MIN_SCALE , this.scale - this.SCALE_STEP );
			this.applyZoom();
		}
	}

	resetZoom () : void {
		this.scale = this.DEFAULT_SCALE;
		this.applyZoom();
	}

	private applyZoom () : void {
		if ( this.content?.nativeElement && this.previewContainer?.nativeElement ) {
			const container : HTMLDivElement                 = this.previewContainer.nativeElement;
			const rect : DOMRect                             = container.getBoundingClientRect();
			const centerX : number                           = ( container.scrollLeft + rect.width / 2 ) / this.scale;
			const centerY : number                           = ( container.scrollTop + rect.height / 2 ) / this.scale;
			this.content.nativeElement.style.transform       = `scale(${ this.scale })`;
			this.content.nativeElement.style.transformOrigin = 'top left';
			requestAnimationFrame( () : void => {
				container.scrollLeft = centerX * this.scale - rect.width / 2;
				container.scrollTop  = centerY * this.scale - rect.height / 2;
			} );
		}
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

