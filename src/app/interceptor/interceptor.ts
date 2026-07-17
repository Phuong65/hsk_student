import {
	HttpErrorResponse ,
	HttpEvent ,
	HttpHandlerFn ,
	HttpInterceptorFn ,
	HttpRequest ,
	HttpResponse
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError , Observable , of , switchMap , throwError } from 'rxjs';
import { Router } from '@angular/router';
import {
	HttpSignatureGeneratorFn ,
	ICTU_HTTP_SIGNATURE_GENERATOR
} from "@app/providers/httpSignatureGenerator.provider";
import { deleteToken , refreshTokenGetter } from "@app/app.config";
import { Helper } from "@utilities/helper";
import { NotificationService } from "@services//notification.service";
import { RefreshTokenService } from "@services//refresh-token.service";

type IctuHttpHandler = ( request : HttpRequest<unknown> , next : HttpHandlerFn , notification : NotificationService , refreshTokenService : RefreshTokenService , router : Router , httpSignatureGenerator : HttpSignatureGeneratorFn ) => Observable<HttpEvent<any>>

type IctuHttpLimitHandler = ( request : HttpRequest<unknown> , next : HttpHandlerFn , data : any[] ) => Observable<HttpEvent<unknown>>;

interface AppHttpErrorMessage {
	body : string,
	heading : string
}

type ServerResponseCode =
	| 'update_fail'
	| 'create_fail'
	| 'delete_fail'
	| 'auth_fail'
	| 'user_not_found'
	| 'user_disable'
	| 'user_not_exist'
	| 'wrong_password'
	| 'system_error'
	| 'not_exist'
	| 'not_found'
	| 'forbidden'
	| 'unauthorized'
	| 'resume_login_after_5_minutes'
	| 'login_has_been_blocked__please_wait_5_minutes_to_continue_logging_in_'
	| 'messages-cannot-be-deleted-after-1-hour';

const serverResponseCode : Record<ServerResponseCode , string> = {
	'update_fail'                                                           : 'Cập nhật không thành công' ,
	'create_fail'                                                           : 'Tạo mới không thành công' ,
	'delete_fail'                                                           : 'Xóa không thành công' ,
	'auth_fail'                                                             : 'Đăng nhập thất bại' ,
	'user_not_found'                                                        : 'Không tìm thấy người dùng' ,
	'user_disable'                                                          : 'Người dùng đã bị vô hiệu hóa' ,
	'user_not_exist'                                                        : 'Người dùng không tồn tại' ,
	'wrong_password'                                                        : 'Sai mật khẩu' ,
	'system_error'                                                          : 'Lỗi hệ thống' ,
	'not_exist'                                                             : 'Không tồn tại' ,
	'not_found'                                                             : 'Không tìm thấy' ,
	'forbidden'                                                             : 'Cấm truy cập' ,
	'unauthorized'                                                          : 'Không được phép truy cập' ,
	'resume_login_after_5_minutes'                                          : 'Tài khoản của bạn bị khóa trong vòng 5 phút do đăng nhập thất bại quá nhiều lần. Vui lòng đăng nhập lại sau 5 phút nữa.' ,
	'login_has_been_blocked__please_wait_5_minutes_to_continue_logging_in_' : 'Tài khoản của bạn bị khóa trong vòng 5 phút do đăng nhập thất bại quá nhiều lần. Vui lòng đăng nhập lại sau 5 phút nữa.' ,
	'messages-cannot-be-deleted-after-1-hour'                               : 'Tin nhắn không thể xoá sau khi đăng 1 giờ'
};

const errorMap : Map<string , string> = new Map<string , string>( [
	[ 'update_fail' , serverResponseCode.auth_fail ] ,
	[ 'create_fail' , serverResponseCode.create_fail ] ,
	[ 'delete_fail' , serverResponseCode.delete_fail ] ,
	[ 'auth_fail' , serverResponseCode.auth_fail ] ,
	[ 'user_not_found' , serverResponseCode.user_not_found ] ,
	[ 'user_disable' , serverResponseCode.user_disable ] ,
	[ 'user_not_exist' , serverResponseCode.user_not_exist ] ,
	[ 'wrong_password' , serverResponseCode.wrong_password ] ,
	[ 'system_error' , serverResponseCode.system_error ] ,
	[ 'not_exist' , serverResponseCode.not_exist ] ,
	[ 'not_found' , serverResponseCode.not_found ]
] );

