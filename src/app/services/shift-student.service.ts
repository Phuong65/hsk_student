import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import { Observable, map } from 'rxjs';
import { DtoObject } from '@models/dto';
import { ShiftStudent } from '@app/models/shift-student';

@Injectable({
    providedIn: 'any'
})
export class ShiftStudentService extends IctuBaseServiceClass<ShiftStudent> {
    private httpClient: HttpClient = inject(HttpClient);

    constructor() {
        super('shift-students');
    }

    deleteByShiftAndStudentIds(shiftId: number, studentIds: number[]): Observable<any> {
        const ids = studentIds.join(',');
        return this.httpClient.delete<DtoObject<any>>(`${this.api}${ids}`).pipe(map(r => r.data));
    }
}
