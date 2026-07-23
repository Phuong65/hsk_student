import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { ShiftTest } from '@models/shift-test';
import { BankQuestion } from '@models/bank-question';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import { DtoObject } from '@models/dto';

@Injectable({
    providedIn: 'any'
})
export class ShiftTestService extends IctuBaseServiceClass<ShiftTest> {
    private httpClient: HttpClient = inject(HttpClient);

    constructor() {
        super('shift-tests');
    }

    getQuestions(shiftTestId: number): Observable<BankQuestion[]> {
        return this.httpClient
            .get<DtoObject<BankQuestion[]>>(`${this.api}questions/${shiftTestId}`)
            .pipe(map(r => r.data));
    }

    scoreShiftTest(shiftTestId: number, skill: string): Observable<any> {
        return this.httpClient.post(`${this.api}${shiftTestId}/score`, { skill });
    }
}