const ictuHttpLimitHandler : IctuHttpLimitHandler = ( request : HttpRequest<unknown> , next : HttpHandlerFn , data : any[] ) : Observable<HttpEvent<unknown>> => {
	return next( request ).pipe( switchMap( ( response : HttpEvent<any> ) : Observable<HttpEvent<any>> => {
		if ( response instanceof HttpResponse && response.body.data ) {
			data.push( ... response.body.data );
			if ( response.body.count && response.body.count === 1000 ) {
				const newRequest : HttpRequest<any> = request.clone( { setParams : { paged : response.body[ 'next' ].toString( 10 ) } } );
				return ictuHttpLimitHandler( newRequest , next , data );
			}
			else {
				response.body.data = data;
				return of( response );
			}
		}
		return of( response );
	} ) );
};

const collectHttpErrorMessages : ( res : HttpErrorResponse ) => AppHttpErrorMessage[] = ( res : HttpErrorResponse ) : AppHttpErrorMessage[] => {
	const result : { body : string, heading : string }[] = [];
	// analysis error if it exists in translated list
	if ( res.error[ 'message' ] ) {
		const heading : string = serverResponseCode[ res.error[ 'code' ] as ServerResponseCode ];
		if ( typeof res.error[ 'message' ] === 'string' ) {
			// const messageKey = res.error['message'].toLowerCase().replace( /\s|\.|,/g , '_' );
			// try translate message.
			const body : string = serverResponseCode[ res.error[ 'message' ].toLowerCase().replace( /\s|\.|,/g , '_' ) as ServerResponseCode ] || res.error[ 'message' ];
			result.push( { body , heading } );
		}
		else if ( typeof res.error[ 'message' ] == 'object' && Object.keys( res.error[ 'message' ] ).length ) {
			Object.keys( res.error[ 'message' ] ).forEach( ( key : string ) : void => {
				result.push( { body : res.error[ 'message' ][ key ] , heading } );
			} );
		}
	}
	else if ( errorMap.has( res.error[ 'code' ] ) ) {
		let heading : string = '';
		let body : string    = errorMap.get( res.error[ 'code' ] ) as string;
		if ( res.error[ 'message' ] ) {
			if ( Array.isArray( res.error[ 'message' ] ) ) {
				const _arrMessage : string[] = res.error[ 'message' ] ? Object.values( res.error[ 'message' ] ) : [];
				heading                      = serverResponseCode[ res.error[ 'code' ] as ServerResponseCode ] || res.error[ 'code' ];
				body                         = _arrMessage.map( ( m : string ) : string => serverResponseCode[ Helper.removeAccents( m ) as ServerResponseCode ] || m ).join( '\n' );
			}
			else if ( res.error[ 'message' ] === 'string' ) {
				heading = serverResponseCode[ res.error[ 'code' ] as ServerResponseCode ] || res.error[ 'code' ];
				body    = serverResponseCode[ Helper.removeAccents( res.error[ 'message' ] ) as ServerResponseCode ] || res.error[ 'message' ];
			}
		}
		result.push( { body , heading } );
	}
	return result;
};

export const httpInterceptor : HttpInterceptorFn = ( request : HttpRequest<unknown> , next : HttpHandlerFn ) : Observable<HttpEvent<any>> => {
	const notification : NotificationService                = inject( NotificationService );
	const refreshTokenService : RefreshTokenService         = inject( RefreshTokenService );
	const router : Router                                   = inject( Router );
	const httpSignatureGenerator : HttpSignatureGeneratorFn = inject<HttpSignatureGeneratorFn>( ICTU_HTTP_SIGNATURE_GENERATOR );
	return sendHttpRequest( request , next , notification , refreshTokenService , router , httpSignatureGenerator );
};

const resendHttpRequest : IctuHttpHandler = ( request : HttpRequest<unknown> , next : HttpHandlerFn , notification : NotificationService , refreshTokenService : RefreshTokenService , router : Router , httpSignatureGenerator : HttpSignatureGeneratorFn ) : Observable<HttpEvent<any>> => {
	return sendHttpRequest( request , next , notification , refreshTokenService , router , httpSignatureGenerator );
}

