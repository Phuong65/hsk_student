import { IctuBaseModel } from '@models/ictu-base-model';

export interface ShiftPeriod extends IctuBaseModel {
    id: number;
    name: string;
    code: string;
    description: string;
    time_start: string;
    time_end: string;
    status: number;
}