import { AfterViewInit , ChangeDetectionStrategy , Component , ElementRef , inject , ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileReaderResponse } from "../../services";
import { I18nPipe } from "../../i18n/i18n.pipe";
import { PreviewIconComponent } from "@module/ngx-file-preview/lib/components/preview-icon";
import { BasePreviewComponent } from "@module/ngx-file-preview/lib/preview-types";

@Component( {
	selector        : 'ngx-image-preview' ,
	standalone      : true ,
	imports         : [ CommonModule , PreviewIconComponent , I18nPipe ] ,
	template        : `
        <div class="image-preview" (mousedown)="startDrag($event)" (mousemove)="onDrag($event)" (mouseup)="stopDrag()" (mouseleave)="stopDrag()" (wheel)="handleWheel($event)">
            <div class="image-wrapper" #imageWrapper [style]="transformStyle" [class.is-moving]="isDragging">
                <img #previewImage [src]="file().url" [style.display]="(isLoading|async) ? 'none' : 'block'" (load)="onImageLoad()" alt="preview"/>
            </div>
            @if (! (isLoading|async)) {
                <div class="image-info">
                    <span class="filename">{{ file().name }}</span>
                    <span class="dimensions">{{ imageWidth }} × {{ imageHeight }}</span>
                </div>
            }

            @if (! (isLoading|async)) {
                <div class="toolbar">
                    <div class="tool-group">
                        <div class="control" (click)="zoomOut()" [class.disabled]="zoom <= minZoom">
                            <preview-icon [themeMode]="themeMode()" name="zoom-out" [title]="'preview.toolbar.zoomOut'|i18n"></preview-icon>
                        </div>
                        <span class="zoom-text">{{ (zoom * 100).toFixed(0) }}%</span>
                        <div class="control" (click)="zoomIn()" [class.disabled]="zoom >= maxZoom">
                            <preview-icon [themeMode]="themeMode()" name="zoom-in" [title]="'preview.toolbar.zoomIn'|i18n"></preview-icon>
                        </div>
                    </div>

                    <div class="divider"></div>

                    <div class="tool-group">
                        <div class="control" (click)="rotate(-90)">
                            <preview-icon [themeMode]="themeMode()" name="rotate-90" [title]="'preview.toolbar.rotate-90'|i18n"></preview-icon>
                        </div>
                        <div class="control" (click)="rotate(90)">
                            <preview-icon [themeMode]="themeMode()" name="rotate90" [title]="'preview.toolbar.rotate90'|i18n"></preview-icon>
                        </div>
                    </div>

                    <div class="divider"></div>

                    <div class="tool-group">
                        <div class="control" (click)="autoFit()">
                            <preview-icon [themeMode]="themeMode()" name="auto-fit" [title]="'preview.toolbar.autoFit'|i18n"></preview-icon>
                        </div>
                        <div class="control" (click)="originSize()">
                            <preview-icon [themeMode]="themeMode()" name="origin-size" [title]="'preview.toolbar.originSize'|i18n"></preview-icon>
                        </div>
                        <div class="control" (click)="resetView()">
                            <preview-icon [themeMode]="themeMode()" name="reset" [title]="'preview.toolbar.reset'|i18n"></preview-icon>
                        </div>
                        @if (canDownload()) {
                            <div class="control" (click)="download()">
                                <preview-icon [themeMode]="themeMode()" name="download" [title]="'preview.toolbar.download'|i18n"></preview-icon>
                            </div>
                        }
                    </div>
                </div>
            }
        </div>
    ` ,
	styleUrls       : [
		"../../styles/_theme.scss" ,
		'./image-preview.component.scss'
	] ,
	changeDetection : ChangeDetectionStrategy.OnPush
} )
export class ImagePreviewComponent extends BasePreviewComponent implements AfterViewInit {

	@ViewChild( 'imageWrapper' ) imageWrapper? : ElementRef<HTMLDivElement>;

	@ViewChild( 'previewImage' ) previewImage? : ElementRef<HTMLImageElement>;

	protected readonly minZoom : number = 0.1;

	protected readonly maxZoom : number = 5;

	private readonly zoomStep : number = 0.1;

	zoom : number = 1;

	rotation : number = 0;

	translateX : number = 0;

	translateY : number = 0;

	isDragging : boolean = false;

	imageWidth : number = 0;

	imageHeight : number = 0;

	transformStyle : string = '';

	private dragStartX : number = 0;

	private dragStartY : number = 0;

	private el : ElementRef = inject<ElementRef>( ElementRef );

	ngAfterViewInit () : void {
		this.updateTransformStyle();
	}

	protected override async handleFileContent ( content : FileReaderResponse ) : Promise<void> {
	}

	private updateTransformStyle () : void {
		const transform           = `translate(-50%, -50%) translate(${ this.translateX }px, ${ this.translateY }px) scale(${ this.zoom }) rotate(${ this.rotation }deg)`;
		const transition : string = this.isDragging ? 'none' : 'transform 0.3s ease';
		this.transformStyle       = `transform: ${ transform }; transition: ${ transition };`;
		this.cdr.markForCheck();
	}

	handleWheel ( event : WheelEvent ) : void {
		event.preventDefault();
		if ( ! this.imageWrapper?.nativeElement ) return;

		const delta : number      = event.deltaY < 0 ? 1 : -1;
		const zoomFactor : number = 1 + ( delta * this.zoomStep );
		const newZoom : number    = Math.max( this.minZoom , Math.min( this.maxZoom , this.zoom * zoomFactor ) );
		this.zoomHandler( newZoom );
	}

