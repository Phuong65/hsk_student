import { Component , computed , forwardRef , input , InputSignal , model , ModelSignal , Signal , signal , WritableSignal } from '@angular/core';
import { ControlValueAccessor , NG_VALUE_ACCESSOR } from '@angular/forms';
import { IctuDropdownOptionElement } from '@models/ictu-dropdown-option';
import { MatMenu , MatMenuItem , MatMenuTrigger } from '@angular/material/menu';
import { takeUntilDestroyed , toObservable } from '@angular/core/rxjs-interop';

@Component( {
    selector    : 'ictu-custom-mat-menu' ,
    standalone  : true ,
    imports     : [ MatMenuTrigger , MatMenu , MatMenuItem ] ,
    providers   : [ {
        provide     : NG_VALUE_ACCESSOR ,
        useExisting : forwardRef( () : typeof IctuCustomMatMenuComponent => IctuCustomMatMenuComponent ) ,
        multi       : true
    } ] ,
    templateUrl : './ictu-custom-mat-menu.component.html' ,
    styleUrl    : './ictu-custom-mat-menu.component.css'
} )
export class IctuCustomMatMenuComponent implements ControlValueAccessor {

    ngModel : ModelSignal<any> = model<any>();

    options : InputSignal<IctuDropdownOptionElement<any>[]> = input.required<IctuDropdownOptionElement<any>[]>();

    placeholder : InputSignal<string> = input<string>( '' );

    readonly value : WritableSignal<any> = signal( null );

    readonly unSelected : Signal<boolean> = computed( () : boolean => this.value() === null || this.value() === undefined );

    readonly disabled : WritableSignal<boolean> = signal( false );

    readonly label : Signal<string> = computed( () : string => {
        // if ( this.model() ) {
        //     return this.options().find( ( i : IctuDropdownOptionElement<any> ) : boolean => i.value === this.model() )?.label ?? 'unknown';
        // }
        // else {
        //
        // }
        if ( ! this.unSelected() ) {
            return this.options().find( ( i : IctuDropdownOptionElement<any> ) : boolean => i.value === this.value() )?.label ?? 'unknown';
        }
        else {
            return this.placeholder();
        }
    } );

    constructor () {
        toObservable( this.ngModel ).pipe(
            takeUntilDestroyed()
        ).subscribe( ( value : any ) : void => {
            this.writeValue( value );
            this.onChangeFn( value );
            this.onTouchedFn();
        } )
    }

    private onChangeFn : ( _ : any ) => void = ( _ : any ) : void => {
    };

    private onTouchedFn : () => void = () : void => {
    };

    writeValue ( value : any ) : void {
        this.value.set( value );
    }

    registerOnChange ( fn : any ) : void {
        this.onChangeFn = fn;
    }

    registerOnTouched ( fn : any ) : void {
        this.onTouchedFn = fn;
    }

    setDisabledState ( isDisabled : boolean ) : void {
        this.disabled.set( isDisabled );
    }

    protected btnChangeValue ( value : any , event : MouseEvent , menu : MatMenuTrigger ) : void {
        if ( event ) {
            event.preventDefault();
            event.stopPropagation();
            menu.closeMenu();
        }
        this.ngModel.set( value );
    }

    // protected changeAdvanceSearchForm<T extends keyof FormAdvanceSearchFields> ( field : T , value : FormAdvanceSearchFields[T] , event : MouseEvent , menu : MatMenuTrigger ) : void {
    //     if ( event ) {
    //         event.preventDefault();
    //         event.stopPropagation();
    //         menu.closeMenu();
    //     }
    //     this.formAdvanceSearch.controls[ field ].setValue( value );
    // }
}
