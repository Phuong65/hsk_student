import { Navigation } from '@theme/types/navigation';

export const menus : Navigation[] = [
	{
		id        : 'navigation' ,
		title     : 'Navigation' ,
		type      : 'group' ,
		customSvg : 'icon-navigation' ,
		children  : [
			{
				id      : 'Dashboard' ,
				title   : 'Dashboard' ,
				type    : 'item' ,
				classes : 'nav-item' ,
				url     : 'dashboard' ,
				icon    : 'ti ti-device-desktop-analytics'
				// customSvg : '#custom-status-up'
			}
		]
	} ,
	{
		id        : 'widget' ,
		title     : 'Widget' ,
		type      : 'group' ,
		customSvg : 'icon-widget' ,
		children  : [
			{
				id        : 'data' ,
				title     : 'Data' ,
				type      : 'item' ,
				classes   : 'nav-item' ,
				url       : '/widget/data' ,
				customSvg : '#custom-fatrows'
			}
		]
	} ,
	{
		id        : 'auth' ,
		title     : 'Authentication' ,
		type      : 'group' ,
		customSvg : 'icon-navigation' ,
		children  : [
			{
				id          : 'Login' ,
				title       : 'Login' ,
				type        : 'item' ,
				classes     : 'nav-item' ,
				url         : '/auth/login' ,
				customSvg   : '#custom-shield' ,
				target      : true ,
				breadcrumbs : false
			} ,
			{
				id          : 'register' ,
				title       : 'Register' ,
				type        : 'item' ,
				classes     : 'nav-item' ,
				url         : '/auth/register' ,
				customSvg   : '#custom-password-check' ,
				target      : true ,
				breadcrumbs : false
			}
		]
	} ,
	{
		id        : 'ui-component' ,
		title     : 'Ui Component' ,
		type      : 'group' ,
		customSvg : 'icon-navigation' ,
		children  : [
			{
				id        : 'typography' ,
				title     : 'Typography' ,
				type      : 'item' ,
				classes   : 'nav-item' ,
				url       : 'component/typography' ,
				customSvg : '#custom-text-block'
			} ,
			{
				id        : 'buttons' ,
				title     : 'Buttons' ,
				type      : 'item' ,
				classes   : 'nav-item' ,
				url       : 'component/buttons' ,
				customSvg : '#custom-shapes'
			} ,
			{
				id        : 'color' ,
				title     : 'Color' ,
				type      : 'item' ,
				classes   : 'nav-item' ,
				url       : 'component/color' ,
				customSvg : '#custom-clipboard'
			} , {
				id      : 'toast' ,
				title   : 'Toast' ,
				type    : 'item' ,
				classes : 'nav-item' ,
				url     : 'component/toasts' ,
				icon    : 'ph-duotone ph-megaphone'
			} ,
			{
				id        : 'ui_progress' ,
				title     : 'Progress' ,
				type      : 'item' ,
				classes   : 'nav-item' ,
				url       : 'component/progress' ,
				customSvg : '#custom-clipboard'
			} ,
			{
				id        : 'tabler' ,
				title     : 'Tabler' ,
				type      : 'item' ,
				classes   : 'nav-item' ,
				url       : 'https://tabler-icons.io/' ,
				customSvg : '#custom-mouse-circle' ,
				target    : true ,
				external  : true
			} ,
			{
				id      : 'icons' ,
				title   : 'Icons' ,
				type    : 'item' ,
				classes : 'nav-item' ,
				url     : 'component/icons' ,
				icon    : 'ph-duotone ph-paint-brush-broad'
			}
		]
	} ,
	{
		id        : 'other' ,
		title     : 'Other' ,
		type      : 'group' ,
		customSvg : 'icon-navigation' ,
		children  : [
			{
				id        : 'menu-levels' ,
				title     : 'Menu levels' ,
				type      : 'collapse' ,
				customSvg : '#custom-level' ,
				children  : [
					{
						id    : 'level-2-1' ,
						title : 'Level 2.1' ,
						type  : 'item' ,
						url   : 'dashboard'
					} ,
					{
						id       : 'menu-level-2.2' ,
						title    : 'Menu Level 2.2' ,
						type     : 'collapse' ,
						classes  : 'edge' ,
						children : [
							{
								id    : 'menu-level-3.1' ,
								title : 'Menu Level 3.1' ,
								type  : 'item' ,
								url   : 'dashboard'
							} ,
							{
								id    : 'menu-level-3.2' ,
								title : 'Menu Level 3.2' ,
								type  : 'item' ,
								url   : 'dashboard'
							} ,
							{
								id       : 'menu-level-3.3' ,
								title    : 'Menu Level 3.3' ,
								type     : 'collapse' ,
								classes  : 'edge' ,
								children : [
									{
										id    : 'menu-level-4.1' ,
										title : 'Menu Level 4.1' ,
										type  : 'item' ,
										url   : 'dashboard'
									} ,
									{
										id    : 'menu-level-4.2' ,
										title : 'Menu Level 4.2' ,
										type  : 'item' ,
										url   : 'dashboard'
									}
								]
							}
						]
					} ,
					{
						id       : 'menu-level-2.3' ,
						title    : 'Menu Level 2.3' ,
						type     : 'collapse' ,
						classes  : 'edge' ,
						children : [
							{
								id    : 'menu-level-3.1' ,
								title : 'Menu Level 3.1' ,
								type  : 'item' ,
								url   : 'dashboard'
							} ,
							{
								id    : 'menu-level-3.2' ,
								title : 'Menu Level 3.2' ,
								type  : 'item' ,
								url   : 'dashboard'
							} ,
							{
								id       : 'menu-level-3.3' ,
								title    : 'Menu Level 3.3' ,
								type     : 'collapse' ,
								classes  : 'edge' ,
								children : [
									{
										id    : 'menu-level-4.1' ,
										title : 'Menu Level 4.1' ,
										type  : 'item' ,
										url   : 'dashboard'
									} ,
									{
										id    : 'menu-level-4.2' ,
										title : 'Menu Level 4.2' ,
										type  : 'item' ,
										url   : 'dashboard'
									}
								]
							}
						]
					}
				]
			} ,
			{
				id        : 'sample-page' ,
				title     : 'Sample Page' ,
				type      : 'item' ,
				classes   : 'nav-item' ,
				url       : 'sample-page' ,
				customSvg : '#custom-notification-status'
			}
		]
	}
];

