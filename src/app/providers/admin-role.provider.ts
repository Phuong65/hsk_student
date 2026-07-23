import { InjectionToken , ValueProvider } from '@angular/core';
import { SysRoleName } from '@models/role';

export const PROVIDED_ROLE : InjectionToken<SysRoleName> = new InjectionToken<SysRoleName>( 'Tên vai trò được sử dụng khi người dùng truy cập vào từ chức năng' );

export const ROLE_PROVIDER : Record<SysRoleName , ValueProvider> = {
    student             : { provide : PROVIDED_ROLE , useValue : 'student' }
}
