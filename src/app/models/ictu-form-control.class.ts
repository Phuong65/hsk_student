import { FormControl , FormGroup , ValidatorFn } from '@angular/forms';

/** * Định nghĩa cấu trúc cấu hình cho từng control
 */
export interface ControlConfig<V> {
    value : V;
    validators? : ValidatorFn | ValidatorFn[];
}

/**
 * Biến đổi Interface T thành một object chứa cấu hình cho từng key của T
 */
export type FormConfig<T> = {
    [K in keyof T] : ControlConfig<T[K]>;
};

/**
 * T đại diện cho interface của Form (ví dụ: ClassSessionFormFields)
 */
export class IctuFormControlClass<T extends object> {
    public formGroup : FormGroup;

    constructor ( configs : FormConfig<T> ) {
        this.formGroup = this.generateFormGroup( configs );
    }

    private generateFormGroup ( configs : FormConfig<T> ) : FormGroup {
        const controls : any = {};

        for ( const key in configs ) {
            if ( Object.prototype.hasOwnProperty.call( configs , key ) ) {
                const config : ControlConfig<T[Extract<keyof T , string>]> = configs[ key ];
                controls[ key ]                                            = new FormControl( config.value , config.validators );
            }
        }
        return new FormGroup( controls );
    }

    /**
     * Lấy control với Type-safety tuyệt đối
     */
    public getControl<K extends keyof T> ( field : K ) : FormControl<T[K]> {
        return this.formGroup.get( field as string ) as FormControl<T[K]>;
    }

    /**
     * Reset giá trị cho một control cụ thể và đảm bảo đúng kiểu dữ liệu
     */
    public resetControl<K extends keyof T> ( field : K , value : T[K] , markAsTouched : boolean = false ) : void {
        const control : FormControl<T[K]> = this.getControl( field );
        if ( control ) {
            control.reset( value );
        }
        if ( markAsTouched ) {
            control.markAsTouched();
        }
    }

    /**
     * Đặt lại toàn bộ giá trị cho FormGroup.
     * Yêu cầu đối tượng truyền vào phải có ĐẦY ĐỦ các thuộc tính của T.
     */
    public setValue ( value : T ) : void {
        this.formGroup.setValue( value );
    }

    /**
     * Cập nhật một phần giá trị của FormGroup.
     * Cho phép truyền đối tượng thiếu một số thuộc tính (Partial<T>).
     */
    public patchValue ( value : Partial<T> ) : void {
        this.formGroup.patchValue( value );
    }

    /**
     * Cập nhật giá trị cho một control cụ thể duy nhất.
     */
    public setControlValue<K extends keyof T> ( field : K , value : T[K] ) : void {
        const control : FormControl<T[K]> = this.getControl( field );
        if ( control ) {
            control.setValue( value );
            control.markAsTouched();
        }
    }

    /**
     * lấy dữ liệu "sạch" ra để gửi lên Server sau khi người dùng nhập xong
     * */
    public getRawValue () : T {
        return this.formGroup.getRawValue() as T;
    }

    /**
     * Khóa một control cụ thể.
     * Khi bị disable, control sẽ không tham gia vào quá trình validation
     * và giá trị của nó sẽ bị loại bỏ khỏi formGroup.value (trừ khi dùng getRawValue).
     */
    public disableControl<K extends keyof T> ( field : K ) : void {
        this.getControl( field ).disable();
    }

    /**
     * Mở khóa một control cụ thể.
     */
    public enableControl<K extends keyof T> ( field : K ) : void {
        this.getControl( field ).enable();
    }

    /**
     * Chuyển đổi trạng thái Enable/Disable dựa trên điều kiện
     * @param field Tên control
     * @param condition Nếu true thì enable, false thì disable
     */
    public toggleControl<K extends keyof T> ( field : K , condition : boolean ) : void {
        if ( condition ) {
            this.enableControl( field );
        }
        else {
            this.disableControl( field );
        }
    }
}
