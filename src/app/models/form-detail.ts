import { IctuBaseModel } from '@models/ictu-base-model';

export interface FormDetail extends IctuBaseModel {
    id: number;
    form_id: number;
    skill: string;
    time: number;
}
