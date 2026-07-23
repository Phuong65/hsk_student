import { IctuBaseModel } from '@models/ictu-base-model';
import { IctuDropdownOption , IctuDropdownOptionElement } from '@models/ictu-dropdown-option';
import { FormControl , FormGroup } from '@angular/forms';
import { SysRoleName } from '@models/role';

export type Gender = 'NAM' | 'NU' | 'KHAC';

// export type HocVi = 'CU_NHAN' | 'KY_SU' | 'THAC_SI' | 'TIEN_SI';
//
// export type HocHam = 'PHO_GIAO_SU' | 'GIAO_SU';

export const GENDER_OPTIONS : IctuDropdownOptionElement<Gender>[] = [
    { value : 'NAM' , label : 'Nam' } ,
    { value : 'NU' , label : 'Nữ' } ,
    { value : 'KHAC' , label : 'Khác' }
]

/***************************
 * Professor: (Giáo sư)
 * Associate Professor: (Phó giáo sư)
 * Academic rank: (Học hàm)
 * Academic degree : (Học vị)
 * Cử nhân: Bachelor's degree
 * Thạc sĩ: Master's degree
 * Tiến sĩ: Doctorate/PhD (Doctor of Philosophy)
 * */
export type AcademicRank = '' | 'GIAO_SU' | 'PHO_GIAO_SU'; // học hàm

export type AcademicDegree = '' | 'CU_NHAN' | 'KY_SU' | 'BAC_SI' | 'THAC_SI' | 'TIEN_SI'; // học vị

export type EmployeeSelectOptionInfo = Pick<Employee , 'id' | 'user_id' | 'email' | 'phone' | 'name' | 'full_name' | 'code' | 'donvi_id' | 'csdt_id' | 'gender' | 'dob' | 'academic_degree' | 'academic_rank' | 'linhvuc_id' | 'nationality'>;

export interface EmployeeSelectOption extends IctuDropdownOption<number> {
    object? : EmployeeSelectOptionInfo;
}

export const EMPLOYEE_SELECT_OPTION_FIELDS : string = 'id,user_id,email,phone,name,full_name,code,donvi_id,csdt_id,gender,dob,academic_degree,academic_rank,linhvuc_id,nationality';

export const EMPLOYEE_EMPTY_OPTION : EmployeeSelectOption = Object.seal<EmployeeSelectOption>( {
    value  : 0 ,
    label  : 'Không có nhân viên' ,
    object : null
} );

export const ACADEMIC_RANK_OPTIONS : IctuDropdownOptionElement<AcademicRank>[] = [
    { value : 'GIAO_SU' , label : 'Giáo sư' } ,
    { value : 'PHO_GIAO_SU' , label : 'Phó giáo sư' }
]

export const ACADEMIC_DEGREE_OPTIONS : IctuDropdownOptionElement<AcademicDegree>[] = [
    { value : 'CU_NHAN' , label : 'Cử nhân' } ,
    { value : 'BAC_SI' , label : 'Bác sĩ' } ,
    { value : 'KY_SU' , label : 'Kỹ sư' } ,
    { value : 'THAC_SI' , label : 'Thạc sĩ' } ,
    { value : 'TIEN_SI' , label : 'Tiến sĩ' }
]

export type SocialMediaName = 'facebook' | 'instagram' | 'tiktok' | 'linkedIn' | 'youtube';

export type SocialMedia = {
    [T in SocialMediaName] : string
}

export type EmployeeContractStatus = '' | 'CHO_DUYET' | 'THU_VIEC' | 'CHINH_THUC' | 'NGHI_VIEC' | 'NGHI_THAI_SAN'; /* Trạng thái hợp đồng */

export const EMPLOYEE_CONTRACT_STATUS_OPTIONS : IctuDropdownOptionElement<EmployeeContractStatus>[] = [
    { value : 'CHO_DUYET' , label : 'Chờ duyệt' } ,
    { value : 'THU_VIEC' , label : 'Đang thử việc' } ,
    { value : 'CHINH_THUC' , label : 'Nhân viên chính thức' } ,
    { value : 'NGHI_VIEC' , label : 'Nghỉ việc' } ,
    { value : 'NGHI_THAI_SAN' , label : 'Nghỉ thai sản' }
];

export type SystemLanguageName = '' | 'en' | 'vi';

export const EMPLOYEE_LANGUAGE_OPTIONS : IctuDropdownOptionElement<SystemLanguageName>[] = [
    { value : 'vi' , label : 'Việt Nam' } ,
    { value : 'en' , label : 'English' }
];

