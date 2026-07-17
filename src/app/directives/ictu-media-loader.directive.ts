import { Directive , ElementRef , input , InputSignal } from '@angular/core';
import { AwsResponseInfo , ICTUFileHostingService , ICTUStandardFile } from "@models/file";
import { map , Observable , Subject , take , takeUntil } from "rxjs";
import { IctuFileService } from "@services/ictu-file.service";
import { toObservable } from "@angular/core/rxjs-interop";

@Directive( {
	selector : '[ICTUMediaLoader]'
} )
export class IctuMediaLoaderDirective {

	info : InputSignal<Pick<ICTUStandardFile , 'location' | 'name'>> = input.required<Pick<ICTUStandardFile , 'location' | 'name'>>( { alias : 'ICTUMediaLoader' } );

	placeholder : InputSignal<string> = input( "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='500' height='500' viewBox='0 0 500 500'%3E%3Crect width='100%25' height='100%25' fill='%23DDDDDD'/%3E%3Cpath fill='%23999999' d='M107.915 250.465h5.83q2.14 0 3.74-.54 1.59-.53 2.65-1.53 1.06-1.01 1.58-2.44.52-1.44.52-3.21 0-1.68-.52-3.04t-1.56-2.32q-1.05-.96-2.64-1.46-1.6-.51-3.77-.51h-5.83zm-7.8-21.08h13.63q4.2 0 7.28.98 3.07.99 5.07 2.76t2.97 4.23q.97 2.47.97 5.39 0 3.05-1.01 5.59-1.02 2.53-3.05 4.36t-5.08 2.84q-3.06 1.02-7.15 1.02h-5.83v14.76h-7.8zm34.85-1.16h7.17v43.09h-7.17zm30.05 35.4v-5.01q-3.1.14-5.22.53-2.12.4-3.39 1-1.28.61-1.83 1.43-.55.81-.55 1.76 0 1.89 1.11 2.7 1.12.81 2.92.81 2.2 0 3.81-.79 1.61-.8 3.15-2.43m-15.14-15.63-1.28-2.29q5.14-4.7 12.36-4.7 2.61 0 4.67.86t3.48 2.38 2.16 3.64q.74 2.11.74 4.64v18.79h-3.25q-1.02 0-1.57-.3-.55-.31-.87-1.24l-.63-2.14q-1.14 1.01-2.21 1.78t-2.23 1.29-2.48.8q-1.32.27-2.92.27-1.88 0-3.48-.5-1.59-.51-2.75-1.53-1.16-1.01-1.8-2.52t-.64-3.51q0-1.13.38-2.25.38-1.11 1.23-2.13.86-1.01 2.22-1.91t3.35-1.57q1.99-.66 4.63-1.08t6.03-.51v-1.74q0-2.99-1.28-4.42-1.27-1.44-3.68-1.44-1.74 0-2.89.41-1.14.4-2.01.91t-1.58.91q-.71.41-1.58.41-.76 0-1.28-.39t-.84-.92m52.06-2.75-1.89 2.61q-.32.41-.62.64-.31.23-.89.23-.55 0-1.07-.33-.52-.34-1.25-.76-.72-.42-1.72-.75-1-.34-2.48-.34-1.89 0-3.31.69-1.42.68-2.36 1.95-.94 1.28-1.41 3.09-.46 1.81-.46 4.1 0 2.38.51 4.24.5 1.85 1.46 3.12.96 1.26 2.32 1.91t3.07.65 2.77-.42 1.79-.93q.72-.5 1.26-.92.53-.42 1.2-.42.87 0 1.31.66l2.06 2.61q-1.19 1.39-2.59 2.34-1.39.94-2.88 1.51-1.49.56-3.07.79-1.59.23-3.15.23-2.76 0-5.19-1.02-2.44-1.03-4.27-3.01-1.82-1.97-2.88-4.82-1.06-2.86-1.06-6.52 0-3.27.94-6.07.95-2.8 2.77-4.84 1.83-2.05 4.53-3.21 2.69-1.16 6.2-1.16 3.34 0 5.85 1.07 2.5 1.08 4.51 3.08m10.41 7.77h13.51q0-1.39-.39-2.62-.39-1.24-1.18-2.16-.78-.93-1.98-1.47-1.21-.54-2.8-.54-3.1 0-4.89 1.77-1.78 1.77-2.27 5.02m18.27 4.32h-18.42q.18 2.29.81 3.96.64 1.67 1.69 2.76 1.04 1.08 2.48 1.62 1.43.54 3.17.54t3-.41 2.21-.9q.94-.49 1.65-.9.71-.4 1.38-.4.9 0 1.33.66l2.06 2.61q-1.19 1.39-2.67 2.34-1.48.94-3.09 1.51-1.61.56-3.27.79-1.67.23-3.24.23-3.1 0-5.77-1.02-2.67-1.03-4.64-3.05t-3.1-4.99-1.13-6.89q0-3.04.98-5.72.99-2.69 2.83-4.67 1.84-1.99 4.5-3.15 2.65-1.16 5.98-1.16 2.82 0 5.2.9 2.37.9 4.08 2.63 1.72 1.72 2.69 4.23t.97 5.73q0 1.62-.35 2.19-.35.56-1.33.56m14.21-29.11v16.53q1.74-1.63 3.82-2.64 2.09-1.02 4.91-1.02 2.43 0 4.32.83 1.88.82 3.14 2.32 1.26 1.49 1.92 3.57.65 2.07.65 4.56v18.94h-7.16v-18.94q0-2.72-1.25-4.22-1.25-1.49-3.8-1.49-1.86 0-3.48.84t-3.07 2.29v21.52h-7.17v-43.09zm38.71 12.87q3.31 0 6.02 1.07 2.71 1.08 4.64 3.05t2.97 4.81q1.05 2.85 1.05 6.35 0 3.54-1.05 6.39-1.04 2.84-2.97 4.84t-4.64 3.07-6.02 1.07q-3.33 0-6.06-1.07t-4.65-3.07q-1.93-2-2.99-4.84-1.06-2.85-1.06-6.39 0-3.5 1.06-6.35 1.06-2.84 2.99-4.81 1.92-1.97 4.65-3.05 2.73-1.07 6.06-1.07m0 25.14q3.71 0 5.5-2.49 1.78-2.49 1.78-7.31 0-4.81-1.78-7.33-1.79-2.53-5.5-2.53-3.77 0-5.58 2.54t-1.81 7.32q0 4.79 1.81 7.3 1.81 2.5 5.58 2.5m20.24-38.01h7.17v43.09h-7.17zm33.01 34.27v-13.34q-1.22-1.48-2.66-2.08-1.43-.61-3.09-.61-1.62 0-2.93.61-1.3.6-2.23 1.84-.93 1.23-1.42 3.13t-.49 4.48q0 2.61.42 4.42.42 1.82 1.2 2.96.78 1.15 1.92 1.65 1.13.51 2.52.51 2.23 0 3.8-.93 1.56-.93 2.96-2.64m0-34.27h7.16v43.09h-4.38q-1.42 0-1.8-1.31l-.61-2.87q-1.8 2.06-4.13 3.34-2.33 1.27-5.44 1.27-2.43 0-4.46-1.01t-3.5-2.94q-1.46-1.93-2.26-4.77-.8-2.85-.8-6.5 0-3.31.9-6.15t2.58-4.93 4.03-3.26q2.35-1.18 5.28-1.18 2.5 0 4.26.79 1.77.78 3.17 2.11zm19.89 24.79h13.51q0-1.39-.39-2.62-.39-1.24-1.17-2.16-.79-.93-1.99-1.47t-2.8-.54q-3.1 0-4.88 1.77-1.79 1.77-2.28 5.02m18.27 4.32h-18.42q.18 2.29.82 3.96.63 1.67 1.68 2.76 1.04 1.08 2.48 1.62 1.43.54 3.17.54t3.01-.41q1.26-.41 2.2-.9t1.65-.9q.71-.4 1.38-.4.9 0 1.33.66l2.06 2.61q-1.19 1.39-2.67 2.34-1.47.94-3.08 1.51-1.61.56-3.28.79t-3.23.23q-3.11 0-5.78-1.02-2.66-1.03-4.64-3.05-1.97-2.02-3.1-4.99t-1.13-6.89q0-3.04.99-5.72.98-2.69 2.82-4.67 1.85-1.99 4.5-3.15t5.99-1.16q2.81 0 5.19.9t4.09 2.63q1.71 1.72 2.68 4.23t.97 5.73q0 1.62-.35 2.19-.34.56-1.33.56m13.37-13.98.43 3.37q1.4-2.67 3.31-4.19 1.91-1.53 4.52-1.53 2.06 0 3.31.9l-.46 5.37q-.15.52-.42.74-.28.22-.74.22-.44 0-1.29-.15-.86-.14-1.67-.14-1.19 0-2.12.34-.93.35-1.67 1-.74.66-1.3 1.58-.57.93-1.06 2.12v18.33h-7.16v-29.75h4.2q1.1 0 1.54.39.43.39.58 1.4'/%3E%3C/svg%3E" , { alias : 'placeholder' } );

