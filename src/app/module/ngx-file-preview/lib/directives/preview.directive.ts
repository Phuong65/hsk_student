import { Directive , ElementRef , EnvironmentInjector , EventEmitter , Injector , input , Input , InputSignal , OnDestroy , OnInit , Output } from '@angular/core';
import { FileReaderService , PreviewService , PreviewState , ThemeService } from '../services';
import { AutoThemeConfig , PreviewEvent , PreviewFile , PreviewFileInput , ThemeMode } from '../types';
import { PreviewUtils } from '../utils';
import { debounceTime , distinctUntilChanged , fromEvent , merge , Observable , Subject , timer } from 'rxjs';
import { filter , switchMap , takeUntil , tap } from 'rxjs/operators';
import { takeUntilDestroyed , toObservable } from '@angular/core/rxjs-interop';

@Directive( {
    selector   : '[ngxFilePreview]' ,
    standalone : true ,
    providers  : [ PreviewService , ThemeService , FileReaderService ]
} )
export class PreviewDirective implements OnInit , OnDestroy {

    @Input( 'ngxFilePreview' ) fileInput : PreviewFileInput;

    @Input() previewIndex : number = 0;

    @Input() trigger : string = 'click';

    private _themeMode : ThemeMode = 'auto';

    @Input() get themeMode () : ThemeMode {
        return this._themeMode;
    }

    set themeMode ( value : ThemeMode ) {
        this._themeMode = value;
        this.themeService.setMode( this.themeMode );
        if ( this.themeMode === 'auto' && this.autoConfig ) {
            this.themeService.setAutoConfig( this.autoConfig );
        }
    }

    @Input() autoConfig? : AutoThemeConfig;

    private _lang : string = 'zh';

    @Input() get lang () : string {
        return this._lang;
    }

    set lang ( value : string ) {
        this._lang = value;
        this.previewService.setLang( value );
    }

    openImmediately : InputSignal<boolean> = input<boolean>( false );

    canDownload : InputSignal<boolean> = input<boolean>( true );

    @Output() previewEvent : EventEmitter<PreviewEvent> = new EventEmitter<PreviewEvent>();

    @Output() onClosePreview : EventEmitter<void> = new EventEmitter<void>();

    @Output() previewVisible : EventEmitter<boolean> = new EventEmitter<boolean>();

    t ( key : string , ... args : ( string | number )[] ) : string {
        return this.previewService?.getLangParser()?.t( key , ... args );
    }

    private destroyed$ : Subject<void> = new Subject<void>();

    private readonly element : HTMLElement;

    private longPressTimer : any;

    private isLongPressing : boolean = false;

    constructor (
        private previewService : PreviewService ,
        private themeService : ThemeService ,
        private injector : Injector ,
        private envInjector : EnvironmentInjector ,
        private elementRef : ElementRef
    ) {
        this.previewService.init( this.injector , this.envInjector );
        this.element = this.elementRef.nativeElement;
        toObservable( this.openImmediately ).pipe(
            takeUntilDestroyed() ,
            debounceTime( 300 ) ,
            distinctUntilChanged() ,
            filter( Boolean )
        ).subscribe( () : void => {
            this.preview();
        } )
    }

    ngOnInit () : void {
        this.setupTriggers();
        this.previewService.onClosePanel.pipe(
            takeUntil( this.destroyed$ )
        ).subscribe( () : void => {
            this.onClosePreview.emit();
        } );
        this.previewService.getStateObservable().pipe(
            takeUntil( this.destroyed$ )
        ).subscribe( ( state : PreviewState ) : void => {
            this.previewVisible.emit( state.isVisible )
        } )
    }

    private setupTriggers () : void {
        const triggers : string[]             = this.trigger.split( ',' ).map( ( t : string ) : string => t.trim() );
        const observables : Observable<any>[] = triggers.map( ( trigger : string ) : Observable<any> => {
            const [ eventName , param ] = trigger.split( ':' );
            switch ( eventName ) {
                case 'click':
                    return fromEvent( this.element , 'click' );
                case 'contextmenu':
                    return fromEvent( this.element , 'contextmenu' ).pipe(
                        tap( ( e : MouseEvent ) : void => e.preventDefault() )
                    );
                case 'dblclick':
                    return fromEvent( this.element , 'dblclick' );
                case 'longpress':
                    const duration : number = parseInt( param ) || 800;
                    return fromEvent<MouseEvent>( this.element , 'mousedown' ).pipe(
                        switchMap( () : Observable<any> => timer( duration ).pipe(
                            takeUntil( fromEvent( document , 'mouseup' ) )
                        ) )
                    );
                case 'hover':
                    const delay : number = parseInt( param ) || 500;
                    return fromEvent( this.element , 'mouseenter' ).pipe(
                        switchMap( () : Observable<any> => timer( delay ).pipe(
                            takeUntil( fromEvent( this.element , 'mouseleave' ) )
                        ) )
                    );
                case 'keydown':
                    return fromEvent<KeyboardEvent>( this.element , 'keydown' ).pipe(
                        filter( ( e : KeyboardEvent ) : boolean => ! param || e.key === param )
                    );
                default:
                    return fromEvent( this.element , 'click' );
            }
        } );
        merge( ... observables ).pipe( takeUntil( this.destroyed$ ) ).subscribe( () : void => this.preview() );
    }

    private preview () : void {
        if ( ! this.fileInput ) return;
        const files : PreviewFile[] = PreviewUtils.normalizeFiles( this.fileInput );
        if ( files.length > 0 ) {
            this.previewService.open( {
                files ,
                index           : this.previewIndex ,
                themeMode       : this.themeMode ,
                autoThemeConfig : this.autoConfig ,
                canDownload     : this.canDownload()
            } );
        }
        else {
            this.previewEvent.emit( { type : 'error' , message : this.t( 'preview.error.noFiles' ) } )
        }
    }

    ngOnDestroy () : void {
        this.destroyed$.next();
        this.destroyed$.complete();
        if ( this.fileInput instanceof File ) {
            URL.revokeObjectURL( PreviewUtils.normalizeFile( this.fileInput ).url );
        }
        else if ( Array.isArray( this.fileInput ) ) {
            this.fileInput.forEach( ( item : string | File | Partial<PreviewFile> ) : void => {
                if ( item instanceof File ) {
                    URL.revokeObjectURL( PreviewUtils.normalizeFile( item ).url );
                }
            } );
        }
    }
}
