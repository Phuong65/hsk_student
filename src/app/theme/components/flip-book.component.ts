import { AfterViewInit , Component , input , InputSignal , OnDestroy } from '@angular/core';
import { v4 as uuid4 } from 'uuid';
import { toObservable } from '@angular/core/rxjs-interop';
import { Observable , Subject , takeUntil } from 'rxjs';

@Component( {
    selector   : 'app-flip-book' ,
    imports    : [] ,
    standalone : true ,
    template   : '<div [id]="componentID"></div>'
} )
export class FlipBookComponent implements AfterViewInit , OnDestroy {

    images : InputSignal<string[]> = input.required<string[]>();

    height : InputSignal<number | 'auto' | any> = input<number | 'auto' | any>( 'auto' );

    private flipBook : any;

    protected readonly componentID : string = 'app-flip-book-' + uuid4();

    private destroyed$ : Subject<void> = new Subject();

    private imagesObserver : Observable<string[]> = toObservable( this.images );

    ngAfterViewInit () : void {
        this.imagesObserver.pipe(
            takeUntil( this.destroyed$ )
        ).subscribe( ( images : string[] ) : void => {
            if ( images.length ) {
                this.initFlipBook( images );
            }
            else {
                this.destroyFlipBook();
            }
        } );
    }

    private initFlipBook ( images : string[] ) : void {
        this.destroyFlipBook();
        const options      = {
            webglShadow           : false ,
            sourceType            : 'images' , // Chỉ định rõ nguồn là ảnh
            soundEnable           : false ,
            height                : this.height() ,
            duration              : 800 ,
            backgroundColor       : '#ffffff' ,
            transparent           : true ,
            forceFit              : true ,
            paddingTop            : 50 ,
            paddingLeft           : 30 ,
            paddingRight          : 30 ,
            paddingBottom         : 50 ,
            hideFull              : true ,
            showPrintControl      : false ,
            showDownloadControl   : false ,
            showSearchControl     : false ,
            allControls           : 'altPrev,pageNumber,altNext,play,outline,thumbnail,zoomIn,zoomOut,fullScreen,share,download,search,more,pageMode,startPage,endPage,sound' ,
            moreControls          : 'download,pageMode,startPage,endPage,sound' ,
            hideControls          : 'download,search,share' ,
            pdfjsSrc              : 'libs/dear-flip/js/pdf.min.js' ,
            pdfjsCompatibilitySrc : 'libs/dear-flip/js/compatibility.js' ,
            pdfjsWorkerSrc        : 'libs/dear-flip/js/pdf.worker.min.js' ,
            threejsSrc            : 'libs/dear-flip/js/three.min.js' ,
            mockupjsSrc           : 'libs/dear-flip/js/mockup.min.js' ,
            soundFile             : 'libs/dear-flip/sound/turn2.mp3' ,
            imagesLocation        : 'libs/dear-flip/images' ,
            imageResourcesPath    : 'libs/dear-flip/images/pdfjs/' ,
            cMapUrl               : 'libs/dear-flip/js/cmaps/' ,
            onCreate              : ( e : any ) : void => {
            } ,
            onCreateUI            : ( e : any ) : void => {
            } ,
            onFlip                : ( e : any ) : void => {
            } ,
            beforeFlip            : ( e : any ) : void => {
            } ,
            onReady               : ( e : any ) : void => {
            }
        };
        const jQuery : any = ( window as any ).$;
        if ( jQuery ) {
            const id : string = '#' + this.componentID;
            this.flipBook     = jQuery( id ).flipBook( images , options );
        }
        else {
            console.error( 'U là trời, jQuery vẫn chưa load kìa!' );
        }
    }

    private destroyFlipBook () : void {
        if ( this.flipBook ) {
            const jQuery : any = ( window as any ).$;
            if ( jQuery ) {
                const id : string = '#' + this.componentID;
                jQuery( id ).empty();
                this.flipBook = null;
            }
        }
    }

    ngOnDestroy () : void {
        this.destroyed$.next();
        this.destroyed$.complete();
    }
}
