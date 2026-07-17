import { Component , forwardRef , inject , input , InputSignal , OnDestroy , signal , WritableSignal } from '@angular/core';
import { ControlValueAccessor , NG_VALUE_ACCESSOR } from '@angular/forms';
import { debounceTime , delay , Observable , Subject , takeUntil , tap } from 'rxjs';
import { AuthenticationService } from '@services/authentication.service';
import { IctuBasicFile , ICTUStandardFile } from '@models/file';
import { takeUntilDestroyed , toObservable } from '@angular/core/rxjs-interop';
import { distinctUntilChanged , filter } from 'rxjs/operators';
import { tokenGetter } from '@app/app.config';
import { DEPLOYMENT_INFO } from '@env';
import { SafeUrlPipe } from '@pipes/safe-url.pipe';
import { MatButton } from '@angular/material/button';
import { assign } from 'lodash-es';
import { _10MB } from '@utilities/syscats';
import { NotificationService } from '@services/notification.service';
import { formatBytes } from '@utilities/helper';
import { FileUploadAttributes , IctuFileService } from '@services/ictu-file.service';

type PictureControlEvent = 'DELETE' | 'UPLOAD' | 'VIEW';

@Component( {
    selector    : 'ictu-picture-control' ,
    standalone  : true ,
    imports     : [ SafeUrlPipe , MatButton ] ,
    providers   : [ {
        provide     : NG_VALUE_ACCESSOR ,
        useExisting : forwardRef( () : typeof IctuPictureControlComponent => IctuPictureControlComponent ) ,
        multi       : true
    } ] ,
    templateUrl : './ictu-picture-control.component.html' ,
    styleUrl    : './ictu-picture-control.component.css'
} )
export class IctuPictureControlComponent implements ControlValueAccessor , OnDestroy {

    maxFileSize : InputSignal<number> = input<number>( _10MB );

    fileAttributes : InputSignal<FileUploadAttributes> = input<FileUploadAttributes>( null );

    enablePreview : InputSignal<boolean> = input<boolean>( false );

    enableDelete : InputSignal<boolean> = input<boolean>( false );

    aspectRatio : InputSignal<number> = input<number>( 1 );

