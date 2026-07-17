import { AfterViewInit , ChangeDetectionStrategy , Component , ElementRef , input , InputSignal , OnInit , ViewChild } from '@angular/core';

import { PreviewIconComponent } from "@module/ngx-file-preview/lib/components/preview-icon";
import { BasePreviewComponent } from "@module/ngx-file-preview/lib/preview-types";
import * as XLSX from 'xlsx';
import { WorkSheet } from 'xlsx';
import { FileReaderResponse } from "../../services";
import { I18nPipe } from "../../i18n";
import { Observable , Subject , takeUntil } from "rxjs";
import { AutoThemeConfig , PreviewFile , ThemeMode } from "@module/ngx-file-preview";
import { toObservable } from "@angular/core/rxjs-interop";

interface TableData {
	headers : string[];
	rows : any[][];
}

@Component( {
	selector        : 'ngx-excel-preview' ,
	standalone      : true ,
	imports: [PreviewIconComponent, I18nPipe] ,
	template        : `
		<div class="excel-container" #container>
			<div class="toolbar">
				<div class="left-controls">
					<button class="tool-btn" (click)="zoomOut()">
						<preview-icon [themeMode]="themeMode()" name="zoom-out" [title]="'preview.toolbar.zoomOut'|i18n"></preview-icon>
					</button>
					<span class="zoom-text" (click)="resetZoom()" [title]="'preview.toolbar.resetZoom'|i18n">{{ (scale * 100).toFixed(0) }}%</span>
					<button class="tool-btn" (click)="zoomIn()">
						<preview-icon [themeMode]="themeMode()" name="zoom-in" [title]="'preview.toolbar.zoomIn'|i18n"></preview-icon>
					</button>
				</div>
				@if (sheets.length > 0) {
					<div class="sheet-controls">
						@for (sheet of sheets; track sheet) {
							<button class="sheet-btn" [class.active]="currentSheet === sheet" (click)="switchSheet(sheet)">{{ sheet }}</button>
						}
					</div>
				}

				<div class="right-controls">
					<button class="tool-btn" (click)="toggleFullscreen()">
						<preview-icon [themeMode]="themeMode()" name="fullscreen" [title]="'preview.toolbar.fullscreen'|i18n"></preview-icon>
					</button>
				</div>
			</div>

			<div class="preview-container">
				<div class="preview-content">
					<div class="table-wrapper" #tableWrapper (mousedown)="startDrag($event)" (wheel)="handleWheel($event)" [class.dragging]="isDragging" [style.transform]="'scale(' + scale + ')'">
						@if (tableData) {
							<table>
								<colgroup>
									<col class="row-header-col">
									@for (header of tableData.headers; track header) {
										<col class="data-col">
									}
									@for (i of extraColumns; track i) {
										<col class="data-col">
									}
								</colgroup>
								<thead>
									<tr>
										<th class="corner-cell"></th>
										@for (header of tableData.headers; track header; let i = $index) {
											<th>
												{{ getColumnName(i) }}
											</th>
										}
										@for (x of extraColumns; track x; let j = $index) {
											<th class="empty-column">
												{{ getColumnName(tableData.headers.length + j) }}
											</th>
										}
									</tr>
								</thead>
								<tbody>
									@for (row of visibleRows; track row; let rowIndex = $index) {
										<tr>
											<td class="row-header">{{ getRowNumber(rowIndex) }}</td>
											@for (cell of row; track cell; ) {
												<td [class.empty-cell]="!cell && cell !== 0">{{ cell }}</td>
											}
											@for (i of extraColumns; track i; ) {
												<td class="empty-cell"></td>
											}
										</tr>
									}
								</tbody>
							</table>
						}
					</div>
				</div>
			</div>
		</div>
	` ,
	styleUrls       : [ "../../styles/_theme.scss" , "excel-preview.component.scss" ] ,
	changeDetection : ChangeDetectionStrategy.OnPush
} )
export class ExcelPreviewComponent extends BasePreviewComponent implements OnInit , AfterViewInit {



	@ViewChild( 'container' ) container! : ElementRef<HTMLDivElement>;

	@ViewChild( 'tableWrapper' ) tableWrapper! : ElementRef<HTMLDivElement>;

	scale : number = 1;

	sheets : string[] = [];

	currentSheet : string = '';

	tableData : TableData = { headers : [] , rows : [] };

	displayRows : any[][] = [];

	extraRows : number = 100;

	extraColumns : any[] = Array( 5 ).fill( 0 );

	visibleRows : any[][] = [];

	private workbook? : XLSX.WorkBook;

	private readonly SCALE_STEP : number = 0.1;

	private readonly MAX_SCALE : number = 3;

	private readonly MIN_SCALE : number = 0.1;

	isDragging : boolean = false;

	private startX : number = 0;

	private startY : number = 0;

	private scrollLeft : number = 0;

	private scrollTop : number = 0;

	private mouseMoveListener? : ( e : MouseEvent ) => void;

	private mouseUpListener? : ( e : MouseEvent ) => void;

	private readonly DEFAULT_SCALE : number = 1;

	private keydownListener? : ( e : KeyboardEvent ) => void;

	get totalColumns () : number[] {
		const total : number = ( this.tableData.headers.length + this.extraColumns.length ) || 0;
		return Array( total ).fill( 0 );
	}

