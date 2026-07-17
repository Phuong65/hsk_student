import { Component , computed , inject , OnDestroy , OnInit , Signal , signal , WritableSignal } from '@angular/core';
import { LoadingProgressComponent } from "@theme/components/loading-progress/loading-progress.component";
import { AppState } from "@models/app-state";
import { InputText } from "primeng/inputtext";
import { MatButton } from "@angular/material/button";
import { FormControl , FormGroup , ReactiveFormsModule , Validators } from "@angular/forms";
import { AuthenticationService } from "@services/authentication.service";
import { User } from "@models/user";
import { debounceTime , firstValueFrom , map , Observable , of , Subject , switchMap , takeUntil } from "rxjs";
import { NgOptimizedImage } from "@angular/common";
import { NotificationService } from "@services/notification.service";
import { IctuImageResizeComponent , ImageResizerConfig , ImageResizerDto } from "@components/ictu-image-resize/ictu-image-resize.component";
import { MatDialog , MatDialogRef } from "@angular/material/dialog";
import { UserService } from "@services/user.service";
import { ACADEMIC_DEGREE_OPTIONS , ACADEMIC_RANK_OPTIONS , AcademicDegree , AcademicRank , Employee , EMPLOYEE_CONTRACT_STATUS_OPTIONS , EmployeeContractStatus , Gender , SocialMedia } from "@models/employee";
import { IctuDropdownOption , IctuDropdownOptionElement } from "@models/ictu-dropdown-option";
import { InfoFormEmployeeComponent } from "@pages/admin/children/account/children/info-form-employee/info-form-employee.component";
import { InfoFormAboutMeComponent } from "@pages/admin/children/account/children/info-form-about-me/info-form-about-me.component";
import { InfoFormSettingsComponent } from "@pages/admin/children/account/children/info-form-settings/info-form-settings.component";
import { EmployeesService } from "@services/employees.service";
import { Helper } from "@utilities/helper";

type AccountInfoSessionName = 'USER' | 'EMPLOYEE' | 'SETTINGS' | 'ABOUT_ME';

interface AccountInfoSession {
	name : AccountInfoSessionName;
	form : FormGroup;
	loading : boolean;
}

type EmployeeProfile = Pick<Employee , 'id' | 'user_id' | 'email' | 'phone' | 'name' | 'full_name' | 'code' | 'donvi_id' | 'csdt_id' | 'gender' | 'dob' | 'academic_degree' | 'academic_rank' | 'linhvuc_id' | 'workplace' | 'workplace_position' | 'nationality' | 'language' | 'province_id' | 'ward_id' | 'street' | 'social_media' | 'contract_status' | 'status'>

type EmployeeFormStructure = {
	[T in EmployeeProfile as string] : FormControl<any>
};

interface EmployeeForm extends EmployeeFormStructure {
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
	social_media : FormControl<SocialMedia>,
	contract_status : FormControl<EmployeeContractStatus>,
	status : FormControl<number>,
}

@Component( {
	selector    : 'app-info' ,
	imports     : [ LoadingProgressComponent , InputText , MatButton , ReactiveFormsModule , NgOptimizedImage , InfoFormEmployeeComponent , InfoFormAboutMeComponent , InfoFormSettingsComponent ] ,
	templateUrl : './info.component.html' ,
	styleUrl    : './info.component.css'
} )
export default class InfoComponent implements OnInit , OnDestroy {

	private employeesService : EmployeesService = inject( EmployeesService );

	private userService : UserService = inject( UserService );

	private auth : AuthenticationService = inject( AuthenticationService );

	private notificationService : NotificationService = inject( NotificationService );

	readonly state : WritableSignal<AppState> = signal<AppState>( 'success' );

	readonly user : WritableSignal<User> = signal<User>( null );

	readonly avatar : Signal<string> = computed( () : string => this.user() ? this.user().avatar : 'assets/images/user/avatar-2.jpg' );

	readonly isEmployee : Signal<boolean> = computed( () : boolean => !! this.auth.employee );

	readonly userSession : AccountInfoSession = {
		name    : 'USER' ,
		loading : false ,
		form    : new FormGroup( {
			display_name : new FormControl( this.auth.user.display_name , [ Validators.required , Validators.minLength( 3 ) , Validators.maxLength( 200 ) ] )
		} )
	}

