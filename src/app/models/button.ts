export interface ButtonBase {
	name : string,
	label : string,
	icon : string,
	class : string,
	readonly : boolean,
	ngStyle? : { [ klass : string ] : any; }; // fit to ngStyle
}

export type Button = Partial<ButtonBase>;

export const BUTTON_CLOSE : Button = {
	label    : 'Đóng' ,
	icon     : 'ti-x ti' ,
	readonly : false
};

export const BUTTON_CLOSED : Button = {
	label : 'Đóng' ,
	name  : 'close' ,
	class : 'p-button-danger' ,
	icon  : 'pi pi-times'
};

export const BUTTON_NO : Button = {
	label : 'Không' ,
	name  : 'no' ,
	class : 'p-button-danger' ,
	icon  : 'pi pi-times'
};

export const BUTTON_YES : Button = {
	label : 'Có' ,
	name  : 'yes' ,
	class : 'p-button-success' ,
	icon  : 'pi pi-check'
};

export const BUTTON_SAVE : Button = {
	label : 'Lưu lại' ,
	name  : 'saved' ,
	class : 'p-button-success' ,
	icon  : 'pi pi-save'
};

export const BUTTON_CANCEL : Button = {
	label : 'Hủy' ,
	name  : 'cancel' ,
	class : 'p-button-secondary' ,
	icon  : 'pi pi-ban'
};

export const BUTTON_CONFIRMED : Button = {
	label : 'Xác nhận' ,
	name  : 'confirmed' ,
	class : 'p-button-primary' ,
	icon  : 'pi pi-check'
};

export const BUTTON_DISMISS : Button = {
	label : 'Dismiss' ,
	name  : 'dismiss' ,
	class : 'p-button-primary' ,
	icon  : 'pi pi-times'
};