export interface Employee extends IctuBaseModel {
    // photo : ICTUStandardFile,
    photo : string, // link to public image
    department_id : number,
    user_id : number,
    email : string,
    phone : string,
    name : string,
    full_name : string,
    code : string, // ma nhan vien
    donvi_id : number,
    csdt_id : number,
    gender : Gender,
    dob : string, // Ngày sinh DD-MM-YYYY
    academic_degree : AcademicDegree,
    academic_rank : AcademicRank,
    positions : string, // Chức vụ (vị trí vệc làm) |teacher|accountant|general_manager|training_manager|teaching_assistant|saler|supporter|security|staff|
    linhvuc_id : number,// lĩnh vực chuyên môn
    linhvuc_ids : number[],
    workplace : string, // đơn vị công tac hiện tại của nhân sự
    workplace_position : string, // Chức vụ tại đơn vị công tác của nhân sự
    nationality : string, // quốc tịch của nhân sự
    language : SystemLanguageName, // Ngôn ngữ của nhân sự
    province_id : number, // Mã tỉnh của nhân sự
    ward_id : number, // Mã xã phường của nhân sự
    street : string, // tên thôn, xóm, số nhà , tên đường ...
    address : string, // Địa chỉ đầy đủ cùa nhân viên
    social_media : SocialMedia,
    bio : string, // Tự giới thiệu không quá 250 ký tự
    contract_status : EmployeeContractStatus,
    status : number, // -1 : dừng hoạt động , 0 : tạm nghỉ , 1 : đang hoạt động
}

export type EmployeeProfile = Pick<Employee , 'id' | 'photo' | 'user_id' | 'email' | 'phone' | 'name' | 'full_name' | 'code' | 'donvi_id' | 'csdt_id' | 'gender' | 'dob' | 'academic_degree' | 'academic_rank' | 'linhvuc_id' | 'workplace' | 'workplace_position' | 'nationality' | 'language' | 'province_id' | 'ward_id' | 'street' | 'social_media' | 'contract_status' | 'status'>

export type BaseEmployeeInfo = Pick<Employee , 'id' | 'full_name' | 'email' | 'phone' | 'gender' | 'photo' | 'positions'>;

export type SimpleEmployee = Pick<Employee , 'id' | 'photo' | 'user_id' | 'email' | 'phone' | 'name' | 'full_name' | 'code' | 'donvi_id' | 'csdt_id' | 'gender' | 'dob'>

export interface EmployeeSelectOption extends IctuDropdownOption<number> {
    info? : SimpleEmployee;
}

export const SimpleEmployeeQuerySelect : string = 'id,photo,user_id,email,phone,name,full_name,code,donvi_id,csdt_id,gender,dob';

const defaultOption : EmployeeSelectOption = {
    value : 0 ,
    label : 'Không có giảng viên' ,
    info  : null
}

export interface EmployeeQueryParams {
    search : string,
    csdt_id : number,
}

export const EMPLOYEE_SELECT_OPTION_DEFAULT : EmployeeSelectOption = Object.seal( { ... defaultOption } );

export type EmployeeFormStructure = {
    [T in EmployeeProfile as string] : FormControl<any> | FormGroup
};

export type EmployeeFormSocial = {
    [T in SocialMediaName] : FormControl<string>
}

export interface EmployeeForm extends EmployeeFormStructure {
    // photo : FormControl<ICTUStandardFile>,
    photo : FormControl<string>,
    user_id : FormControl<number>,
    email : FormControl<string>,
    phone : FormControl<string>,
    name : FormControl<string>,
    full_name : FormControl<string>,
    code : FormControl<string>,
    donvi_id : FormControl<number>,
    csdt_id : FormControl<number>,
    gender : FormControl<Gender>,
    dob : FormControl<string>,
    academic_degree : FormControl<AcademicDegree | ''>,
    academic_rank : FormControl<AcademicRank | ''>,
    linhvuc_id : FormControl<number>,
    workplace : FormControl<string>,
    workplace_position : FormControl<string>,
    nationality : FormControl<string>,
    language : FormControl<string>,
    province_id : FormControl<number>,
    ward_id : FormControl<number>,
    street : FormControl<string>,
    social_media : FormGroup<EmployeeFormSocial>,
    contract_status : FormControl<EmployeeContractStatus>,
    status : FormControl<number>,
}