	readonly employeeForm : AccountInfoSession = {
		name    : 'EMPLOYEE' ,
		loading : false ,
		form    : new FormGroup<EmployeeForm>( {
			user_id            : new FormControl( 0 , Validators.required ) ,
			academic_degree    : new FormControl( '' ) ,
			academic_rank      : new FormControl( '' ) ,
			code               : new FormControl( '' ) ,
			contract_status    : new FormControl( 'CHO_DUYET' , [ Validators.required ] ) ,
			csdt_id            : new FormControl( 0 ) ,
			dob                : new FormControl( '' , [ Validators.required ] ) ,
			donvi_id           : new FormControl( 0 ) ,
			email              : new FormControl( '' , [ Validators.required , Validators.email ] ) ,
			full_name          : new FormControl( '' , [ Validators.required , Validators.minLength( 3 ) , Validators.maxLength( 200 ) ] ) ,
			gender             : new FormControl( 'KHAC' , [ Validators.required ] ) ,
			language           : new FormControl( '' ) ,
			linhvuc_id         : new FormControl( 0 ) ,
			name               : new FormControl( '' ) ,
			nationality        : new FormControl( '' ) ,
			phone              : new FormControl( '' , [ Validators.required ] ) ,
			province_id        : new FormControl( 0 ) ,
			social_media       : new FormControl( { facebook : '' , instagram : '' , tiktok : '' , linkedIn : '' , youtube : '' } ) ,
			status             : new FormControl( 0 ) ,
			street             : new FormControl( '' ) ,
			ward_id            : new FormControl( 0 ) ,
			workplace          : new FormControl( '' ) ,
			workplace_position : new FormControl( '' )
		} )
	}

	private destroy$ : Subject<void> = new Subject<void>();

	private observeAvatarChoose : Subject<void> = new Subject<void>();

	private dialog : MatDialog = inject( MatDialog );

	private _submitter : Record<AccountInfoSessionName , () => void> = {
		USER     : () : void => {
			this.userSession.loading = true;
			this.userService.update( { display_name : this.userSession.form.value.display_name } ).pipe(
				takeUntil( this.destroy$ )
			).subscribe( {
				next  : () : void => {
					this.userSession.loading = false;
					const user : User        = { ... this.auth.user };
					user.display_name        = this.userSession.form.value.display_name;
					this.auth.saveUser( user );
				} ,
				error : () : void => {
					this.userSession.loading = false;
				}
			} )
		} ,
		EMPLOYEE : () : void => {
		} ,
		SETTINGS : () : void => {
		} ,
		ABOUT_ME : () : void => {
		}
	}

	private formSubmitterObserver : Subject<AccountInfoSessionName> = new Subject();

	readonly employeeMajorListOptions : WritableSignal<IctuDropdownOptionElement<number>[]> = signal<IctuDropdownOptionElement<number>[]>( [] );

	readonly genderOptions : IctuDropdownOptionElement<Gender>[] = [
		{ value : 'NAM' , label : 'Nam' } ,
		{ value : 'NU' , label : 'Nữ' } ,
		{ value : 'KHAC' , label : 'Khác' }
	]

	readonly ACADEMIC_RANK_OPTIONS : IctuDropdownOptionElement<AcademicRank>[] = ACADEMIC_RANK_OPTIONS;

	readonly ACADEMIC_DEGREE_OPTIONS : IctuDropdownOptionElement<AcademicDegree>[] = ACADEMIC_DEGREE_OPTIONS;

	readonly EMPLOYEE_CONTRACT_STATUS_OPTIONS : IctuDropdownOptionElement<EmployeeContractStatus>[] = EMPLOYEE_CONTRACT_STATUS_OPTIONS;

	get employeeFormControls () : EmployeeForm {
		return this.employeeForm.form.controls as EmployeeForm;
	}

	protected readonly tabActive : WritableSignal<AccountInfoSessionName> = signal<AccountInfoSessionName>( 'USER' );

	protected readonly dmLinhVuc : WritableSignal<IctuDropdownOption<number>[]> = signal<IctuDropdownOption<number>[]>( [] );

	constructor () {
		this.auth.onUserSetup.pipe(
			takeUntil( this.destroy$ )
		).subscribe( ( user : User ) : void => {
			this.user.set( user );
		} );

		this.observeAvatarChoose.pipe(
			takeUntil( this.destroy$ ) ,
			debounceTime( 250 )
		).subscribe( () : void => {
			this.openAvatarFileChoose();
		} );

		this.formSubmitterObserver.pipe(
			takeUntil( this.destroy$ ) ,
			debounceTime( 250 )
		).subscribe( ( form : AccountInfoSessionName ) : void => {
			this._submitter[ form ]();
		} )
	}

