import { IctuBaseModel } from '@models/ictu-base-model';

export interface Shift extends IctuBaseModel {
    id: number;
    name: string | null;
    shift_period_id: number;
    form_id: number;
    test_num: number;
    time_start: string | Date | null; // Kiểu datetime trong MySQL khi lên FE thường là chuỗi string ISO hoặc đối tượng Date
    teacher_invigilation: TeacherInvilation[]; // Mảng các giáo viên coi thi theo từng phòng (hoặc chuỗi JSON)
    status: number; // -1: xóa, 0: không kích hoạt, 1: kích hoạt, 2: Đã thi xong, 3: Đã chấm xong
    user_id: number; // User kích hoạt
    student_count?: number;
    listening_count?: number; // Số lượt nghe tối đa cho skill listening; 0 = không cho replay, >0 = giới hạn, -1 = unlimited
}

export interface TeacherInvilation {
    teacher_id: number;
    room: string;
}
