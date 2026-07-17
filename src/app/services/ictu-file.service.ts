import { inject , Injectable } from '@angular/core';
import { HttpClient , HttpEvent , HttpEventType , HttpProgressEvent , HttpResponse } from '@angular/common/http';
import { SAVER , Saver } from '@app/providers/saver.provider';
import { map , Observable , of , retry , scan , switchMap } from 'rxjs';
import { DEPLOYMENT_INFO , getApiRouteLink , getLinkDownload , linkGetFileContentAws } from '@env';
import { AwsResponseInfo , Download , IctuBasicFile , IctuFile , IctuMediaPdfSplitResponse , ICTUStandardFile , UploadInfo } from '@models/file';
import { distinctUntilChanged } from 'rxjs/operators';
import { saveAs } from 'file-saver';
import { Dto , DtoObject } from '@models/dto';
import { Helper } from '@utilities/helper';
import { tokenGetter } from '@app/app.config';

export interface FileUploadAttributes {
    tag? : string,
    public? : number
}

/**********************************************************
 * Convert, prebuild and packet functions
 * ********************************************************/
const fileToFormData : ( file : File , fileAttributes? : FileUploadAttributes ) => FormData = ( file : File , fileAttributes? : FileUploadAttributes ) : FormData => {
    const formData : FormData = new FormData();
    formData.append( 'upload' , file );
    return fileAttributes ? Object.keys( fileAttributes ).reduce( ( reducer : FormData , key : string ) : FormData => {
        reducer.append( key , fileAttributes[ key ] );
        return reducer;
    } , formData ) : formData;
}

/**************************************************************
 * format bytes
 * @param bytes (File size in bytes)
 * @param decimals (Decimals point)
 *************************************************************/
const formatBytes : ( bytes : number , decimals : number ) => string = ( bytes : number , decimals : number = 2 ) : string => {
    if ( ! bytes || bytes === 0 ) {
        return '0 Bytes';
    }
    const k                = 1024;
    const dm : number      = decimals <= 0 ? 0 : decimals;
    const sizes : string[] = [ 'Bytes' , 'KB' , 'MB' , 'GB' , 'TB' , 'PB' , 'EB' , 'ZB' , 'YB' ];
    const i : number       = Math.floor( Math.log( bytes ) / Math.log( k ) );
    return parseFloat( ( bytes / Math.pow( k , i ) ).toFixed( dm ) ) + ' ' + sizes[ i ];
}

const base64ToFile : ( base64 : string , fileName : string ) => File = ( base64 : string , fileName : string ) : File => {
    const bytes = base64.split( ',' )[ 0 ].indexOf( 'base64' ) >= 0 ? atob( base64.split( ',' )[ 1 ] ) : ( <any> window ).unescape( base64.split( ',' )[ 1 ] );
    const mime  = base64.split( ',' )[ 0 ].split( ':' )[ 1 ].split( ';' )[ 0 ];
    const max   = bytes.length;
    const ia    = new Uint8Array( max );
    for ( let i = 0 ; i < max ; i++ ) {
        ia[ i ] = bytes.charCodeAt( i );
    }
    return new File( [ ia ] , fileName , { lastModified : new Date().getTime() , type : mime } );
}

const blobToFile : ( blob : Blob , fileName : string ) => File = ( blob : Blob , fileName : string ) : File => {
    return new File( [ blob ] , fileName , { lastModified : new Date().getTime() , type : blob.type } );
}

const blobToBase64 : ( blob : Blob | File ) => Promise<string> = ( blob : Blob | File ) : Promise<string> => {
    return new Promise( ( resolve : ( value : ( string | null ) ) => void ) : void => {
        const reader   = new FileReader;
        reader.onerror = () : void => resolve( null );
        reader.onload  = () : void => resolve( reader.result.toString() );
        reader.readAsDataURL( blob );
    } );
}

export const FileHostingServiceApi : string = DEPLOYMENT_INFO.fileHostingService === 'aws' ? DEPLOYMENT_INFO.aws : DEPLOYMENT_INFO.media;

