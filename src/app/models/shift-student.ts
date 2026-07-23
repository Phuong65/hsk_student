import { IctuBaseModel } from '@models/ictu-base-model';
import { Shift } from './shift';

export interface ShiftStudent extends IctuBaseModel {
    id: number;
    shift_id: number;
    student_id: number;
    student_code: string;
    room: string;
    created_by: number;
    updated_by: number;
    is_deleted: number;
}

export interface ShiftStudentWithShift extends ShiftStudent {
    shift: Shift;
}