export const AppTableRows : number = 20;

export const FileType : Map<string , string> = new Map( [
	[ 'application/vnd.google-apps.folder' , 'folder' ] ,
	[ 'audio/mpeg' , 'mp3' ] ,
	[ 'audio/mp3' , 'mp3' ] ,
	[ 'audio/x-aac' , 'x-aac' ] ,
	[ 'application/zip' , 'zip' ] ,
	[ 'application/x-zip-compressed' , 'zip' ] ,
	[ 'application/x-rar-compressed' , 'rar' ] ,
	[ 'application/x-7z-compressed' , 'zip' ] ,
	[ 'application/msword' , 'doc' ] ,
	[ 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' , 'docx' ] ,
	[ 'application/vnd.ms-powerpoint' , 'ppt' ] ,
	[ 'application/vnd.openxmlformats-officedocument.presentationml.presentation' , 'pptx' ] ,
	[ 'application/vnd.ms-excel' , 'xls' ] ,
	[ 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' , 'xlsx' ] ,
	[ 'application/vnd.google-apps.spreadsheet' , 'xlsx' ] ,
	[ 'application/pdf' , 'pdf' ] ,
	[ 'video/x-msvideo' , 'video' ] ,
	[ 'video/mp4' , 'mp4' ] ,
	[ 'image/png' , 'img' ] ,
	[ 'image/jpeg' , 'img' ] ,
	[ 'image/jpg' , 'img' ] ,
	[ 'image/gif' , 'img' ] ,
	[ 'text/plain' , 'text' ]
] );

const d : Date = new Date();

const diff : number = ( d.getTimezoneOffset() / 60 ) * -1;

export const currentUserTimeZone : string = `(UTC${ ( diff >= 0 ? ( '+' + diff.toString( 10 ).padStart( 2 , '0' ) ) : diff.toString( 10 ).padStart( 2 , '0' ) ) })`;

export const subtractTestScoresByPercentage : ( rawPoint : number , percentage : number ) => number = ( rawPoint : number , percentage : number ) : number => ( parseFloat( Math.max( rawPoint - ( ( rawPoint / 100 ) * percentage ) , 0 ).toFixed( 1 ) ) )

export const _10MB : number = 10485760;

export const _90MB : number = 94371840;

export const _100MB : number = 104857600;

export const _1Gb : number = 1073741824;

export const _2Gb : number = 2147483648;

export const _3Gb : number = 3221225472;

export const _5Gb : number = 5368709120;

export interface UserLanguage {
	value : AppLanguage;
	label : string;
	tran2vn : string;
}

export type AppLanguage = 'de' | 'en' | 'es' | 'fr' | 'it' | 'ja' | 'ko' | 'ru' | 'vi' | 'zh';

export const UserLanguage : UserLanguage[] = [
	{ value : 'de' , label : 'Deutsch' , tran2vn : 'Tiếng Đức' } ,
	{ value : 'en' , label : 'English' , tran2vn : 'Tiếng Anh' } ,
	{ value : 'es' , label : 'Español' , tran2vn : 'Tiếng Tây Ban Nha' } ,
	{ value : 'fr' , label : 'Français' , tran2vn : 'Tiếng Pháp' } ,
	{ value : 'it' , label : 'Italiano' , tran2vn : 'Tiếng Ý' } ,
	{ value : 'ja' , label : '日本語' , tran2vn : 'Tiếng Nhật' } ,
	{ value : 'ko' , label : '한국인' , tran2vn : 'Tiếng Hàn' } ,
	{ value : 'ru' , label : 'Русский' , tran2vn : 'Tiếng Nga' } ,
	{ value : 'vi' , label : 'Tiếng Việt' , tran2vn : 'Tiếng Việt' } ,
	{ value : 'zh' , label : '中国人' , tran2vn : 'Tiếng Trung' }
]

