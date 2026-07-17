import { signal , Signal , WritableSignal } from '@angular/core';
import { map , Observable , of , tap } from 'rxjs';

export interface IctuDropdownOptionElement<T> {
	value : T,
	label : string,
	disabled? : boolean,
}

export interface IctuDropdownOption2<R , V> extends IctuDropdownOptionElement<V> {
	raw : R;
}

export interface IctuDropdownOptionLoader<R , V> {
	loaded : boolean;
	options : IctuDropdownOption2<R , V>[];
}

export interface IctuDropdownOption<T> extends IctuDropdownOptionElement<T> {
	items? : IctuDropdownOptionElement<T>[];
}

export class IctuDropdownField {
	readonly placeholder? : Signal<string>;
	readonly options : WritableSignal<IctuDropdownOption<number>[]>;
	private loaded : boolean;
	private _dirty : boolean;
	private loader : Observable<IctuDropdownOption<number>[]>;

	constructor( loader : Observable<IctuDropdownOption<number>[]> , placeholder? : string ) {
		this.loader      = loader;
		this.placeholder = signal<string>( placeholder || '' );
		this.loaded      = false;
		this._dirty      = false;
		this.options     = signal<IctuDropdownOption<number>[]>( [] );
	}

	public get dirty() : boolean {
		return this._dirty || !this.loaded;
	}

	public markAsDirty() : void {
		this._dirty = true;
	}

	public load() : Observable<IctuDropdownOption<number>[]> {
		console.log( this.dirty );
		return this.dirty ? this.loader.pipe(
			tap( () : void => {
				this.loaded = true;
				this._dirty = false;
			} ) ,
			map( ( options : IctuDropdownOption<number>[] ) : IctuDropdownOption<number>[] => {
				this.options.set( options );
				return options;
			} )
		) : of( this.options() );
	}
}
