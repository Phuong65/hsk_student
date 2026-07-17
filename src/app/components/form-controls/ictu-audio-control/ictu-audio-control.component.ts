import { Component , forwardRef , inject , input , InputSignal , OnDestroy , signal , WritableSignal } from '@angular/core';
import { ControlValueAccessor , NG_VALUE_ACCESSOR } from '@angular/forms';
import { IctuBasicFile , ICTUStandardFile } from '@models/file';
import { _10MB } from '@utilities/syscats';
import { FileUploadAttributes , IctuFileService } from '@services/ictu-file.service';
import { debounceTime , delay , Observable , Subject , takeUntil , tap } from 'rxjs';
import { AuthenticationService } from '@services/authentication.service';
import { NotificationService } from '@services/notification.service';
import { assign } from 'lodash-es';
import * as Plyr from 'plyr';
import { tokenGetter } from '@app/app.config';
import { DEPLOYMENT_INFO } from '@env';
import { formatBytes } from '@utilities/helper';
import { MatButton } from '@angular/material/button';
import { takeUntilDestroyed , toObservable } from '@angular/core/rxjs-interop';
import { distinctUntilChanged , filter } from 'rxjs/operators';
import { NgClass } from '@angular/common';

type AudioControlEvent = 'DELETE' | 'UPLOAD' | 'VIEW';

@Component( {
    selector    : 'ictu-audio-control' ,
    standalone  : true ,
    imports     : [ MatButton , NgClass ] ,
    providers   : [ {
        provide     : NG_VALUE_ACCESSOR ,
        useExisting : forwardRef( () : typeof IctuAudioControlComponent => IctuAudioControlComponent ) ,
        multi       : true
    } ] ,
    templateUrl : './ictu-audio-control.component.html' ,
    styleUrl    : './ictu-audio-control.component.css'
} )
export class IctuAudioControlComponent implements ControlValueAccessor , OnDestroy {

    maxFileSize : InputSignal<number> = input<number>( _10MB );

    fileAttributes : InputSignal<FileUploadAttributes> = input<FileUploadAttributes>( { public : 1 } );

    options : InputSignal<Plyr.Options> = input<Plyr.Options>( {
        controls : [ 'play' , 'progress' , 'current-time' ]
    } );

    private destroyed$ : Subject<void> = new Subject<void>();

    private auth : AuthenticationService = inject( AuthenticationService );

    private notification : NotificationService = inject( NotificationService );

    private fileService : IctuFileService = inject<IctuFileService>( IctuFileService );

    value : WritableSignal<IctuBasicFile> = signal( null );

    readonly disabled : WritableSignal<boolean> = signal( false );

    readonly error : WritableSignal<boolean> = signal( false );

    readonly isLoading : WritableSignal<boolean> = signal( true );

    private audioElement : HTMLAudioElement;

    readonly sources : WritableSignal<Plyr.Source[]> = signal( [] );
    // readonly sources : Signal<Plyr.Source[]> = computed( () : Plyr.Source[] => {
    //     if ( this.value() ) {
    //         const url : URL = new URL( [ ( this.value().location === 'aws' ? DEPLOYMENT_INFO.aws : DEPLOYMENT_INFO.media ) , 'file/' , this.value().name ].join( '' ) );
    //         url.searchParams.set( 'token' , tokenGetter() );
    //         return [ {
    //             provider : 'html5' ,
    //             src      : url.toString() ,
    //             type     : this.value().type
    //         } ];
    //     }
    //     else {
    //         return []
    //     }
    // } );

    get donViID () : number {
        return this.auth.user?.donvi_id ?? 0;
    }

    private eventObserver : Subject<AudioControlEvent> = new Subject<AudioControlEvent>();

    private eventHandler : Record<AudioControlEvent , () => void> = {
        DELETE : () : void => {
            this.value.set( null );
            this.onChange( null );
            this.onTouched();
            this.enableLoading.set( false );
        } ,
        VIEW   : () : void => {
        } ,
        UPLOAD : () : void => {
            const inputFile : HTMLInputElement = assign<HTMLInputElement , Pick<HTMLInputElement , 'type' | 'accept' | 'multiple'>>( document.createElement( 'input' ) , { type : 'file' , accept : 'audio/*' , multiple : false } );
            inputFile.onchange                 = () : void => {
                if ( inputFile.files.length ) {
                    const _file : File = inputFile.files.item( 0 );
                    if ( this.validateFile( _file ) ) {
                        this.uploadFile( _file );
                    }
                    else {
                        this.enableLoading.set( false );
                    }
                }
                else {
                    this.enableLoading.set( false );
                }
                setTimeout( () : void => inputFile.remove() , 1000 );
            };
            inputFile.oncancel                 = () : void => {
                this.enableLoading.set( false );
            };
            inputFile.onabort                  = () : void => {
                this.enableLoading.set( false );
            };
            inputFile.click();
        }
    }

    protected readonly enableLoading : WritableSignal<boolean> = signal( true );

    protected readonly isPlaying : WritableSignal<boolean> = signal( false );

    protected readonly lblCurrentTime : WritableSignal<string> = signal( '00:00' );

    protected readonly lblEndTime : WritableSignal<string> = signal( '00:00' );

    protected readonly progress : WritableSignal<number> = signal( 0 );

    readonly ready : WritableSignal<boolean> = signal( false );

