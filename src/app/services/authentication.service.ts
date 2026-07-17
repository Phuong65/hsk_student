import { ApplicationRef , inject , Injectable } from '@angular/core';
import { Helper , HelperClass } from '@utilities/helper';
import dayjs , { Dayjs } from 'dayjs';
import { BehaviorSubject , catchError , filter , firstValueFrom , forkJoin , map , Observable , of , Subject , Subscriber , switchMap , takeUntil , tap } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import weekday from 'dayjs/plugin/weekday';
import { GoogleSignIn , User , UserSignIn } from '@models/user';
import { ARRAY_EMPLOYEE_ROLES , PickRole , SysRoleName } from '@models/role';
import { Dto , IctuQueryCondition } from '@models/dto';
import { JwtHelperService } from '@auth0/angular-jwt';
import * as CryptoJS from 'crypto-js'; // Do not convert to a default import. Pls
import { Permission , Token , UserPermission } from '@models/auth';
import { SystemConfig } from '@models/system-config';
import { ACCESS_TOKEN_KEY , AUTH_OPTIONS , EMPLOYEE_STORAGE_KEY , ENCRYPT_KEY , ENVIRONMENT , getApiRouteLink , IDENTITY_CODE , PERMISSION_STORAGE_KEY , REFRESH_TOKEN_KEY , SHIFT_CODE_KEY , STUDENT_STORAGE_KEY , USER_META_STORAGE_KEY , USER_STORAGE_KEY } from '@env';
import { refreshTokenSetter , tokenGetter , tokenSetter } from '@app/app.config';
import { SysConfigsService } from '@services//sys-configs.service';
import { IctuNavigation , IctuNavigationItemPms } from '@theme/types/navigation';
import { Employee } from '@models/employee';
import { EmployeesService } from '@services/employees.service';
import { Is } from '@utilities/is';
import { HocSinh } from '@models/hoc-sinh';
import { Socket , SocketIoConfig } from 'ngx-socket-io';
import { ManagerOptions } from 'socket.io-client';

interface IdentityStoreData {
	user : User | null,
	employee : Employee | null,
	student : HocSinh | null,
	permission : Permission | null
}

const nullPermission : Permission = Object.freeze( { data : { menus : [] , roles : [] } , nonce : 'nonce-0' } );

export type PickSystemConfig = Pick<SystemConfig , 'config_key' | 'value' | 'params'>

const matchRoute : ( route : string , menu : IctuNavigation ) => boolean = ( route : string , { url } : IctuNavigation ) : boolean => url === route;

const extractPms : ( menu : IctuNavigation ) => IctuNavigationItemPms = ( { pms } : IctuNavigation ) : IctuNavigationItemPms => Object.assign<IctuNavigationItemPms , IctuNavigationItemPms>( [ 0 , 0 , 0 , 0 ] , pms );

interface AuthResponse {
	user : User,
	permissions : Permission,
	employee : Employee,
	student : HocSinh,
	configs : PickSystemConfig[],
}

class AppSocket extends Socket {
	constructor( appRef : ApplicationRef ) {
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
		};
		const url : string            = ENVIRONMENT.deployment.socket.url;
		const config : SocketIoConfig = { url , options };
		super( config , appRef );
	}
}

export interface ResetPasswordInfo {
	token : string,
	password : string,
	password_confirmation : string,
}

@Injectable( {
	providedIn : 'root'
} )
export class AuthenticationService {

	private readonly http : HttpClient = inject( HttpClient );

	private _socket : AppSocket;

	private appRef : ApplicationRef = inject( ApplicationRef );

	private readonly employeesService : EmployeesService = inject( EmployeesService );

	private readonly sysConfigsService : SysConfigsService = inject( SysConfigsService );

	readonly firstDayOfTheWeek : Dayjs;

	private readonly _dayjs : Dayjs;

	readonly helper : HelperClass = Helper;

	private readonly jwtHelperService : JwtHelperService = new JwtHelperService();

	private readonly _key : CryptoJS.lib.WordArray = CryptoJS.enc.Utf8.parse( ENCRYPT_KEY );

