import { HttpRequest } from "@angular/common/http";
import { inject , InjectionToken } from "@angular/core";
import { tokenGetter } from "@app/app.config";
import { ENVIRONMENT , getHostDomain } from "@env";
import dayjs from "dayjs";
import { crc32 } from "@utilities/crc32";

type IctuHttpHeaderParamHandlerType = Record<IctuHttpHeaderParams , ( request : HttpRequest<unknown> , sign : ( data : string ) => string , appDateForSigning : string ) => string>;

type IctuHttpHeaderParams = 'X-APP-ID' | 'Authorization' | 'x-request-signature';

export type HttpSignatureGeneratorFn = ( request : HttpRequest<unknown> ) => HttpRequest<unknown>;

export const ICTU_HTTP_HEADER_PARAM_HANDLER : InjectionToken<IctuHttpHeaderParamHandlerType> = new InjectionToken<IctuHttpHeaderParamHandlerType>( 'ICTU_HTTP_HEADER_PARAM_HANDLER' );

export const APP_SIGNING_DATE : InjectionToken<string> = new InjectionToken<string>( 'APP_SIGNING_DATE' );

export const ICTU_HTTP_SIGNATURE_GENERATOR = new InjectionToken<HttpSignatureGeneratorFn>( 'ICTU_HTTP_SIGNATURE_GENERATOR' );

export const IctuHttpHeaderParamHandler : IctuHttpHeaderParamHandlerType = {
	'Authorization'       : () : string => ( tokenGetter() ? `Bearer ${ tokenGetter() }` : '' ) ,
	'X-APP-ID'            : () : string => ENVIRONMENT.deployment.X_APP_ID ,
	'x-request-signature' : ( request : HttpRequest<unknown> , sign : ( data : string ) => string , _d : string ) : string => {
		const prefix : string = [ 'POST' , 'PUT' ].includes( request.method.toUpperCase() ) ? JSON.stringify( request.body ?? {} ) : '';
		return sign( prefix + ENVIRONMENT.deployment.X_APP_ID + dayjs().format( _d ) )
	}
}

export const httpSignatureGenerator : HttpSignatureGeneratorFn = ( request : HttpRequest<unknown> ) : HttpRequest<unknown> => {
	const IctuHttpHeaderParamHandler : IctuHttpHeaderParamHandlerType = inject<IctuHttpHeaderParamHandlerType>( ICTU_HTTP_HEADER_PARAM_HANDLER );
	const _d : string                                                 = inject<string>( APP_SIGNING_DATE );
	if ( request && request.url.startsWith( getHostDomain() ) && ! ( request.method === 'GET' && ( new URL( request.url ).pathname.replace( /\//g , '' ) === 'datetime' ) ) ) {
		const setHeaders : {
			[ name : string ] : string
		} = Object.keys( IctuHttpHeaderParamHandler ).reduce( ( reducer : {
			[ name : string ] : string
		} , key : string ) : { [ name : string ] : string } => {
			reducer[ key ] = IctuHttpHeaderParamHandler[ key as IctuHttpHeaderParams ]( request , crc32 , _d )
			return reducer;
		} , {} );
		if ( request.params.has( 'limit' ) && request.params.get( 'limit' )?.toString() === '-1' ) {
			request = request.clone( { setParams : { limit : '1000' } } );
		}
		return request.clone( { setHeaders } );
	}
	return request;
}
