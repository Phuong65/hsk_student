import ZH from "../../assets/i18n/zh.json";
import EN from "../../assets/i18n/en.json";

const LangMapping : Record<string , any> = {
	'zh' : ZH
}
export const I18nUtils                   = {

	get ( locale : string ) : I18nParser {
		return new I18nParser( locale || 'en' )
	} ,

	register ( locale : string , langJson : typeof ZH ) : void {
		LangMapping[ locale ] = langJson;
	}
}

I18nUtils.register( 'en' , EN )

class I18nParser {
	static InstanceMap : Record<string , I18nParser> = {}
	public locale : string                           = 'en';

	constructor ( locale : string ) {
		this.locale = locale
		if ( I18nParser.InstanceMap[ locale ] ) return I18nParser.InstanceMap[ locale ];
		I18nParser.InstanceMap[ locale ] = this
	}

	public t ( key : string , ... args : ( string | number )[] ) : string {
		const translated = I18nParser.getValue( LangMapping[ this.locale ] , key );
		if ( args.length > 0 ) return translated.replace( /\${(\d+)}/g , ( match : any , index : number ) => args[ index ] );
		if ( translated ) return translated
		return key;
	}

	static getValue ( data : Record<string , any> , prop : string | string[] ) : any {
		let ps = Array.isArray( prop ) ? prop : prop.split( '.' );
		try {
			return ps.length == 1 ? data[ ps.shift()! ] : I18nParser.getValue( data[ ps.shift()! ] , ps );
		}
		catch ( e ) {
			return undefined;
		}
	}
}