	private readonly _iv : CryptoJS.lib.WordArray = CryptoJS.enc.Utf8.parse( ENCRYPT_KEY );

	private readonly observeGetToLoginPage$ : Subject<string> = new Subject<string>();

	private readonly userSetupBehavior : BehaviorSubject<User | null> = new BehaviorSubject<User | null>( null );

	private readonly employeeSetupBehavior : BehaviorSubject<Employee | null> = new BehaviorSubject<Employee | null>( null );

	private readonly studentSetupBehavior : BehaviorSubject<HocSinh | null> = new BehaviorSubject<HocSinh | null>( null );

	private readonly permissionSetupBehavior : BehaviorSubject<Permission | null> = new BehaviorSubject<Permission | null>( null );

	private readonly subjectRequestCheckVersion : Subject<string> = new Subject<string>();

	private readonly observeLastAppVersion : Subject<string> = new Subject<string>();

	private _student : HocSinh | null = null;

	private _employee : Employee | null = null;

	private _user : User | null = null;

	private _permission : Permission | null = nullPermission;

	private _configs : PickSystemConfig[] = [];

	private _options : any[] = [];

	constructor() {
		const stores : IdentityStoreData = this.loadDataFromStores();
		this.employee                    = stores.employee;
		this.user                        = stores.user;
		this.permission                  = stores.permission || nullPermission;
		const apConfigs : string | null  = localStorage.getItem( '__ap_configs' );
		this._configs                    = apConfigs ? JSON.parse( apConfigs ) : [];
		dayjs.extend( weekday );
		this._dayjs            = dayjs();
		this.firstDayOfTheWeek = ( dayjs().weekday() ? dayjs() : dayjs().subtract( 3 , 'day' ) ).weekday( 1 );
		this.requestCheckVersion.asObservable().subscribe( () : void => {
			this.checkVersionAfterRouteChanges();
		} );
		if ( this.userLoggedIn ) {
			this.connectSocket();
		}
	}

	get user() : User | null {
		return this._user;
	}

	set user( user : User | null ) {
		this._user = user;
		this.userSetupBehavior.next( user ? Object.freeze<User>( { ... user } ) : null );
	}

	get employee() : Employee | null {
		return this._employee;
	}

	set employee( employee : Employee | null ) {
		this.employeeSetupBehavior.next( employee ? Object.freeze<Employee>( { ... employee } ) : null );
		this._employee = employee;
	}

	get student() : HocSinh | null {
		return this._student;
	}

	set student( student : HocSinh | null ) {
		this.studentSetupBehavior.next( student ? Object.freeze<HocSinh>( { ... student } ) : null );
		this._student = student;
	}

	get permission() : Permission | null {
		return this._permission;
	}

	set permission( permission : Permission ) {
		this._permission = permission;
		this.permissionSetupBehavior.next( permission ? this.permission : nullPermission );
	}

	getUserPermission( route : string ) : UserPermission {
		const _pms : IctuNavigationItemPms = this.permission?.data?.menus ? this.permission.data.menus.reduce( ( reducer : IctuNavigationItemPms , menu : IctuNavigation ) : IctuNavigationItemPms => {
			if ( matchRoute( route , menu ) ) {
				return extractPms( menu );
			} else if ( menu.child ) {
				return menu.child.reduce( ( childReducer : IctuNavigationItemPms , menuChild : IctuNavigation ) : IctuNavigationItemPms => ( matchRoute( route , menuChild ) ? extractPms( menuChild ) : childReducer ) , reducer );
			}
			return reducer;
		} , [ 0 , 0 , 0 , 0 ] ) : [ 0 , 0 , 0 , 0 ];
		return {
			view   : Boolean( _pms[ 0 ] ) ,
			create : Boolean( _pms[ 1 ] ) ,
			update : Boolean( _pms[ 2 ] ) ,
			delete : Boolean( _pms[ 3 ] )
		};
	}

	get configs() : PickSystemConfig[] {
		return this._configs;
	}

	get identityCode() : string {
		return IDENTITY_CODE + ( this._user?.id.toString( 10 ) || '' );
	}

