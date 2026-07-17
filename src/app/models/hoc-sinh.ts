import { IctuBaseModel } from '@models/ictu-base-model';
import { Helper } from '@utilities/helper';
import { regexMatchALink } from '@models/file';

export interface HocSinh extends IctuBaseModel {
    donvi_id : number;
    phuhuynh_id : number;
    user_id : number;
    sale_id : number;
    code : string;
    email : string;
    phone : string;
    full_name : string;
    name : string;
    english_name : string;
    dob : string;
    gender : string;
    avatar : string;
    nguonden : number;
    regular_school : string;
    regular_class : string;
    tinh : number;
    huyen : number;
    xa : number;
    address : string;
    status : number;
}

export function studentAvatar ( student : Pick<HocSinh , 'avatar' | 'gender'> ) : string {
    if ( student ) {
        switch ( true ) {
            case regexMatchALink( [ 'g' , 'i' ] ).test( student.avatar ):
                return student.avatar;
            case Helper.removeAccents( student.gender ) === 'nu':
                return 'images/user/avatar-9.jpg';
            default:
                return 'images/user/avatar-2.jpg';
        }
    }
    return 'images/user/avatar-2.jpg'
}
