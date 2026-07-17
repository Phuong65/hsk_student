import { Component , ComponentRef , Directive , ElementRef , HostListener , Input , OnDestroy , Renderer2 , ViewContainerRef } from "@angular/core";
import { PreviewService } from "../services";

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

@Directive( {
	selector : '[tooltip]' ,
	standalone : true
} )
export class TooltipDirective implements OnDestroy {
	@Input( 'tooltip' ) content! : string;
	@Input() delay : number = 500;

	private tooltip! : HTMLElement;
	private showTimeout? : any;
	private hideTimeout? : any;
	private positions : TooltipPosition[]     = [ 'top' , 'bottom' , 'left' , 'right' ];
	private currentPosition : TooltipPosition = 'top';

	constructor (
		private el : ElementRef ,
		private renderer : Renderer2 ,
		private viewContainer : ViewContainerRef ,
		private previewService : PreviewService
	) {
	}

	@HostListener( 'mouseenter' ) onMouseEnter () : void {
		this.clearTimers();
		this.showTimeout = setTimeout( () : void => this.show() , this.delay );
	}

	@HostListener( 'mouseleave' ) onMouseLeave () : void {
		this.clearTimers();
		this.hideTimeout = setTimeout( () => this.hide() , 100 );
	}

	private show () : void {
		if ( ! this.content ) return;
		if ( ! this.tooltip ) {
			const factory : ComponentRef<TooltipComponent> = this.viewContainer.createComponent( TooltipComponent );
			this.tooltip                                   = factory.location.nativeElement;
			factory.instance.content                       = this.content;
			this.renderer.addClass( this.tooltip , 'visible' );
			this.previewService.modalElement?.querySelector( '.nfp-modal__overlay' ).appendChild( this.tooltip );
			factory.changeDetectorRef.detectChanges()
		}

		const hostRect : DOMRect      = this.el.nativeElement.getBoundingClientRect();
		const tooltipRect : DOMRect   = this.tooltip.getBoundingClientRect();
		const viewportWidth : number  = window.innerWidth;
		const viewportHeight : number = window.innerHeight;

		const spaces : Record<string , number> = {
			top    : hostRect.top ,
			bottom : viewportHeight - ( hostRect.bottom ) ,
			left   : hostRect.left ,
			right  : viewportWidth - ( hostRect.right )
		};

		this.currentPosition = this.positions.reduce( ( best : TooltipPosition , current : TooltipPosition ) : TooltipPosition =>
			spaces[ current ] > spaces[ best ] ? current : best
		);

		this.positions.forEach( ( _position : TooltipPosition ) : void => this.renderer.removeClass( this.tooltip , _position ) );
		this.renderer.addClass( this.tooltip , this.currentPosition );

		let top : number  = 0;
		let left : number = 0;
		switch ( this.currentPosition ) {
			case 'top':
				top  = hostRect.top - tooltipRect.height - 8;
				left = hostRect.left + ( hostRect.width - tooltipRect.width ) / 2;
				break;
			case 'bottom':
				top  = hostRect.bottom + 8;
				left = hostRect.left + ( hostRect.width - tooltipRect.width ) / 2;
				break;
			case 'left':
				top  = hostRect.top + ( hostRect.height - tooltipRect.height ) / 2;
				left = hostRect.left - tooltipRect.width - 8;
				break;
			case 'right':
				top  = hostRect.top + ( hostRect.height - tooltipRect.height ) / 2;
				left = hostRect.right + 8;
				break;
		}

		top  = Math.max( 8 , Math.min( viewportHeight - tooltipRect.height - 8 , top ) );
		left = Math.max( 8 , Math.min( viewportWidth - tooltipRect.width - 8 , left ) );

		this.renderer.setStyle( this.tooltip , 'top' , `${ top }px` );
		this.renderer.setStyle( this.tooltip , 'left' , `${ left }px` );
	}

	private hide () : void {
		if ( this.tooltip ) {
			this.renderer.removeClass( this.tooltip , 'visible' );
			setTimeout( () : void => {
				this.viewContainer.clear()
				this.tooltip = null!
			} , 300 );
		}
	}

	private clearTimers () : void {
		clearTimeout( this.showTimeout );
		clearTimeout( this.hideTimeout );
	}

	ngOnDestroy () : void {
		this.viewContainer.clear();
	}
}

@Component( {
	selector   : 'ngx-file-tooltip' ,
	template   : `{{ content }}` ,
	standalone : true ,
	styles     : [ `
                       :host {
                           position: absolute;
                           background: rgba(0, 0, 0, 0.85);
                           color: #fff;
                           font-size: 14px;
                           padding: 6px 8px;
                           border-radius: 2px;
                           box-shadow: 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 9px 28px 8px rgba(0, 0, 0, 0.05);
                           max-width: 250px;
                           min-height: 24px;
                           word-wrap: break-word;
                           z-index: 999;
                           pointer-events: none;
                           opacity: 0;
                           display: flex;
                           justify-content: center;
                           align-items: center;
                           transform: scale(0.8);
                           transform-origin: center;
                           transition: opacity 0.2s ease-in-out, transform 0.2s ease-in-out;
                       }

                       :host.visible {
                           opacity: 1;
                           transform: scale(1);
                       }

                       :host::after {
                           content: '';
                           position: absolute;
                           width: 0;
                           height: 0;
                           border: 5px solid transparent;
                       }

                       :host.top::after {
                           border-top-color: rgba(0, 0, 0, 0.85);
                           bottom: -10px;
                           left: 50%;
                           transform: translateX(-50%);
                       }

                       :host.bottom::after {
                           border-bottom-color: rgba(0, 0, 0, 0.85);
                           top: -10px;
                           left: 50%;
                           transform: translateX(-50%);
                       }

                       :host.left::after {
                           border-left-color: rgba(0, 0, 0, 0.85);
                           right: -10px;
                           top: 50%;
                           transform: translateY(-50%);
                       }

                       :host.right::after {
                           border-right-color: rgba(0, 0, 0, 0.85);
                           left: -10px;
                           top: 50%;
                           transform: translateY(-50%);
                       }
	               ` ]
} )
export class TooltipComponent {
	@Input() content : string = "";
}
