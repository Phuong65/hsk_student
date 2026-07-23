import { IctuBaseModel } from '@models/ictu-base-model';

export interface ShiftTestAnswer extends IctuBaseModel {
    id: number;

    shift_id: number;

    shift_test_id: number;

    bank_question_id: number;

    student_id: number;

    student_answer: string;
}