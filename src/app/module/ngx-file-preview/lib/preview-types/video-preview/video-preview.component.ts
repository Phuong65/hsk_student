import { AfterViewInit , ChangeDetectionStrategy , Component , ElementRef , input , InputSignal , OnDestroy , OnInit , Signal , viewChild , ViewChild } from '@angular/core';

import { PreviewIconComponent } from '@module/ngx-file-preview/lib/components/preview-icon';
import Hls from 'hls.js';
import { FileReaderResponse } from "../../services";
import { I18nPipe } from "../../i18n";
import { BasePreviewComponent } from "@module/ngx-file-preview/lib/preview-types";
import { Observable , Subject , takeUntil } from "rxjs";
import { AutoThemeConfig , PreviewFile , ThemeMode } from "@module/ngx-file-preview";
import { toObservable } from "@angular/core/rxjs-interop";
import { filter } from "rxjs/operators";

@Component( {
	selector        : 'ngx-video-preview' ,
	standalone      : true ,
	imports: [PreviewIconComponent, I18nPipe] ,
	template        : `
		<div #videoContainer [class.pip-mode]="isPiPMode" class="video-container">
			<video #videoPlayer (click)="togglePlay()" (ended)="onVideoEnded()" (loadeddata)="onVideoLoad()" (pause)="onVideoPause()" (timeupdate)="onTimeUpdate()"></video>
			<div (mouseleave)="hideControls()" (mouseover)="showControls()" [class.visible]="isControlsVisible" class="controls">
				<div (mousedown)="startDragging($event)" class="progress-bar">
					<div [style.width.%]="progress" class="progress"></div>
				</div>
				<div class="bottom-controls">
					<div class="left-controls">
						<button (click)="togglePlay()">
							<preview-icon [name]="isPlaying ? 'pause' : 'play'" [title]="(isPlaying ? 'preview.toolbar.pause' : 'preview.toolbar.play')|i18n"></preview-icon>
						</button>
						<button (click)="back15s()">
							<preview-icon [title]="'preview.toolbar.back15s'|i18n" name="back15s"></preview-icon>
						</button>
						<button (click)="forward15s()">
							<preview-icon [title]="'preview.toolbar.forward15s'|i18n" name="forward15s"></preview-icon>
						</button>
						<span class="time">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>
					</div>
					<div class="right-controls">
						<div (mouseenter)="showSpeedControl = true" (mouseleave)="showSpeedControl = false" class="speed-control">
							<button>
								{{ playbackSpeed }}x
							</button>
							@if (showSpeedControl) {
								<div class="speed-options">
									@for (speed of playbackSpeeds; track speed) {
										<button (click)="setPlaybackSpeed(speed)" [class.active]="playbackSpeed === speed">{{ speed }}x</button>
									}
								</div>
							}
						</div>
						<div (mouseenter)="showBrightnessControl = true" (mouseleave)="showBrightnessControl = false" class="control-group">
							<button (click)="cycleBrightness()">
								<preview-icon [name]="'lightness'"></preview-icon>
							</button>
							@if (showBrightnessControl) {
								<div class="slider-container">
									<input (input)="adjustBrightness($event)" [value]="brightness" max="200" min="0" type="range">
								</div>
							}
						</div>
						<div (mouseenter)="showVolumeControl = true" (mouseleave)="showVolumeControl = false" class="control-group">
							<button (click)="cycleVolume()">
								<preview-icon [name]="getVolumeIcon()"></preview-icon>
							</button>
							@if (showVolumeControl) {
								<div class="slider-container">
									<input (input)="adjustVolume($event)" [value]="volume * 100" max="100" min="0" type="range">
								</div>
							}
						</div>
						<button (click)="togglePip()">
							<preview-icon [title]="'preview.toolbar.pip'|i18n" name="pip"></preview-icon>
						</button>
						<button (click)="toggleFullscreen()">
							<preview-icon [title]="'preview.toolbar.fullscreen'|i18n" name="fullscreen"></preview-icon>
						</button>
					</div>
				</div>
			</div>
		</div>
	` ,
	styleUrls       : [ "../../styles/_theme.scss" , "video-preview.component.scss" ] ,
	changeDetection : ChangeDetectionStrategy.OnPush
} )
export class VideoPreviewComponent extends BasePreviewComponent implements OnInit , AfterViewInit , OnDestroy {



	private readonly videoPlayer : Signal<ElementRef<HTMLVideoElement>> = viewChild<ElementRef<HTMLVideoElement>>( 'videoPlayer' )

	@ViewChild( 'videoContainer' ) videoContainer! : ElementRef<HTMLDivElement>;

	private hls? : Hls;

	isPlaying : boolean = false;

