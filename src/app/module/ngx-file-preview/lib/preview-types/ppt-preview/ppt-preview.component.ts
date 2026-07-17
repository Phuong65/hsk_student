import { AfterViewInit , ChangeDetectionStrategy , Component , ElementRef , OnDestroy , OnInit , ViewChild } from '@angular/core';

import { init } from "pptx-preview";
import { FileReaderResponse } from "../../services";
import { BasePreviewComponent } from "@module/ngx-file-preview/lib/preview-types";
import { PreviewIconComponent } from "@module/ngx-file-preview/lib/components/preview-icon";
import { Observable , Subject , takeUntil } from "rxjs";
import { toObservable } from "@angular/core/rxjs-interop";
import { PreviewFile } from "@module/ngx-file-preview";
import { filter } from "rxjs/operators";

@Component( {
	selector        : 'ngx-ppt-preview' ,
	standalone      : true ,
	imports: [PreviewIconComponent] ,
	template        : `
		<div class="ppt-container" #container>
			<div class="toolbar">
				<div class="left-controls">
					<button class="tool-btn" (click)="zoomOut()">
						<preview-icon name="zoom-out" [themeMode]="themeMode()"></preview-icon>
					</button>
					<span class="zoom-text" (click)="resetZoom()" title="Click Reset Zoom">{{ (scale * 100).toFixed(0) }}%</span>
					<button class="tool-btn" (click)="zoomIn()">
						<preview-icon [themeMode]="themeMode()" name="zoom-in"></preview-icon>
					</button>
				</div>
				<div class="right-controls">
					<button class="tool-btn" (click)="toggleFullscreen()">
						<preview-icon [themeMode]="themeMode()" name="fullscreen"></preview-icon>
					</button>
				</div>
			</div>

			<div class="preview-container" #previewContainer (wheel)="handleWheel($event)" (mousedown)="startDrag($event)" [class.dragging]="isDragging">
				<div class="content-wrapper">
					<div #content class="preview-content"></div>
				</div>
			</div>
		</div>
	` ,
	styleUrls       : [ "../../styles/_theme.scss" , "ppt-preview.component.scss" ] ,
	changeDetection : ChangeDetectionStrategy.OnPush
} )
export class PptPreviewComponent extends BasePreviewComponent implements OnDestroy , OnInit , AfterViewInit {

	@ViewChild( 'content' ) content! : ElementRef<HTMLDivElement>;

	@ViewChild( 'previewContainer' ) previewContainer! : ElementRef<HTMLDivElement>;

	@ViewChild( 'container' ) container! : ElementRef<HTMLDivElement>;

	private pptxPreviewer : any;

	scale : number = 1;

	private readonly SCALE_STEP : number = 0.1;

	private readonly MAX_SCALE : number = 3;

	private readonly MIN_SCALE : number = 0.1;

	private readonly DEFAULT_SCALE : number = 1;

	isDragging : boolean = false;

	private startScrollLeft : number = 0;

	private startScrollTop : number = 0;

	private lastMouseX : number = 0;

	private lastMouseY : number = 0;

	private mouseMoveListener? : ( e : MouseEvent ) => void;

	private mouseUpListener? : ( e : MouseEvent ) => void;

	private destroy$ : Subject<void> = new Subject();

	private fileChanges : Observable<PreviewFile> = toObservable( this.file );

	ngOnInit () : void {
		this.fileChanges.pipe(
			filter( ( file : PreviewFile ) : boolean => !! file ) ,
			takeUntil( this.destroy$ )
		).subscribe( () : void => {
			void this.loadFile();
		} )
	}

	ngAfterViewInit () : void {
		this.setupDragListeners();
		this.disableNativeDragAndSelect();
		this.setupResizeObserver();
	}

	protected override async handleFileContent ( content : FileReaderResponse ) : Promise<void> {
		try {
			const { data }                   = content;
			const container : HTMLDivElement = this.previewContainer.nativeElement;
			const { width }                  = container.getBoundingClientRect();
			this.pptxPreviewer               = init( this.content.nativeElement , {
				width    : Math.min( 1200 , width ) ,
				renderer : 'canvas'
			} );
			await this.pptxPreviewer.preview( data );
		}
		catch ( e ) {
			console.log( "error" , e )
		}
	}

	private setupResizeObserver () : void {
		const resizeObserver = new ResizeObserver( () : void => {
			if ( this.pptxPreviewer ) {
				this.updatePreviewSize();
			}
		} );
		resizeObserver.observe( this.container.nativeElement );
	}

	private updatePreviewSize () : void {
		const container : HTMLDivElement = this.previewContainer.nativeElement;
		const { width }                  = container.getBoundingClientRect();
		const scaledWidth : number       = Math.min( 1200 , width ) * this.scale;

		if ( this.pptxPreviewer ) {
			this.pptxPreviewer?.resize?.( scaledWidth );
		}
	}

	private setupDragListeners () : void {
		this.mouseMoveListener = ( e : MouseEvent ) : void => this.onDrag( e );
		this.mouseUpListener   = () : void => this.stopDrag();

		document.addEventListener( 'mousemove' , this.mouseMoveListener );
		document.addEventListener( 'mouseup' , this.mouseUpListener );
	}

