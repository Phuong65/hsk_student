import { AfterViewInit , Component , ElementRef , input , InputSignal , OnDestroy , OnInit , ViewChild } from '@angular/core';

import { SafeUrl } from '@angular/platform-browser';
import { FileReaderResponse } from "../../services";
import { PreviewIconComponent } from '@module/ngx-file-preview/lib/components/preview-icon';
import { I18nPipe } from "../../i18n";
import { BasePreviewComponent } from "@module/ngx-file-preview/lib/preview-types";
import { AutoThemeConfig , PreviewFile , ThemeMode } from "@module/ngx-file-preview";

@Component( {
	selector   : 'ngx-audio-preview' ,
	standalone : true ,
	imports: [PreviewIconComponent, I18nPipe] ,
	template   : `
		<div class="audio-container">
			<audio #audioPlayer [src]="file().url" (loadeddata)="onAudioLoad()" (timeupdate)="onTimeUpdate()"></audio>
			<div class="audio-player">
				<div class="cover">
					@if (coverUrl) {
						<img [src]="coverUrl" alt="album cover">
					} @else {
						<preview-icon [themeMode]="themeMode()" name="music" [size]="48"></preview-icon>
					}
				</div>

				<div class="controls">
					<div class="info">
						<span class="filename">{{ file().name }}</span>
					</div>

					<div class="player-controls">
						<div class="main-controls">
							<button class="control-btn" (click)="togglePlay()">
								<preview-icon [themeMode]="themeMode()" [name]="isPlaying ? 'pause' : 'play'" [title]="(isPlaying ? 'preview.toolbar.pause' : 'preview.toolbar.play')|i18n" [size]="24"></preview-icon>
							</button>
						</div>

						<div class="progress-area">
							<span class="time current">{{ formatTime(currentTime) }}</span>
							<div class="progress-bar" (mousedown)="startDragging($event)">
								<div class="progress-bg"></div>
								<div class="progress" [style.width.%]="progress">
									<div class="progress-handle"></div>
								</div>
							</div>
							<span class="time duration">{{ formatTime(duration) }}</span>
						</div>
					</div>

					<div class="extra-controls">
						<div class="speed-control" (mouseenter)="showSpeedControl = true" (mouseleave)="showSpeedControl = false">
							<button class="text-btn">{{ playbackSpeed }}x</button>
							@if (showSpeedControl) {
								<div class="speed-options">
									@for (speed of playbackSpeeds; track speed) {
										<button (click)="setPlaybackSpeed(speed)" [class.active]="playbackSpeed === speed">
											{{ speed }}x
										</button>
									}
								</div>
							}
						</div>
						<div class="volume-control" (mouseenter)="showVolumeControl = true" (mouseleave)="showVolumeControl = false">
							<button class="control-btn" (click)="cycleVolume()">
								<preview-icon [themeMode]="themeMode()" [name]="getVolumeIcon()"></preview-icon>
							</button>
							@if (showVolumeControl) {
								<div class="slider-container">
									<input type="range" min="0" max="100" [value]="volume * 100" (input)="adjustVolume($event)">
								</div>
							}
						</div>
					</div>
				</div>
			</div>
		</div>
	` ,
	styleUrls  : [ '../../styles/_theme.scss' , './audio-preview.component.scss' ]
} )
export class AudioPreviewComponent extends BasePreviewComponent implements OnInit , AfterViewInit , OnDestroy {



	@ViewChild( 'audioPlayer' ) audioPlayer! : ElementRef<HTMLAudioElement>;
	coverUrl : SafeUrl | null   = null;
	isPlaying : boolean         = false;
	currentTime : number        = 0;
	duration : number           = 0;
	progress : number           = 0;
	volume : number             = 1;
	previousVolume : number     = 1;
	isDragging : boolean        = false;
	showVolumeControl : boolean = false;
	showSpeedControl : boolean  = false;
	playbackSpeed : number      = 1;
	playbackSpeeds : number[]   = [ 0.75 , 1 , 1.5 , 2.0 , 3.0 , 5.0 ];

	private playHandler : () => void = () : void => {
		this.isPlaying = true;
		this.cdr.markForCheck();
	};

	private pauseHandler : () => void = () : void => {
		this.isPlaying = false;
		this.cdr.markForCheck();
	};

	private endedHandler : () => void = () : void => {
		this.isPlaying = false;
		this.cdr.markForCheck();
	};

	ngOnInit () : void {
		this.startLoading()
		void this.loadCover();
		this.cdr.markForCheck();
	}

