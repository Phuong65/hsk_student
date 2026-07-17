import { ChangeDetectionStrategy , Component , input , InputSignal } from '@angular/core';

import { PreviewIconComponent } from "@module/ngx-file-preview/lib/components/preview-icon";
import { BasePreviewComponent } from "@module/ngx-file-preview/lib/preview-types";
import { FileReaderResponse } from "../../services";
import { I18nPipe } from "../../i18n";
import { AutoThemeConfig , PreviewFile , ThemeMode } from "@module/ngx-file-preview";

@Component( {
	selector        : 'ngx-archive-preview' ,
	standalone      : true ,
	imports: [PreviewIconComponent, I18nPipe] ,
	template        : `
		<div class="archive-container">
			<div class="archive-info">
				<div class="icon">
					<preview-icon [themeMode]="themeMode()" [svg]="'zip'" [size]="48"></preview-icon>
				</div>
				<div class="details">
					<h2>{{ file().name }}</h2>
					<div class="meta">
						<span>{{ 'zip.type'|i18n }}: {{ getArchiveType() }}</span>
						<span>{{ 'zip.size'|i18n }}: {{ formatFileSize(file().size) }}</span>
					</div>
				</div>
			</div>
		</div>
	` ,
	styleUrls       : [ "../../styles/_theme.scss" , "archive-preview.component.scss" ] ,
	changeDetection : ChangeDetectionStrategy.OnPush
} )
export class ArchivePreviewComponent extends BasePreviewComponent {



	getArchiveType () : string {
		const extension : string                    = this.file().name.split( '.' ).pop()?.toLowerCase();
		const that : ArchivePreviewComponent        = this;
		const types : { [ key : string ] : string } = [ 'zip' , 'rar' , '7z' , 'tar' , 'gz' ].reduce( ( ts , key ) => Object.assign( ts , {
			[ key ] : that.t( 'zip.types.' + key )
		} ) , {} );
		return types[ extension || '' ] || this.t( 'zip.types.unknown' );
	}

	protected override async handleFileContent ( content : FileReaderResponse ) : Promise<void> {
	}

	formatFileSize ( bytes? : number ) : string {
		if ( ! bytes ) return this.t( 'zip.unknownSize' );

		const units : string[] = [ 'B' , 'KB' , 'MB' , 'GB' , 'TB' ];
		let size : number      = bytes;
		let unitIndex : number = 0;

		while ( size >= 1024 && unitIndex < units.length - 1 ) {
			size /= 1024;
			unitIndex++;
		}

		return `${ size.toFixed( 2 ) } ${ units[ unitIndex ] }`;
	}
}