	currentTime : number = 0;

	duration : number = 0;

	progress : number = 0;

	volume : number = 1;

	previousVolume : number = 1;

	brightness : number = 100;

	isPiPMode : boolean = false;

	isControlsVisible : boolean = true;

	showVolumeControl : boolean = false;

	showBrightnessControl : boolean = false;

	controlsTimeout : any;

	isMuted : boolean = false;

	playbackSpeed : number = 1;

	playbackSpeeds : number[] = [ 0.75 , 1 , 1.5 , 2.0 , 3.0 , 5.0 ];

	showSpeedControl : boolean = false;

	isDragging : boolean = false;

	private destroy$ : Subject<void> = new Subject();

	private fileChanges : Observable<PreviewFile> = toObservable( this.file );

	ngOnInit () : void {
		this.startLoading();
		this.cdr.markForCheck();

		this.fileChanges.pipe(
			filter( ( file : PreviewFile ) : boolean => !! file ) ,
			takeUntil( this.destroy$ )
		).subscribe( () : void => {
			void this.loadFile( 'text' )
		} )
	}

	ngAfterViewInit () : void {
		this.setupVideo();
	}

	onVideoLoad () : void {
		this.stopLoading()
		this.duration = this.videoPlayer().nativeElement.duration;
		this.cdr.markForCheck();
	}

	private setupVideo () : void {
		const video : HTMLVideoElement = this.videoPlayer().nativeElement;
		const url : string             = this.file().url;

		if ( this.isHLSVideo( url ) ) {
			this.setupHLS( video , url );
		}
		else {
			video.src = url;
		}
	}

	togglePlay () : void {
		const video : HTMLVideoElement = this.videoPlayer().nativeElement;
		if ( video.paused ) {
			video.play().then( () : void => {
				this.isPlaying = true;
				this.cdr.markForCheck();
			} ).catch( ( error : any ) : void => {
				console.error( 'Playback failed:' , error );
				this.isPlaying = false;
				this.cdr.markForCheck();
			} );
		}
		else {
			video.pause();
			this.isPlaying = false;
			this.cdr.markForCheck();
		}
	}

	private isHLSVideo ( url : string ) : boolean {
		return url.toLowerCase().includes( '.m3u8' ) || url.includes( 'application/x-mpegURL' ) || url.includes( 'application/vnd.apple.mpegurl' );
	}

	onTimeUpdate () : void {
		const video : HTMLVideoElement = this.videoPlayer().nativeElement;
		this.currentTime               = video.currentTime;
		this.progress                  = ( video.currentTime / video.duration ) * 100;
	}

	adjustVolume ( event : Event ) : void {
		const value : number = +( event.target as HTMLInputElement ).value;
		this.volume          = value / 100;
		this.isMuted         = this.volume === 0;
		if ( this.volume > 0 ) {
			this.previousVolume = this.volume;
		}
		this.videoPlayer().nativeElement.volume = this.volume;
		this.cdr.markForCheck();
	}

	adjustBrightness ( event : Event ) : void {
		this.brightness                             = +( event.target as HTMLInputElement ).value;
		this.videoPlayer().nativeElement.style.filter = `brightness(${ this.brightness }%)`;
		this.cdr.markForCheck();
	}

	async togglePip () : Promise<void> {
		if ( ! document.pictureInPictureElement ) {
			try {
				await this.videoPlayer().nativeElement.requestPictureInPicture();
				this.isPiPMode = true;
			}
			catch ( error ) {
				console.error( 'Picture-in-picture mode is not supported:' , error );
			}
		}
		else {
			await document.exitPictureInPicture();
			this.isPiPMode = false;
		}
	}

	private setupHLS ( video : HTMLVideoElement , url : string ) : void {
		if ( Hls.isSupported() ) {
			this.hls = new Hls( {
				debug                 : false ,
				enableWorker          : true ,
				capLevelToPlayerSize  : true ,
				startLevel            : -1 ,
				abrMaxWithRealBitrate : true
			} );

			this.hls.loadSource( url );
			this.hls.attachMedia( video );

			this.hls.on( Hls.Events.MANIFEST_PARSED , () : void => {
				video.play().catch( () : void => {
					console.log( 'Autoplay prevented' );
				} );
			} );

			this.hls.on( Hls.Events.ERROR , ( event , data ) => {
				if ( data.fatal ) {
					console.error( 'HLS error:' , data );
				}
			} );
		}
		else if ( video.canPlayType( 'application/vnd.apple.mpegurl' ) ) {
			// Safari
			video.src = url;
		}
	}

	protected override async handleFileContent ( content : FileReaderResponse ) : Promise<void> {
	}