	get userLoggedIn() : boolean {
		try {
			return !this.jwtHelperService.isTokenExpired( tokenGetter() );
		} catch ( e ) {
			return false;
		}
	}

	get startSessionCode() : string {
		if ( !localStorage.getItem( '--startSessionCode' ) ) {
			this.createStartSessionCode();
		}
		return localStorage.getItem( '--startSessionCode' ) as string;
	}

	get roles() : readonly PickRole[] {
		return this.permission ? this.permission.data.roles : [];
	}

	get userMenu() : IctuNavigation[] {
		return this.permission ? this.permission.data.menus : [];
	}

	userHasRole( roleName : SysRoleName[] ) : boolean {
		return this.roles && this.roles.length ? this.roles.reduce( ( find : boolean , role : PickRole ) : boolean => ( find || roleName.includes( role.name ) ) , false ) : false;
	}

	maxPowerRoleUser() : PickRole | undefined {
		const _maxPowerRoleUse : PickRole | undefined = this.roles.reduce( ( reducer : PickRole | undefined , role : PickRole ) : PickRole | undefined => {
			return reducer ? ( role.ordering < reducer.ordering ? role : reducer ) : role;
		} , undefined );
		return _maxPowerRoleUse ? Object.freeze<PickRole>( { ... _maxPowerRoleUse } ) : undefined;
	}

	get onEmployeeSetup() : Observable<Employee | null> {
		return this.employeeSetupBehavior;
	}

	get onUserSetup() : Observable<User> {
		return this.userSetupBehavior.asObservable().pipe( filter( Boolean ) );
	}

	get onPermissionSetup() : Observable<Permission> {
		return this.permissionSetupBehavior.asObservable().pipe( filter( Boolean ) );
	}

	get onGetToLoginPage() : Observable<string> {
		return this.observeGetToLoginPage$.asObservable();
	}

	get dayjs() : Dayjs {
		return this._dayjs;
	}

	get requestCheckVersion() : Subject<string> {
		return this.subjectRequestCheckVersion;
	}

	get onHasNewAppVersion() : Subject<string> {
		return this.observeLastAppVersion;
	}

	private get options() : any {
		if ( this._options ) {
			return this._options;
		}
		const decrypt : string | null = localStorage.getItem( AUTH_OPTIONS );
		return decrypt ? JSON.parse( this.decrypt( decrypt ) ) : [];
	}

	private set options( options : any ) {
		this._options = options;
		localStorage.setItem( AUTH_OPTIONS , this.encrypt( JSON.stringify( options ) ) );
	}

	setOption( key : string , value : any ) : void {
		const _options : any = this.options;
		_options[ key ]      = value;
		this.options         = _options;
	}

	getOption<T>( key : string , _default? : T ) : T {
		const _options : any = this.options;
		return key in _options ? _options[ key ] : ( _default || null );
	}

	getStoredData<T>( key : string , _default : T ) : T {
		const _encrypted : string | null = localStorage.getItem( key );
		return _encrypted ? JSON.parse( this.decrypt( _encrypted ) ) : _default;
	}

	storeData( key : string , data : any ) : void {
		if ( data ) {
			const _string : string    = typeof data === 'string' ? data : JSON.stringify( data );
			const _encrypted : string = this.encrypt( _string );
			localStorage.setItem( key , _encrypted );
		} else {
			localStorage.removeItem( key );
		}
	}

	encrypt( message : string ) : string {
		let encrypted : CryptoJS.lib.CipherParams = CryptoJS.AES.encrypt(
			message , this._key , {
				keySize : ENCRYPT_KEY.length ,
				iv      : this._iv ,
				mode    : CryptoJS.mode.ECB ,
				padding : CryptoJS.pad.Pkcs7
			} );
		return encrypted.toString();
	}

	decrypt( encrypted : string ) : string {
		return CryptoJS.AES.decrypt(
			encrypted , this._key , {
				keySize : ENCRYPT_KEY.length ,
				iv      : this._iv ,
				mode    : CryptoJS.mode.ECB ,
				padding : CryptoJS.pad.Pkcs7
			} ).toString( CryptoJS.enc.Utf8 );
	}