export const FileHostingServiceApiLocal : string = DEPLOYMENT_INFO.media;

@Injectable( {
    providedIn : 'any'
} )
export class IctuFileService {

    private http : HttpClient = inject<HttpClient>( HttpClient );

    private save : Saver = inject<Saver>( SAVER );

    get fileHostingServiceApi () : string {
        return FileHostingServiceApi;
    }

    get fileHostingServiceApiLocal () : string {
        return FileHostingServiceApiLocal;
    }

    isHttpResponse<T> ( event : HttpEvent<T> ) : event is HttpResponse<T> {
        return event.type === HttpEventType.Response;
    }

    isHttpProgressEvent ( event : HttpEvent<unknown> ) : event is HttpProgressEvent {
        return ( event.type === HttpEventType.DownloadProgress || event.type === HttpEventType.UploadProgress );
    }

    downloadLocalFile ( id : number ) : Observable<Download> {
        return this.downloadExternalWithProgress( getLinkDownload( id.toString( 10 ) ) );
    }

    downloadWithProgress ( id : number , filename? : string ) : Observable<Download> {
        return this.downloadExternalWithProgress( getLinkDownload( id.toString( 10 ) ) , filename );
    }

    downloadExternalWithProgress ( url : string , filename? : string ) : Observable<Download> {
        const saver : Saver | undefined = filename ? ( blob : Blob ) : void => this.save( blob , filename ) : undefined;
        return this.http.get( url , { reportProgress : true , observe : 'events' , responseType : 'blob' } ).pipe( this._downloadProcess( saver ) );
    }

    private _downloadProcess ( saver? : Saver ) : ( source : Observable<HttpEvent<Blob>> ) => Observable<Download> {
        return ( source : Observable<HttpEvent<Blob>> ) : Observable<Download> => source.pipe(
            scan(
                ( download : Download , event : HttpEvent<Blob> ) : Download => {
                    if ( this.isHttpProgressEvent( event ) ) {
                        return {
                            progress : event.total ? Math.round( ( 100 * event.loaded ) / event.total ) : download.progress ,
                            state    : 'IN_PROGRESS' ,
                            content  : null
                        };
                    }
                    if ( this.isHttpResponse( event ) ) {
                        if ( saver ) {
                            saver( event.body as Blob );
                        }
                        return {
                            progress : 100 ,
                            state    : 'DONE' ,
                            content  : event.body
                        };
                    }
                    return download;
                } ,
                { state : 'PENDING' , progress : 0 , content : null }
            ) ,
            distinctUntilChanged( ( a : Download , b : Download ) : boolean => a.state === b.state && a.progress === b.progress && a.content === b.content )
        );
    }

    /********************************************************************************
     * aws functions
     * ******************************************************************************/
    awsDownloadWithProgress ( idOrName : string , filename? : string ) : Observable<Download> {
        const saver : Saver | undefined = filename ? ( blob : Blob ) : void => this.save( blob , filename ) : undefined;
        return this.getLinkDownloadAws( idOrName ).pipe( map( ( i : AwsResponseInfo ) : string => i.data ) , switchMap( link => this.http.get( link , { reportProgress : true , observe : 'events' , responseType : 'blob' } ).pipe( this._downloadProcess( saver ) ) ) );
    }

    getLinkDownloadAws ( idOrName : string ) : Observable<AwsResponseInfo> {
        return this.http.post<AwsResponseInfo>( linkGetFileContentAws( idOrName ) , {} );
    }

    downloadAwsFile ( idOrName : string ) : Observable<Download> {
        return this.getLinkDownloadAws( idOrName ).pipe( switchMap( ( info : AwsResponseInfo ) : Observable<Download> => this.http.get( info.data , { reportProgress : true , observe : 'events' , responseType : 'blob' } ).pipe( this._downloadProcess( null ) ) ) );
    }