	private removeDragListeners () : void {
		if ( this.mouseMoveListener ) {
			document.removeEventListener( 'mousemove' , this.mouseMoveListener );
		}
		if ( this.mouseUpListener ) {
			document.removeEventListener( 'mouseup' , this.mouseUpListener );
		}
	}

	startDrag ( e : MouseEvent ) : void {
		if ( e.target instanceof HTMLButtonElement ||
		     e.target instanceof HTMLInputElement ||
		     ( e.target as HTMLElement ).closest( '.toolbar' ) ) {
			return;
		}

		const container : HTMLDivElement = this.previewContainer.nativeElement;
		const rect : DOMRect             = container.getBoundingClientRect();

		const isClickOnScrollbarX : boolean = e.clientY > ( rect.bottom - 12 );
		const isClickOnScrollbarY : boolean = e.clientX > ( rect.right - 12 );
		if ( isClickOnScrollbarX || isClickOnScrollbarY ) {
			return;
		}

		this.isDragging      = true;
		this.lastMouseX      = e.clientX;
		this.lastMouseY      = e.clientY;
		this.startScrollLeft = container.scrollLeft;
		this.startScrollTop  = container.scrollTop;

		document.body.style.userSelect = 'none';
		document.body.style.cursor     = 'grabbing';
	}

	private onDrag ( e : MouseEvent ) : void {
		if ( ! this.isDragging ) return;
		e.preventDefault();
		const container : HTMLDivElement = this.previewContainer.nativeElement;
		const deltaX : number            = e.clientX - this.lastMouseX;
		const deltaY : number            = e.clientY - this.lastMouseY;
		this.lastMouseX                  = e.clientX;
		this.lastMouseY                  = e.clientY;
		requestAnimationFrame( () : void => {
			container.scrollLeft -= deltaX;
			container.scrollTop -= deltaY;
		} );
	}

	private stopDrag () : void {
		if ( ! this.isDragging ) return;

		this.isDragging = false;
		document.body.style.removeProperty( 'user-select' );
		document.body.style.removeProperty( 'cursor' );
		window.getSelection()?.removeAllRanges();
	}

	handleWheel ( event : WheelEvent ) : void {
		if ( event.ctrlKey || event.metaKey ) {
			event.preventDefault();
			const delta : number             = event.deltaY || event.detail || 0;
			const container : HTMLDivElement = this.previewContainer.nativeElement;
			const rect : DOMRect             = container.getBoundingClientRect();
			const mouseX : number            = event.clientX - rect.left;
			const mouseY : number            = event.clientY - rect.top;
			const oldScale : number          = this.scale;

			if ( delta < 0 ) {
				this.zoomIn();
			}
			else {
				this.zoomOut();
			}

			if ( oldScale !== this.scale ) {
				const scaleChange : number = this.scale / oldScale;
				const contentX : number    = ( container.scrollLeft + mouseX ) / oldScale;
				const contentY : number    = ( container.scrollTop + mouseY ) / oldScale;
				const newContentX : number = contentX * this.scale;
				const newContentY : number = contentY * this.scale;
				container.scrollLeft       = newContentX - mouseX;
				container.scrollTop        = newContentY - mouseY;
			}
		}
	}

	zoomIn () : void {
		if ( this.scale < this.MAX_SCALE ) {
			const oldScale : number = this.scale;
			this.scale              = Math.min( this.MAX_SCALE , this.scale + this.SCALE_STEP );
			this.applyScale( oldScale );
		}
	}


	zoomOut () : void {
		if ( this.scale > this.MIN_SCALE ) {
			const oldScale : number = this.scale;
			this.scale              = Math.max( this.MIN_SCALE , this.scale - this.SCALE_STEP );
			this.applyScale( oldScale );
		}
	}

	resetZoom () : void {
		const oldScale : number = this.scale;
		this.scale              = this.DEFAULT_SCALE;
		this.applyScale( oldScale );
	}

	private applyScale ( oldScale : number ) : void {
		const container : HTMLDivElement      = this.previewContainer.nativeElement;
		const contentWrapper : HTMLDivElement = this.content.nativeElement;
		const rect : DOMRect                  = container.getBoundingClientRect();
		const scaleChange : number            = this.scale / oldScale;
		const centerX : number                = ( container.scrollLeft + rect.width / 2 ) / oldScale;
		const centerY : number                = ( container.scrollTop + rect.height / 2 ) / oldScale;

		contentWrapper.style.transform       = `scale(${ this.scale })`;
		contentWrapper.style.transformOrigin = 'top left';

		container.scrollLeft = centerX * this.scale - rect.width / 2;
		container.scrollTop  = centerY * this.scale - rect.height / 2;

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

	private disableNativeDragAndSelect () : void {
		if ( this.content ) {
			const element : HTMLDivElement = this.content.nativeElement;
			element.addEventListener( 'dragstart' , ( e : Event ) : void => e.preventDefault() );
			element.addEventListener( 'selectstart' , ( e : Event ) : void => {
				if ( this.isDragging ) {
					e.preventDefault();
				}
			} );
		}
	}

	ngOnDestroy () : void {
		this.removeDragListeners();
		this.destroy$.next();
		this.destroy$.complete();
	}
}
