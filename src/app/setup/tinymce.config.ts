import { EditorOptions } from 'tinymce';

export const TINYMCE_CONFIG : Partial<EditorOptions> = {
    base_url           : '/tinymce' , // phải khớp với angular.json assets
    suffix             : '.min' ,
    height             : 500 ,
    branding           : false ,
    resize             : false ,
    statusbar          : true ,
    browser_spellcheck : true ,
    menubar            : false ,
    sandbox_iframes    : false ,
    inline_styles      : true ,
    plugins            : [ 'advlist' , 'autolink' , 'lists' , 'link' , 'image' , 'charmap' , 'preview' , 'anchor' , 'searchreplace' , 'visualblocks' , 'code' , 'fullscreen' , 'insertdatetime' , 'media' , 'table' , 'help' , 'wordcount' , 'emoticons' ] ,
    toolbar            : 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | forecolor backcolor | alignleft aligncenter alignright alignjustify | outdent indent | numlist bullist | link image media table | removeformat code fullscreen preview | emoticons charmap insertdatetime | searchreplace visualblocks | help' ,
    toolbar_mode       : 'sliding' , // 'floating', 'sliding', 'scrolling', 'wrap'
    // Font options
    font_family_formats : 'Roboto=roboto, Arial=arial,helvetica,sans-serif; Courier New=courier new,courier,monospace; Georgia=georgia,palatino; Tahoma=tahoma,arial,helvetica,sans-serif; Times New Roman=times new roman,times; Verdana=verdana,geneva' ,
    font_size_formats   : '8px 10px 12px 14px 16px 18px 24px 36px 48px 54px' ,

    // Block formats
    block_formats : 'Paragraph=p; Heading 1=h1; Heading 2=h2; Heading 3=h3; Heading 4=h4; Heading 5=h5; Heading 6=h6; Preformatted=pre' ,

    // Image config
    image_title       : true ,
    image_caption     : true ,
    image_advtab      : true ,
    automatic_uploads : true ,
    file_picker_types : 'image' ,

    // Table config
    table_toolbar : 'tableprops tabledelete | tableinsertrowbefore tableinsertrowafter tabledeleterow | tableinsertcolbefore tableinsertcolafter tabledeletecol' ,

    // Link config
    link_title       : true ,
    link_target_list : [
        { title : 'None' , value : '' } ,
        { title : 'Same page' , value : '_self' } ,
        { title : 'New page' , value : '_blank' }
    ] ,

    // Tùy chỉnh appearance
    skin : 'oxide' , // hoặc 'oxide-dark' cho dark mode

    // Content style
    content_style : 'body { font-family: times new roman, times; font-size: 18px; line-height: 1.4; }, body p { margin-block-start: 0;margin-block-end: 10px;}' ,

    // Image upload với transform ID
    images_upload_handler : ( blobInfo : any ) : Promise<string> => {
        return tinyEditorUploadImage( blobInfo );
    } ,

    // Setup cho image transform
    setup : ( editor : any ) => {
        // Transform khi paste content
        editor.on( 'PastePostProcess' , ( e : any ) : void => {
            // this.transformImagesInContent( e.node );
        } );
    }
};

/**
 * Upload image và nhận ID từ server
 */
const tinyEditorUploadImage : ( blobInfo : any ) => Promise<string> = async ( blobInfo : any ) : Promise<string> => {
    const formData = new FormData();
    formData.append( 'file' , blobInfo.blob() , blobInfo.filename() );

    const response = await Promise.resolve( { id : '808' , url : 'https://...' } );

    // response = { id: "808", url: "https://..." }

    // Return URL cho editor, nhưng khi save sẽ convert về ID
    // Thêm data attribute để track ID
    setTimeout( () : void => {
        const editor : any    = ( window as any ).tinymce.activeEditor;
        const imageList : any = editor.getBody().querySelectorAll( 'img' );
        imageList.forEach( ( img : HTMLImageElement ) : void => {
            if ( img.src === response.url && ! img.getAttribute( 'data-image-id' ) ) {
                img.setAttribute( 'data-image-id' , response.id );
            }
        } );
    } , 100 );

    return response.url;
}
