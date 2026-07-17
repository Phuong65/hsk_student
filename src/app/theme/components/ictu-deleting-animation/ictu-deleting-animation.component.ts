import { Component , computed , Inject , OnDestroy , Signal , signal , WritableSignal } from '@angular/core';
import { map , Observable , Subject , takeUntil } from 'rxjs';
import { MAT_DIALOG_DATA , MatDialogRef } from '@angular/material/dialog';
import { MatProgressBar , ProgressBarMode } from '@angular/material/progress-bar';

export interface IctuDeletingAnimationConfig {
    observer : Observable<number>;
    heading : string;
}

@Component( {
    selector    : 'app-ictu-deleting-animation' ,
    imports     : [ MatProgressBar ] ,
    templateUrl : './ictu-deleting-animation.component.html' ,
    styleUrl    : './ictu-deleting-animation.component.scss'
} )
export class IctuDeletingAnimationComponent implements OnDestroy {

    mode : Signal<ProgressBarMode> = computed( () : ProgressBarMode => this.value() > 0 ? 'buffer' : 'indeterminate' );

    value : WritableSignal<number> = signal<number>( 0 );

    private destroyed$ : Subject<void> = new Subject<void>();

    readonly heading : string = 'Đang xóa dữ liệu...';

    constructor (
        private dialogRef : MatDialogRef<IctuDeletingAnimationComponent> ,
        @Inject( MAT_DIALOG_DATA ) public data : IctuDeletingAnimationConfig
    ) {
        this.data.observer.pipe(
            takeUntil( this.destroyed$ ) ,
            map( ( progress : number ) : number => Math.max( 0 , Math.min( progress , 100 ) ) )
        ).subscribe( {
            next     : ( progress : number ) : void => {
                this.value.set( Math.round( progress ) );
                if ( progress === 100 ) {
                    setTimeout( () : void => {
                        if ( this.dialogRef ) {
                            this.dialogRef.close( true );
                        }
                    } , 500 )
                }
            } ,
            error    : () : void => {
                if ( this.dialogRef ) {
                    this.dialogRef.close( false );
                }
            } ,
            complete : () : void => {
                if ( this.dialogRef ) {
                    this.dialogRef.close( true );
                }
            }
        } );
        this.heading = this.data.heading;
    }

    ngOnDestroy () : void {
        this.destroyed$.next();
        this.destroyed$.complete();
    }
}
