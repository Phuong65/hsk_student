import { Component , ElementRef , input , InputSignal , OnDestroy , signal , Signal , viewChild , WritableSignal } from '@angular/core';
import { takeUntilDestroyed , toObservable } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { take } from 'rxjs';

type CircleProgressAnimationEasingFunction = ( x : number ) => number

interface CircleProgressAnimation {
    duration : number,
    easing : CircleProgressAnimationEasingFunction
}

export interface CircleProgressFill {
    color? : string;
    gradient? : ( string | [ string , number ] )[];
    gradientAngle? : number;
    image? : string | HTMLImageElement; // image or src
}

@Component( {
    selector    : 'circle-progress' ,
    standalone  : true ,
    imports     : [] ,
    templateUrl : './circle-progress.component.html' ,
    styleUrl    : './circle-progress.component.css'
} )
export class CircleProgressComponent implements OnDestroy {

    value : InputSignal<number> = input<number>( 0 ); // 0 → 1

    size : InputSignal<number> = input<number>( 100 ); // unit px

    startAngle : InputSignal<number> = input<number>( -Math.PI / 2 ); // -Math.PI / 2 => Góc 12h; -Math.PI => góc 9h

    thickness : InputSignal<number | 'auto'> = input<number | 'auto'>( 'auto' );  // unit px

    emptyFill : InputSignal<string> = input<string>( 'rgba(0,0,0,.1)' );

    reverse : InputSignal<boolean> = input<boolean>( false );

    lineCap : InputSignal<CanvasLineCap> = input<CanvasLineCap>( 'butt' );

    animation : InputSignal<CircleProgressAnimation> = input<CircleProgressAnimation>( {
        duration : 1200 ,
        easing   : this.easeInOutCubic
    } );

    fill : InputSignal<CircleProgressFill> = input<CircleProgressFill>( { gradient : [ '#3aeabb' , '#fdd250' ] } );

    canvasRef : Signal<ElementRef<HTMLCanvasElement>> = viewChild<ElementRef<HTMLCanvasElement>>( 'canvas' );

    private ctx : WritableSignal<CanvasRenderingContext2D> = signal( null );

    private radius : number = 0;

    private arcFill : string | CanvasGradient | CanvasPattern = '#000';

    private lastFrameValue : number = 0;

    private animationId? : number;

    private destroyed : boolean = false;

    constructor () {
        toObservable( this.value ).pipe(
            takeUntilDestroyed() ,
            filter( () : boolean => !! this.ctx() )
        ).subscribe( ( value : number ) : void => {
            const newValue : number = Math.max( 0 , Math.min( 1 , value ) );
            this.initFill();
            this.animateTo( newValue );
        } );

        toObservable( this.canvasRef ).pipe(
            takeUntilDestroyed() ,
            take( 1 )
        ).subscribe( () => {
            this.initCanvas();
            this.initFill();
            this.drawFrame( this.value() );
        } )
    }

    private initCanvas () : void {
        const canvas : HTMLCanvasElement = this.canvasRef().nativeElement;
        const dpr : number               = window.devicePixelRatio || 1;
        canvas.width                     = this.size() * dpr;
        canvas.height                    = this.size() * dpr;
        canvas.style.width               = `${ this.size }px`;
        canvas.style.height              = `${ this.size }px`;

        this.ctx.set( canvas.getContext( '2d' )! );
        this.ctx().scale( dpr , dpr );

        this.radius = this.size() / 2;
    }

