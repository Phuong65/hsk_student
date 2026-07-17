import { PreviewFile , PreviewFileInput , PreviewType } from '../types/preview.types';

export class PreviewUtils {
	static formatFileSize ( bytes? : number ) : string {
		if ( bytes === undefined || bytes === null ) return '未知大小';
		if ( bytes === 0 ) return '0 B';
		const units : string[] = [ 'B' , 'KB' , 'MB' , 'GB' , 'TB' ];
		const k                = 1024;
		const i : number       = Math.floor( Math.log( bytes ) / Math.log( k ) );
		return parseFloat( ( bytes / Math.pow( k , i ) ).toFixed( 2 ) ) + ' ' + units[ i ];
	}

	static getFileType ( file : File ) : PreviewType {
		const mimeType : string = file.type.toLowerCase();
		if ( mimeType.startsWith( 'image/' ) ) return 'image';
		if ( mimeType.startsWith( 'video/' ) || mimeType.includes( 'application/x-mpegURL' ) || mimeType.includes( 'application/vnd.apple.mpegurl' ) ) return 'video';
		if ( mimeType.startsWith( 'audio/' ) ) return 'audio';
		const extension : string = file.name.split( '.' ).pop()?.toLowerCase();
		return this.getFileTypeFromExtension( extension );
	}

	static getFileTypeFromUrl ( url : string ) : PreviewType {
		try {
			const extension : string = url.split( '.' ).pop()?.toLowerCase();
			return PreviewUtils.isBase64Url( url ) ? "image" : this.getFileTypeFromExtension( extension );
		}
		catch {
			return 'unknown';
		}
	}

	static isBase64Url ( url : string ) : boolean {
		return url.startsWith( 'data:' );
	}

	private static getFileTypeFromExtension ( extension? : string ) : PreviewType {
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

	static normalizeFiles ( input : PreviewFileInput ) : PreviewFile[] {
		const inputArray : PreviewFileInput[] = Array.isArray( input ) ? input : [ input ];
		return inputArray.map( ( item : PreviewFileInput ) : PreviewFile => PreviewUtils.normalizeFile( item ) );
	}

	static normalizeFile ( input : PreviewFileInput ) : PreviewFile {
		if ( PreviewUtils.isPreviewFile( input ) ) {
			return input;
		}

		if ( input instanceof File ) {
			return {
				url          : URL.createObjectURL( input ) ,
				name         : input.name ,
				type         : PreviewUtils.getFileType( input ) ,
				size         : input.size ,
				lastModified : input.lastModified
			};
		}

		if ( typeof input === 'string' ) {
			return {
				url  : input ,
				name : PreviewUtils.getFileNameFromUrl( input ) ,
				type : PreviewUtils.getFileTypeFromUrl( input )
			};
		}
		if ( typeof input === 'object' && 'url' in input ) {
			return {
				url  : input.url as string ,
				name : input.name as string ,
				type : PreviewUtils.getFileTypeFromUrl( input.url as string )
			}
		}

		throw new Error( 'Invalid file input' );
	}

	static isPreviewFile ( input : any ) : input is PreviewFile {
		return typeof input === 'object' && 'url' in input && 'name' in input && 'type' in input;
	}

	static getFileNameFromUrl ( url : string ) : string {
		try {
			const urlObj            = new URL( url );
			const pathname : string = urlObj.pathname;
			const fileName : string = pathname.split( '/' ).pop();
			return fileName || 'unknown';
		}
		catch {
			return 'unknown';
		}
	}

}
