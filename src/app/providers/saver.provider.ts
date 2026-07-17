import { InjectionToken } from '@angular/core';
import { saveAs } from 'file-saver';

export type Saver = ( blob : Blob , filename? : string ) => void;

export const SAVER : InjectionToken<Saver> = new InjectionToken<Saver>( 'saver' );

export function getSaver () : Saver {
	return saveAs;
}