    downloadFileFromAwsByFileId ( id : number ) : Observable<Blob> {
        return this.getLinkDownloadAws( id.toString( 10 ) ).pipe( switchMap( ( info : AwsResponseInfo ) : Observable<Blob> => this.http.get( info.data , { reportProgress : true , responseType : 'blob' } ) ) );
    }

    // async getPathFileAws ( id : number ) : Promise<string> {
    // 	try {
    // 		const res : AwsResponseInfo = await firstValueFrom( this.getLinkDownloadAws( id ) );
    // 		return Promise.resolve( res.code === 'success' && res.data ? res.data : null );
    // 	}
    // 	catch ( e ) {
    // 		return Promise.resolve( null );
    // 	}
    // }

    getPublicLink ( info : ICTUStandardFile | Pick<ICTUStandardFile , 'name' | 'location'> ) : string {
        switch ( info.location ) {
            case 'aws':
                return linkGetFileContentAws( info.name );
            case 'local':
                return getLinkDownload( info.name );
            default:
                return ''
        }
    }

    /********************************************************************************
     * Server file
     * ******************************************************************************/
    getFile ( nameOrId : string ) : Observable<Blob> {
        return this.http.get( getLinkDownload( nameOrId ) , { responseType : 'blob' } );
    }

    downloadFileByName ( fileName : string , title : string ) : Promise<boolean> {
        return new Promise( ( resolve : ( value : boolean ) => void ) : void => {
            this.getFile( fileName ).subscribe(
                {
                    next  : ( blob : Blob ) : void => {
                        saveAs( blob , title );
                        resolve( true );
                    } ,
                    error : () : void => resolve( false )
                }
            );
        } );
    }

    getImageContentFromLocalAssesFile ( file : string ) : Observable<string> {
        return this.http.get( file , { responseType : 'blob' } ).pipe( map( ( blob : Blob ) : string => URL.createObjectURL( blob ) ) );
    }

    /**********************************************************
     * Main upload file function
     * ********************************************************/
    upload ( file : File , fileAttributes? : FileUploadAttributes ) : Observable<ICTUStandardFile> {
        return this.http.post<Dto>( this.fileHostingServiceApi , fileToFormData( file , fileAttributes ) ).pipe(
            retry( 2 ) ,
            map( ( response : Dto ) : IctuFile => Array.isArray( response.data ) ? response.data[ 0 ] : response.data ) ,
            map( ( response : IctuFile ) : ICTUStandardFile => response ? ( { ... response , location : DEPLOYMENT_INFO.fileHostingService } ) : null )
            // mergeMap( ( fileInfo : ICTUStandardFile ) : Observable<ICTUStandardFile> => submitterInfo.public && fileInfo ? this.publicFile( fileInfo.id.toString( 10 ) ).pipe( map( () : ICTUStandardFile => ( { ... fileInfo , public : 1 } ) ) ) : of( fileInfo ) )
        );
    }

    uploadLocal ( file : File , fileAttributes? : FileUploadAttributes ) : Observable<ICTUStandardFile> {
        return this.http.post<Dto>( this.fileHostingServiceApiLocal , fileToFormData( file , fileAttributes ) ).pipe(
            retry( 2 ) ,
            map( ( response : Dto ) : IctuFile => Array.isArray( response.data ) ? response.data[ 0 ] : response.data ) ,
            map( ( response : IctuFile ) : ICTUStandardFile => response ? ( { ... response , location : DEPLOYMENT_INFO.fileHostingService } ) : null )
            // mergeMap( ( fileInfo : ICTUStandardFile ) : Observable<ICTUStandardFile> => submitterInfo.public && fileInfo ? this.publicFile( fileInfo.id.toString( 10 ) ).pipe( map( () : ICTUStandardFile => ( { ... fileInfo , public : 1 } ) ) ) : of( fileInfo ) )
        );
    }

    publicFile ( fileNameOrId : string ) : Observable<Dto> {
        return this.http.put<Dto>( [ Helper.removeSlashes( this.fileHostingServiceApi ) , fileNameOrId ].join( '/' ) , { public : 1 } )
    }

