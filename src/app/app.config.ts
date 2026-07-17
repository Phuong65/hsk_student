import { ApplicationConfig , provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';
import { ACCESS_TOKEN_KEY , REFRESH_TOKEN_KEY } from '@env';
import { MatDialog } from '@angular/material/dialog';
import { provideHttpClient , withInterceptors } from '@angular/common/http';
import { APP_SIGNING_DATE , httpSignatureGenerator , ICTU_HTTP_HEADER_PARAM_HANDLER , ICTU_HTTP_SIGNATURE_GENERATOR , IctuHttpHeaderParamHandler } from '@app/providers/httpSignatureGenerator.provider';
import { httpInterceptor } from '@app/interceptor/interceptor';
import { getSaver , SAVER } from '@app/providers/saver.provider';
import { MessageService } from 'primeng/api';
import { APP_REDIRECT_LINKS , createAppRedirectLinks } from '@models/role';
import { provideAnimations } from '@angular/platform-browser/animations';

export function tokenGetter () : string | null {
    return localStorage.getItem( ACCESS_TOKEN_KEY );
}

export function tokenSetter ( access_token : string ) : string {
    localStorage.setItem( ACCESS_TOKEN_KEY , access_token );
    return access_token;
}

export function deleteToken () : void {
    if ( localStorage.getItem( ACCESS_TOKEN_KEY ) ) {
        localStorage.removeItem( ACCESS_TOKEN_KEY );
    }
    if ( localStorage.getItem( REFRESH_TOKEN_KEY ) ) {
        localStorage.removeItem( REFRESH_TOKEN_KEY );
    }
}

export function refreshTokenGetter () : string | null {
    return localStorage.getItem( REFRESH_TOKEN_KEY );
}

export function refreshTokenSetter ( refresh_token : string ) : void {
    return localStorage.setItem( REFRESH_TOKEN_KEY , refresh_token );
}

export const appConfig : ApplicationConfig = {
    providers : [
        provideAnimations() ,
        provideZoneChangeDetection( { eventCoalescing : true } ) ,
        provideRouter( routes ) ,
        { provide : APP_SIGNING_DATE , useValue : 'YYYY-MM-DD HH:mm:00' } ,
        { provide : ICTU_HTTP_HEADER_PARAM_HANDLER , useValue : IctuHttpHeaderParamHandler } ,
        { provide : ICTU_HTTP_SIGNATURE_GENERATOR , useValue : httpSignatureGenerator } ,
        { provide : APP_REDIRECT_LINKS , useFactory : createAppRedirectLinks } ,
        MatDialog ,
        providePrimeNG( {
            theme       : {
                preset  : Aura ,
                options : {
                    darkModeSelector : 'none'
                }
            } ,
            translation : {
                dayNames        : [ 'Chủ nhật' , 'Thứ hai' , 'Thứ ba' , 'Thứ tư' , 'Thứ năm' , 'Thứ sáu' , 'Thứ bảy' ] ,
                dayNamesShort   : [ 'CN' , 'T2' , 'T3' , 'T4' , 'T5' , 'T6' , 'T7' ] ,
                dayNamesMin     : [ 'CN' , 'T2' , 'T3' , 'T4' , 'T5' , 'T6' , 'T7' ] ,
                monthNames      : [ 'Tháng một' , 'Tháng hai' , 'Tháng ba' , 'Tháng tư' , 'Tháng năm' , 'Tháng sáu' , 'Tháng bảy' , 'Tháng tám' , 'Tháng chín' , 'Tháng mười' , 'Tháng mười một' , 'Tháng mười hai' ] ,
                monthNamesShort : [ 'Tháng 1' , 'Tháng 2' , 'Tháng 3' , 'Tháng 4' , 'Tháng 5' , 'Tháng 6' , 'Tháng 7' , 'Tháng 8' , 'Tháng 9' , 'Tháng 10' , 'Tháng 11' , 'Tháng 12' ]
            }
        } ) ,
        MessageService ,
        provideHttpClient( withInterceptors( [ httpInterceptor ] ) ) ,
        { provide : SAVER , useFactory : getSaver }
    ]
};
