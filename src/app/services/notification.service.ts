import { inject , Injectable } from '@angular/core';
import { BehaviorSubject , filter , firstValueFrom , map , Observable , Subject , tap } from 'rxjs';
import { MessageService } from 'primeng/api';
import { getApiRouteLink } from '@env';
import { HttpClient } from '@angular/common/http';
import { ConfirmComponent , ConfirmDialogData } from '@theme/components/confirm/confirm.component';
import { MatDialog , MatDialogRef } from '@angular/material/dialog';
import { distinctUntilChanged } from 'rxjs/operators';
import { refreshTokenGetter , tokenSetter } from '@app/app.config';
import { ButtonBase } from '@models/button';
import { ConfirmDeleteComponent } from '@theme/components/confirm-delete/confirm-delete.component';
import { IctuDeletingAnimationComponent } from '@theme/components/ictu-deleting-animation/ictu-deleting-animation.component';
import { IctuMediaPlayerComponent , IctuMediaPlayerDialogData } from '@theme/components/ictu-media-player/ictu-media-player.component';
import { IctuFilePreviewerComponent , IctuFilePreviewerDialogData } from '@theme/components/ictu-file-previewer/ictu-file-previewer.component';
import { IctuBasicFile , ICTUStandardFile } from '@models/file';
import { IctuFileDownloaderComponent , IctuFileDownloaderDialogData } from '@theme/components/ictu-file-downloader/ictu-file-downloader.component';
import { IctuFileUploaderComponent , IctuFileUploaderDialogData , IctuFileUploaderDialogResponse } from '@theme/components/ictu-file-uploader/ictu-file-uploader.component';
import { ConfirmDelete2Component , ConfirmDelete2Data } from '@theme/components/confirm-delete-2/confirm-delete-2.component';

export interface StateLoadingV2 extends StateLoadingV2Input {
    loading? : boolean;
}

export interface StateLoadingV2Input {
    icon? : 'circle' | 'pill',
    text? : string,
    process? : { percent : number }
}

@Injectable( {
    providedIn : 'root'
} )
export class NotificationService {

    private OBSERVE_SYSTEM_IS_ASYNCHRONOUS_IN_TIME : Subject<string> = new Subject<string>();

    private REMEASURE_DEVICE_SCREEN : Subject<string> = new Subject<string>();

    private OBSERVE_LOADING_ANIMATION : Subject<boolean> = new Subject<boolean>();

    private OBSERVE_OPEN_DEVTOOL : BehaviorSubject<boolean> = new BehaviorSubject<boolean>( false );

    private OBSERVE_LOADING_ANIMATION_V2 : Subject<StateLoadingV2> = new Subject<StateLoadingV2>();

    private observerSignOut$ : Subject<string> = new Subject<string>();

    private observerSessionExpired$ : Subject<string> = new Subject<string>();

    private refreshTokenSubject$ : BehaviorSubject<string> = new BehaviorSubject<string>( '' );

    /****************************************************************************
     * Toast message
     * ***************************************************************************/

    private messageService : MessageService        = inject( MessageService );
    /****************************************************************************
     * Refresh token
     * ***************************************************************************/
    private http : HttpClient                      = inject( HttpClient );
    /************************* End *************************/
    private dialog : MatDialog                     = inject( MatDialog );
    private dataConfirmSignOut : ConfirmDialogData = {
        heading : 'Bạn có chắc chắn muốn đăng xuất không?' ,
        buttons : [
            {
                name  : 'yes' ,
                label : 'Có' ,
                icon  : 'ti ti-check' ,
                class : 'p-button-primary p-button-rounded'
            } ,
            {
                name  : 'no' ,
                label : 'Không' ,
                icon  : 'ti ti-x' ,
                class : 'p-button-secondary p-button-rounded'
            }
        ]
    };

    get onSessionExpired () : Observable<string> {
        return this.observerSessionExpired$;
    }

    get matDialog () : MatDialog {
        return this.dialog;
    }

    get onSignOut () : Observable<string> {
        return this.observerSignOut$.asObservable();
    }

    get onLoadingAnimationV2 () : Observable<StateLoadingV2> {
        return this.OBSERVE_LOADING_ANIMATION_V2.asObservable();
    }

    get onRemeasureDeviceScreen () : Observable<string> {
        return this.REMEASURE_DEVICE_SCREEN.asObservable();
    }