	customEncrypt( message : string , secretKey : string ) : string {
		let encrypted : CryptoJS.lib.CipherParams = CryptoJS.AES.encrypt( message , secretKey );
		return encrypted.toString();
	}

	customDecrypt( encrypted : string , secretKey : string ) : string {
		const byte : CryptoJS.lib.WordArray = CryptoJS.AES.decrypt( encrypted , secretKey );
		return byte.toString( CryptoJS.enc.Utf8 );
	}

	encryptStringToBase64Url( input : string , secretKey : string = '' ) : string {
		const encryptString : string = secretKey ? this.customEncrypt( input , secretKey ) : input;
		return this.helper.base64URLEncode( encryptString );
	}

	decryptBase64UrlToString( input : string , secretKey : string = '' ) : string {
		const decode : string = input ? this.helper.base64URLDecode( input ) : '';
		return secretKey ? this.customDecrypt( decode , secretKey ) : decode;
	}

	async googleSignIn( signIn : GoogleSignIn ) : Promise<boolean> {
		return this._signIn( signIn , 'GOOGLE' ).then( ( success : boolean ) : boolean => {
			if ( !success ) {
				this.clearSession();
			}
			return success;
		} );
	}

	async signIn( signIn : UserSignIn ) : Promise<boolean> {
		return this._signIn( signIn , 'LOCAL' ).then( ( success : boolean ) : boolean => {
			if ( !success ) {
				this.clearSession();
			}
			return success;
		} );
	}

	loadUserInfo() : Observable<User> {
		return this.http.get<Dto>( getApiRouteLink( 'profile' ) ).pipe( map( ( res : Dto ) : User => Array.isArray( res.data ) ? res.data[ 0 ] : res.data ) );
	}

	clearSession() : void {
		this._user       = null;
		this._employee   = null;
		this._permission = nullPermission;
		localStorage.removeItem( USER_STORAGE_KEY );
		// localStorage.removeItem( MY_SALE_TEAM_STORAGE_KEY );
		localStorage.removeItem( EMPLOYEE_STORAGE_KEY );
		localStorage.removeItem( STUDENT_STORAGE_KEY );
		localStorage.removeItem( USER_META_STORAGE_KEY );
		localStorage.removeItem( ACCESS_TOKEN_KEY );
		localStorage.removeItem( REFRESH_TOKEN_KEY );
		localStorage.removeItem( PERMISSION_STORAGE_KEY );
		localStorage.removeItem( SHIFT_CODE_KEY );
	}

	nonce() : string {
		return localStorage.getItem( '--nonce-code' ) || this.createNonce();
	}

	createNonce() : string {
		const nonce : string = Math.floor( Math.random() * 1000000 ).toString( 10 );
		localStorage.setItem( '--nonce-code' , nonce );
		return nonce;
	}

	private saveEmployee( employee : Employee | null ) : void {
		this.storeData( EMPLOYEE_STORAGE_KEY , employee );
		this.employee = employee;
	}

	private saveStudent( student : HocSinh | null ) : void {
		this.storeData( STUDENT_STORAGE_KEY , student );
		this.student = student;
	}

	/*	private storeMySaleTeam ( mySaleTeam : MySaleTeam ) : void {
	 this._mySaleTeam = mySaleTeam;
	 this.storeData( MY_SALE_TEAM_STORAGE_KEY , mySaleTeam );
	 }

	 set mySaleTeam ( mySaleTeam : MySaleTeam ) {
	 this._mySaleTeam = mySaleTeam;
	 }

	 get mySaleTeam () : MySaleTeam | null {
	 return this._mySaleTeam;
	 }

	 get isSaleTeamLeader () : boolean {
	 return this._user && this._mySaleTeam && this._user.id === this._mySaleTeam.leader_id;
	 }*/

	saveConfigs( configs : PickSystemConfig[] ) : void {
		this._configs = configs;
		localStorage.setItem( '__ap_configs' , JSON.stringify( configs ) );
	}

