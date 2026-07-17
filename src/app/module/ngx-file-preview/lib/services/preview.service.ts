import { ApplicationRef , ComponentRef , createComponent , EnvironmentInjector , inject , Injectable , Injector } from '@angular/core';
import { PreviewFile , PreviewOptions } from '../types/preview.types';
import { BehaviorSubject , Observable , Subject } from 'rxjs';
import { PreviewModalComponent } from '../components';
import { ThemeService } from "./theme.service";
import { I18nUtils } from "../i18n/i18n.utils";

export const INITIAL_PREVIEW_STATE = {
	isVisible    : false ,
	currentIndex : 0 ,
	files        : []
}

export interface PreviewState {
	isVisible : boolean;
	currentFile? : PreviewFile;
	currentIndex : number;
	files : PreviewFile[];
}

@Injectable()
export class PreviewService {
	private injector! : Injector;
	private envInjector! : EnvironmentInjector;
	private appRef : ApplicationRef            = inject( ApplicationRef )
	private lang : string                      = 'zh';
	private loading : BehaviorSubject<boolean> = new BehaviorSubject( false );

	init ( injector : Injector , envInjector : EnvironmentInjector ) : void {
		this.envInjector = envInjector;
		this.injector    = injector;
	}

	setLang ( lang : string ) : void {
		this.lang = lang;
	}

	getLangParser () {
		return I18nUtils.get( this.lang )
	}

	readonly stateSubject : BehaviorSubject<PreviewState> = new BehaviorSubject<PreviewState>( INITIAL_PREVIEW_STATE );

	readonly onClosePanel : Subject<void> = new Subject<void>();

	get state () : PreviewState {
		return this.stateSubject.getValue();
	}

	getStateObservable () : Observable<PreviewState> {
		return this.stateSubject.asObservable();
	}

	previous () : void {
		const state : PreviewState = this.state;
		const newIndex : number    = Math.max( 0 , state.currentIndex - 1 );
		this.updatePreviewState( true , state.files , newIndex );
	}

	next () : void {
		const state : PreviewState = this.state;
		const newIndex : number    = Math.min( state.files.length - 1 , state.currentIndex + 1 );
		this.updatePreviewState( true , state.files , newIndex );
	}

	private updatePreviewState ( isVisible : boolean , files : PreviewFile[] , index : number ) : void {
		const currentFile : PreviewFile = files[ index ];
		this.stateSubject.next( { isVisible , currentFile , currentIndex : index , files } );
	}

	setLoading ( loading : boolean ) : void {
		this.loading.next( loading );
	}

	getLoadingObservable () : Observable<boolean> {
		return this.loading.asObservable();
	}

	private modalRef? : ComponentRef<PreviewModalComponent>;

	get modalElement () : any {
		return this.modalRef?.location.nativeElement
	}

	open ( options : PreviewOptions ) : void {
		const { files , index = 0 } = options;
		if ( this.modalRef ) {
			this.cleanupModal()
		}
		try {
			this.modalRef = createComponent( PreviewModalComponent , {
				environmentInjector : this.envInjector ,
				elementInjector     : this.injector
			} );
			Object.assign( this.modalRef.instance , options )
			this.injector.get( ThemeService ).bindElement( this.modalRef.location.nativeElement )
			document.body.appendChild( this.modalRef.location.nativeElement );
			this.modalRef.changeDetectorRef.detectChanges();
			this.updatePreviewState( true , files , index );
			this.appRef.attachView( this.modalRef.hostView );
		}
		catch ( error ) {
			console.error( 'Error creating preview-list modal:' , error );
			this.cleanupModal();
		}
	}

	close () : void {
		if ( document.fullscreenElement ) {
			void document?.exitFullscreen();
		}
		this.updatePreviewState( false , [] , 0 );
		this.cleanupModal();
		this.onClosePanel.next();
	}

	private cleanupModal () : void {
		if ( ! this.modalRef ) return;
		try {
			const element : HTMLElement = this.modalRef.location.nativeElement;
			if ( element.parentNode ) {
				element.parentNode.removeChild( element );
			}
			this.appRef.detachView( this.modalRef.hostView );
			this.modalRef.destroy();
		}
		catch ( error ) {
			console.error( 'Error cleaning up modal:' , error );
		}
		finally {
			this.modalRef = undefined;
		}
	}
}
