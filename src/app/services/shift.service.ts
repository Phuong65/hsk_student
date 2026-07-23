import { Injectable } from '@angular/core';
import { Shift } from '@models/shift';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'any'
})
export class ShiftService extends IctuBaseServiceClass<Shift> {
    constructor() {
        super('shifts');
    }

    generateExam(id: number): Observable<any> {
        return this.http.post(`${this.api}sinhde/${id}`, {});
    }
}