    uploadWithProgress ( file : File , fileAttributes? : FileUploadAttributes , otherLink? : string ) : Observable<UploadInfo> {
        return this.http.post<DtoObject<ICTUStandardFile[]>>( otherLink ?? this.fileHostingServiceApi , fileToFormData( file , fileAttributes ) , {
            reportProgress : true ,
            observe        : 'events'
        } ).pipe(
            // gom các trạng thái vào 1 object
            scan( ( acc : UploadInfo , event : HttpEvent<DtoObject<ICTUStandardFile[]>> ) : UploadInfo => {
                switch ( event.type ) {
                    case HttpEventType.UploadProgress:
                        return {
                            state    : 'IN_PROGRESS' ,
                            progress : event.total ? Math.round( ( 100 * event.loaded ) / event.total ) : acc.progress ,
                            response : null ,
                            total    : event.total ,
                            uploaded : event.loaded
                        }
                    case HttpEventType.Response:
                        return {
                            state    : 'DONE' ,
                            progress : 100 ,
                            response : { location : DEPLOYMENT_INFO.fileHostingService , ... event.body.data[ 0 ] } ,
                            total    : acc.total ,
                            uploaded : acc.uploaded
                        }
                }
                return acc;
            } , { state : 'PENDING' , progress : 0 , response : null } ) ,
            // chỉ emit khi progress thay đổi
            distinctUntilChanged( ( prev : UploadInfo , curr : UploadInfo ) : boolean => prev.progress === curr.progress && prev.response === curr.response )
            // chỉ giữ lại object {progress, response}
            // map( ( state : UploadInfo ) : UploadInfo => state )
        )
    }

    getLinkFile ( file : IctuBasicFile | ICTUStandardFile ) : Observable<string> {
        switch ( file.location ) {
            case 'aws':
                return this.getLinkDownloadAws( file.id.toString( 10 ) ).pipe( map( ( response : AwsResponseInfo ) : string => response.data ?? '' ) );
            case 'local':
                return this.getFile( file.id.toString( 10 ) ).pipe( map( ( blob : Blob ) : string => URL.createObjectURL( blob ) ) );
            default :
                return of( '' );
        }
    }

    /**********************************************************
     * Media pdf
     * ********************************************************/
    convertPdf2Images ( id : number ) : Observable<IctuMediaPdfSplitResponse> {
        const api : string = getApiRouteLink( [ 'media-pdf' , id.toString( 10 ) , 'split' ].join( '/' ) );
        return this.http.post<IctuMediaPdfSplitResponse>( api , {} );
    }

    /**
     * getMediaPdfPage
     * @param id file ID
     * @param page page number
     * @returns url string
     * */
    getLinkMediaPdfPage ( id : number , page : number ) : Observable<string> {
        // file-page/:id/:page
        const api : string = getApiRouteLink( [ 'media-pdf' , 'file-page' , id.toString( 10 ) , `${ page }.png` ].join( '/' ) );
        return this.http.post<DtoObject<string>>( api , {} ).pipe( map( ( response : DtoObject<string> ) : string => response.data ) )
    }

    /**
     * getMediaPdfPage
     * @param id file ID
     * @param page page start (number)
     * */
    linkMediaPdf ( id : number , page : number ) : string {
        const url : URL = new URL( getApiRouteLink( [ 'media-pdf' , 'file-page' , id.toString( 10 ) , `${ page }.png` ].join( '/' ) ) );
        url.searchParams.set( 'token' , tokenGetter() );
        return url.toString();
    }

    /**
     * getMediaPdfPage
     * @param id file ID
     * @param pages page array of number
     * @returns url string
     * */
    getMultiMediaPdfPage ( id : number , pages : number[] ) : Observable<any> {
        const api : string = getApiRouteLink( [ 'media-pdf' , 'file-pages' , id.toString( 10 ) ].join( '/' ) );
        return this.http.post<DtoObject<string>>( api , { pages } ).pipe( map( ( response : DtoObject<string> ) : string => response.data ) )
    }
}
