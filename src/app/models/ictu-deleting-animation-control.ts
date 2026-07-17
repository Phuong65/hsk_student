import { computed , signal , Signal , WritableSignal } from "@angular/core";
import { map , Observable , Subject } from "rxjs";
import { IctuBaseService } from "@models/ictu-base-model";

export class IctuDeletingAnimationControl<T> {
	
	private ids : WritableSignal<number[]> = signal<number[]>( [] );
	
	totalItems : Signal<number>;
	
	percent : Signal<number> = computed( () : number => {
		if ( this.totalItems() <= 0 ) {
			return 0;
		}
		const restIds : number = this.ids().length;
		return 100 - ( ( 100 / this.totalItems() ) * restIds );
	} );
	
	private service : IctuBaseService<T>;
	
	private _progress : Subject<number> = new Subject<number>();
	
	private _observerComplete : Subject<boolean> = new Subject<boolean>();
	
	private _noError : boolean = true;
	
	constructor ( items : number[] , service : IctuBaseService<T> ) {
		this.ids.set( items );
		this.service    = service;
		this.totalItems = signal<number>( items.length );
	}
	
	get progress () : Observable<number> {
		return this._progress.asObservable();
	}
	
	run () : void {
		if ( this.ids().length <= 0 ) {
			this._observerComplete.next( this._noError );
		}
		else {
			this._delete();
		}
	}
	
	private _delete () : void {
		const id : number = this.ids()[ 0 ];
		this.service.delete( id ).pipe(
			map( () : number => {
				this.ids.update( ( items : [] ) : number[] => [ ... items.filter( ( _id : number ) : boolean => _id !== id ) ] );
				return this.percent();
			} )
		).subscribe( {
			next  : ( percent : number ) : void => {
				this._progress.next( percent );
				this.run();
			} ,
			error : () : void => {
				this._noError = false;
				this.ids.update( ( items : [] ) : number[] => [ ... items.filter( ( _id : number ) : boolean => _id !== id ) ] );
				this.run();
			}
		} );
	}
	
	get onComplete () : Observable<boolean> {
		return this._observerComplete.asObservable();
	}
	
}
