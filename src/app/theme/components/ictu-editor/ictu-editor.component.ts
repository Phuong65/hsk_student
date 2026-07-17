import { Component , EventEmitter , forwardRef , Input , input , InputSignal , Output } from '@angular/core';
import { EditorModule , TINYMCE_SCRIPT_SRC } from '@tinymce/tinymce-angular';
import { SharedModule } from '@shared/shared.module';
import { ControlValueAccessor , NG_VALUE_ACCESSOR } from '@angular/forms';
import { TINYMCE_CONFIG } from '@setup/tinymce.config';
import { EditorOptions } from 'tinymce';
import { takeUntilDestroyed , toObservable } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

@Component( {
    selector    : 'ictu-editor' ,
    standalone  : true ,
    imports     : [ EditorModule , SharedModule ] ,
    providers   : [
        {
            provide  : TINYMCE_SCRIPT_SRC ,
            useValue : 'tinymce/tinymce.min.js'
        } ,
        {
            provide     : NG_VALUE_ACCESSOR ,
            useExisting : forwardRef( () : typeof IctuEditorComponent => IctuEditorComponent ) ,
            multi       : true
        }
    ] ,
    templateUrl : './ictu-editor.component.html' ,
    styleUrl    : './ictu-editor.component.css' ,
    host        : {
        class : 'ictu-editor'
    }
} )
export class IctuEditorComponent implements ControlValueAccessor {

    config : InputSignal<Partial<EditorOptions>> = input<Partial<EditorOptions>>( TINYMCE_CONFIG )

    protected initConfig : Partial<EditorOptions> = TINYMCE_CONFIG;

    // -------------------------------------------------------------------------------------------------------------------
    // MODE 1: INPUT MODEL
    // -------------------------------------------------------------------------------------------------------------------
    @Input() set content ( value : string ) {
        this.value = value;
    }

    @Output() contentChange : EventEmitter<string> = new EventEmitter<string>();

    @Output() onEditorBlur : EventEmitter<void> = new EventEmitter<void>();

    value : string = '';

    // value accessor callbacks
    private onChangeFn : ( _ : any ) => void = ( _ : any ) : void => {
    };

    private onTouchedFn : () => void = () : void => {
    };

    constructor () {
        toObservable( this.config ).pipe(
            map( ( settings : Partial<EditorOptions> ) : Partial<EditorOptions> => ( { ... TINYMCE_CONFIG , ... settings } ) ) ,
            takeUntilDestroyed()
        ).subscribe( ( configs : Partial<EditorOptions> ) : void => {
            this.initConfig = configs;
        } );
    }

    writeValue ( value : string ) : void {
        this.value = value || '';
    }

    registerOnChange ( fn : any ) : void {
        this.onChangeFn = fn;
    }

    registerOnTouched ( fn : any ) : void {
        this.onTouchedFn = fn;
    }

    onEditorChange ( content : string ) : void {
        this.value = content;
        this.onChangeFn( content );
        this.onTouchedFn();
        // Mode 1: update Input model
        this.contentChange.emit( content );
    }

    onBlur () : void {
        this.onEditorBlur.next();
        this.onTouchedFn();
    }

    onInit ( event : any ) : void {
        console.log( 'TinyMCE initialized:' , event.editor );
    }
}
