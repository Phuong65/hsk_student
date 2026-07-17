import { ChangeDetectionStrategy , Component , ElementRef , input , InputSignal , OnInit , ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxExtendedPdfViewerComponent , NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';
import { PreviewIconComponent } from '@module/ngx-file-preview/lib/components/preview-icon';
import { BasePreviewComponent } from "@module/ngx-file-preview/lib/preview-types";
import { FileReaderResponse } from "../../services";
import { I18nPipe } from "../../i18n";

@Component( {
	selector        : 'ngx-pdf-preview' ,
	standalone      : true ,
	imports         : [ CommonModule , NgxExtendedPdfViewerModule , PreviewIconComponent , I18nPipe ] ,
	template        : `
		<div class="pdf-container">
			<div class="toolbar">
				<div class="left-controls">
					<div (click)="zoomOut()" class="control">
						<preview-icon [themeMode]="themeMode()" [title]="'preview.toolbar.zoomOut'|i18n" name="zoom-out"></preview-icon>
					</div>
					<span (click)="resetZoom()">{{ zoom == "page-fit" ? "100%" : zoom }}%</span>
					<div (click)="zoomIn()" class="control">
						<preview-icon [themeMode]="themeMode()" [title]="'preview.toolbar.zoomIn'|i18n" name="zoom-in"></preview-icon>
					</div>
					<div (click)="autoFit()" class="control">
						<preview-icon [themeMode]="themeMode()" [title]="'preview.toolbar.autoFit'|i18n" name="auto-fit"></preview-icon>
					</div>
				</div>
				<div class="right-controls">
					<div (click)="rotate(-90)" class="control">
						<preview-icon [themeMode]="themeMode()" [title]="'preview.toolbar.rotate-90'|i18n" name="rotate-90"></preview-icon>
					</div>
					<div (click)="rotate(90)" class="control">
						<preview-icon [themeMode]="themeMode()" [title]="'preview.toolbar.rotate90'|i18n" name="rotate90"></preview-icon>
					</div>
					<div (click)="reset()" class="control">
						<preview-icon [themeMode]="themeMode()" [title]="'preview.toolbar.reset'|i18n" name="reset"></preview-icon>
					</div>
				</div>
			</div>
			<div #viewerContainer class="viewer-container">
				<ngx-extended-pdf-viewer (currentZoomFactor)="onScaleChange($event)" (pagesLoaded)="pdfLoaded()" [(page)]="currentPage" [backgroundColor]="'rgba(0,0,0,0)'" [class.hidden]="isLoading|async" [rotation]="rotation" [showDownloadButton]="false" [showFindButton]="false" [showHandToolButton]="false" [showOpenFileButton]="false" [showPagingButtons]="false" [showPresentationModeButton]="false" [showPrintButton]="false" [showPropertiesButton]="false" [showRotateButton]="false" [showSecondaryToolbarButton]="false" [showSidebarButton]="false" [showSpreadButton]="false" [showTextEditor]="false" [showToolbar]="false" [showZoomButtons]="false" [src]="file()?.url" [textLayer]="true" [zoom]="zoom" style="width: 100%; height: 100%;"></ngx-extended-pdf-viewer>
			</div>
		</div>
	` ,
	styleUrls       : [ "../../styles/_theme.scss" , "./pdf-preview.component.scss" ] ,
	changeDetection : ChangeDetectionStrategy.OnPush
} )
export class PdfPreviewComponent extends BasePreviewComponent implements OnInit {

	zoom : any = "page-fit";// 'auto'|'page-actual'|'page-fit'|'page-width'|

	rotation : 0 | 90 | 180 | 270 = 0;

	currentPage : number = 0;

	@ViewChild( NgxExtendedPdfViewerComponent ) pdfViewer! : NgxExtendedPdfViewerComponent;

	@ViewChild( 'viewerContainer' ) viewerContainer? : ElementRef<HTMLDivElement>

	ngOnInit () : void {
		this.startLoading()
	}

	protected override async handleFileContent ( content : FileReaderResponse ) : Promise<void> {
	}

	pdfLoaded () : void {
		this.stopLoading()
		this.autoFit()
	}

	zoomIn () : void {
		this.zoom = Math.floor( Math.min( this.zoom * 1.2 , 300 ) );
	}

	zoomOut () : void {
		this.zoom = Math.floor( Math.max( this.zoom / 1.2 , 10 ) );
	}

	autoFit () : void {
		this.zoom = 'page-fit';
	}

	resetZoom () : void {
		this.zoom = 100;
	}

	reset () : void {
		this.resetZoom();
		this.rotation = 0;
	}

	rotate ( degrees : number ) : void {
		this.rotation = ( this.rotation + degrees + 360 ) % 360 as 0 | 90 | 180 | 270;
	}

	onScaleChange ( $event : number ) : void {
		const zoomNum : number = Math.floor( Number( $event ) * 100 );
		if ( Number.isNaN( zoomNum ) || this.zoom == zoomNum ) {
			return
		}
		this.zoom = zoomNum
		this.cdr.markForCheck()
	}
}