    placeholder : InputSignal<string> = input<string>( `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='500' height='500' viewBox='0 0 500 500'%3E%3Crect width='100%25' height='100%25' fill='%23DDDDDD'/%3E%3Cpath fill='%23999999' d='M107.915 250.465h5.83q2.14 0 3.74-.54 1.59-.53 2.65-1.53 1.06-1.01 1.58-2.44.52-1.44.52-3.21 0-1.68-.52-3.04t-1.56-2.32q-1.05-.96-2.64-1.46-1.6-.51-3.77-.51h-5.83zm-7.8-21.08h13.63q4.2 0 7.28.98 3.07.99 5.07 2.76t2.97 4.23q.97 2.47.97 5.39 0 3.05-1.01 5.59-1.02 2.53-3.05 4.36t-5.08 2.84q-3.06 1.02-7.15 1.02h-5.83v14.76h-7.8zm34.85-1.16h7.17v43.09h-7.17zm30.05 35.4v-5.01q-3.1.14-5.22.53-2.12.4-3.39 1-1.28.61-1.83 1.43-.55.81-.55 1.76 0 1.89 1.11 2.7 1.12.81 2.92.81 2.2 0 3.81-.79 1.61-.8 3.15-2.43m-15.14-15.63-1.28-2.29q5.14-4.7 12.36-4.7 2.61 0 4.67.86t3.48 2.38 2.16 3.64q.74 2.11.74 4.64v18.79h-3.25q-1.02 0-1.57-.3-.55-.31-.87-1.24l-.63-2.14q-1.14 1.01-2.21 1.78t-2.23 1.29-2.48.8q-1.32.27-2.92.27-1.88 0-3.48-.5-1.59-.51-2.75-1.53-1.16-1.01-1.8-2.52t-.64-3.51q0-1.13.38-2.25.38-1.11 1.23-2.13.86-1.01 2.22-1.91t3.35-1.57q1.99-.66 4.63-1.08t6.03-.51v-1.74q0-2.99-1.28-4.42-1.27-1.44-3.68-1.44-1.74 0-2.89.41-1.14.4-2.01.91t-1.58.91q-.71.41-1.58.41-.76 0-1.28-.39t-.84-.92m52.06-2.75-1.89 2.61q-.32.41-.62.64-.31.23-.89.23-.55 0-1.07-.33-.52-.34-1.25-.76-.72-.42-1.72-.75-1-.34-2.48-.34-1.89 0-3.31.69-1.42.68-2.36 1.95-.94 1.28-1.41 3.09-.46 1.81-.46 4.1 0 2.38.51 4.24.5 1.85 1.46 3.12.96 1.26 2.32 1.91t3.07.65 2.77-.42 1.79-.93q.72-.5 1.26-.92.53-.42 1.2-.42.87 0 1.31.66l2.06 2.61q-1.19 1.39-2.59 2.34-1.39.94-2.88 1.51-1.49.56-3.07.79-1.59.23-3.15.23-2.76 0-5.19-1.02-2.44-1.03-4.27-3.01-1.82-1.97-2.88-4.82-1.06-2.86-1.06-6.52 0-3.27.94-6.07.95-2.8 2.77-4.84 1.83-2.05 4.53-3.21 2.69-1.16 6.2-1.16 3.34 0 5.85 1.07 2.5 1.08 4.51 3.08m10.41 7.77h13.51q0-1.39-.39-2.62-.39-1.24-1.18-2.16-.78-.93-1.98-1.47-1.21-.54-2.8-.54-3.1 0-4.89 1.77-1.78 1.77-2.27 5.02m18.27 4.32h-18.42q.18 2.29.81 3.96.64 1.67 1.69 2.76 1.04 1.08 2.48 1.62 1.43.54 3.17.54t3-.41 2.21-.9q.94-.49 1.65-.9.71-.4 1.38-.4.9 0 1.33.66l2.06 2.61q-1.19 1.39-2.67 2.34-1.48.94-3.09 1.51-1.61.56-3.27.79-1.67.23-3.24.23-3.1 0-5.77-1.02-2.67-1.03-4.64-3.05t-3.1-4.99-1.13-6.89q0-3.04.98-5.72.99-2.69 2.83-4.67 1.84-1.99 4.5-3.15 2.65-1.16 5.98-1.16 2.82 0 5.2.9 2.37.9 4.08 2.63 1.72 1.72 2.69 4.23t.97 5.73q0 1.62-.35 2.19-.35.56-1.33.56m14.21-29.11v16.53q1.74-1.63 3.82-2.64 2.09-1.02 4.91-1.02 2.43 0 4.32.83 1.88.82 3.14 2.32 1.26 1.49 1.92 3.57.65 2.07.65 4.56v18.94h-7.16v-18.94q0-2.72-1.25-4.22-1.25-1.49-3.8-1.49-1.86 0-3.48.84t-3.07 2.29v21.52h-7.17v-43.09zm38.71 12.87q3.31 0 6.02 1.07 2.71 1.08 4.64 3.05t2.97 4.81q1.05 2.85 1.05 6.35 0 3.54-1.05 6.39-1.04 2.84-2.97 4.84t-4.64 3.07-6.02 1.07q-3.33 0-6.06-1.07t-4.65-3.07q-1.93-2-2.99-4.84-1.06-2.85-1.06-6.39 0-3.5 1.06-6.35 1.06-2.84 2.99-4.81 1.92-1.97 4.65-3.05 2.73-1.07 6.06-1.07m0 25.14q3.71 0 5.5-2.49 1.78-2.49 1.78-7.31 0-4.81-1.78-7.33-1.79-2.53-5.5-2.53-3.77 0-5.58 2.54t-1.81 7.32q0 4.79 1.81 7.3 1.81 2.5 5.58 2.5m20.24-38.01h7.17v43.09h-7.17zm33.01 34.27v-13.34q-1.22-1.48-2.66-2.08-1.43-.61-3.09-.61-1.62 0-2.93.61-1.3.6-2.23 1.84-.93 1.23-1.42 3.13t-.49 4.48q0 2.61.42 4.42.42 1.82 1.2 2.96.78 1.15 1.92 1.65 1.13.51 2.52.51 2.23 0 3.8-.93 1.56-.93 2.96-2.64m0-34.27h7.16v43.09h-4.38q-1.42 0-1.8-1.31l-.61-2.87q-1.8 2.06-4.13 3.34-2.33 1.27-5.44 1.27-2.43 0-4.46-1.01t-3.5-2.94q-1.46-1.93-2.26-4.77-.8-2.85-.8-6.5 0-3.31.9-6.15t2.58-4.93 4.03-3.26q2.35-1.18 5.28-1.18 2.5 0 4.26.79 1.77.78 3.17 2.11zm19.89 24.79h13.51q0-1.39-.39-2.62-.39-1.24-1.17-2.16-.79-.93-1.99-1.47t-2.8-.54q-3.1 0-4.88 1.77-1.79 1.77-2.28 5.02m18.27 4.32h-18.42q.18 2.29.82 3.96.63 1.67 1.68 2.76 1.04 1.08 2.48 1.62 1.43.54 3.17.54t3.01-.41q1.26-.41 2.2-.9t1.65-.9q.71-.4 1.38-.4.9 0 1.33.66l2.06 2.61q-1.19 1.39-2.67 2.34-1.47.94-3.08 1.51-1.61.56-3.28.79t-3.23.23q-3.11 0-5.78-1.02-2.66-1.03-4.64-3.05-1.97-2.02-3.1-4.99t-1.13-6.89q0-3.04.99-5.72.98-2.69 2.82-4.67 1.85-1.99 4.5-3.15t5.99-1.16q2.81 0 5.19.9t4.09 2.63q1.71 1.72 2.68 4.23t.97 5.73q0 1.62-.35 2.19-.34.56-1.33.56m13.37-13.98.43 3.37q1.4-2.67 3.31-4.19 1.91-1.53 4.52-1.53 2.06 0 3.31.9l-.46 5.37q-.15.52-.42.74-.28.22-.74.22-.44 0-1.29-.15-.86-.14-1.67-.14-1.19 0-2.12.34-.93.35-1.67 1-.74.66-1.3 1.58-.57.93-1.06 2.12v18.33h-7.16v-29.75h4.2q1.1 0 1.54.39.43.39.58 1.4'/%3E%3C/svg%3E` );

