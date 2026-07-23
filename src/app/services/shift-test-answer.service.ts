import { Injectable } from '@angular/core';
import { ShiftTestAnswer } from '@models/shift-test-answer';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';

@Injectable({
    providedIn: 'any'
})
export class ShiftTestAnswerService extends IctuBaseServiceClass<ShiftTestAnswer> {
    constructor() {
        super('shift-test-answers');
    }
}