	/*************************************************
	 * User Object
	 *************************************************/
	updateAvatar( file : File ) : Observable<string | null> {
		const formData : FormData = new FormData();
		formData.append( 'avatar' , file );
		return this.http.post<{ data : string, message : string }>( getApiRouteLink( 'avatar' ) , formData ).pipe(
			map( ( res : { data : string, message : string } ) : string => res.message && this.helper.removeAccents( res.message ) === 'update-avatar-success' && res.data ? res.data : '' ) ,
			tap( ( avatar : string ) : void => {
				if ( avatar && this._user ) {
					const newInfo : User = { ... this._user };
					newInfo[ 'avatar' ]  = avatar;
					void this.saveUser( newInfo );
				}
			} )
		);
	}

	saveUser( user : User ) : void {
		this.createNonce();
		user.avatar = user.avatar ? [ user.avatar.split( '?nonce=' )[ 0 ] , '?nonce=' , this.nonce() ].join( '' ) : [ 'images/user/avatar-' , user.id.toString( 10 ).split( '' ).pop() , '.jpg' ].join( '' );
		this.storeData( USER_STORAGE_KEY , user );
		this.user = user;
	}

	logout() : void {
		this.clearSession();
		this.getToLoginPage();
	}

	forgetPassword( to : string ) : Observable<number> {
		const home_url : string = location.protocol + '//' + location.host;
		const callback : string = location.protocol + '//' + location.host + '/auth/reset-password';
		return this.http.post<number>( getApiRouteLink( 'forget-password' ) , { to , callback , home_url } );
	}

	sendCodeResetPassword( to : string ) : Observable<number> {
		const home_url : string = '';
		const callback : string = '';
		return this.http.post<number>( getApiRouteLink( 'forget-password' ) , { to , callback , home_url } );
	}

	resetPassword( info : ResetPasswordInfo ) : Observable<any> {
		return this.http.post( getApiRouteLink( 'reset-password' ) , info );
	}

	getSysConfigValue( config_key : string , _default : number = 0 ) : number {
		const config : PickSystemConfig | null | undefined = this.configs && Array.isArray( this.configs ) ? this.configs.find( i => i.config_key === config_key ) : null;
		return config ? config.value : _default;
	}

	getConfigParams<T>( config_key : string , _default : T ) : T {
		const config : PickSystemConfig | null | undefined = this.configs && Array.isArray( this.configs ) ? this.configs.find( i => i.config_key === config_key ) : null;
		return ( config ? config.params : _default ) as T;
	}

	/**
	 * isDateInputValid
	 * Check if input string is a valid date
	 * @var input
	 * @var format - the format of input
	 * */
	isDateValid( input : string , format : string = 'DD/MM/YYYY' ) : boolean {
		return dayjs( input , format , true ).isValid();
	}

	formatMoment( date : dayjs.ConfigType , format : dayjs.OptionType = 'DD/MM/YYYY' , strict? : boolean ) : dayjs.Dayjs {
		return dayjs( date , format , strict );
	}

	sqlDateTime2Dayjs( sqlDateTime : string , strict? : boolean ) : dayjs.Dayjs {
		return dayjs( sqlDateTime , 'YYYY-MM-DD HH:mm:ss' , strict ).add( 7 , 'hours' );
	}

	isSqlDateTime( str : string ) : boolean {
		return this.helper.isSqlDateTime( str );
	}

	getFirstDateOfTheWeek( date : dayjs.ConfigType ) : Dayjs {
		const _dayjs : Dayjs = dayjs( date );
		return ( _dayjs.weekday() ? _dayjs : _dayjs.subtract( 3 , 'day' ) ).weekday( 1 );
	}

	private loadDataFromStores() : IdentityStoreData {
		// const mySaleTeam : MySaleTeam | null = this.getStoredData<MySaleTeam | null>( MY_SALE_TEAM_STORAGE_KEY , null );
		const employee : Employee | null     = this.getStoredData<Employee | null>( EMPLOYEE_STORAGE_KEY , null );
		const user : User | null             = this.getStoredData<User | null>( USER_STORAGE_KEY , null );
		const permission : Permission | null = this.getStoredData<Permission | null>( PERMISSION_STORAGE_KEY , null );
		const student : HocSinh | null       = this.getStoredData<HocSinh | null>( STUDENT_STORAGE_KEY , null );
		return { employee , user , permission , student };
	}