    private destroyed$ : Subject<void> = new Subject<void>();

    private auth : AuthenticationService = inject( AuthenticationService );

    private notification : NotificationService = inject( NotificationService );

    private fileService : IctuFileService = inject<IctuFileService>( IctuFileService );

    value : WritableSignal<IctuBasicFile> = signal( null );

    readonly disabled : WritableSignal<boolean> = signal( false );

    protected imgSrc : WritableSignal<string> = signal( this.placeholder() );

    get donViID () : number {
        return this.auth.user?.donvi_id ?? 0;
    }

    private eventObserver : Subject<PictureControlEvent> = new Subject<PictureControlEvent>();

    private eventHandler : Record<PictureControlEvent , () => void> = {
        DELETE : () : void => {
        } ,
        VIEW   : () : void => {
        } ,
        UPLOAD : () : void => {
            const inputFile : HTMLInputElement = assign<HTMLInputElement , Pick<HTMLInputElement , 'type' | 'accept' | 'multiple'>>( document.createElement( 'input' ) , { type : 'file' , accept : 'image/png, image/gif, image/jpeg, image/bmp, image/x-icon' , multiple : false } );
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

    constructor () {
        toObservable( this.value ).pipe(
            takeUntilDestroyed() ,
            distinctUntilChanged( ( previous : IctuBasicFile , current : IctuBasicFile ) : boolean => previous?.id === current?.id )
        ).subscribe( ( file : IctuBasicFile ) : void => {
            this.imgSrc.set( this.image2Src( file ) );
            this.enableLoading.set( false );
        } );

        this.eventObserver.asObservable().pipe(
            takeUntilDestroyed() ,
            filter( Boolean ) ,
            tap( () : void => {
                this.enableLoading.set( true );
            } ) ,
            debounceTime( 500 )
        ).subscribe( ( event : PictureControlEvent ) : void => {
            this.eventHandler[ event ]();
        } )
    }

    private onChange : ( _ : any ) => void = ( _ : any ) : void => {
    };

    private onTouched : () => void = () : void => {
    };

    writeValue ( value : IctuBasicFile ) : void {
        this.value.set( value );
    }

    registerOnChange ( fn : any ) : void {
        this.onChange = fn;
    }

    registerOnTouched ( fn : any ) : void {
        this.onTouched = fn;
    }

    setDisabledState ( isDisabled : boolean ) : void {
        this.disabled.set( isDisabled );
    }

    private image2Src ( file : IctuBasicFile ) : string {
        if ( ! file ) {
            return this.placeholder();
        }
        const url : URL = new URL( [ ( file.location === 'aws' ? DEPLOYMENT_INFO.aws : DEPLOYMENT_INFO.media ) , 'file/' , file.id ].join( '' ) );
        url.searchParams.set( 'token' , tokenGetter() );
        return url.toString();
    }

    protected btnCallUploadPanel () : void {
        this.eventObserver.next( 'UPLOAD' );
    }

    protected btnCallView () : void {
        this.eventObserver.next( 'VIEW' );
    }

    protected btnCallDelete () : void {
        this.eventObserver.next( 'DELETE' );
    }

    private validateFile ( file : File ) : boolean {
        switch ( true ) {
            case file.size >= this.maxFileSize():
                this.notification.toastError( 'Dung lượng file không được vượt quá' + formatBytes( this.maxFileSize() ) );
                return false;
            case ! [ 'jpg' , 'png' , 'jpeg' , 'gif' ].includes( file.name.toLowerCase().split( '.' ).pop() ):
                this.notification.toastError( 'Chỉ chấp nhận file có định dạng jpg, png, jpeg, gif' );
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
                this.onChange( file );
                this.value.set( file );
                this.onTouched();
                this.notification.toastSuccess( 'Cập nhật file ảnh thành công' );
            } ,
            error : () : void => {
                this.notification.toastError( 'Upload file thất bại' );
                this.enableLoading.set( false );
            }
        } );
    }

    ngOnDestroy () : void {
        this.destroyed$.next();
        this.destroyed$.complete();
    }
}
