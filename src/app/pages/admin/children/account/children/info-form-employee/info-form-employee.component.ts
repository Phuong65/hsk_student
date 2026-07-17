import { Component , computed , inject , model , ModelSignal , signal , Signal , WritableSignal } from '@angular/core';
import { NotificationService } from "@services/notification.service";
import { IctuFileService } from "@services/ictu-file.service";
import { MatDialog , MatDialogRef } from "@angular/material/dialog";
import { IctuDropdownOption , IctuDropdownOptionElement } from "@models/ictu-dropdown-option";
import { debounceTime , firstValueFrom , map , Subject , takeUntil } from "rxjs";
import { FormControl , FormGroup , ReactiveFormsModule , Validators } from "@angular/forms";
import { ACADEMIC_DEGREE_OPTIONS , ACADEMIC_RANK_OPTIONS , AcademicDegree , AcademicRank , Employee , EMPLOYEE_CONTRACT_STATUS_OPTIONS , EMPLOYEE_LANGUAGE_OPTIONS , EmployeeContractStatus , Gender , SystemLanguageName } from "@models/employee";
import { AppState } from "@models/app-state";
import { InputMask } from "primeng/inputmask";
import { InputText } from "primeng/inputtext";
import { Select } from "primeng/select";
import { Textarea } from "primeng/textarea";
import { IctuImageResizeComponent , ImageResizerConfig , ImageResizerDto } from "@components/ictu-image-resize/ictu-image-resize.component";
import { Helper } from "@utilities/helper";
import { ICTUStandardFile } from "@models/file";
import { AuthenticationService } from "@services/authentication.service";
import { MatButton } from "@angular/material/button";
import { FormGroupType } from "@models/common";
import { Tooltip } from "primeng/tooltip";

type EmployeeProfileFieldName = Pick<Employee , 'photo' | 'user_id' | 'email' | 'phone' | 'name' | 'full_name' | 'code' | 'donvi_id' | 'csdt_id' | 'gender' | 'dob' | 'academic_degree' | 'academic_rank' | 'linhvuc_id' | 'workplace' | 'workplace_position' | 'nationality' | 'language' | 'province_id' | 'ward_id' | 'street' | 'contract_status' | 'status'>

type EmployeeProfileFormGroup = FormGroupType<EmployeeProfileFieldName>;

@Component( {
	selector    : 'app-info-form-employee' ,
	imports     : [ InputMask , InputText , ReactiveFormsModule , Select , Textarea , MatButton , Tooltip ] ,
	templateUrl : './info-form-employee.component.html' ,
	styleUrl    : './info-form-employee.component.css'
} )
export class InfoFormEmployeeComponent {

	private auth : AuthenticationService = inject( AuthenticationService );

	// private linhVucDaoTaoService : LinhVucDaoTaoService = inject( LinhVucDaoTaoService );

	private notification : NotificationService = inject<NotificationService>( NotificationService );

	private fileService : IctuFileService = inject<IctuFileService>( IctuFileService );

	private dialog : MatDialog = inject( MatDialog );

