export interface NavigationItem {
	id : string;
	title : string;
	type : 'item' | 'collapse' | 'group';
	translate? : string;
	icon? : string;
	link? : string;
	hidden? : boolean;
	url? : string;
	classes? : string;
	groupClasses? : string;
	exactMatch? : boolean;
	external? : boolean;
	target? : boolean;
	breadcrumbs? : boolean;
	badge? : {
		title? : string;
		type? : string;
	};
	children? : Navigation[];
	customSvg? : string;
	pms? : number[]
}

export interface Navigation extends NavigationItem {
	children? : NavigationItem[];
}

export interface IctuNavigationItem {
	id : string;
	title : string;
	url : string;
	icon? : string;
	link? : string;
	external? : boolean;
	classes? : string;
	target? : boolean;
	customSvg? : string;
	pms? : IctuNavigationItemPms
}

export type IctuNavigationItemPms = [ number , number , number , number ];

export interface IctuNavigation extends IctuNavigationItem {
	child? : IctuNavigationItem[];
}