export const EMPLOYEE_PHOTO_PLACEHOLDER : string = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMwAAADACAMAAAB/Pny7AAAAMFBMVEXk5ueutLfb3t+nrrHn6eqrsbTh4+S7wMPT1tixt7rKztDBxsi3vL/q7O3Y293Q09Wdj+FKAAAFPklEQVR4nO2c25LbIAxADRZgrv7/vy042SabOyBH8g7npdP2xWckQBDQNA0Gg8FgMBgMBoPBYDAYDAaDwWAwGAwGg92BzKRlQevtL0cFQMvFOe/NhnduSfqQPtlk8SZYdY0Nxi86HswH4uKDFUrcUoR8OlJ4skoQD0zOPsKG5TDRick+E/kvZNMhdECb+Y1KsZmNZm8DsKp3YfkZPSv1x74BtP8gLGeYBwdS+NxlGzl8bT5OsUuqLRNXHVensuk4pmtOg0uGpQ24FpViQ/3l98Da6CLEyi00sNhmGcFsTgMZmgbMhrLM1hvf7lJWT+rP/8Vas1Y+sGE0CYDsictmwyfRwPTKqBCpJc7A0pdkW2i4zM+xW6VAbXEiuv7AlCKNRaIBgkrGUnsU4to7+s9wCA101DHXqEBtUqYyHBfBoeAEj+WiPLmM7qgwb2SCJHaBFWnIZCx1nkFXufwb5WldJt1dll3JGNo8gxTQXHKe0W45O3b+D1C0gwbajpeeyRDv0RDHf5kBNKWLRBz/ZQYg3XAmg+giRJCEMriTmaA9QYOEt/7Ty+CVzBtqIZXBHP9Fhs6l/LqEKjP/JRnayCCnGW1k/tSYwZ7NxjqDJoN2ArBhKcuZXGhiutDWZpP+S1sAzPOMsjmjlcHdaRJvm3t+Mb+Hss7M9PxkfkdIpC6ohwDE47/8bIbmUm440cpg1gCB/NoJoC2byhBnGWqe0f8OCBIrz2gLsxMRK88MvQvCxZkzxCvmiYhzEBg4uOTSGeWGBvm8fCJilDRsrjVNCLeaeMRlwtgIzPRrzIXOn2mUZROYTOqMDPV1ht90JRrxDvOOnpMN8ssMt0D77QYG1fIdrRto+vs/j2jbpjF93dRUcSrBoPB/CDTY8Llqfkt1lcakVH5M9E9fAd+jBP1FxpfA+nFwVGC2Vt4D8rPg5LBwHfpXwLSYt881lfJ8X2j+AvRi5lc6SpmF7yx2C+jk1ROf/O8+8StgXqNXc++j5jnQ/qLUCkzJ2zlT2meUP2d7lJHyEIhxksvqnFsXOcVDdGd4CfyH+ksa2b5cn5HnJjonzv95DPKn5u9PKSeX9yYEW6bibeGxIRjv3ZpSVpu4GxUPmYpEKPOWul87T1OBsiY7LUlyNdpE1hwL+2yB+S2VlXKcXJL8ki5CFjFBPAjGS6WT0MRolotRuq0rU4XHlVAeS3n5YXGiCVG70pWp69xMWOvpWwRBRLtzrqwj7a8VJyc+GO0f68yGbIuTt2GIJmedQNPzSL7es7Qyi0V/txgt9fAuKptOWL94xllUKg5h6lFh/dZGFKR724yt10aY9RuFAUwO98bsMx0vd19Howy7ZtiVjnX7LjsQ/d4ZdmUjwp7BAY38Kuutzn5nnrB8KcMuzH6fNQfAdVWTbahdLqFXtS7EtBH4z1BAftIdcxebeUVONXjftHRHHdxOezF9fehfgzoNxJUwLgWFZxNX0rig2sBCHBdEG9KxfwHlbn1X60JMEK4+fdZ9+SsgvOJGaV6Gguq9ko79RLYL1dehEiT5pHzN3DUJ9LdhxKXnJjdOtz9Eum7Z8oqL6GmDGJkl2UbjJQJIDF2UaQsN0lMSbJrmgIjaIAsN1fQAitu0/INtqGqQXy3j0dLUEfdxPCKq/m0qm8r/nvqdDW5/PFTq3w7g9pPApfbCfc4y6k9+Tm3rQFb7mFuq+wag9sbApvIwHbdxITZz1aBhPWRKq/qawLAsmC/UDRqMTv97UrfScNsv32BrZDgvmQVVJWNm3lR125HMqVs1gTdVLoPBYDAYDAZH4R8eaVEbhZaf7QAAAABJRU5ErkJggg==';

export interface EmployeePositionTag {
    cssClasses : string,
    label : string,
    value : SysRoleName,
    ordering : number
    order : number,
}

export const EmployeePositionTagOrdering : Record<SysRoleName , EmployeePositionTag> = {
    student             : { cssClasses : 'ictu-badge ictu-badge--success' , label : 'Học sinh' , value : 'student' , ordering : 14 , order : 100 }
}

export const EMPLOYEE_POSITION_OPTIONS : IctuDropdownOptionElement<string>[] = Object.values<{ label : string, value : string }>( EmployeePositionTagOrdering );
