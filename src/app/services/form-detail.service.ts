import { Injectable } from '@angular/core';
import { FormDetail } from '@models/form-detail';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';

@Injectable({
    providedIn: 'any'
})
export class FormDetailService extends IctuBaseServiceClass<FormDetail> {
    constructor() {
        super('form-details');
    }
}