	protected readonly profilePhotoPlaceholder : Signal<string> = signal<string>( 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMwAAADACAMAAAB/Pny7AAAAMFBMVEXk5ueutLfb3t+nrrHn6eqrsbTh4+S7wMPT1tixt7rKztDBxsi3vL/q7O3Y293Q09Wdj+FKAAAFPklEQVR4nO2c25LbIAxADRZgrv7/vy042SabOyBH8g7npdP2xWckQBDQNA0Gg8FgMBgMBoPBYDAYDAaDwWAwGAwGg92BzKRlQevtL0cFQMvFOe/NhnduSfqQPtlk8SZYdY0Nxi86HswH4uKDFUrcUoR8OlJ4skoQD0zOPsKG5TDRick+E/kvZNMhdECb+Y1KsZmNZm8DsKp3YfkZPSv1x74BtP8gLGeYBwdS+NxlGzl8bT5OsUuqLRNXHVensuk4pmtOg0uGpQ24FpViQ/3l98Da6CLEyi00sNhmGcFsTgMZmgbMhrLM1hvf7lJWT+rP/8Vas1Y+sGE0CYDsictmwyfRwPTKqBCpJc7A0pdkW2i4zM+xW6VAbXEiuv7AlCKNRaIBgkrGUnsU4to7+s9wCA101DHXqEBtUqYyHBfBoeAEj+WiPLmM7qgwb2SCJHaBFWnIZCx1nkFXufwb5WldJt1dll3JGNo8gxTQXHKe0W45O3b+D1C0gwbajpeeyRDv0RDHf5kBNKWLRBz/ZQYg3XAmg+giRJCEMriTmaA9QYOEt/7Ty+CVzBtqIZXBHP9Fhs6l/LqEKjP/JRnayCCnGW1k/tSYwZ7NxjqDJoN2ArBhKcuZXGhiutDWZpP+S1sAzPOMsjmjlcHdaRJvm3t+Mb+Hss7M9PxkfkdIpC6ohwDE47/8bIbmUm440cpg1gCB/NoJoC2byhBnGWqe0f8OCBIrz2gLsxMRK88MvQvCxZkzxCvmiYhzEBg4uOTSGeWGBvm8fCJilDRsrjVNCLeaeMRlwtgIzPRrzIXOn2mUZROYTOqMDPV1ht90JRrxDvOOnpMN8ssMt0D77QYG1fIdrRto+vs/j2jbpjF93dRUcSrBoPB/CDTY8Llqfkt1lcakVH5M9E9fAd+jBP1FxpfA+nFwVGC2Vt4D8rPg5LBwHfpXwLSYt881lfJ8X2j+AvRi5lc6SpmF7yx2C+jk1ROf/O8+8StgXqNXc++j5jnQ/qLUCkzJ2zlT2meUP2d7lJHyEIhxksvqnFsXOcVDdGd4CfyH+ksa2b5cn5HnJjonzv95DPKn5u9PKSeX9yYEW6bibeGxIRjv3ZpSVpu4GxUPmYpEKPOWul87T1OBsiY7LUlyNdpE1hwL+2yB+S2VlXKcXJL8ki5CFjFBPAjGS6WT0MRolotRuq0rU4XHlVAeS3n5YXGiCVG70pWp69xMWOvpWwRBRLtzrqwj7a8VJyc+GO0f68yGbIuTt2GIJmedQNPzSL7es7Qyi0V/txgt9fAuKptOWL94xllUKg5h6lFh/dZGFKR724yt10aY9RuFAUwO98bsMx0vd19Howy7ZtiVjnX7LjsQ/d4ZdmUjwp7BAY38Kuutzn5nnrB8KcMuzH6fNQfAdVWTbahdLqFXtS7EtBH4z1BAftIdcxebeUVONXjftHRHHdxOezF9fehfgzoNxJUwLgWFZxNX0rig2sBCHBdEG9KxfwHlbn1X60JMEK4+fdZ9+SsgvOJGaV6Gguq9ko79RLYL1dehEiT5pHzN3DUJ9LdhxKXnJjdOtz9Eum7Z8oqL6GmDGJkl2UbjJQJIDF2UaQsN0lMSbJrmgIjaIAsN1fQAitu0/INtqGqQXy3j0dLUEfdxPCKq/m0qm8r/nvqdDW5/PFTq3w7g9pPApfbCfc4y6k9+Tm3rQFb7mFuq+wag9sbApvIwHbdxITZz1aBhPWRKq/qawLAsmC/UDRqMTv97UrfScNsv32BrZDgvmQVVJWNm3lR125HMqVs1gTdVLoPBYDAYDAZH4R8eaVEbhZaf7QAAAABJRU5ErkJggg==' );

	dmLinhVuc : ModelSignal<IctuDropdownOption<number>[]> = model<IctuDropdownOption<number>[]>( [] );

	private destroy$ : Subject<void> = new Subject<void>();

	// private submittingObserver : Subject<any> = new Subject<any>();

	protected readonly formGroup : EmployeeProfileFormGroup = new FormGroup( {
		photo              : new FormControl<string>( '' ) ,
		user_id            : new FormControl<number>( 0 ) ,
		name               : new FormControl<string>( '' ) ,
		full_name          : new FormControl<string>( '' , [ Validators.required , Validators.minLength( 3 ) , Validators.maxLength( 200 ) ] ) ,
		academic_degree    : new FormControl<AcademicDegree>( '' ) ,
		academic_rank      : new FormControl<AcademicRank>( '' ) ,
		code               : new FormControl<string>( { value : '' , disabled : true } ) ,
		contract_status    : new FormControl<EmployeeContractStatus>( { value : '' , disabled : true } ) ,
		csdt_id            : new FormControl<number>( 0 ) ,
		dob                : new FormControl<string>( '' , [ Validators.required ] ) ,
		donvi_id           : new FormControl<number>( 0 ) ,
		email              : new FormControl<string>( '' , [ Validators.required , Validators.email ] ) ,
		gender             : new FormControl<Gender>( 'KHAC' , [ Validators.required ] ) ,
		linhvuc_id         : new FormControl<number>( 0 ) ,
		language           : new FormControl<SystemLanguageName>( 'vi' ) ,
		nationality        : new FormControl<string>( '' ) ,
		phone              : new FormControl<string>( '' , [ Validators.required ] ) ,
		province_id        : new FormControl<number>( 0 ) ,
		status             : new FormControl<number>( 0 ) ,
		street             : new FormControl<string>( '' ) ,
		ward_id            : new FormControl<number>( 0 ) ,
		workplace          : new FormControl<string>( '' ) ,
		workplace_position : new FormControl<string>( '' )
	} );

	protected readonly ACADEMIC_RANK_OPTIONS : IctuDropdownOptionElement<AcademicRank>[] = ACADEMIC_RANK_OPTIONS;

	protected readonly EMPLOYEE_CONTRACT_STATUS_OPTIONS : IctuDropdownOptionElement<EmployeeContractStatus>[] = EMPLOYEE_CONTRACT_STATUS_OPTIONS;

	protected readonly ACADEMIC_DEGREE_OPTIONS : IctuDropdownOptionElement<AcademicDegree>[] = ACADEMIC_DEGREE_OPTIONS;

	protected readonly EMPLOYEE_LANGUAGE_OPTIONS : IctuDropdownOptionElement<SystemLanguageName>[] = EMPLOYEE_LANGUAGE_OPTIONS;

	protected readonly genderOptions : IctuDropdownOptionElement<Gender>[] = [
		{ value : 'NAM' , label : 'Nam' } ,
		{ value : 'NU' , label : 'Nữ' } ,
		{ value : 'KHAC' , label : 'Khác' }
	]

	protected readonly state : WritableSignal<AppState | 'updating'> = signal<AppState>( 'loading' );

	protected readonly isLoading : Signal<boolean> = computed( () : boolean => [ 'updating' , 'loading' ].includes( this.state() ) );

	protected readonly loadingTitle : Signal<string> = computed( () : string => this.state() === 'loading' ? 'Đang tải xuống thông tin...' : 'Cập nhật thông tin...' );

	private openFileChooserObserver : Subject<void> = new Subject<void>();

	protected readonly Validators : typeof Validators = Validators;

	constructor () {
		this.openFileChooserObserver.pipe(
			takeUntil( this.destroy$ ) ,
			debounceTime( 250 )
		).subscribe( () : void => {
			this.callFileChooser();
		} );
	}

	public getControl<K extends keyof EmployeeProfileFieldName> ( key : K ) : FormControl<EmployeeProfileFieldName[K]> {
		return this.formGroup.get( key as string ) as FormControl<EmployeeProfileFieldName[K]>;
	}

	private callFileChooser () : void {
		const fileChooser : HTMLInputElement = document.createElement( 'input' );
		fileChooser.type                     = 'file';
		fileChooser.accept                   = 'image/png, image/gif, image/jpeg, image/bmp, image/x-icon';
		fileChooser.onchange                 = () : void => {
			if ( fileChooser.files.length ) {
				void this.profilePhotoMaker( fileChooser.files.item( 0 ) );
			}
			setTimeout( () : void => fileChooser.remove() , 1000 );
		};
		fileChooser.click();
	}

	btnUpdateEmployeePhoto () : void {
		this.openFileChooserObserver.next();
	}

	private async profilePhotoMaker ( file : File ) : Promise<any> {
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
				const fileName : string = `profile-photo-${ this.auth.user.id }-${ Date.now() }.png`;
				const photo : File      = Helper.blobToFile( result.data.blob , fileName );
				this.fileService.upload( photo , { tag : 'profile-photo' , public : 1 } ).pipe(
					map( ( info : ICTUStandardFile ) : string => this.fileService.getPublicLink( info ) ) ,
					takeUntil( this.destroy$ )
				).subscribe( {
					next  : ( src : string ) : void => {
						this.getControl( 'photo' ).setValue( src );
						this.getControl( 'photo' ).markAsTouched( { emitEvent : true } );
					} ,
					error : () : void => {
						this.notification.toastError( 'Upload file thất bại' );
					}
				} );
			}
		}
		catch ( e ) {
			console.log( e );
		}
	}
}
