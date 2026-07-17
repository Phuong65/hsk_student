import { ChangeDetectionStrategy , ChangeDetectorRef , Component , HostListener , Input , OnDestroy , OnInit , ViewEncapsulation } from '@angular/core';
import { PreviewService , PreviewState , ThemeService } from '../../services';
import { PreviewIconComponent } from '../preview-icon';
import { Observable , Subject , takeUntil } from 'rxjs';
import { AutoThemeConfig , PreviewFile , ThemeMode } from '../../types';
import { I18nPipe } from '../../i18n/i18n.pipe';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AsyncPipe } from '@angular/common';
import { ArchivePreviewComponent , AudioPreviewComponent , ExcelPreviewComponent , ImagePreviewComponent , MarkdownPreviewComponent , PdfPreviewComponent , PptPreviewComponent , TextPreviewComponent , UnknownPreviewComponent , VideoPreviewComponent , WordPreviewComponent } from '@module/ngx-file-preview/lib/preview-types';
import { ThemeIconComponent } from '../theme-icon';

@Component( {
    selector        : 'ngx-file-preview-modal' ,
    standalone      : true ,
    imports         : [ ImagePreviewComponent , VideoPreviewComponent , PdfPreviewComponent , TextPreviewComponent , ArchivePreviewComponent , PreviewIconComponent , WordPreviewComponent , ExcelPreviewComponent , PptPreviewComponent , AudioPreviewComponent , UnknownPreviewComponent , MarkdownPreviewComponent , ThemeIconComponent , I18nPipe , AsyncPipe ] ,
    templateUrl     : 'preview-modal.component.html' ,
    styleUrls       : [ '../../styles/_theme.scss' , 'preview-modal.component.scss' ] ,
    changeDetection : ChangeDetectionStrategy.OnPush ,
    encapsulation   : ViewEncapsulation.None
} )
export class PreviewModalComponent implements OnInit , OnDestroy {

    @Input() file! : PreviewFile;

    @Input( { transform : ( value : ThemeMode | null ) : ThemeMode => value! } ) themeMode! : ThemeMode;

    @Input() autoThemeConfig? : AutoThemeConfig;

    @Input() canDownload : boolean = false;

    isVisible : boolean = false;

    currentFile? : PreviewFile;

    private state$ : Observable<PreviewState> = this.previewService.getStateObservable();

    isControlsVisible : boolean = true;

    private controlsTimeout? : number;

    private readonly HIDE_DELAY : number = 2000;

    theme$! : Observable<ThemeMode>;

    private destroy$ : Subject<void> = new Subject<void>();

    public loading$ : Observable<boolean> = this.previewService.getLoadingObservable();

    constructor (
        private cdr : ChangeDetectorRef ,
        private themeService : ThemeService ,
        private previewService : PreviewService
    ) {
        this.state$.pipe(
            takeUntilDestroyed()
        ).subscribe( ( state : PreviewState ) : void => {
            this.isVisible   = state.isVisible;
            this.currentFile = state.currentFile;
            this.cdr.markForCheck();
        } );
    }

    @HostListener( 'document:keydown' , [ '$event' ] ) handleKeyboardEvent ( event : KeyboardEvent ) : void {
        switch ( event.key ) {
            case 'Escape':
                this.close();
                break;
            case 'ArrowLeft':
                this.previous();
                break;
            case 'ArrowRight':
                this.next();
                break;
        }
    }

    ngOnInit () : void {
        this.themeService.setMode( this.themeMode );
        this.theme$ = this.themeService.getThemeObservable()
        this.theme$.pipe(
            takeUntil( this.destroy$ )
        ).subscribe( ( theme : ThemeMode ) : void => {
            this.themeMode = theme;
        } )
    }

    close () : void {
        this.previewService.close();
    }

    previous () : void {
        this.previewService.previous();
    }

    next () : void {
        this.previewService.next();
    }

    canShowPrevious () : boolean {
        const state : PreviewState = this.previewService.state;
        return state.currentIndex > 0;
    }

    canShowNext () : boolean {
        const state : PreviewState = this.previewService.state;
        return state.currentIndex < state.files.length - 1;
    }

    getCurrentFileInfo () : string {
        const state : PreviewState = this.previewService.state;
        return `${ state.currentIndex + 1 } / ${ state.files.length }`;
    }

    get hasMultipleFiles () : boolean {
        const state : PreviewState = this.previewService.state;
        return ( state.files?.length || 0 ) > 1;
    }

    handleMouseMove () : void {
        this.isControlsVisible = true;
        this.cdr.markForCheck();

        if ( this.controlsTimeout ) {
            window.clearTimeout( this.controlsTimeout );
        }

        this.controlsTimeout = window.setTimeout( () : void => {
            this.hideControls();
        } , this.HIDE_DELAY );
    }

    hideControls () : void {
        this.isControlsVisible = false;
        this.cdr.markForCheck();

        if ( this.controlsTimeout ) {
            window.clearTimeout( this.controlsTimeout );
        }
    }

    toggleTheme () : void {
        this.themeService.toggleTheme();
    }

    ngOnDestroy () : void {
        if ( this.controlsTimeout ) {
            window.clearTimeout( this.controlsTimeout );
        }
        if ( window.matchMedia ) {
            const prefersDark : MediaQueryList = window.matchMedia( '(prefers-color-scheme: dark)' );
            prefersDark.removeEventListener( 'change' , () : void => {
            } );
        }
        this.destroy$.next();
        this.destroy$.complete();
    }
}
