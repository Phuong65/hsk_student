import { Source } from 'plyr';
import { PreviewType } from '@module/ngx-file-preview';
import { PreviewUtils } from '@module/ngx-file-preview/lib/utils';
import { IctuFileService } from '@services/ictu-file.service';

export type IctuMediaSourceType = 'googleDrive' | 'serverFile' | 'local' | 'vimeo' | 'youtube' | 'encrypted' | 'serverAws';

export type IctuDocumentType = 'docx' | 'pptx' | 'pdf' | 'xlsx' | 'audio' | 'video' | 'image' | 'text' | 'zip';

export interface IctuDocument {
    type : IctuDocumentType;
    source : IctuMediaSourceType;
    path : string | number;
    size? : number;
    fileName? : string;
    preview? : boolean;
    _ext? : IctuDocumentType;
    download? : boolean;
}

type DownloadStateType = 'PENDING' | 'IN_PROGRESS' | 'DONE';

export interface Download {
    content : Blob | null;
    progress : number;
    state : DownloadStateType;
}

export interface UploadInfo {
    response : ICTUStandardFile | null;
    progress : number;
    state : DownloadStateType;
    uploaded : number;
    total : number;
}

export interface EncryptedFormats {
    itag : number;
    url : string;
    mimeType : string;
    bitrate : number;
    width : number;
    height : number;
    lastModified : string;
    fps : number;
    quality : string;
    qualityLabel : string;
    initRange? : {
        start : string;
        end : string;
    };
    indexRange? : {
        start : string;
        end : string;
    };
    projectionType? : string;
    audioQuality? : string;
    approxDurationMs? : string;
    audioSampleRate? : string;
    audioChannels? : 2;
    type? : string;
    averageBitrate? : string;
    highReplication? : boolean;
    loudnessDb? : number;
}

export interface EncryptedSource extends Source {
    src : string;
    approxDurationMs? : string;
}

export interface IctuMedia {
    type : string; // only 'audio' and 'video' is accepted
    source : IctuMediaSourceType;
    path : string | number;
    replay? : number;
    encryptedSource? : EncryptedSource[]; // Trường hợp source === encrypted thì trường này chứa link video
}

export interface AwsResponseInfo {
    code : string,
    data : string,
    message : string
}

export interface EncryptedVideo {
    code : string,
    message : string,
    videoDetails : EncryptedVideoDetails;
    video? : EncryptedVideoDetails;
    formats? : EncryptedFormats[];
    format? : EncryptedFormats;
}

export interface EncryptedVideoDetails {
    title : string;
    lengthSeconds : string;
    keywords : string[];
    channelId : string;
    isOwnerViewing : boolean;
    shortDescription : string;
    isCrawlable : boolean;
    allowRatings : boolean;
    viewCount : string;
    author : string;
    isPrivate : boolean;
    isUnpluggedCorpus : boolean;
    isLiveContent : boolean;
}

export interface IctuFileInfo {
    id? : number;
    name : string;
    size : number;
    type : string;
    donvi_id? : number;
    ext? : string;
    realm? : string;
    title? : string;
    url? : string;
    user_id? : number;
    updated_at? : string;
    created_at? : string;
}

export interface IctuDocumentDownloadResult {
    state : 'REJECTED' | 'ERROR' | 'INVALIDATE' | 'COMPLETED' | 'CANCEL';
    download : Download;
}

export interface IctuDriveFile extends IctuTinyDriveFile {
    parents : string[];
    spaces : string[];
    webContentLink? : string;
    webViewLink? : string;
    thumbnailLink? : string;
    createdTime : string;
    modifiedTime : string;
    originalFilename : string;
    fullFileExtension : string;
}

export interface IctuFileStore {
    id : number;
    name : string;
    title : string;
    size : number;
    type : string;
    ext : string;
    progress? : number;
}

export interface IctuTinyDriveFile {
    id : string;
    mimeType : string;
    name : string;
    fileExtension : string;
    shared : boolean;
    size : string;
}

export interface IctuFile {
    id : number;
    name : string;
    title : string;
    url : string;
    ext : string;
    type : string;
    size : number;
    user_id : number;
    public : number; // '-1' => public | '0' => private | '|12|24|25|' => share group.
    created_at : string; // mySql DATETIME format: YYYY-MM-DD HH:mm:ss
    updated_at : string; // mySql DATETIME format: YYYY-MM-DD HH:mm:ss
}

export type ICTUFileHostingService = 'aws' | 'local';

// Interface generic nhận T là một giá trị cụ thể thuộc ICTUFileHostingService
// export interface ICTUStandardFile<T extends ICTUFileHostingService> extends IctuFile {
// 	location : T;
// }

export interface ICTUStandardFile extends IctuFile {
    location : ICTUFileHostingService;
}

export type IctuBasicFile = Pick<ICTUStandardFile , 'id' | 'name' | 'title' | 'url' | 'ext' | 'type' | 'size' | 'location'>;

export interface IctuPreviewFileContent {
    id : string | number;
    file? : IctuFile | IctuDriveFile | IctuTinyDriveFile | SimpleFileLocal;
}