    private initFill () : void {
        const ctx : CanvasRenderingContext2D = this.ctx();
        const size : number                  = this.size();
        if ( this.fill().color ) {
            this.arcFill = this.fill().color;
        }
        if ( this.fill().gradient ) {
            const ga : number                                                    = this.fill().gradientAngle ?? 0;
            const gd : [ x0 : number , y0 : number , x1 : number , y1 : number ] = [
                size / 2 * ( 1 - Math.cos( ga ) ) ,
                size / 2 * ( 1 + Math.sin( ga ) ) ,
                size / 2 * ( 1 + Math.cos( ga ) ) ,
                size / 2 * ( 1 - Math.sin( ga ) )
            ];

            const lg : CanvasGradient = ctx.createLinearGradient( ... gd );

            this.fill().gradient.forEach( ( g : string | [ string , number ] , i : number , arr : ( string | [ string , number ] )[] ) : void => {
                let color : string;
                let pos : number = i / ( arr.length - 1 );

                if ( Array.isArray( g ) ) {
                    color = g[ 0 ];
                    pos   = g[ 1 ];
                }
                else {
                    color = g;
                }

                lg.addColorStop( pos , color );
            } );

            this.arcFill = lg;
        }

        if ( this.fill().image ) {
            const img : HTMLImageElement = this.fill().image instanceof HTMLImageElement ? ( this.fill().image as HTMLImageElement ) : new Image();

            if ( typeof this.fill().image === 'string' ) {
                img.src = this.fill().image as string;
            }

            img.onload = () : void => {
                const bg : HTMLCanvasElement = document.createElement( 'canvas' );
                bg.width                     = size;
                bg.height                    = size;
                bg.getContext( '2d' )!.drawImage( img , 0 , 0 , size , size );
                this.arcFill = this.ctx().createPattern( bg , 'no-repeat' )!;
                this.drawFrame( this.lastFrameValue );
            };
        }
    }

    private drawFrame ( v : number ) : void {
        this.lastFrameValue = v;
        this.ctx().clearRect( 0 , 0 , this.size() , this.size() );
        this.drawEmptyArc( v );
        this.drawArc( v );
    }

    private drawArc ( v : number ) : void {
        if ( v <= 0 ) return;
        const ctx : CanvasRenderingContext2D = this.ctx();
        const r : number                     = this.radius;
        const t : number                     = this.getThickness();
        const a : number                     = this.startAngle();
        ctx.beginPath();
        ctx.arc( r , r , r - t / 2 , this.reverse() ? a - Math.PI * 2 * v : a , this.reverse() ? a : a + Math.PI * 2 * v );
        ctx.lineWidth   = t;
        ctx.lineCap     = this.lineCap();
        ctx.strokeStyle = this.arcFill;
        ctx.stroke();
    }

    private drawEmptyArc ( v : number ) : void {
        if ( v >= 1 ) return;
        const ctx : CanvasRenderingContext2D = this.ctx();
        const r : number                     = this.radius;
        const t : number                     = this.getThickness();
        const a : number                     = this.startAngle();

        ctx.beginPath();

        if ( v <= 0 ) {
            ctx.arc( r , r , r - t / 2 , 0 , Math.PI * 2 );
        }
        else {
            ctx.arc( r , r , r - t / 2 , this.reverse() ? a : a + Math.PI * 2 * v , this.reverse() ? a - Math.PI * 2 * v : a );
        }

        ctx.lineWidth   = t;
        ctx.strokeStyle = this.emptyFill();
        ctx.stroke();
    }

    private getThickness () : number {
        return typeof this.thickness() === 'number' ? ( this.thickness() as number ) : this.size() / 14;
    }

    private easeInOutCubic ( x : number ) : number {
        return x < 0.5 ? 4 * x * x * x : 1 - Math.pow( -2 * x + 2 , 3 ) / 2;
    }

    private animateTo ( value : number ) : void {
        if ( ! this.animation() ) {
            this.drawFrame( value );
            return;
        }

        if ( this.animationId ) {
            cancelAnimationFrame( this.animationId );
        }

        const from : number                                  = this.lastFrameValue;
        const to : number                                    = value;
        const duration : number                              = this.animation().duration;
        const easing : CircleProgressAnimationEasingFunction = this.animation().easing;
        const startTime : number                             = performance.now();

        const animate : ( now : number ) => void = ( now : number ) : void => {
            if ( this.destroyed ) return;
            const elapsed : number  = now - startTime;
            const progress : number = Math.min( elapsed / duration , 1 );
            const eased : number    = easing( progress );
            const value : number    = from + ( to - from ) * eased;
            this.drawFrame( value );
            if ( progress < 1 ) {
                this.animationId = requestAnimationFrame( animate );
            }
        };

        this.animationId = requestAnimationFrame( animate );
    }

    ngOnDestroy () : void {
        this.destroyed = true;
        if ( this.animationId ) {
            cancelAnimationFrame( this.animationId );
        }
    }
}