	private destroy$ : Subject<void> = new Subject<void>();

	private changeFile : Observable<PreviewFile> = toObservable( this.file );

	ngOnInit () : void {
		this.changeFile.pipe(
			takeUntil( this.destroy$ )
		).subscribe( () : void => {
			void this.loadFile();
		} );
	}

	ngAfterViewInit () : void {
		this.setupDragListeners();
		this.setupKeyboardListeners();
	}

	ngOnDestroy () : void {
		this.removeDragListeners();
		this.removeKeyboardListeners();
		this.destroy$.next();
		this.destroy$.complete();
	}

	protected override async handleFileContent ( content : FileReaderResponse ) : Promise<void> {
		const { data } = content
		this.workbook  = XLSX.read( data , { type : 'array' } );
		this.sheets    = this.workbook.SheetNames;
		if ( this.sheets.length > 0 ) {
			await this.switchSheet( this.sheets[ 0 ] );
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
		const wrapper : HTMLDivElement      = this.tableWrapper.nativeElement;
		const rect : DOMRect                = wrapper.getBoundingClientRect();
		const isClickOnScrollbarX : boolean = e.clientY > ( rect.bottom - 12 );
		const isClickOnScrollbarY : boolean = e.clientX > ( rect.right - 12 );

		if ( isClickOnScrollbarX || isClickOnScrollbarY ) {
			return;
		}

		this.isDragging = true;
		this.startX     = e.pageX - wrapper.offsetLeft;
		this.startY     = e.pageY - wrapper.offsetTop;
		this.scrollLeft = wrapper.scrollLeft;
		this.scrollTop  = wrapper.scrollTop;
	}

	private onDrag ( e : MouseEvent ) : void {
		if ( ! this.isDragging ) return;

		e.preventDefault();
		const wrapper : HTMLDivElement = this.tableWrapper.nativeElement;
		const x : number               = e.pageX - wrapper.offsetLeft;
		const y : number               = e.pageY - wrapper.offsetTop;
		const walkX : number           = ( x - this.startX ) * 1.5;
		const walkY : number           = ( y - this.startY ) * 1.5;

		wrapper.scrollLeft = this.scrollLeft - walkX;
		wrapper.scrollTop  = this.scrollTop - walkY;
	}

	private stopDrag () : void {
		this.isDragging = false;
	}

	async switchSheet ( sheetName : string ) : Promise<void> {
		if ( ! this.workbook ) return;

		try {
			const worksheet : WorkSheet = this.workbook.Sheets[ sheetName ];
			const jsonData : any[][]    = XLSX.utils.sheet_to_json<any[]>( worksheet , { header : 1 } );

			const maxLength : number = Math.max( ... jsonData.map( ( row : any[] ) : number => row?.length || 0 ) , 0 );
			this.displayRows         = jsonData.map( ( row : any[] ) : any[] => {
				const paddedRow : any[] = Array.isArray( row ) ? [ ... row ] : [];
				while ( paddedRow.length < maxLength ) {
					paddedRow.push( null );
				}
				return paddedRow;
			} );

			const emptyRows : any[][] = Array( this.extraRows ).fill( 0 ).map( () : any[] => Array( maxLength ).fill( null ) );
			this.visibleRows          = [ ... this.displayRows , ... emptyRows ];

			this.tableData = {
				headers : Array( maxLength ).fill( '' ) ,
				rows    : this.displayRows
			};

			this.currentSheet = sheetName;
			this.cdr.markForCheck();
		}
		catch ( error ) {
			console.error( 'Failed to switch worksheet:' , error );
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

	toggleFullscreen () : void {
		if ( ! document.fullscreenElement ) {
			void document.documentElement.requestFullscreen();
		}
		else {
			void document.exitFullscreen();
		}
	}

	getColumnName ( index : number ) : string {
		let name : string = '';
		let num : number  = index;

		do {
			name = String.fromCharCode( 65 + ( num % 26 ) ) + name;
			num  = Math.floor( num / 26 ) - 1;
		}
		while ( num >= 0 );

		return name;
	}

	getRowNumber ( index : number ) : number {
		return index + 1;
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

	private applyZoom () : void {
		if ( this.tableWrapper ) {
			const wrapper : HTMLDivElement   = this.tableWrapper.nativeElement;
			const scrollLeftPercent : number = wrapper.scrollLeft / ( wrapper.scrollWidth - wrapper.clientWidth );
			const scrollTopPercent : number  = wrapper.scrollTop / ( wrapper.scrollHeight - wrapper.clientHeight );
			wrapper.style.transform          = `scale(${ this.scale })`;
			setTimeout( () : void => {
				wrapper.scrollLeft = scrollLeftPercent * ( wrapper.scrollWidth - wrapper.clientWidth );
				wrapper.scrollTop  = scrollTopPercent * ( wrapper.scrollHeight - wrapper.clientHeight );
			} );
		}
		this.cdr.markForCheck();
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

	private removeKeyboardListeners () {
		if ( this.keydownListener ) {
			document.removeEventListener( 'keydown' , this.keydownListener );
		}
	}

	resetZoom () : void {
		this.scale = this.DEFAULT_SCALE;
		this.applyZoom();
	}
}
