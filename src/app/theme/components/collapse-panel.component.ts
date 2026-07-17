import { AfterViewInit , Component , input , Input , InputSignal , ViewChild } from '@angular/core';
import { CollapseDimension , CollapseDirective , CollapseState } from '@theme/directives/collapse.directive';

@Component( {
    selector   : 'collapse-panel' ,
    standalone : true ,
    imports    : [ CollapseDirective ] ,
    template   : '<div [collapse]="dimension"><ng-content></ng-content></div>'
} )
export class CollapsePanelComponent implements AfterViewInit {
    @Input() dimension : CollapseDimension = 'height';

    initState : InputSignal<CollapseState> = input<CollapseState>( 'collapse' );

    @ViewChild( CollapseDirective , { static : true , read : CollapseDirective } ) panel? : CollapseDirective;

    ngAfterViewInit () : void {
        if ( this.initState() === 'open' ) {
            this.panel.show();
        }
    }

}