    constructor () {
        toObservable( this.value ).pipe(
            takeUntilDestroyed() ,
            debounceTime( 500 ) ,
            distinctUntilChanged( ( previous : IctuBasicFile , current : IctuBasicFile ) : boolean => previous?.id === current?.id )
        ).subscribe( ( file : IctuBasicFile ) : void => {
            if ( file ) {
                const url : URL = new URL( [ ( file.location === 'aws' ? DEPLOYMENT_INFO.aws : DEPLOYMENT_INFO.media ) , 'file/' , file.name ].join( '' ) );
                url.searchParams.set( 'token' , tokenGetter() );
                // this.sources.set( [ {
                //     provider : 'html5' ,
                //     src      : url.toString() ,
                //     type     : file.type
                // } ] );
                this.clearAudio();
                this.createAudio( url.toString() );
                this.ready.set( true );
            }
            else {
                this.clearAudio();
                this.ready.set( false );
            }
            this.enableLoading.set( false );
        } );
        this.eventObserver.asObservable().pipe(
            takeUntilDestroyed() ,
            filter( Boolean ) ,
            tap( () : void => {
                this.enableLoading.set( true );
            } ) ,
            debounceTime( 500 )
        ).subscribe( ( event : AudioControlEvent ) : void => {
            this.eventHandler[ event ]();
        } )
    }

    private onChange : ( _ : any ) => void = ( _ : any ) : void => {
    };

    private onTouched : () => void = () : void => {
    };

    registerOnChange ( fn : any ) : void {
        this.onChange = fn;
    }

    registerOnTouched ( fn : any ) : void {
        this.onTouched = fn;
    }

    setDisabledState ( isDisabled : boolean ) : void {
        this.disabled.set( isDisabled );
    }

    writeValue ( value : IctuBasicFile ) : void {
        this.value.set( value );
    }

    private validateFile ( file : File ) : boolean {
        switch ( true ) {
            case file.size >= this.maxFileSize():
                this.notification.toastError( 'Dung lượng file không được vượt quá' + formatBytes( this.maxFileSize() ) );
                return false;
            case ! [ 'mp3' , 'wav' , 'aac' , 'm4a' , 'ogg' ].includes( file.name.toLowerCase().split( '.' ).pop() ):
                this.notification.toastError( 'Chỉ chấp nhận file có định dạng mp3, wav, aac, m4a và ogg' );
                return false;
            default:
                return true;
        }
    }

    private uploadFile ( file : File ) : void {
        const uploader : Observable<ICTUStandardFile> = this.fileAttributes() ? this.fileService.upload( file , this.fileAttributes() ) : this.fileService.upload( file );
        uploader.pipe(
            takeUntil( this.destroyed$ ) ,
            delay( 2000 ) // waiting for file stable pls
        ).subscribe( {
            next  : ( { id , name , title , url , ext , type , size , location } : ICTUStandardFile ) : void => {
                const file : IctuBasicFile = { id , name , title , url , ext , type , size , location };
                this.sources.set( [] ); // force frontend rerender
                this.value.set( file );
                this.onChange( { ... file } );
                this.onTouched();
                this.notification.toastSuccess( 'Cập nhật file audio thành công' );
            } ,
            error : () : void => {
                this.notification.toastError( 'Upload file thất bại' );
                this.enableLoading.set( false );
            }
        } );
    }

    protected btnCallUploadPanel () : void {
        this.eventObserver.next( 'UPLOAD' );
    }

    protected btnCallDelete () : void {
        this.eventObserver.next( 'DELETE' );
    }

    protected async playAudio () : Promise<void> {
        if ( this.audioElement.paused ) {
            await this.audioElement.play();
            this.isPlaying.set( true );
        }
        else {
            this.audioElement.pause();
            this.isPlaying.set( false );
        }
    }

    private clearAudio () : void {
        if ( this.audioElement ) {
            this.audioElement.pause();
            this.audioElement.remove();
        }
    }

    private createAudio ( src : string ) : void {
        this.isLoading.set( true );
        this.error.set( false );
        const audio : HTMLAudioElement = document.createElement( 'audio' );
        audio.ontimeupdate             = () : void => {
            this.lblCurrentTime.set( this.convertSecondToMinute( audio.currentTime ) );
            this.progress.set( this.calculatePercent( audio.duration , audio.currentTime ) );
        };
        audio.addEventListener( 'ended' , () : void => {
            this.isPlaying.set( false );
        } , false );

        audio.addEventListener( 'canplay' , () : void => {
            this.lblCurrentTime.set( this.convertSecondToMinute( audio.currentTime ) );
            this.lblEndTime.set( this.convertSecondToMinute( audio.duration ) );
            this.isLoading.set( false );
        } , false );

        audio.onerror     = ( error : string | Event ) : void => {
            this.isLoading.set( false );
            this.error.set( true );
        };
        audio.src         = src;
        audio.volume      = 1;
        this.audioElement = audio;
    }

    convertSecondToMinute ( secondNumber : number ) : string {
        let s : number = Math.floor( secondNumber );
        if ( s <= 60 ) {
            return s < 10 ? `00:0${ s }` : `00:${ s }`;
        }
        const secs : number     = s % 60;
        s                       = ( s - secs ) / 60;
        const mins : number     = s % 60;
        const result : string[] = [];
        result.push( mins < 10 ? '0' + mins.toString() : mins.toString() );
        result.push( secs < 10 ? '0' + secs.toString() : secs.toString() );
        return result.join( ':' );
    }

    calculatePercent ( duration : number , currentTime : number ) : number {
        return ( currentTime / duration ) * 100;
    }

    ngOnDestroy () : void {
        this.destroyed$.next();
        this.destroyed$.complete();
        this.clearAudio();
    }
}
