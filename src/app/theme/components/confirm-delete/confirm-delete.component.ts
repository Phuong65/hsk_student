import { Component , Inject , signal , Signal } from '@angular/core';
import { MAT_DIALOG_DATA , MatDialogModule , MatDialogRef } from '@angular/material/dialog';

import { MatButton } from '@angular/material/button';

export interface ConfirmDeleteData {
    amount : number;
}

@Component( {
    selector    : 'app-confirm-delete' ,
    standalone  : true ,
    imports     : [ MatDialogModule , MatButton ] ,
    templateUrl : './confirm-delete.component.html' ,
    styleUrl    : './confirm-delete.component.scss'
} )
export class ConfirmDeleteComponent {

    message : Signal<string>;

    constructor (
        public dialogRef : MatDialogRef<ConfirmDeleteComponent , boolean> ,
        @Inject( MAT_DIALOG_DATA ) public data : ConfirmDeleteData
    ) {
        const _message : string = `Bạn có chắc chắn muốn xóa ${ ( data.amount === 1 ? 'mục' : `những mục` ) } này không?`;
        this.message            = signal<string>( _message );
    }

    dismiss ( event : MouseEvent ) : void {
        this.confirm( event , false );
    }

    confirm ( event : MouseEvent , confirm : boolean ) : void {
        event.preventDefault();
        event.stopPropagation();
        this.dialogRef.close( confirm );
    }
}