	startDrag ( event : MouseEvent ) : void {
		if ( event.button !== 0 ) return;
		this.isDragging = true;
		this.dragStartX = event.clientX - this.translateX;
		this.dragStartY = event.clientY - this.translateY;
		this.updateTransformStyle();
	}

	onDrag ( event : MouseEvent ) : void {
		if ( ! this.isDragging ) return;
		event.preventDefault();

		this.translateX = event.clientX - this.dragStartX;
		this.translateY = event.clientY - this.dragStartY;
		this.updateTransformStyle();
	}

	stopDrag () : void {
		this.isDragging = false;
		this.updateTransformStyle();
	}

	zoomIn () : void {
		const newZoom : number = Math.min( this.maxZoom , this.zoom * ( 1 + this.zoomStep ) );
		this.zoomHandler( newZoom );
	}

	zoomOut () : void {
		const newZoom : number = Math.max( this.minZoom , this.zoom / ( 1 + this.zoomStep ) );
		this.zoomHandler( newZoom );
	}

	private zoomHandler ( newZoom : number ) : void {
		if ( newZoom !== this.zoom ) {
			const scale : number = newZoom / this.zoom;
			this.translateX      = this.translateX * scale;
			this.translateY      = this.translateY * scale;
			this.zoom            = newZoom;
			this.updateTransformStyle();
		}
	}

	rotate ( angle : number ) : void {
		this.rotation += angle;
		this.updateTransformStyle();
	}

	resetView () : void {
		this.rotation = 0;
		this.centerImage();
		this.autoFit()
	}

	onImageLoad () : void {
		if ( this.previewImage?.nativeElement ) {
			const image : HTMLImageElement = this.previewImage.nativeElement;
			this.imageWidth                = image.naturalWidth;
			this.imageHeight               = image.naturalHeight;
			this.autoFit()
		}
	}

	autoFit () : void {
		if ( ! this.previewImage?.nativeElement ) return;
		const image : HTMLImageElement = this.previewImage.nativeElement;
		const container : HTMLElement  = this.el.nativeElement
		const imageWidth : number      = image.naturalWidth;
		const imageHeight : number     = image.naturalHeight;
		const containerWidth : number  = container.clientWidth
		const containerHeight : number = container.clientHeight
		if ( ! imageWidth || ! imageHeight || ! containerWidth || ! containerHeight ) return;
		const scaleX : number = containerWidth / imageWidth;
		const scaleY : number = containerHeight / imageHeight;
		const zoom : number   = Math.min( scaleX , scaleY );
		this.zoom             = zoom > 0 ? zoom : 1;
		setTimeout( () : void => this.updateTransformStyle() );
	}

	originSize () : void {
		this.zoom = 1;
		setTimeout( () : void => this.updateTransformStyle() );
	}

	private centerImage () : void {
		if ( ! this.imageWrapper?.nativeElement || ! this.previewImage?.nativeElement ) return;

		const wrapper : HTMLDivElement = this.imageWrapper.nativeElement;
		const image : HTMLImageElement = this.previewImage.nativeElement;

		const wrapperWidth : number  = wrapper.clientWidth;
		const wrapperHeight : number = wrapper.clientHeight;
		const imageWidth : number    = image.naturalWidth;
		const imageHeight : number   = image.naturalHeight;

		if ( ! wrapperWidth || ! wrapperHeight || ! imageWidth || ! imageHeight ) return;

		const wrapperRatio : number = wrapperWidth / wrapperHeight;
		const imageRatio : number   = imageWidth / imageHeight;

		this.zoom = imageRatio > wrapperRatio ? wrapperWidth / imageWidth : wrapperHeight / imageHeight;

		if ( ! this.zoom || this.zoom <= 0 ) {
			this.zoom = 1;
		}

		this.translateX = 0;
		this.translateY = 0;

		setTimeout( () : void => this.updateTransformStyle() );
	}

	download () : void {
		if ( ! this.file()?.url ) return;

		const link : HTMLAnchorElement = document.createElement( 'a' );
		link.href                      = this.file().url;
		link.download                  = this.file().name || 'image';
		link.target                    = '_blank';
		link.rel                       = 'noopener noreferrer';

		if ( this.isExternalUrl( this.file().url ) ) {
			const image : HTMLImageElement = this.previewImage?.nativeElement;
			if ( ! image ) return;

			const canvas : HTMLCanvasElement = document.createElement( 'canvas' );
			canvas.width                     = image.naturalWidth;
			canvas.height                    = image.naturalHeight;

			const ctx : CanvasRenderingContext2D = canvas.getContext( '2d' );
			if ( ! ctx ) return;

			ctx.drawImage( image , 0 , 0 );

			try {
				canvas.toBlob( ( blob : Blob ) : void => {
					if ( ! blob ) return;
					const url : string = URL.createObjectURL( blob );
					link.href          = url;
					link.click();
					URL.revokeObjectURL( url );
				} , 'image/png' );
			}
			catch ( error ) {
				console.error( 'Failed to download image:' , error );
				window.open( this.file().url , '_blank' );
			}
		}
		else {
			link.click();
		}
	}

	private isExternalUrl ( url : string ) : boolean {
		try {
			const currentOrigin : string = window.location.origin;
			const urlOrigin : string     = new URL( url , window.location.href ).origin;
			return currentOrigin !== urlOrigin;
		}
		catch {
			return true;
		}
	}
}
