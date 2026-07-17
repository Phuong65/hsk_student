import { Component , inject , input , InputSignal , OnInit , signal , WritableSignal } from '@angular/core';
import { AbstractControl , FormsModule } from '@angular/forms';
import { Observable , of } from 'rxjs';
import { SelectModule } from 'primeng/select';
import { CommonModule } from '@angular/common';
import { Is } from '@utilities/is';
import { MatProgressBar } from '@angular/material/progress-bar';
import { EmployeesService } from '@services/employees.service';
import { EMPLOYEE_SELECT_OPTION_DEFAULT , EmployeeSelectOption } from '@models/employee';

type EmployeePickerComponentState = 'loading' | 'error' | 'success';

const convertInput : ( input : number | number[] | string | string[] ) => number[] = ( input : number | number[] | string | string[] ) : number[] => {
    let result : number[] = [];
    if ( input ) {
        switch ( true ) {
            case Is.string( input ):
                result = [ parseInt( ( input as string ) , 10 ) ];
                break;
            case Is.number( input ):
                result = [ ( input as number ) ];
                break
            case Is.array( input ):
                result = ( input as number[] | string[] ).map( ( i : number | string ) : number => <number> ( Is.number( i ) ? i : parseInt( i as string , 10 ) ) );
                break
            default :
                break;
        }
    }

    return result;
}

@Component( {
    selector    : 'employee-picker' ,
    imports     : [ CommonModule , SelectModule , MatProgressBar , FormsModule ] ,
    templateUrl : './employee-picker.component.html' ,
    styleUrl    : './employee-picker.component.css'
} )
export class EmployeePickerComponent implements OnInit {

    donviId : InputSignal<number> = input.required<number>( { alias : 'donvi_id' } );

    formControl : InputSignal<AbstractControl> = input.required<AbstractControl>( { alias : 'formControlObject' } );

    readonly state : WritableSignal<EmployeePickerComponentState> = signal( 'loading' );

    readonly employees : WritableSignal<EmployeeSelectOption[]> = signal<EmployeeSelectOption[]>( [] );

    selected : EmployeeSelectOption = EMPLOYEE_SELECT_OPTION_DEFAULT;

    readonly userIds : WritableSignal<number[]> = signal<number[]>( [] );

    private service : EmployeesService = inject( EmployeesService );

    ngOnInit () : void {
        setTimeout( () : void => {
            this.formControl().valueChanges.subscribe( ( value : number | number[] ) : void => {
                this.userIds.set( convertInput( value ) );
            } );
        } , 1000 );

        this.loadAllEmployees();
    }

    private loadAllEmployees () : void {
        this.state.set( 'loading' );
        this.service.loadEmployeeSelectOptions( this.donviId() , EMPLOYEE_SELECT_OPTION_DEFAULT ).subscribe( {
            next  : ( employees : EmployeeSelectOption[] ) : void => {
                this.employees.set( employees );
                this.state.set( 'success' );
            } ,
            error : () : void => {
                this.state.set( 'error' );
            }
        } );
    }

    loadSelected ( userIds : number[] ) : void {
        this.state.set( 'loading' );
        const loader : Observable<EmployeeSelectOption[]> = userIds.length ? this.service.loadSelectedEmployee( userIds ) : of<EmployeeSelectOption[]>( [] );
        loader.subscribe( {
            next  : ( employees : EmployeeSelectOption[] ) : void => {
                this.employees.set( employees );
                this.state.set( 'success' );
            } ,
            error : () : void => {
                this.state.set( 'error' );
            }
        } );
    }
}
