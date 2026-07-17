import { Pipe , PipeTransform } from '@angular/core';

@Pipe( {
	name       : 'findInArray' ,
	standalone : true
} )
export class FindInArrayPipe implements PipeTransform {

	transform<T , K extends keyof T>( list : Array<T> , field : K , value : T[K] ) : T | null {
		return list.find( ( elm : T ) : boolean => elm[ field ] === value );
	}

}