    get onDevtoolOpened () : Observable<boolean> {
        return this.OBSERVE_OPEN_DEVTOOL.asObservable().pipe( distinctUntilChanged() );
    }

    get isSystemAsynchronousInTime () : Observable<string> {
        return this.OBSERVE_SYSTEM_IS_ASYNCHRONOUS_IN_TIME.asObservable();
    }

    toastSuccess ( body : string , heading : string = 'Thông báo' ) : void {
        this.messageService.add( {
            severity : 'success' ,
            summary  : heading || 'Success' ,
            detail   : body ,
            closable : true
        } );
    }

    toastWarning ( body : string , heading : string = 'Cảnh báo' ) : void {
        this.messageService.add( {
            severity : 'warn' ,
            summary  : heading || 'Warn' ,
            detail   : body ,
            closable : true
        } );
    }

    toastInfo ( body : string , heading : string = 'Thông báo' ) : void {
        this.messageService.add( {
            severity : 'info' ,
            summary  : heading || 'Info' ,
            detail   : body ,
            closable : true
        } );
    }

    toastError ( body : string , heading : string = 'Cảnh báo' ) : void {
        this.messageService.add( {
            severity : 'error' ,
            summary  : heading || 'Error' ,
            detail   : body ,
            closable : true
        } );
    }

    clearToast () : void {
        this.messageService.clear();
    }

    /************************* End *************************/

    sessionExpired ( message? : string ) : void {
        this.observerSessionExpired$.next( message || '' );
    }

    waitingForNewAccessTokenToBeServed () : Observable<string> {
        return this.refreshTokenSubject$.asObservable().pipe(
            filter( ( token : string ) : boolean => token != '' )
        );
    }

    confirm ( data : ConfirmDialogData ) : Observable<ButtonBase> {
        const dialogRef : MatDialogRef<ConfirmComponent> = this.dialog.open( ConfirmComponent , {
            data ,
            disableClose : true ,
            panelClass   : 'ictu-app-notification'
        } );
        return dialogRef.afterClosed();
    }

    confirmDelete ( amount : number ) : Observable<boolean> {
        const dialogRef : MatDialogRef<ConfirmDeleteComponent> = this.dialog.open( ConfirmDeleteComponent , {
            data         : { amount } ,
            disableClose : true ,
            panelClass   : [ 'ictu-app-notification' , 'ictu-app-confirm-delete' ]
        } );
        return dialogRef.afterClosed();
    }

    confirmDelete2 ( config? : Partial<ConfirmDelete2Data> ) : Observable<boolean> {
        const dialogRef : MatDialogRef<ConfirmDelete2Component> = this.dialog.open( ConfirmDelete2Component , {
            data         : config ,
            disableClose : true ,
            panelClass   : [ 'ictu-app-notification' , 'ictu-app-confirm-delete' ]
        } );
        return dialogRef.afterClosed();
    }

    startDeleting ( observer : Observable<number> ) : Observable<boolean> {
        return this.progressBarWithPercent( observer , 'Đang xóa dữ liệu...' );
    }

    progressBarWithPercent ( observer : Observable<number> , heading : string ) : Observable<boolean> {
        const dialogRef : MatDialogRef<IctuDeletingAnimationComponent> = this.dialog.open( IctuDeletingAnimationComponent , {
            data         : { observer , heading } ,
            disableClose : true ,
            panelClass   : [ 'ictu-app-notification' , 'ictu-app-deleting-animation' ]
        } );
        return dialogRef.afterClosed();
    }

    playMedia ( info : Partial<IctuMediaPlayerDialogData> ) : Observable<any> {
        const config : IctuMediaPlayerDialogData = Object.assign<IctuMediaPlayerDialogData , Partial<IctuMediaPlayerDialogData>>( {
            title       : '' ,
            file        : null ,
            sources     : [] ,
            options     : null ,
            aspectRatio : '16/9'
        } , info );

        const dialogRef : MatDialogRef<IctuMediaPlayerComponent> = this.dialog.open( IctuMediaPlayerComponent , {
            data         : config ,
            disableClose : true ,
            panelClass   : [ 'ictu-app-notification' , 'ictu-play-media' ]
        } );
        return dialogRef.afterClosed();
    }