	private async loadCover () : Promise<void> {
		try {
			if ( this.file().coverUrl ) {
				this.coverUrl = this.file().coverUrl;
				return;
			}
			this.coverUrl = null;
			this.cdr.markForCheck();
		}
		catch ( error ) {
			console.error( 'Failed to load cover:' , error );
			this.coverUrl = null;
			this.cdr.markForCheck();
		}
	}

	ngAfterViewInit () : void {
		const audio : HTMLAudioElement = this.audioPlayer.nativeElement;
		audio.addEventListener( 'play' , this.playHandler );
		audio.addEventListener( 'pause' , this.pauseHandler );
		audio.addEventListener( 'ended' , this.endedHandler );
	}

	onAudioLoad () : void {
		this.stopLoading()
		this.duration = this.audioPlayer.nativeElement.duration;
		this.cdr.markForCheck();
	}

	onTimeUpdate () : void {
		if ( ! this.isDragging ) {
			const audio : HTMLAudioElement = this.audioPlayer.nativeElement;
			this.currentTime               = audio.currentTime;
			this.progress                  = ( audio.currentTime / audio.duration ) * 100;
			this.cdr.markForCheck();
		}
	}

	async togglePlay () : Promise<void> {
		const audio : HTMLAudioElement = this.audioPlayer.nativeElement;
		try {
			if ( this.isPlaying ) {
				audio.pause();
			}
			else {
				if ( audio.ended ) {
					audio.currentTime = 0;
				}
				await audio.play();
			}
		}
		catch ( error ) {
			console.error( 'Playback control error:' , error );
		}
	}

	startDragging ( event : MouseEvent ) : void {
		this.isDragging = true;
		this.seek( event );
		document.addEventListener( 'mousemove' , this.onGlobalDrag );
		document.addEventListener( 'mouseup' , this.stopDragging );
	}

	private seek ( event : MouseEvent ) : void {
		const progressBar    = event.currentTarget as HTMLElement;
		const rect : DOMRect = progressBar.getBoundingClientRect();
		const pos : number   = ( event.clientX - rect.left ) / rect.width;
		if ( pos >= 0 && pos <= 1 ) {
			const audio : HTMLAudioElement = this.audioPlayer.nativeElement;
			audio.currentTime              = pos * audio.duration;
			this.progress                  = pos * 100;
			this.cdr.markForCheck();
		}
	}

	private onGlobalDrag : ( event : MouseEvent ) => void = ( event : MouseEvent ) : void => {
		if ( this.isDragging ) {
			const progressBar : Element = this.audioPlayer.nativeElement.parentElement?.querySelector( '.progress-bar' );
			if ( progressBar ) {
				const rect : DOMRect           = progressBar.getBoundingClientRect();
				const pos : number             = Math.max( 0 , Math.min( 1 , ( event.clientX - rect.left ) / rect.width ) );
				const audio : HTMLAudioElement = this.audioPlayer.nativeElement;
				audio.currentTime              = pos * audio.duration;
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
		}
		else {
			this.volume = this.previousVolume;
		}
		this.audioPlayer.nativeElement.volume = this.volume;
		this.cdr.markForCheck();
	}

	adjustVolume ( event : Event ) : void {
		const value : number = +( event.target as HTMLInputElement ).value;
		this.volume          = value / 100;
		if ( this.volume > 0 ) {
			this.previousVolume = this.volume;
		}
		this.audioPlayer.nativeElement.volume = this.volume;
		this.cdr.markForCheck();
	}

	getVolumeIcon () : string {
		if ( this.volume === 0 ) return 'mute';
		return 'volume';
	}

	setPlaybackSpeed ( speed : number ) : void {
		this.playbackSpeed                          = speed;
		this.audioPlayer.nativeElement.playbackRate = speed;
		this.showSpeedControl                       = false;
		this.cdr.markForCheck();
	}

	formatTime ( seconds : number ) : string {
		if ( ! seconds ) return '00:00';

		const minutes : number = Math.floor( seconds / 60 );
		const secs : number    = Math.floor( seconds % 60 );
		return [ minutes , secs ].map( ( val : number ) : string => val.toString().padStart( 2 , '0' ) ).join( ':' );
	}

	ngOnDestroy () : void {
		if ( this.audioPlayer?.nativeElement ) {
			const audio : HTMLAudioElement = this.audioPlayer.nativeElement;
			audio.removeEventListener( 'play' , this.playHandler );
			audio.removeEventListener( 'pause' , this.pauseHandler );
			audio.removeEventListener( 'ended' , this.endedHandler );
		}
		this.stopDragging();
	}

	protected override async handleFileContent ( content : FileReaderResponse ) : Promise<void> {
	}
}
