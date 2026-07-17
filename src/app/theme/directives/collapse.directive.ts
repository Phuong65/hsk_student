import { Directive , ElementRef , EventEmitter , inject , Input , OnInit , Output } from '@angular/core';

export type CollapseState = 'collapse' | 'open';

export type CollapseDimension = 'width' | 'height';

const MILLISECONDS_MULTIPLIER                                            = 1000;
const TRANSITION_END                                                     = 'transitionend';
const CLASS_NAME_SHOW                                                    = 'show';
const CLASS_NAME_COLLAPSE                                                = 'app-collapse';
const CLASS_NAME_COLLAPSING                                              = 'app-collapsing';
const getTransitionDurationFromElement : ( element : Element ) => number = ( element : Element ) : number => {
	if ( ! element ) {
		return 0;
	}
	
	// Get transition-duration of the element
	let { transitionDuration , transitionDelay } : CSSStyleDeclaration = window.getComputedStyle( element );
	const floatTransitionDuration : number                             = Number.parseFloat( transitionDuration );
	const floatTransitionDelay : number                                = Number.parseFloat( transitionDelay );
	
	// Return 0 if element or transition duration is not found
	if ( ! floatTransitionDuration && ! floatTransitionDelay ) {
		return 0;
	}
	
	// If multiple durations are defined, take the first
	transitionDuration = transitionDuration.split( ',' )[ 0 ];
	transitionDelay    = transitionDelay.split( ',' )[ 0 ];
	return ( Number.parseFloat( transitionDuration ) + Number.parseFloat( transitionDelay ) ) * MILLISECONDS_MULTIPLIER;
};

const triggerTransitionEnd : ( element : Element ) => void = ( element : Element ) : void => {
	element.dispatchEvent( new Event( TRANSITION_END ) );
};

const execute : ( possibleCallback : Function , args? : never[] , defaultValue? : any ) => any = ( possibleCallback : Function , args : never[] = [] , defaultValue : any = possibleCallback ) : any => {
	return typeof possibleCallback === 'function' ? possibleCallback( ... args ) : defaultValue;
};

const executeAfterTransition : ( callback : Function , transitionElement : Element , waitForTransition? : boolean ) => void = ( callback : Function , transitionElement : Element , waitForTransition = true ) : void => {
	if ( ! waitForTransition ) {
		execute( callback );
		return;
	}
	const durationPadding           = 5;
	const emulatedDuration : number = getTransitionDurationFromElement( transitionElement ) + durationPadding;
	let called : boolean            = false;
	const handler : any             = ( { target } : any ) : void => {
		if ( target !== transitionElement ) {
			return;
		}
		called = true;
		transitionElement.removeEventListener( TRANSITION_END , handler );
		execute( callback );
	};
	transitionElement.addEventListener( TRANSITION_END , handler );
	setTimeout( () : void => {
		if ( ! called ) {
			triggerTransitionEnd( transitionElement );
		}
	} , emulatedDuration );
};

@Directive( {
	selector   : '[collapse]' ,
	standalone : true ,
	host       : {
		class : CLASS_NAME_COLLAPSE ,
	}
} )
export class CollapseDirective implements OnInit {
	
	public elementRef : ElementRef<HTMLElement> = inject( ElementRef );
	
	private _dimension : CollapseDimension = 'height';
	
	get dimension () : CollapseDimension {
		return this._dimension;
	}
	
	@Input( { alias : 'collapse' } ) set dimension ( direct : CollapseDimension ) {
		this._dimension = direct;
	}
	
	@Output() collapseState : EventEmitter<CollapseState> = new EventEmitter();
	
	private _state : CollapseState = 'collapse';
	
	private get state () : CollapseState {
		return this._state;
	}
	
	private set state ( state : CollapseState ) {
		this.collapseState.emit( state );
		this._state = state;
	}
	
	private _isTransitioning : boolean = false;
	
	public get isShown () : boolean {
		return this.state === 'open';
	}
	
	private get _element () : HTMLElement {
		return this.elementRef.nativeElement;
	}
	
	public toggle () : void {
		if ( this.isShown ) {
			this.hide();
		}
		else {
			this.show();
		}
	}
	
	public show () : void {
		if ( this._isTransitioning || this.isShown ) {
			return;
		}
		this._isTransitioning               = true;
		const dimension : CollapseDimension = this.dimension;
		this._element.classList.remove( CLASS_NAME_COLLAPSE );
		this._element.classList.add( CLASS_NAME_COLLAPSING );
		this._element.style[ dimension ]                  = '0';
		const complete : () => void                       = () : void => {
			this._isTransitioning = false;
			this._element.classList.remove( CLASS_NAME_COLLAPSING );
			this._element.classList.add( CLASS_NAME_COLLAPSE , CLASS_NAME_SHOW );
			this._element.style[ dimension ] = '';
			this.state                       = 'open';
		};
		const capitalizedDimension : 'Height' | 'Width'   = dimension[ 0 ].toUpperCase() + dimension.slice( 1 ) as 'Height' | 'Width';
		const scrollSize : 'scrollWidth' | 'scrollHeight' = `scroll${ capitalizedDimension }`;
		this._queueCallback( complete , this._element , true );
		this._element.style[ dimension ] = `${ this._element[ scrollSize ] }px`;
	}
	
	public hide () : void {
		if ( this._isTransitioning || ! this.isShown ) {
			return;
		}
		this._isTransitioning               = true;
		const dimension : CollapseDimension = this.dimension;
		this._element.style[ dimension ]    = `${ this._element.getBoundingClientRect()[ dimension ] }px`;
		this._element.classList.add( CLASS_NAME_COLLAPSING );
		this._element.classList.remove( CLASS_NAME_COLLAPSE , CLASS_NAME_SHOW );
		const complete : () => void = () : void => {
			this._isTransitioning = false;
			this._element.classList.remove( CLASS_NAME_COLLAPSING );
			this._element.classList.add( CLASS_NAME_COLLAPSE );
			this.state = 'collapse';
		};
		setTimeout( () : void => {
			this._element.style[ dimension ] = '';
			this._queueCallback( complete , this._element , true );
		} , 50 );
	}
	
	ngOnInit () : void {
		if ( this.isShown ) {
			this._element.classList.add( CLASS_NAME_COLLAPSE , CLASS_NAME_SHOW );
		}
		this.collapseState.emit( this.state );
	}
	
	private _queueCallback ( callback : Function , element : Element , isAnimated : boolean = true ) : void {
		executeAfterTransition( callback , element , isAnimated );
	}
}
