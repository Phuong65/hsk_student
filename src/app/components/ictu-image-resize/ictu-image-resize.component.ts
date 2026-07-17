import { AfterViewInit , Component , Inject , OnInit , Signal , viewChild } from '@angular/core';
import { ImageCroppedEvent , ImageCropperComponent , OutputFormat } from "ngx-image-cropper";
import { state , style , trigger } from "@angular/animations";
import { NotificationService } from "@services/notification.service";
import { MAT_DIALOG_DATA , MatDialogRef } from "@angular/material/dialog";
import { ConfirmDialogData } from "@theme/components/confirm/confirm.component";
import { Button , BUTTON_NO , BUTTON_YES } from "@models/button";
import { firstValueFrom } from "rxjs";
import { SafeUrlPipe } from "@app/pipes/safe-url.pipe";
import { ButtonDirective , ButtonIcon , ButtonLabel } from "primeng/button";
import { Ripple } from "primeng/ripple";

export interface ImageResizerConfig {
	panelWidth : number;
	panelHeight : number;
	maintainAspectRatio : boolean;
	aspectRatio : number;
	resizeToWidth : number;
	imageQuality : number;
	format : OutputFormat;
	resizeToHeight : number;
	cropperMinWidth : number;
	cropperMinHeight : number;
	cropperMaxHeight : number;
	cropperMaxWidth : number;
	cropperStaticWidth : number;
	cropperStaticHeight : number;
	dataUrl : string;
}

export interface ImageResizerDto {
	error : boolean;
	errorCode : number;
	data : ImageCroppedEvent;
	message : string;
	uploaded_id? : number;
}

@Component( {
	selector    : 'app-ictu-image-resize' ,
	imports     : [ SafeUrlPipe , ImageCropperComponent , ButtonDirective , Ripple , ButtonLabel , ButtonIcon ] ,
	templateUrl : './ictu-image-resize.component.html' ,
	styleUrl    : './ictu-image-resize.component.css' ,
	animations  : [
		trigger( 'effect' , [
			state( 'open' , style( {
				'opacity'    : '1' ,
				'z-index'    : '10' ,
				'visibility' : 'visible'
			} ) ) ,
			state( 'close' , style( {
				'opacity'    : '0' ,
				'z-index'    : '-1' ,
				'visibility' : 'hidden'
			} ) )
		] )
	]
} )
export class IctuImageResizeComponent implements OnInit , AfterViewInit {

	readonly video : Signal<HTMLVideoElement> = viewChild<HTMLVideoElement>( 'video' );

	readonly canvas : Signal<HTMLCanvasElement> = viewChild<HTMLCanvasElement>( 'canvas' );

	config : ImageResizerConfig;

	imgRaw : string;

	croppedImage : ImageCroppedEvent;

	errorMessage : string;

	cameraAvailable : boolean;

	cameraMode : string = 'close';

	croppedPanelMode : string = 'close';

	dismissAct : ImageResizerDto = {
		error     : true ,
		errorCode : -2 ,
		data      : null ,
		message   : 'User does block camera'
	};

	rejectByUser : ImageResizerDto = {
		error     : true ,
		errorCode : -1 ,
		data      : null ,
		message   : 'The progress was canceled by user'
	};

	cameraNotAvailable : ImageResizerDto = {
		error     : true ,
		errorCode : -3 ,
		data      : null ,
		message   : 'Requested device not found'
	};

	result : ImageResizerDto = {
		error     : false ,
		errorCode : 1 ,
		data      : null ,
		message   : 'Successful'
	};

	stream : MediaStream;

	constructor (
		private notificationService : NotificationService ,
		public dialogRef : MatDialogRef<IctuImageResizeComponent> ,
		@Inject( MAT_DIALOG_DATA ) public data : Partial<ImageResizerConfig>
	) {
		this.config = Object.assign<ImageResizerConfig , Partial<ImageResizerConfig>>( {
			panelWidth          : 640 ,
			panelHeight         : 480 ,
			maintainAspectRatio : true ,
			aspectRatio         : 4 / 6 ,
			resizeToWidth       : 151 ,
			imageQuality        : 100 ,
			format              : 'png' ,
			resizeToHeight      : undefined ,
			cropperMinWidth     : undefined ,
			cropperMinHeight    : undefined ,
			cropperMaxHeight    : undefined ,
			cropperMaxWidth     : undefined ,
			cropperStaticWidth  : undefined ,
			cropperStaticHeight : undefined ,
			dataUrl             : undefined
		} , data );
	}

	ngOnInit () : void {
		if ( this.config.dataUrl ) {
			this.enableDirRectImageMode( this.config.dataUrl );
		}
	}

	ngAfterViewInit () : void {
		if ( ! this.config.dataUrl && navigator.mediaDevices && navigator.mediaDevices.getUserMedia ) {
			navigator.mediaDevices.getUserMedia( { video : true } ).then(
				( stream : MediaStream ) : void => {
					this.stream = stream;
					// this.video().nativeElement.srcObject = stream;
					// void this.video().nativeElement.play();
					this.video().srcObject = stream;
					void this.video().play();
					this.cameraAvailable  = true;
					this.cameraMode       = 'open';
					this.croppedPanelMode = 'close';
				} ,
				( error : any ) : void => {
					if ( error.code === 0 ) {
						this.errorMessage     = 'Vùi lòng cho phép camera hoạt động trên thiết bị này';
						this.croppedPanelMode = 'close';
					}
					else {
						this.cameraAvailable  = false;
						this.cameraMode       = 'close';
						this.croppedPanelMode = 'close';
						this.closeProcess( this.cameraNotAvailable );
					}
				}
			);
		}
	}

	enableDirRectImageMode ( dataUrl : string ) : void {
		this.imgRaw           = dataUrl;
		this.cameraMode       = 'close';
		this.croppedPanelMode = 'open';
	}

	capture () : void {
		this.canvas().getContext( '2d' ).drawImage( this.video() , 0 , 0 , this.config.panelWidth , this.config.panelHeight );
		this.imgRaw           = this.canvas().toDataURL( 'image/png' );
		this.cameraMode       = 'close';
		this.croppedPanelMode = 'open';
	}

	imageCropped ( event : ImageCroppedEvent ) : void {
		this.croppedImage = event;
		this.result.data  = event;
	}

	imageLoaded () : void {
		// show cropper
		// this.hideError();
	}

	cropperReady () : void {
		// cropper ready
	}

	loadImageFailed () : void {
		// show message
		// this.showError( 'controls.fileType' );
	}

	turnOffCamera () : void {
		this.video().srcObject = null;
		this.stream?.getTracks()[ 0 ].stop();
	}

	closeProcess ( data : ImageResizerDto ) : void {
		this.turnOffCamera();
		this.dialogRef.close( data );
	}

	async cancelAct () : Promise<void> {
		try {
			const _config : ConfirmDialogData = {
				heading : 'Xác nhận hủy' ,
				message : '<p>Bạn có chăc chắn muốn hủy hành động không</p>' ,
				buttons : [ BUTTON_YES , BUTTON_NO ]
			};
			const btn : Button                = await firstValueFrom( this.notificationService.confirm( _config ) );
			if ( btn && btn.name === BUTTON_YES.name ) {
				this.turnOffCamera();
				this.closeProcess( this.rejectByUser );
			}
		}
		catch ( e ) {
		}
	}

	takeNewPicture () : void {
		this.cameraMode       = 'open';
		this.croppedPanelMode = 'close';
	}
}