	private checkAppVersion() : void {
		const searchParams : URLSearchParams | null = window.location.search ? new URLSearchParams( window.location.search ) : null;
		const hash : number                         = searchParams && searchParams.has( 'hash-code' ) ? parseInt( searchParams.get( 'hash-code' ) as string , 10 ) : NaN;
		const currentTime : number                  = Date.now();
		const fiveMinutes : number                  = ( 5 * 60000 );
		if ( Number.isNaN( hash ) || ( hash < ( currentTime - fiveMinutes ) && hash > ( currentTime + fiveMinutes ) ) ) {
			const currentVersion : number = Number( ENVIRONMENT.appVersion.replace( /\./g , '' ) );
			const latestVersion : number  = this.getSysConfigValue( '__APP_VERSION' , currentVersion );
			if ( currentVersion < latestVersion ) {
				this.forceReload();
			}
		}
	}

	private forceReload() : void {
		const url : URL = new URL( window.location.toString() );
		url.searchParams.set( 'hash-code' , Date.now().toString( 10 ) );
		window.location.assign( url.toString() );
	}

	private async _signIn( signIn : UserSignIn | GoogleSignIn , provider : 'LOCAL' | 'GOOGLE' ) : Promise<boolean> {
		const route : string = provider === 'GOOGLE' ? 'login-google' : 'login';
		return firstValueFrom( this.http.post<Token>( getApiRouteLink( route ) , signIn ).pipe(
			switchMap( ( token : Token ) : Observable<boolean> => this.startSession( token ) ) ,
			catchError( () : Observable<boolean> => of( false ) )
		) );
	}

	private createStartSessionCode() : void {
		localStorage.setItem( '--startSessionCode' , Date.now().toString() );
	}

	public startSession( token : Token ) : Observable<boolean> {
		this.createStartSessionCode();
		this.createNonce();
		this.saveToken( token );
		const loadUser$ : Observable<User>                  = this.loadUserInfo();
		const loadPermissions$ : Observable<Permission>     = this.loadUserPermissions();
		const loadConfigs$ : Observable<PickSystemConfig[]> = this.sysConfigsService.getAppConfigs( 'config_key,value,params' );
		return forkJoin<{
			user : Observable<User>,
			permissions : Observable<Permission>,
			employee : Observable<Employee>,
			student : Observable<HocSinh>,
			configs : Observable<PickSystemConfig[]>,
		}>( {
			user        : loadUser$ ,
			permissions : loadPermissions$ ,
			employee    : of( null ) ,
			student     : of( null ) ,
			configs     : loadConfigs$
		} ).pipe(
			switchMap( ( { user , permissions , configs } : AuthResponse ) : Observable<AuthResponse> => {
				if ( Is.array( permissions.data?.roles ) && -1 !== permissions.data.roles.findIndex( ( _role : PickRole ) : boolean => ARRAY_EMPLOYEE_ROLES.includes( _role.name ) ) ) {
					return this.employeesService.getEmployeeInfo( user ).pipe(
						map( ( employee : Employee ) : AuthResponse => ( { user , permissions , employee , configs , student : null } ) )
					);
				} else {
					return of( { user , permissions , employee : null , configs , student : null } );
				}
			} ) ,
			map( ( { user , permissions , employee , configs , student } : AuthResponse ) : boolean => {
				this.saveUser( user );
				this.savePermissions( permissions );
				this.saveEmployee( employee );
				this.saveStudent( student );
				this.saveConfigs( configs );
				this.connectSocket();
				return true;
			} )
		);
	}

