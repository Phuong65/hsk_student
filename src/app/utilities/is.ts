// ==========================================================================
// Type checking utils
// ==========================================================================
const getConstructor : ( input : any ) => any | null              = ( input : any ) : any | null => ( input !== null && typeof input !== 'undefined' ? input.constructor : null );
const instanceOf : ( input : any , constructor : any ) => boolean = ( input : any , constructor : any ) : boolean => Boolean( input && constructor && input instanceof constructor );
const isNullOrUndefined : ( input : any ) => boolean              = ( input : any ) : boolean => input === null || typeof input === 'undefined';
const isObject : ( input : any ) => boolean                       = ( input : any ) : boolean => getConstructor( input ) === Object;
const isNumber : ( input : any ) => boolean                       = ( input : any ) : boolean => getConstructor( input ) === Number && ! Number.isNaN( input );
const isString : ( input : any ) => boolean                       = ( input : any ) : boolean => getConstructor( input ) === String;
const isBoolean : ( input : any ) => boolean                      = ( input : any ) : boolean => getConstructor( input ) === Boolean;
const isFunction : ( input : any ) => boolean                     = ( input : any ) : boolean => getConstructor( input ) === Function;
const isArray : ( input : any ) => boolean                        = ( input : any ) : boolean => Array.isArray( input );
const isWeakMap : ( input : any ) => boolean                      = ( input : any ) : boolean => instanceOf( input , WeakMap );
const isNodeList : ( input : any ) => boolean                     = ( input : any ) : boolean => instanceOf( input , NodeList );
const isTextNode : ( input : any ) => boolean                     = ( input : any ) : boolean => getConstructor( input ) === Text;
const isEvent : ( input : any ) => boolean                        = ( input : any ) : boolean => instanceOf( input , Event );
const isKeyboardEvent : ( input : any ) => boolean                = ( input : any ) : boolean => instanceOf( input , KeyboardEvent );
const isCue : ( input : any ) => boolean                          = ( input : any ) : boolean => instanceOf( input , window.TextTrackCue ) || instanceOf( input , window.VTTCue );
const isTrack : ( input : any ) => boolean                        = ( input : any ) : boolean => instanceOf( input , TextTrack ) || ( ! isNullOrUndefined( input ) && isString( input.kind ) );
const isPromise : ( input : any ) => boolean                      = ( input : any ) : boolean => instanceOf( input , Promise ) && isFunction( input.then );

const isElement : ( input : any ) => boolean = ( input : any ) : boolean =>
	input !== null &&
	typeof input === 'object' &&
	input.nodeType === 1 &&
	typeof input.style === 'object' &&
	typeof input.ownerDocument === 'object';

const isEmpty : ( input : any ) => boolean = ( input : any ) : boolean =>
	isNullOrUndefined( input ) ||
	( ( isString( input ) || isArray( input ) || isNodeList( input ) ) && ! input.length ) ||
	( isObject( input ) && ! Object.keys( input ).length );

const isUrl : ( input : any ) => boolean = ( input : any ) : boolean => {
	// Accept a URL object
	if ( instanceOf( input , window.URL ) ) {
		return true;
	}
	
	// Must be string from here
	if ( ! isString( input ) ) {
		return false;
	}
	
	// Add the protocol if required
	let string = input;
	if ( ! input.startsWith( 'http://' ) || ! input.startsWith( 'https://' ) ) {
		string = `http://${ input }`;
	}
	
	try {
		return ! isEmpty( new URL( string ).hostname );
	}
	catch ( e ) {
		return false;
	}
};

type IsFuncName = 'nullOrUndefined' | 'object' | 'number' | 'string' | 'boolean' | 'function' | 'array' | 'weakMap' | 'nodeList' | 'element' | 'textNode' | 'event' | 'keyboardEvent' | 'cue' | 'track' | 'promise' | 'url' | 'empty';

export const Is : { [T in IsFuncName] : ( input : any ) => boolean } = {
	nullOrUndefined : isNullOrUndefined ,
	object          : isObject ,
	number          : isNumber ,
	string          : isString ,
	boolean         : isBoolean ,
	function        : isFunction ,
	array           : isArray ,
	weakMap         : isWeakMap ,
	nodeList        : isNodeList ,
	element         : isElement ,
	textNode        : isTextNode ,
	event           : isEvent ,
	keyboardEvent   : isKeyboardEvent ,
	cue             : isCue ,
	track           : isTrack ,
	promise         : isPromise ,
	url             : isUrl ,
	empty           : isEmpty
};