	ngOnInit () : void {
		if ( this.auth.employee ) {
			this.employeeForm.form.reset( {
				user_id            : this.auth.employee.id ,
				academic_degree    : this.auth.employee.academic_degree ,
				academic_rank      : this.auth.employee.academic_rank ,
				code               : this.auth.employee.code ,
				contract_status    : this.auth.employee.contract_status ,
				csdt_id            : this.auth.employee.csdt_id ,
				dob                : this.auth.employee.dob ,
				donvi_id           : this.auth.employee.donvi_id ,
				email              : this.auth.employee.email ,
				full_name          : this.auth.employee.full_name ,
				gender             : this.auth.employee.gender ,
				language           : this.auth.employee.language ,
				linhvuc_id         : this.auth.employee.linhvuc_id ,
				name               : this.auth.employee.name ,
				nationality        : this.auth.employee.nationality ,
				phone              : this.auth.employee.phone ,
				province_id        : this.auth.employee.province_id ,
				social_media       : this.auth.employee.social_media ? Object.assign<SocialMedia , SocialMedia>( { facebook : '' , instagram : '' , tiktok : '' , linkedIn : '' , youtube : '' } , this.auth.employee.social_media ) : { facebook : '' , instagram : '' , tiktok : '' , linkedIn : '' , youtube : '' } ,
				status             : this.auth.employee.status ,
				street             : this.auth.employee.street ,
				ward_id            : this.auth.employee.ward_id ,
				workplace          : this.auth.employee.workplace ,
				workplace_position : this.auth.employee.workplace_position
			} );

			this.employeeForm.form.get( 'email' ).disable();
			this.employeeForm.form.get( 'phone' ).disable();
			this.employeeForm.form.get( 'contract_status' ).disable();
		}
	}

	public btnUploadAvatar () : void {
		this.observeAvatarChoose.next();
	}

	private openAvatarFileChoose () : void {
		const inputFile : HTMLInputElement = Object.assign<HTMLInputElement , any>( document.createElement<'input'>( "input" ) , {
			type   : 'file' ,
			accept : 'image/png, image/gif, image/jpeg, image/bmp, image/x-icon'
		} );

		inputFile.onchange = () : void => {
			if ( inputFile.files.length ) {
				const file : File = inputFile.files[ 0 ];
				switch ( true ) {
					case ( ! [ 'png' , 'jpeg' , 'jpg' , 'webp' ].includes( file.name.split( '.' ).pop().toLowerCase() ) ):
						this.notificationService.toastError( 'Hệ thống chỉ chấp nhận file có phần mở rộng là jpg, jpeg, png, webp' , 'Lỗi định dạng file' )
						break;
					case ( ( file.size / ( 1024 * 1024 ) ) > 10 ):
						this.notificationService.toastError( 'Dung lượng file upload không được vượt quá 10Mb!' , 'Lỗi dung lượng file' )
						break;
					default:
						void this.makeAvatar( file );
						break
				}
			}
			setTimeout( () : void => inputFile.remove() , 1000 );
		};
		inputFile.click();
	}

	private async makeAvatar ( file : File ) : Promise<void> {
		try {
			const data : Partial<ImageResizerConfig> = {
				resizeToWidth : 200 ,
				aspectRatio   : 1 ,
				format        : 'png' ,
				dataUrl       : URL.createObjectURL( file )
			};

			const dialogRef : MatDialogRef<IctuImageResizeComponent> = this.dialog.open( IctuImageResizeComponent , {
				data ,
				disableClose : true ,
				panelClass   : 'image-resizer-panel'
			} );

			const result : ImageResizerDto = await firstValueFrom( dialogRef.afterClosed() );
			if ( ! result.error ) {
				const fileName : string  = `user-avatar-${ this.auth.user.id }-${ Date.now() }.png`
				const file : File        = this.auth.helper.blobToFile( result.data.blob , fileName );
				this.userSession.loading = true;
				this.auth.updateAvatar( file ).pipe(
					switchMap( ( photo : string ) : Observable<string> => {
						if ( this.auth.employee ) {
							return this.employeesService.update( this.auth.employee.id , { photo } ).pipe( map( () : string => photo ) )
						}
						else {
							return of( photo )
						}
					} )
				).subscribe( {
					next  : ( photo : string ) : void => {
						const employee : Employee = Helper.cloneObject( this.auth.employee );
						this.auth.employee        = { ... employee , photo };
						this.userSession.loading  = false;
						this.notificationService.toastSuccess( 'Cập nhật avatar thành công' );
					} ,
					error : () : void => {
						this.userSession.loading = false;
						this.notificationService.toastError( 'Cập nhật avatar thất bại' );
					}
				} );
			}
		}
		catch ( e ) {
			console.log( e );
		}
	}

	public btnSubmitForm ( session : AccountInfoSessionName ) : void {
		this.formSubmitterObserver.next( session );
	}

	public activeTab ( tab : AccountInfoSessionName , event : Event ) : void {
		event.preventDefault();
		event.stopPropagation();
		this.tabActive.update( () : AccountInfoSessionName => tab );
	}

	ngOnDestroy () : void {
		this.destroy$.next();
		this.destroy$.complete();
	}

}