	// private loadSalesTeam ( user : User ) : Observable<MySaleTeam> {
	// 	const conditions : IctuConditionParam[] = [
	// 		{ conditionName : 'leader_id' , condition : IctuQueryCondition.equal , value : user.id.toString( 10 ) } ,
	// 		{ conditionName : 'members' , condition : IctuQueryCondition.like , value : `%${ user.id.toString( 10 ) }%` , orWhere : "or" }
	// 	];
	// 	const queryParams : IctuQueryParams     = {
	// 		select     : 'id,donvi_id,leader_id,name,members,desc,status' ,
	// 		include    : user.donvi_id.toString( 10 ) ,
	// 		include_by : 'donvi_id'
	// 	};
	// 	return this.salesTeamsService.query( conditions , queryParams ).pipe(
	// 		map( ( response : DtoObject<SalesTeam[]> ) : MySaleTeam => response.data.length ? response.data[ 0 ] : null )
	// 	);
	// }

	private loadUserPermissions() : Observable<Permission> {
		return this.http.get<Permission>( getApiRouteLink( 'permission' ) );
	}

	private saveToken( token : Token ) : void {
		if ( token && token.access_token ) {
			tokenSetter( token.access_token );
		}
		if ( token && token.refresh_token ) {
			refreshTokenSetter( token.refresh_token );
		}
	}

	private savePermissions( permission : Permission ) : void {
		/*const baseMenus : IctuNavigation[] = [
		 {
		 id        : 'tai-khoan' ,
		 url       : 'tai-khoan' ,
		 title     : 'Tài khoản' ,
		 customSvg : 'custom-user-bold' ,
		 child     : [
		 {
		 id        : 'tai-khoan/ho-so' ,
		 url       : 'tai-khoan/ho-so' ,
		 title     : 'Thông tin tài khoản' ,
		 customSvg : 'custom-presentation-chart'
		 } ,
		 {
		 id    : 'tai-khoan/label-tc' ,
		 title : 'Tra cứu' ,
		 url   : ''
		 } ,
		 {
		 id    : 'tai-khoan/lich-su-truy-cap' ,
		 title : 'Lịch sử truy cập' ,
		 url   : 'tai-khoan/lich-su-truy-cap'
		 } ,
		 {
		 id    : 'tai-khoan/label-hs' ,
		 title : 'Cập nhật' ,
		 url   : ''
		 } ,
		 {
		 id    : 'tai-khoan/cap-nhat-mat-khau' ,
		 title : 'Cập nhật mật khẩu' ,
		 url   : 'tai-khoan/cap-nhat-mat-khau'
		 } ,
		 {
		 id    : 'tai-khoan/cap-nhat-thong-tin' ,
		 title : 'Cập nhật thông tin' ,
		 url   : 'tai-khoan/cap-nhat-thong-tin'
		 }
		 ]
		 } ,
		 {
		 id        : 'thong-bao' ,
		 url       : 'thong-bao' ,
		 title     : 'Thông báo' ,
		 customSvg : 'custom-notification' ,
		 child     : [
		 {
		 id        : 'thong-bao/thong-ke' ,
		 url       : 'thong-bao/thong-ke' ,
		 title     : 'Thống kê' ,
		 customSvg : 'custom-status-up'
		 } ,
		 {
		 id    : 'thong-bao/label-thong-bao' ,
		 title : 'Thông báo' ,
		 url   : ''
		 } ,
		 {
		 id    : 'thong-bao/danh-sach-thong-bao' ,
		 title : 'Danh sách thông báo' ,
		 url   : 'thong-bao/danh-sach-thong-bao'
		 } ,
		 {
		 id    : 'thong-bao/label-phan-hoi' ,
		 title : 'Phản hồi' ,
		 url   : ''
		 } ,
		 {
		 id    : 'thong-bao/tao-phan-hoi' ,
		 title : 'Tạo phản hồi mới' ,
		 url   : 'thong-bao/tao-phan-hoi'
		 } ,
		 {
		 id    : 'thong-bao/danh-sach-phan-hoi' ,
		 title : 'Danh sách phản hồi' ,
		 url   : 'thong-bao/danh-sach-phan-hoi'
		 }
		 ]
		 }
		 ];*/
		const baseMenus : IctuNavigation[] = [
			{
				id        : 'account' ,
				url       : 'account' ,
				title     : 'Tài khoản' ,
				customSvg : 'custom-user-bold' ,
				child     : [
					{
						id        : 'account/profile' ,
						url       : 'account/profile' ,
						title     : 'Hồ sơ người dùng' ,
						customSvg : 'custom-employee-tag'
					} ,
					{
						id    : 'account/label-tc' ,
						url   : '' ,
						title : 'Tra cứu'
					} ,
					{
						id    : 'account/activities-logs' ,
						url   : 'account/activities-logs' ,
						title : 'Lịch sử truy cập'
					} ,
					{
						id    : 'account/label-hs' ,
						url   : '' ,
						title : 'Cập nhật'
					} ,
					{
						id    : 'account/password' ,
						url   : 'account/password' ,
						title : 'Cập nhật mật khẩu'
					} ,
					{
						id    : 'account/info' ,
						url   : 'account/info' ,
						title : 'Cập nhật thông tin'
					}
				]
			} ,
			{
				id        : 'thong-bao' ,
				url       : 'thong-bao' ,
				title     : 'Thông báo' ,
				customSvg : 'custom-notification' ,
				child     : [
					{
						id        : 'thong-bao/thong-ke' ,
						url       : 'thong-bao/thong-ke' ,
						title     : 'Thống kê' ,
						customSvg : 'custom-status-up'
					} ,
					{
						id    : 'thong-bao/label-thong-bao' ,
						title : 'Thông báo' ,
						url   : ''
					} ,
					{
						id    : 'thong-bao/danh-sach-thong-bao' ,
						title : 'Danh sách thông báo' ,
						url   : 'thong-bao/danh-sach-thong-bao'
					} ,
					{
						id    : 'thong-bao/label-phan-hoi' ,
						title : 'Phản hồi' ,
						url   : ''
					} ,
					{
						id    : 'thong-bao/tao-phan-hoi' ,
						title : 'Tạo phản hồi mới' ,
						url   : 'thong-bao/tao-phan-hoi'
					} ,
					{
						id    : 'thong-bao/danh-sach-phan-hoi' ,
						title : 'Danh sách phản hồi' ,
						url   : 'thong-bao/danh-sach-phan-hoi'
					}
				]
			}
		];
		this.permission                    = {
			nonce : 'nonce-' + Date.now().toString() , data : {
				... permission.data ,
				menus : [ ... permission.data.menus , ... baseMenus ]
			}
		};

		// permission[ 'nonce' ] = 'nonce-' + Date.now().toString();
		this.storeData( PERMISSION_STORAGE_KEY , this.permission );
	}

