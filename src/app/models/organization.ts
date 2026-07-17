import { IctuBaseModel } from '@models/ictu-base-model';

export interface Organization extends IctuBaseModel {
    id: number;
    donvi_id: number;
    name: string;
}