    previewFile ( info : Partial<IctuFilePreviewerDialogData> ) : Observable<any> {
        const config : IctuFilePreviewerDialogData = Object.assign<IctuFilePreviewerDialogData , Partial<IctuFilePreviewerDialogData>>( {
            info  : [] ,
            files : []
        } , info );

        const dialogRef : MatDialogRef<IctuFilePreviewerComponent> = this.dialog.open( IctuFilePreviewerComponent , {
            data         : config ,
            disableClose : true ,
            panelClass   : [ 'ictu-app-notification' , 'ictu-play-media' ]
        } );
        return dialogRef.afterClosed();
    }

    downloadFile ( info : IctuBasicFile | ICTUStandardFile ) : Observable<boolean> {
        const config : IctuFileDownloaderDialogData                           = { info }
        const dialogRef : MatDialogRef<IctuFileDownloaderComponent , boolean> = this.dialog.open( IctuFileDownloaderComponent , {
            data         : config ,
            disableClose : true ,
            panelClass   : [ 'ictu-app-notification' , 'ictu-file-downloader-panel' ]
        } );
        return dialogRef.afterClosed();
    }

    uploadFile ( info : IctuFileUploaderDialogData ) : Observable<IctuFileUploaderDialogResponse> {
        const dialogRef : MatDialogRef<IctuFileUploaderComponent , IctuFileUploaderDialogResponse> = this.dialog.open( IctuFileUploaderComponent , {
            data         : info ,
            disableClose : true ,
            panelClass   : [ 'ictu-app-notification' , 'ictu-file-downloader-panel' ]
        } );
        return dialogRef.afterClosed();
    }

    confirmSignOut () : void {
        void this._handleConfirmSignOut();
    }

    isProcessing ( isLoading = true ) : void {
        this.OBSERVE_LOADING_ANIMATION.next( isLoading );
    }

    startLoading () : void {
        this.isProcessing( true );
    }

    stopLoading () : void {
        this.isProcessing( false );
    }

    loadingAnimationV2 ( state : StateLoadingV2Input ) : void {
        this.OBSERVE_LOADING_ANIMATION_V2.next( { loading : true , ... state } );
    }

    disableLoadingAnimationV2 () : void {
        const reset : StateLoadingV2 = {
            loading : false ,
            icon    : undefined ,
            text    : '' ,
            process : undefined
        };
        setTimeout( () : void => this.OBSERVE_LOADING_ANIMATION_V2.next( reset ) , 120 );
    }

    remeasureDeviceScreen () : void {
        this.REMEASURE_DEVICE_SCREEN.next( 'remeasureDeviceScreen' );
    }

    noticeDevtoolOpened () : void {
        this.OBSERVE_OPEN_DEVTOOL.next( true )
    }

    reportSystemAsynchronousInTime () : void {
        this.OBSERVE_SYSTEM_IS_ASYNCHRONOUS_IN_TIME.next( 'report' );
    }

    private refreshToken () : Observable<string> {
        this.refreshTokenSubject$.next( '' );
        return this.http.post<{ data : string }>( getApiRouteLink( 'refresh-token' ) , { 'refresh_token' : refreshTokenGetter() } ).pipe( map( ( { data } ) => tokenSetter( data ) ) , tap( ( access_token ) => this.refreshTokenSubject$.next( access_token ) ) );
    }

    private async _handleConfirmSignOut () : Promise<void> {
        const confirm : string = await firstValueFrom( this.confirm( this.dataConfirmSignOut ) ).then( ( u : ButtonBase ) : string => ( u.name ) );
        if ( confirm === 'yes' ) {
            this.observerSignOut$.next( 'logout' );
        }
    }

    /**
     * downloadLocalFile
     * @var path : string - path get to file stored folder
     * @var fileName : string - File name (without extension)
     * */
    downloadLocalFile ( path : string , fileName : string ) : void {
        const link : HTMLAnchorElement = Object.assign<HTMLAnchorElement , Pick<HTMLAnchorElement , 'rel' | 'download' | 'href' | 'target'>>( document.createElement<'a'>( 'a' ) , {
            download : fileName ,
            href     : path ,
            target   : '_blank' ,
            rel      : 'noopener noreferrer'
        } );
        link.click();
        setTimeout( () : void => link.remove() , 5000 );
    }
}
