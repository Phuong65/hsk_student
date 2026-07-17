import { Directive , HostListener , input , InputSignal , signal , WritableSignal } from '@angular/core';

@Directive( {
	selector : '[preventDoubleClick]'
} )
export class PreventDoubleClickDirective {

	delay : InputSignal<number> = input( 500 ); // mặc định 500ms

	private isDisabled : WritableSignal<boolean> = signal( false );

	@HostListener( 'click' , [ '$event' ] ) handleClick ( event : Event ) : void {
		if ( this.isDisabled() ) {
			event.stopImmediatePropagation();
			event.preventDefault();
			return;
		}

		this.isDisabled.set( true );

		setTimeout( () : void => {
			this.isDisabled.set( false );
		} , this.delay() );
	}
}
