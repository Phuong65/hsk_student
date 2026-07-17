export type ThemeMode = Partial<'light' | 'dark' | 'auto'>;

export interface AutoThemeConfig {
	dark : {
		start : number;
		end : number;
	};
}
