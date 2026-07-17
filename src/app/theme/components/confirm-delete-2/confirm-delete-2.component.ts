import { Component , Inject , signal , Signal } from '@angular/core';
import { MAT_DIALOG_DATA , MatDialogRef } from '@angular/material/dialog';
import { SafeHtmlPipe } from '@pipes/safe-html.pipe';
import { MatButton } from '@angular/material/button';

export interface ConfirmDelete2Data {
    heading? : string;
    htmlMessage? : string;
}

@Component( {
    selector    : 'app-confirm-delete-2' ,
    standalone  : true ,
    imports     : [ SafeHtmlPipe , MatButton ] ,
    templateUrl : './confirm-delete-2.component.html' ,
    styleUrl    : './confirm-delete-2.component.css'
} )
export class ConfirmDelete2Component {

    readonly heading : Signal<string>;

    readonly htmlMessage : Signal<string>;

    constructor (
        public dialogRef : MatDialogRef<ConfirmDelete2Component> ,
        @Inject( MAT_DIALOG_DATA ) public data : ConfirmDelete2Data
    ) {
        this.heading     = signal<string>( data?.heading ?? 'Xác nhận xóa' );
        this.htmlMessage = signal<string>( data?.htmlMessage ?? '<p class="m-0 f-roboto f-14 lh-base text-center">Bạn muốn thực hiện thao tác xóa phân tử đã chọn, thao tác này không thể hoàn tác sau khi đã xóa.</p>' );
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
