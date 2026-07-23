import { IctuBaseModel } from '@models/ictu-base-model';

export interface ShiftTest extends IctuBaseModel {
    id: number;
    shift_id: number;
    student_id: number;
    form_id: number;
    test_num: number;
    score: number | null;
    status: number;
    time_start: string | null;
    time_end: string | null;
}