	private getToLoginPage() : void {
		this.observeGetToLoginPage$.next( 'need get to login page' );
	}

	private checkVersionAfterRouteChanges() : void {
		if ( this.userLoggedIn ) {
			this.sysConfigsService.query<SystemConfig>( [
				{
					conditionName : 'config_key' ,
					condition     : IctuQueryCondition.equal ,
					value         : '__APP_VERSION'
				}
			] , {
				limit  : 1 ,
				select : 'value,title'
			} ).pipe(
				map( ( configs : SystemConfig[] ) : SystemConfig | null => configs.length ? configs[ 0 ] : null ) ).pipe(
				takeUntil( this.subjectRequestCheckVersion.asObservable() )
			).subscribe( ( config : SystemConfig | null ) : void => {
				if ( config ) {
					const currentAppVersion : number = parseInt( ENVIRONMENT.appVersion.replace( /\./gmi , '' ) , 10 );
					if ( currentAppVersion < config.value ) {
						this.observeLastAppVersion.next( config.title );
					}
				}
			} );
		}
	}

	private connectSocket() : void {
		if ( this._socket ) {
			this.disconnectSocket();
		}
		this._socket = new AppSocket( this.appRef );
	}

	disconnectSocket() : void {
		if ( this._socket ) {
			this._socket.disconnect();
			this._socket = undefined;
		}
	}

	get socket() : AppSocket {
		return this._socket;
	}

	listen<T>( event : string ) : Observable<T> {
		return new Observable( ( observer : Subscriber<T> ) : () => AppSocket => {
			if ( this.socket ) {
				this.socket.on( event , ( data : T ) : void => observer.next( data ) );
				return () : AppSocket => this.socket.off( event );
			} else {
				return () : AppSocket => null;
			}
		} );
	}

}
