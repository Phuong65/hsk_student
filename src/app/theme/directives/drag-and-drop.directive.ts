import { Directive , HostBinding , HostListener , output , OutputEmitterRef } from '@angular/core';

@Directive( {
	selector   : '[dragAndDrop]' ,
	standalone : true ,
	host       : {
		class : 'ictu-drag-and-drop ictu-dnd-section' ,
	}
} )
export class DragAndDropDirective {
	
	@HostBinding( 'class.ictu-dnd-section--file-over' ) fileOver : boolean;
	
	public readonly fileDropped : OutputEmitterRef<FileList> = output<FileList>()
	
	// Dragover listener
	@HostListener( 'dragover' , [ '$event' ] ) onDragOver ( event : Event ) : void {
		event.preventDefault();
		event.stopPropagation();
		this.fileOver = true;
	}
	
	// Dragleave listener
	@HostListener( 'dragleave' , [ '$event' ] ) onDragLeave ( event : Event ) : void {
		event.preventDefault();
		event.stopPropagation();
		this.fileOver = false;
	}
	
	// Drop listener
	@HostListener( 'drop' , [ '$event' ] ) ondrop ( event : DragEvent ) : void {
		event.preventDefault();
		event.stopPropagation();
		this.fileOver          = false;
		const files : FileList = event.dataTransfer.files;
		if ( files.length > 0 ) {
			this.fileDropped.emit( files );
		}
	}
	
}
