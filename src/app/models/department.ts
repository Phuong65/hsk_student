import { IctuBaseModel } from "@models/ictu-base-model";
import { IctuDropdownOptionLoader } from "@models/ictu-dropdown-option";

export interface Department extends IctuBaseModel {
	donvi_id : number,
	parent_id : number, // mã id phòng ban cha
	name : string, // tên phòng ban
	code : string, // mã phòng ban
	head_of_department : number, // Mã user trưởng phòng ( Head of Department )
	desc : string, // mô tả
	capacity : number, // Quy mô nhân sự (Employee Capacity) la số lượng nhân viên tối đa được phép tuyển dụng ( biên chế, phân bổ, bao gồm cả chính thức và cộng tác viên) của phòng ban
	total_employees : number, // Tổng số nhân sự của phòng ban
	staus : number, // Trạng thái
}


export type DepartmentOptionLoader = IctuDropdownOptionLoader<Department , number>;