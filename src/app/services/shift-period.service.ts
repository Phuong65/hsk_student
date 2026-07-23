import { Injectable } from '@angular/core';
import { ShiftPeriod } from '@models/shift-period';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';

@Injectable({
    providedIn: 'any'
})
export class ShiftPeriodService extends IctuBaseServiceClass<ShiftPeriod> {
    constructor() {
        super('shift-periods');
    }
}
