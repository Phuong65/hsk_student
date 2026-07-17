import { Directive , ElementRef , HostListener , OnInit , Renderer2 } from '@angular/core';

@Directive( {
	selector : '[videoAutoFit]'
} )
export class VideoAutoFitDirective implements OnInit {

	@HostListener( 'window:resize' ) onResize () : void {
		this.applySize();
	}

	constructor (
		private el : ElementRef<HTMLVideoElement> ,
		private rd : Renderer2
	) {
	}

	ngOnInit () : void {
		this.rd.setStyle( this.el.nativeElement , 'display' , 'block' );
		this.applySize();
	}

	private applySize () : void {
		const maxWidth : number  = window.innerWidth - 30;
		const maxHeight : number = window.innerHeight - 30;

		// Lấy aspect-ratio từ CSS style (vd: "16/9" hoặc "1/1")
		const style : CSSStyleDeclaration = getComputedStyle( this.el.nativeElement );
		const ratioStr : string           = style.aspectRatio; // dạng "16 / 9"
		let aspectW : number              = 16;
		let aspectH : number              = 9;
		if ( ratioStr && ratioStr.includes( '/' ) ) {
			const [ w , h ] = ratioStr.split( '/' ).map( v => +v.trim() );
			if ( w > 0 && h > 0 ) {
				aspectW = w;
				aspectH = h;
			}
		}
		const ratio : number  = aspectW / aspectH;
		const height : number = maxWidth / ratio;
		const width : number  = Math.min( height , maxHeight ) * ratio;
		this.rd.setStyle( this.el.nativeElement , 'width' , `${ width }px` );
		this.rd.setStyle( this.el.nativeElement , 'objectFit' , 'contain' );
	}
}