	error : InputSignal<string> = input( "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='500' height='500' viewBox='0 0 500 500'%3E%3Crect width='100%25' height='100%25' fill='%23f8d7da'/%3E%3Cpath fill='%23dc3545' d='M165.38 215.65h-42.69v26.67h33.65v13.76h-33.65v27.2h42.69v14.3h-60.65v-96.16h60.65zm27.73 17.82 1 7.72q3.19-6.12 7.58-9.61t10.37-3.49q4.72 0 7.58 2.06l-1.06 12.3q-.33 1.2-.97 1.7-.63.5-1.69.5-1 0-2.96-.34-1.96-.33-3.82-.33-2.73 0-4.86.8t-3.82 2.29q-1.7 1.5-2.99 3.63-1.3 2.13-2.43 4.85v42.03h-16.43v-68.23h9.65q2.52 0 3.52.9t1.33 3.22m49.61 0 1 7.72q3.19-6.12 7.58-9.61t10.37-3.49q4.72 0 7.58 2.06l-1.06 12.3q-.33 1.2-.97 1.7-.63.5-1.69.5-1 0-2.96-.34-1.96-.33-3.82-.33-2.73 0-4.86.8t-3.82 2.29q-1.7 1.5-3 3.63-1.29 2.13-2.42 4.85v42.03h-16.43v-68.23h9.64q2.53 0 3.53.9t1.33 3.22m65.3-5.18q7.58 0 13.8 2.46t10.64 6.98 6.82 11.04q2.39 6.52 2.39 14.56 0 8.12-2.39 14.63-2.4 6.52-6.82 11.11t-10.64 7.05-13.8 2.46q-7.65 0-13.9-2.46t-10.67-7.05-6.85-11.11q-2.43-6.51-2.43-14.63 0-8.04 2.43-14.56t6.85-11.04 10.67-6.98 13.9-2.46m0 57.65q8.51 0 12.6-5.72t4.09-16.75q0-11.04-4.09-16.83-4.09-5.78-12.6-5.78-8.64 0-12.8 5.81-4.16 5.82-4.16 16.8 0 10.97 4.16 16.72t12.8 5.75m60.72-52.47.99 7.72q3.2-6.12 7.58-9.61 4.39-3.49 10.38-3.49 4.72 0 7.58 2.06l-1.06 12.3q-.34 1.2-.97 1.7t-1.69.5q-1 0-2.96-.34-1.97-.33-3.83-.33-2.72 0-4.85.8t-3.83 2.29q-1.69 1.5-2.99 3.63-1.29 2.13-2.43 4.85v42.03h-16.42v-68.23h9.64q2.53 0 3.53.9.99.9 1.33 3.22'/%3E%3C/svg%3E" , { alias : 'error' } );

