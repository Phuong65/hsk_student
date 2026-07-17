import { ApplicationRef , InjectionToken } from '@angular/core';
import { ENVIRONMENT } from '@env';
import { tokenGetter } from '@app/app.config';
import { Socket , SocketIoConfig } from 'ngx-socket-io';
import { ManagerOptions } from 'socket.io-client';

class AppSocket extends Socket {
    constructor ( appRef : ApplicationRef ) {
        const options : Partial<ManagerOptions> | any = {
            reconnection : true ,
            // reconnectionAttempts: 5,
            // reconnectionDelay: 1000,
            autoConnect : true ,
            path        : ENVIRONMENT.deployment.socket.path ,
            transports  : [ 'websocket' , 'polling' ]
        };

        options[ 'auth' ]             = {
            token : tokenGetter() ,
            realm : ENVIRONMENT.deployment.realm
        }
        const url : string            = ENVIRONMENT.deployment.socket.url;
        const config : SocketIoConfig = { url , options }
        super( config , appRef );
    }
}

export class IOnlineSocket {
    readonly session : number;

    constructor () {
        this.session = new Date().getTime();
    }

    private _socket : AppSocket | undefined;

    get socket () : AppSocket | undefined {
        return this._socket;
    }

    online ( appRef : ApplicationRef ) : void {
        this.close();
        this.createNewConnection( appRef );
    }

    close () : void {
        if ( this.socket ) {
            this.socket.disconnect();
            this._socket = undefined;
        }
    }

    private createNewConnection ( appRef : ApplicationRef ) : void {
        this._socket = new AppSocket( appRef );
    }
}

export const ICTU_ONLINE_SOCKET : InjectionToken<IOnlineSocket> = new InjectionToken<IOnlineSocket>( '' );

export const getIOnlineSocketInstance : () => IOnlineSocket = () : IOnlineSocket => new IOnlineSocket();