	toggleFullscreen () : void {
		const video : HTMLDivElement = this.videoContainer.nativeElement;
		if ( ! document.fullscreenElement ) {
			void video.requestFullscreen();
		}
		else {
			void document.exitFullscreen();
		}
	}

	showControls () : void {
		this.isControlsVisible = true;
		clearTimeout( this.controlsTimeout );
	}

	hideControls () : void {
		this.controlsTimeout = setTimeout( () : void => {
			if ( this.isPlaying ) {
				this.isControlsVisible = false;
				this.cdr.markForCheck();
			}
		} , 2000 );
	}

	back15s () : void {
		this.videoPlayer().nativeElement.currentTime -= 15;
	}

	forward15s () : void {
		this.videoPlayer().nativeElement.currentTime += 15;
	}

	seek ( event : MouseEvent ) : void {
		const progressBar    = event.currentTarget as HTMLElement;
		const rect : DOMRect = progressBar.getBoundingClientRect();
		const pos : number   = ( event.clientX - rect.left ) / rect.width;
		if ( pos >= 0 && pos <= 1 ) {
			const video : HTMLVideoElement = this.videoPlayer().nativeElement;
			video.currentTime              = pos * video.duration;
			this.progress                  = pos * 100;
			this.cdr.markForCheck();
		}
	}

	startDragging ( event : MouseEvent ) : void {
		this.isDragging = true;
		this.seek( event );
		document.addEventListener( 'mousemove' , this.onGlobalDrag );
		document.addEventListener( 'mouseup' , this.stopDragging );
	}

	private onGlobalDrag : ( event : MouseEvent ) => void = ( event : MouseEvent ) : void => {
		if ( this.isDragging ) {
			const progressBar = this.videoPlayer().nativeElement.parentElement?.querySelector( '.progress-bar' );
			if ( progressBar ) {
				const rect : DOMRect           = progressBar.getBoundingClientRect();
				const pos : number             = Math.max( 0 , Math.min( 1 , ( event.clientX - rect.left ) / rect.width ) );
				const video : HTMLVideoElement = this.videoPlayer().nativeElement;
				video.currentTime              = pos * video.duration;
				this.progress                  = pos * 100;
				this.cdr.markForCheck();
			}
		}
	}

	stopDragging : () => void = () : void => {
		if ( this.isDragging ) {
			this.isDragging = false;
			document.removeEventListener( 'mousemove' , this.onGlobalDrag );
			document.removeEventListener( 'mouseup' , this.stopDragging );
		}
	}

	cycleVolume () : void {
		if ( this.volume > 0 ) {
			this.previousVolume = this.volume;
			this.volume         = 0;
			this.isMuted        = true;
		}
		else {
			this.volume  = this.previousVolume;
			this.isMuted = false;
		}
		this.videoPlayer().nativeElement.volume = this.volume;
		this.cdr.markForCheck();
	}

	getVolumeIcon () : string {
		if ( this.volume === 0 ) return 'mute';
		return 'volume';
	}

	cycleBrightness () : void {
		const levels : number[]                     = [ 0 , 100 , 200 ];
		const currentIndex : number                 = levels.indexOf( this.brightness );
		const nextIndex : number                    = ( currentIndex + 1 ) % levels.length;
		this.brightness                             = levels[ nextIndex ];
		this.videoPlayer().nativeElement.style.filter = `brightness(${ this.brightness }%)`;
		this.cdr.markForCheck();
	}

	toggleSpeedControl () : void {
		this.showSpeedControl      = ! this.showSpeedControl;
		this.showVolumeControl     = false;
		this.showBrightnessControl = false;
		this.cdr.markForCheck();
	}

	setPlaybackSpeed ( speed : number ) : void {
		this.playbackSpeed                          = speed;
		this.videoPlayer().nativeElement.playbackRate = speed;
		this.showSpeedControl                       = false;
		this.cdr.markForCheck();
	}

	formatTime ( seconds : number ) : string {
		if ( ! seconds ) return '00:00:00';

		const hours : number   = Math.floor( seconds / 3600 );
		const minutes : number = Math.floor( ( seconds % 3600 ) / 60 );
		const secs : number    = Math.floor( seconds % 60 );

		return [ hours , minutes , secs ].map( val => val.toString().padStart( 2 , '0' ) ).join( ':' );
	}

	onVideoEnded () : void {
		this.isPlaying = false;
		this.cdr.markForCheck();
	}

	onVideoPause () : void {
		this.isPlaying = false;
		this.cdr.markForCheck();
	}

	ngOnDestroy () : void {
		if ( this.hls ) {
			this.hls.destroy();
		}
		this.destroy$.next();
		this.destroy$.complete();
	}
}
