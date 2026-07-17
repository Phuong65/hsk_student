import { Component , input , InputSignal } from '@angular/core';

import { PreviewIconComponent } from '@module/ngx-file-preview/lib/components/preview-icon';
import { FileReaderResponse } from "../../services";
import { BasePreviewComponent } from "@module/ngx-file-preview/lib/preview-types";
import { I18nPipe } from "../../i18n/i18n.pipe";
import { AutoThemeConfig , PreviewFile , ThemeMode } from "@module/ngx-file-preview";

@Component( {
	selector   : 'ngx-unknown-preview' ,
	standalone : true ,
	imports: [PreviewIconComponent, I18nPipe] ,
	template   : `
		<div class="unknown-preview">
			<div class="unknown-message">
				<preview-icon [themeMode]="themeMode()" [size]="72" svg="unknown"></preview-icon>
				<p>{{ file().name }}</p>
				<p>{{ 'unknownFileTips'|i18n }}</p>
			</div>
		</div>
	` ,
	styleUrls  : [ '../../styles/_theme.scss' , 'unknown-preview.component.scss' ]
} )
export class UnknownPreviewComponent extends BasePreviewComponent {


	
	protected override async handleFileContent ( content : FileReaderResponse ) : Promise<void> {
	}
}
