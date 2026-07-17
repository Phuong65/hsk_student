import { InjectionToken , ValueProvider } from '@angular/core';
import { SysRoleName } from '@models/role';

export const PROVIDED_ROLE : InjectionToken<SysRoleName> = new InjectionToken<SysRoleName>( 'Tên vai trò được sử dụng khi người dùng truy cập vào từ chức năng' );

export const ROLE_PROVIDER : Record<SysRoleName , ValueProvider> = {
    admin               : { provide : PROVIDED_ROLE , useValue : 'admin' } ,
    ceo                 : { provide : PROVIDED_ROLE , useValue : 'ceo' } ,
    training_management : { provide : PROVIDED_ROLE , useValue : 'training_management' } ,
    general_management  : { provide : PROVIDED_ROLE , useValue : 'general_management' } ,
    sales               : { provide : PROVIDED_ROLE , useValue : 'sales' } ,
    supporter           : { provide : PROVIDED_ROLE , useValue : 'supporter' } ,
    accountant          : { provide : PROVIDED_ROLE , useValue : 'accountant' } ,
    teacher             : { provide : PROVIDED_ROLE , useValue : 'teacher' } ,
    teaching_assistant  : { provide : PROVIDED_ROLE , useValue : 'teaching_assistant' } ,
    parents             : { provide : PROVIDED_ROLE , useValue : 'parents' } ,
    student             : { provide : PROVIDED_ROLE , useValue : 'student' } ,
    marketing           : { provide : PROVIDED_ROLE , useValue : 'marketing' } ,
    mod_media           : { provide : PROVIDED_ROLE , useValue : 'mod_media' } ,
    mod_comments        : { provide : PROVIDED_ROLE , useValue : 'mod_comments' }
}
