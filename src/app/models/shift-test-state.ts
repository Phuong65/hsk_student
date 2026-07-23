import { IctuBaseModel } from '@models/ictu-base-model';

export interface ShiftTestState extends IctuBaseModel {
    id: number;
    shift_test_id: number;
    student_id: number;
    skill: string;
    progress: string;
    duration: number;
    time_left: number;
    completed: number;
}
