import { Component , computed , forwardRef , input , InputSignal , OnDestroy , Signal , signal , WritableSignal } from '@angular/core';
import { ControlValueAccessor , NG_VALUE_ACCESSOR , ReactiveFormsModule } from '@angular/forms';
import { debounceTime , Subject } from 'rxjs';
import { v4 as uuid4 } from 'uuid';
import { SharedModule } from '@shared/shared.module';
import { NgClass } from '@angular/common';
import { animate , state , style , transition , trigger } from '@angular/animations';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { distinctUntilChanged } from 'rxjs/operators';

type ISCLabelPosition = 'left' | 'right';

@Component( {
    selector    : 'ictu-switch-control' ,
    imports     : [ ReactiveFormsModule , SharedModule , NgClass ] ,
    standalone  : true ,
    providers   : [ {
        provide     : NG_VALUE_ACCESSOR ,
        useExisting : forwardRef( () : typeof IctuSwitchControlComponent => IctuSwitchControlComponent ) ,
        multi       : true
    } ] ,
    animations  : [
        trigger( 'toggleKnob' , [
            state( 'off' , style( {
                transform : 'translateX(0)'
            } ) ) ,
            state( 'on' , style( {
                transform : 'translateX(14px)'
            } ) ) ,
            transition( 'off <=> on' , animate( '200ms ease-in-out' ) )
        ] ) ,
        trigger( 'toggleBg' , [
            state( 'off' , style( {
                backgroundColor : '#cbd5e0'
            } ) ) ,
            state( 'on' , style( {
                backgroundColor : '#227aff'
            } ) ) ,
            transition( 'off <=> on' , animate( '150ms ease-in-out' ) )
        ] )
    ] ,
    templateUrl : './ictu-switch-control.component.html' ,
    styleUrl    : './ictu-switch-control.component.css'
} )
export class IctuSwitchControlComponent implements ControlValueAccessor , OnDestroy {

    private destroyed$ : Subject<void> = new Subject<void>();

    description : InputSignal<string> = input<string>( '' );

    label : InputSignal<string> = input<string>( '' );

    labelCssClass : InputSignal<string> = input<string>( 'f-14 f-roboto lh-base fw-medium' );

    labelPosition : InputSignal<ISCLabelPosition> = input<ISCLabelPosition>( 'left' );

    readonly value : WritableSignal<number> = signal( 0 );

    readonly disabled : WritableSignal<boolean> = signal( false );

    readonly className : Signal<string> = computed( () : string => {
        const _classes : string[] = [ 'ictu-switch-control' , `ictu-switch-control--${ this.labelPosition() }` ];
        if ( this.disabled() ) {
            _classes.push( 'ictu-switch-control--disabled' )
        }
        return _classes.join( ' ' );
    } );

    readonly inputID : string = uuid4();

    readonly animationName : Signal<string> = computed( () : string => {
        return this.value() === 1 ? 'on' : 'off';
    } );

    private session : number = 0;

    private observerChangeValue : Subject<number> = new Subject<number>();

    constructor () {
        this.observerChangeValue.asObservable().pipe(
            takeUntilDestroyed() ,
            debounceTime( 100 ) ,
            distinctUntilChanged()
        ).subscribe( () : void => {
            this.toggle();
        } )
    }

    writeValue ( value : number | string ) : void {
        this.value.set( Number( value ) );
    }

    private onChange : ( _ : any ) => void = ( _ : any ) : void => {
    };

    private onTouched : () => void = () : void => {
    };

    registerOnChange ( fn : any ) : void {
        this.onChange = fn;
    }

    registerOnTouched ( fn : any ) : void {
        this.onTouched = fn;
    }

    setDisabledState ( disabled : boolean ) : void {
        this.disabled.set( disabled );
    }

    btnToggle () : void {
        this.observerChangeValue.next( this.session );
    }

    private toggle () : void {
        if ( this.disabled() ) {
            this.session += 1;
            return;
        }
        this.value.update( ( value : number ) : number => value === 1 ? 0 : 1 );
        this.onChange( this.value() );
        this.onTouched();
        this.session += 1;
    }

    ngOnDestroy () : void {
        this.destroyed$.next();
        this.destroyed$.complete();
    }
}