	private loadingObserver : Subject<void> = new Subject<void>();

	private fileLoader : Record<ICTUFileHostingService , ( name : string ) => Observable<string>> = {
		aws   : ( name : string ) : Observable<string> => {
			return this.fileService.getLinkDownloadAws( name ).pipe( map( ( response : AwsResponseInfo ) : string => response.data ) );
		} ,
		local : ( name : string ) : Observable<string> => {
			return this.fileService.getFile( name ).pipe( map( ( blob : Blob ) : string => URL.createObjectURL( blob ) ) );
		}
	}

	constructor (
		private elementRef : ElementRef ,
		private fileService : IctuFileService
	) {
		toObservable( this.info ).subscribe( ( info : Pick<ICTUStandardFile , 'location' | 'name'> ) : void => {
			this.loadMedia( info );
		} );
	}

	private loadMedia ( info : Pick<ICTUStandardFile , 'location' | 'name'> ) : void {
		this.loadingObserver.next();
		this.elementRef.nativeElement.parentElement.classList.remove( 'ictu-media--loading' , 'ictu-media--error' , 'ictu-media--loaded' );
		if ( info ) {
			this.elementRef.nativeElement.parentElement.classList.add( 'ictu-media--loading' );
			const { location , name } : Pick<ICTUStandardFile , 'location' | 'name'> = info;
			this.fileLoader[ location ]( name ).pipe(
				takeUntil( this.loadingObserver ) ,
				take( 1 )
			).subscribe( {
				next  : ( link : string ) : void => {
					this.elementRef.nativeElement.setAttribute( 'src' , link );
					this.elementRef.nativeElement.parentElement.classList.remove( 'ictu-media--loading' );
					this.elementRef.nativeElement.parentElement.classList.add( 'ictu-media--loaded' );
				} ,
				error : () : void => {
					this.elementRef.nativeElement.parentElement.classList.remove( 'ictu-media--loading' );
					this.elementRef.nativeElement.parentElement.classList.add( 'ictu-media--error' );
					this.elementRef.nativeElement.setAttribute( 'src' , this.error() )
				}
			} )
		}
		else {
			this.elementRef.nativeElement.setAttribute( 'src' , this.placeholder() )
		}
	}
}
