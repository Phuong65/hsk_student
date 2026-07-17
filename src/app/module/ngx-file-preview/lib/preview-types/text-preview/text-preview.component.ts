import { ChangeDetectionStrategy , Component , input , InputSignal , OnDestroy , OnInit } from '@angular/core';

import { PreviewIconComponent } from '@module/ngx-file-preview/lib/components/preview-icon';
import { BasePreviewComponent } from "@module/ngx-file-preview/lib/preview-types";
import { FileReaderResponse } from "../../services";
import { I18nPipe } from "../../i18n/i18n.pipe";
import { TooltipDirective } from "../../directives";
import { Observable , Subject , takeUntil } from "rxjs";
import { AutoThemeConfig , PreviewFile , ThemeMode } from "@module/ngx-file-preview";
import { toObservable } from "@angular/core/rxjs-interop";
import { filter } from "rxjs/operators";

@Component( {
	selector        : 'ngx-text-preview' ,
	standalone      : true ,
	imports: [PreviewIconComponent, I18nPipe, TooltipDirective] ,
	template        : `
		<div class="text-container">
			<div class="toolbar">
				<div class="left-controls">
					<button (click)="zoomOut()" class="tool-btn">
						<preview-icon [themeMode]="themeMode()" [tooltip]="'preview.toolbar.zoomOut'|i18n" name="zoom-out"></preview-icon>
					</button>
					<span (click)="resetZoom()" [tooltip]="'preview.toolbar.resetZoom'|i18n" class="zoom-text">{{ (scale * 100).toFixed(0) }}%</span>
					<button (click)="zoomIn()" class="tool-btn">
						<preview-icon [themeMode]="themeMode()" [tooltip]="'preview.toolbar.zoomIn'|i18n" name="zoom-in"></preview-icon>
					</button>
					<button (click)="toggleWrap()" class="tool-btn">
						<preview-icon [name]="isWrapped ? 'nowrap' : 'wrap'" [themeMode]="themeMode()" [tooltip]="(isWrapped ? 'preview.toolbar.nowrap' : 'preview.toolbar.wrap')|i18n"></preview-icon>
					</button>
				</div>
				<div class="right-controls">
					<button (click)="toggleFullscreen()" class="tool-btn">
						<preview-icon [themeMode]="themeMode()" [tooltip]="'preview.toolbar.fullscreen'|i18n" name="fullscreen"></preview-icon>
					</button>
				</div>
			</div>

			<div (wheel)="handleWheel($event)" [class.wrap]="isWrapped" class="content-container">
				<div [class.wrap]="isWrapped" [style]="'--scale:'+scale" class="content-wrapper">
					<pre [class.wrap]="isWrapped" [style.transform-origin]="'left top'">{{ content }}</pre>
				</div>
			</div>
		</div>
	` ,
	styleUrls       : [ '../../styles/_theme.scss' , './text-preview.component.scss' ] ,
	changeDetection : ChangeDetectionStrategy.OnPush
} )
export class TextPreviewComponent extends BasePreviewComponent implements OnInit , OnDestroy {



	content : string = '';

	isWrapped : boolean = false;

	scale : number = 1;

	private readonly SCALE_STEP : number = 0.1;

	private readonly MAX_SCALE : number = 3;

	private readonly MIN_SCALE : number = 0.1;

	private readonly DEFAULT_SCALE : number = 1;

	private keydownListener? : ( e : KeyboardEvent ) => void;

	private destroy$ : Subject<void> = new Subject();

	private fileChanges : Observable<PreviewFile> = toObservable( this.file );

	ngOnInit () : void {
		this.setupKeyboardListeners();
		this.fileChanges.pipe(
			filter( ( file : PreviewFile ) : boolean => !! file ) ,
			takeUntil( this.destroy$ )
		).subscribe( () : void => {
			void this.loadFile( 'text' )
		} )
	}

	protected override async handleFileContent ( content : FileReaderResponse ) : Promise<void> {
		if ( content.error ) {
			this.content = 'File loading failed:' + content.error;
		}
		else {
			this.content = content.text || 'The file content is empty';
		}
	}


	private setupKeyboardListeners () : void {
		this.keydownListener = ( e : KeyboardEvent ) : void => {
			if ( ( e.ctrlKey || e.metaKey ) && e.key === '0' ) {
				e.preventDefault();
				this.resetZoom();
			}
		};

		document.addEventListener( 'keydown' , this.keydownListener );
	}

	private removeKeyboardListeners () : void {
		if ( this.keydownListener ) {
			document.removeEventListener( 'keydown' , this.keydownListener );
		}
	}

	handleWheel ( event : WheelEvent ) : void {
		if ( event.ctrlKey || event.metaKey ) {
			event.preventDefault();
			const delta : number = event.deltaY || event.detail || 0;

			if ( delta < 0 ) {
				this.zoomIn();
			}
			else {
				this.zoomOut();
			}
		}
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
		this.cdr.markForCheck();
	}

	toggleWrap () : void {
		this.isWrapped = ! this.isWrapped;
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
		this.removeKeyboardListeners();
		this.destroy$.next();
		this.destroy$.complete();
	}
}
