import { forkJoin , Observable } from "rxjs";

export type ObservableProps<T> = {
	[K in keyof T] : Observable<T[K]>;
};

export function joinSources<T> ( sources : ObservableProps<T> ) : Observable<T> {
	return forkJoin( sources );
}