export interface SimpleFileLocal {
    id : number,
    name : string,
    title : string,
    ext : string,
    type : string,
    size : number
}

export interface AwsFileInfo {
    id : number,
    name : string,
    title : string,
    tag : string,
    url : string,
    ext : string,
    type : string,
    size : number,
    user_id : number,
    public : number,
    status : number,
    is_deleted : number,
    deleted_by : number,
    created_by : number,
    updated_by : number,
    created_at : string,
    updated_at : string,
}

export interface LocalStoreFile {
    nonce : string, // org-id, eg: serverAws-1452
    org : string,
    id : string, // file id or name
    url : string,
    file : File;
}

export interface IctuMediaPdf {
    id : number,
    name : string,
    title : string,
    url : string,
    ext : string,
    type : string,
    size : number,
    user_id : number,
    parent_id : number,
    public : number,
    created_at : string,
    updated_at : string,
}

export interface IctuMediaPdfSplitResponse {
    message : string,//'Split success!',
    data : IctuMediaPdf[],
}

export interface MediaPdf {
    id : number,
    name : string,
    title : string,
    url : string,
    ext : string,
    type : string,
    size : number,
    user_id : number,
    parent_id : number,
    public : number,
    created_at : string,
    updated_at : string,
}

export type CommonCompressExtension = 'rar' | 'gzip' | 'zip';

export type CommonImageExtension = 'jpg' | 'jpeg' | 'png' | 'gif' | 'bmp' | 'webp' | 'svg' | 'ico'

export type CommonDocExtension = 'doc' | 'docx' | 'ppt' | 'pptx' | 'xls' | 'xlsx' | 'pdf' | 'txt';

export type CommonAudioExtension = 'mp3' | 'wav' | 'ogg' | 'm4a' | 'aac' | 'oga';

export type CommonVideoExtension = 'mp4' | 'webm' | 'ogv';

export type FileExtensionSupported = CommonImageExtension | CommonVideoExtension | CommonDocExtension | CommonAudioExtension | CommonCompressExtension;

export const FILE_EXTENSIONS : FileExtensionSupported[] = [ 'jpg' , 'jpeg' , 'png' , 'gif' , 'bmp' , 'webp' , 'svg' , 'ico' , 'rar' , 'gzip' , 'zip' , 'doc' , 'docx' , 'ppt' , 'pptx' , 'xls' , 'xlsx' , 'pdf' , 'mp3' , 'wav' , 'ogg' , 'm4a' , 'aac' , 'oga' , 'mp4' , 'webm' , 'ogv' ] as const;

export const FILE_ICON_MAP : ReadonlyMap<FileExtensionSupported , PreviewType> = Object.freeze( new Map<FileExtensionSupported , PreviewType>( [
    // Images
    [ 'jpg' , 'image' ] ,
    [ 'jpeg' , 'image' ] ,
    [ 'png' , 'image' ] ,
    [ 'gif' , 'image' ] ,
    [ 'bmp' , 'image' ] ,
    [ 'webp' , 'image' ] ,
    [ 'svg' , 'image' ] ,
    [ 'ico' , 'image' ] ,
    // Compress
    [ 'rar' , 'zip' ] ,
    [ 'gzip' , 'zip' ] ,
    [ 'zip' , 'zip' ] ,
    // Docs
    [ 'doc' , 'word' ] ,
    [ 'docx' , 'word' ] ,
    [ 'ppt' , 'ppt' ] ,
    [ 'pptx' , 'ppt' ] ,
    [ 'xls' , 'excel' ] ,
    [ 'xlsx' , 'excel' ] ,
    [ 'pdf' , 'pdf' ] ,
    [ 'txt' , 'txt' ] ,
    //Audios
    [ 'mp3' , 'audio' ] ,
    [ 'wav' , 'audio' ] ,
    [ 'ogg' , 'audio' ] ,
    [ 'm4a' , 'audio' ] ,
    [ 'aac' , 'audio' ] ,
    [ 'oga' , 'audio' ] ,
    // Videos
    [ 'mp4' , 'video' ] ,
    [ 'webm' , 'video' ] ,
    [ 'ogv' , 'video' ]
] ) );

export const FILE_EXTENSIONS_SET : Set<FileExtensionSupported> = new Set<FileExtensionSupported>( FILE_EXTENSIONS );

export const AUDIO_EXTENSIONS_SET : Set<CommonAudioExtension> = new Set<CommonAudioExtension>( [ 'mp3' , 'aac' , 'm4a' , 'ogg' , 'oga' , 'wav' ] as const );

export const VIDEO_EXTENSIONS_SET : Set<CommonVideoExtension> = new Set<CommonVideoExtension>( [ 'mp4' , 'webm' , 'ogv' ] as const );

export const IMAGE_EXTENSIONS_SET : Set<CommonImageExtension> = new Set<CommonImageExtension>( [ 'jpg' , 'jpeg' , 'png' , 'gif' , 'bmp' , 'webp' , 'svg' , 'ico' ] as const );

