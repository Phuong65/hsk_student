import { Injectable } from '@angular/core';
import { ShiftTestState } from '@models/shift-test-state';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';

@Injectable({
    providedIn: 'any'
})
export class ShiftTestStateService extends IctuBaseServiceClass<ShiftTestState> {
    constructor() {
        super('shift-test-states');
    }
}