const sendHttpRequest : IctuHttpHandler = ( request : HttpRequest<unknown> , next : HttpHandlerFn , notification : NotificationService , refreshTokenService : RefreshTokenService , router : Router , httpSignatureGenerator : HttpSignatureGeneratorFn ) : Observable<HttpEvent<any>> => {
	return next( httpSignatureGenerator( request ) ).pipe(
		switchMap( ( res : HttpEvent<any> ) : Observable<any> => {
			if ( request.params.has( 'limit' ) && request.params.get( 'limit' )?.toString() === '1000' && res instanceof HttpResponse && res.body.next && res.body.data && res.body.data.length === 1000 ) {
				return ictuHttpLimitHandler( request , next , [] );
			}
			return of( res );
		} ) ,
		catchError( ( res : HttpErrorResponse ) : Observable<never> | Observable<HttpEvent<any>> => {
			if ( res.error instanceof ErrorEvent ) {
				return throwError( () : HttpErrorResponse => res );
			}
			else {
				if ( res.status === 401 ) {
					/*if ( res.error && res.error.message === 'jwt expired' ) {
					 notification.toastInfo( 'Phiên làm việc của bạn đã hết hạn \n vui lòng đang nhập lại' );
					 } else {
					 if ( res.error['code'] === 'unauthorized' ) {
					 notification.toastInfo( isLoginRequest ? 'không được phép' : 'Tài khoản của bạn đã được đăng nhập trên một thiết bị khác' );
					 } else {
					 collectHttpErrorMessages( res ).forEach( ( { body, heading } : AppHttpErrorMessage ) : void => notification.toastError( body, heading ) );
					 }
					 }
					 if ( !router.isActive( '/auth/login', {
					 paths : 'exact',
					 fragment : 'ignored',
					 queryParams : 'ignored',
					 matrixParams : 'ignored'
					 } ) ) {
					 deleteToken();
					 void router.navigate( [ '/auth/login' ] );
					 }*/
					if ( res.error && res.error.message === 'jwt expired' && localStorage.getItem( 'remember_me' ) && refreshTokenGetter() ) {
						return refreshTokenService.refreshToken().pipe(
							switchMap( ( _token : string ) : Observable<HttpEvent<any>> => resendHttpRequest( request , next , notification , refreshTokenService , router , httpSignatureGenerator ) ) ,
							catchError( ( res : HttpErrorResponse ) : Observable<never> => {
								if ( ! ( res.error instanceof ErrorEvent ) && res.status === 403 ) {
									notification.toastError( 'Thời gian ra hạn của phiên đăng nhập đã hết. Hoặc tài khoản của bạn đã được đăng nhập trên một thiết bị khác.' , 'Gian hạn phiên đăng nhập thất bại!' );
									deleteToken();
									void router.navigate( [ '/auth/login' ] );
								}
								// return throwError( () : any => ( { error : new ErrorEvent( 'RefreshTokenFail' ) } )
								// );
								return throwError( () : HttpErrorResponse => res );
							} ) ,
						);
					}
					else if ( res.error[ 'code' ] === 'unauthorized' ) {
						if ( ! router.isActive( '/auth/login' , {
							paths        : 'exact' ,
							fragment     : 'ignored' ,
							queryParams  : 'ignored' ,
							matrixParams : 'ignored'
						} ) ) {
							deleteToken();
							void router.navigate( [ '/auth/login' ] );
							notification.toastInfo( 'Tài khoản của bạn đã được đăng nhập trên một thiết bị khác.' );
							return throwError( () : HttpErrorResponse => res );
						}
					}
					else {
						collectHttpErrorMessages( res ).forEach( ( m : AppHttpErrorMessage ) : void => notification.toastError( m.body , m.heading ) );
						return throwError( () : HttpErrorResponse => res );
					}
				}
				switch ( res.status ) {
					case 0:
						notification.toastError( 'Mất kết nối với máy chủ' );
						break;
					case 404:
						collectHttpErrorMessages( res ).forEach( ( m : AppHttpErrorMessage ) : void => notification.toastError( m.body , m.heading ) );
						break;
					case 403:
						if ( res.url?.endsWith( 'refresh-token' ) ) {
							notification.toastError( 'Thời gian ra hạn của phiên đăng nhập đã hết. Hoặc tài khoản của bạn đã được đăng nhập trên một thiết bị khác.' , 'Gian hạn phiên đăng nhập thất bại!' );
						}
						else {
							collectHttpErrorMessages( res ).forEach( ( m : AppHttpErrorMessage ) : void => notification.toastError( m.body , m.heading ) );
						}
						if ( ! router.isActive( '/auth/login' , {
							paths        : 'exact' ,
							fragment     : 'ignored' ,
							queryParams  : 'ignored' ,
							matrixParams : 'ignored'
						} ) || ( res.error?.message ? Helper.removeAccents( res.error.message ) !== 'invalid-signature' : false ) ) {
							deleteToken();
							void router.navigate( [ '/auth/login' ] );
						}
						break;
					default :
						// avoid duplicate notify
						if ( res.error[ 'code' ] !== 'unauthorized' ) {
							collectHttpErrorMessages( res ).forEach( ( m : AppHttpErrorMessage ) : void => notification.toastError( m.body , m.heading ) );
						}
						break;
				}
				return throwError( () : HttpErrorResponse => res );
			}
		} )
	);
}