export const DOC_EXTENSIONS_SET : Set<CommonDocExtension> = new Set<CommonDocExtension>( [ 'pdf' , 'doc' , 'docx' , 'xls' , 'xlsx' , 'ppt' , 'pptx' , 'txt' ] as const );

/********************************************************************************************
 * Type guard
 * ******************************************************************************************/
export function isAudioExtension ( ext : string ) : ext is CommonAudioExtension {
    return AUDIO_EXTENSIONS_SET.has( ext.toLowerCase() as CommonAudioExtension );
}

export function isVideoExtension ( ext : string ) : ext is CommonVideoExtension {
    return VIDEO_EXTENSIONS_SET.has( ext.toLowerCase() as CommonVideoExtension );
}

export function isImageExtension ( ext : string ) : ext is CommonImageExtension {
    return IMAGE_EXTENSIONS_SET.has( ext.toLowerCase() as CommonImageExtension );
}

export function isDocExtension ( ext : string ) : ext is CommonDocExtension {
    return DOC_EXTENSIONS_SET.has( ext.toLowerCase() as CommonDocExtension );
}

export function isSupportedExtension ( ext : string ) : ext is FileExtensionSupported {
    return FILE_EXTENSIONS_SET.has( ext.toLowerCase() as FileExtensionSupported )
}

/**********************************************************************************************
 * Functions
 * ********************************************************************************************/

function getFileTypeFromExtension ( extension ? : string ) : PreviewType {
    if ( ! extension ) return 'unknown';

    switch ( extension ) {
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'bmp':
        case 'webp':
            return 'image';
        case 'mp4':
        case 'webm':
        case 'ogg':
        case 'mov':
        case 'm3u8':
        case 'm3u':
        case 'ts':
        case 'avi':
        case 'wmv':
        case 'flv':
        case 'mkv':
        case '3gp':
            return 'video';
        case 'mp3':
        case 'wav':
            return 'audio';
        case 'pdf':
            return 'pdf';
        case 'ppt':
        case 'pptx':
            return 'ppt';
        case 'doc':
        case 'docx':
            return 'word';
        case 'xls':
        case 'xlsx':
            return 'excel';
        case 'txt':
        case 'json':
            return 'txt';
        case 'md':
            return 'markdown';
        case 'zip':
        case 'rar':
        case '7z':
            return 'zip';

        default:
            return 'unknown';
    }
}

export function isFile ( input : unknown ) : input is File {
    return typeof File !== 'undefined' && input instanceof File;
}

export function getFileExtension ( file : File | string | IctuBasicFile | ICTUStandardFile | IctuFile ) : FileExtensionSupported | string {
    if ( typeof file === 'string' ) {
        return file.substring( file.lastIndexOf( '.' ) ).toLowerCase().replace( '.' , '' );
    }

    if ( file instanceof File ) {
        return file.name.substring( file.name.lastIndexOf( '.' ) ).toLowerCase().replace( '.' , '' );
    }
    // Trường hợp  IctuBasicFile | ICTUStandardFile | IctuFile
    return file[ 'ext' ]?.toLowerCase() ?? '';
}

export function getFileIcon ( file : File | string | IctuBasicFile | ICTUStandardFile | IctuFile ) : PreviewType {
    if ( isFile( file ) ) {
        return PreviewUtils.getFileType( ( file as File ) );
    }
    else {
        const ext : string = typeof file === 'string' ? file : file.ext;
        return getFileTypeFromExtension( ext );
    }

    // const ext : FileExtensionSupported | string = file ? getFileExtension( file ) : '';
    // return FILE_ICON_MAP.has( <FileExtensionSupported> ext ) ? FILE_ICON_MAP.get( <FileExtensionSupported> ext ) : 'genericfile.svg'
}

export function canFilePreview ( file : File | string | IctuBasicFile | ICTUStandardFile | IctuFile ) : boolean {
    const ext : FileExtensionSupported | string = getFileExtension( file );
    return isAudioExtension( ext ) || isVideoExtension( ext ) || isImageExtension( ext );
}

export type RegexFlag = 'g' | 'm' | 'i';

export type IctuRegExpProvider = ( flags? : RegexFlag[] ) => RegExp;

export const regexMatchGoogleDrive : IctuRegExpProvider = ( flags : RegexFlag[] = [ 'g' ] ) : RegExp => {
    return new RegExp( /https:\/\/drive\.google\.com\/file\/d\/([^\/]+)/ , flags.join( '' ) );
};

export const regexMatchYouTube : IctuRegExpProvider = ( flags : RegexFlag[] = [ 'g' ] ) : RegExp => {
    return new RegExp( /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/ , flags.join( '' ) );
};

export const regexMatchVimeo : IctuRegExpProvider = ( flags : RegexFlag[] = [ 'g' ] ) : RegExp => {
    return new RegExp( /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)/ , flags.join( '' ) );
};

export const regexMatchALink : IctuRegExpProvider = ( flags : RegexFlag[] = [ 'g' ] ) : RegExp => {
    return new RegExp( /[(http(s)?):\/\/(www\.)?a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/ , flags.join( '' ) );
};
