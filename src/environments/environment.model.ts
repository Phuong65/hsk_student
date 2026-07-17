import { IctuDocumentType , ICTUFileHostingService } from '@models/file';

export type AppLanguage = 'en' | 'vn';

export type EnvironmentDeployProtocolInfo = 'http' | 'https';

export type DeploymentClient = 'ictu';

export interface ApiServiceConfig {
    realm : string,
    port : number,
    title : string,
    googleClientId : string,
    domainName : string,
    protocol : EnvironmentDeployProtocolInfo,
    X_APP_ID : string,
    client : DeploymentClient,
    synchronization_time : number; // the duration time between two synchronization | unit seconds
    privateKey : string,
    enableConstructionMode : boolean,
    enableTestingMode : boolean;
    enableSignInWithGoogle : boolean;
    enableSignInWithMicrosoft : boolean;
    listOfRestrictedFileTypesForDownload : IctuDocumentType[]; // Danh sách các loại tập tin bị hạn chế để tải xuống
    fileHostingService : ICTUFileHostingService;
}

export interface Environment {
    appVersion : string,
    production : boolean,
    deployment : DeploymentEnvironment;
}

interface SocketServiceConfig {
    port : number,
    path : string
}

export interface DeploymentEnvironmentConfigs {
    apiServiceConfig : ApiServiceConfig,
    socketServiceConfig : SocketServiceConfig
}

export class DeploymentEnvironment implements ApiServiceConfig {
    public readonly domainName : string;
    public readonly protocol : EnvironmentDeployProtocolInfo;
    public readonly port : number;
    public readonly realm : string;
    public readonly title : string;
    public readonly googleClientId : string;
    public readonly domain : string;
    public readonly url : string;
    public readonly api : string;
    public readonly fileDir : string;
    public readonly media : string;
    public readonly driverFile : string;
    public readonly aws : string;
    public readonly X_APP_ID : string;
    public readonly client : DeploymentClient;
    public readonly enableSignInWithGoogle : boolean;
    public readonly enableSignInWithMicrosoft : boolean;
    public readonly synchronization_time : number; // the duration time between two synchronization | unit seconds
    public readonly privateKey : string;
    public readonly enableConstructionMode : boolean;
    public readonly enableTestingMode : boolean;
    public readonly listOfRestrictedFileTypesForDownload : IctuDocumentType[]; // Danh sách các loại tập tin bị hạn chế để tải xuống
    public readonly socket : IctuDeclareSocket;
    public readonly fileHostingService : ICTUFileHostingService;

    private readonly configs : ApiServiceConfig;

    constructor ( { apiServiceConfig , socketServiceConfig } : DeploymentEnvironmentConfigs ) {
        const { realm , port , protocol , domainName } : ApiServiceConfig = apiServiceConfig;

        this.configs    = apiServiceConfig;
        this.socket     = new IctuDeclareSocket( domainName , socketServiceConfig );
        this.domain     = `${ protocol }://${ domainName }`;
        this.url        = `${ protocol }://${ domainName }:${ port }/`;
        this.api        = `${ protocol }://${ domainName }:${ port }/${ realm }/api/`;
        this.fileDir    = `${ protocol }://${ domainName }:${ port }/folder/${ realm }/`;
        this.media      = `${ protocol }://${ domainName }:${ port }/${ realm }/api/uploads/`;
        this.driverFile = `${ protocol }://${ domainName }:${ port }/${ realm }/api/driver/`;
        this.aws        = `${ protocol }://${ domainName }:${ port }/${ realm }/api/aws/`;

        return new Proxy( this , {
            get ( target : DeploymentEnvironment , prop : string | symbol , receiver ) {
                if ( prop in target ) {
                    return Reflect.get( target , prop , receiver );
                }
                if ( prop in target.configs ) {
                    return ( target.configs as any )[ prop ];
                }
                return undefined;
            }
        } ) as DeploymentEnvironment & ApiServiceConfig;
    }
}

export class IctuDeclareSocket {

    public readonly path : string;

    private readonly port : number;

    private readonly wss : string;

    constructor ( domainName : string , { port , path } : SocketServiceConfig ) {
        this.wss  = 'wss://' + domainName;
        this.port = port;
        this.path = path;
    }

    public get url () : string {
        return [ this.wss , this.port ].join( ':' );
    }

}
