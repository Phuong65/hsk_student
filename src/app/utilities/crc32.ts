const makeCRCTable : () => any[] = () : any[] => {
	let c : any;
	let crcTable : any[] = [];
	
	for ( let n : number = 0 ; n < 256 ; n++ ) {
		c = n;
		for ( let k : number = 0 ; k < 8 ; k++ ) {
			c = ( ( c & 1 ) ? ( 0xEDB88320 ^ ( c >>> 1 ) ) : ( c >>> 1 ) );
		}
		crcTable[ n ] = c;
	}
	
	return crcTable;
}

export const crc32 : ( str : string ) => string = ( str : string ) : string => {
	let crcTable : any[] = makeCRCTable();
	let crc : number     = 0 ^ ( -1 );
	
	for ( let i : number = 0 ; i < str.length ; i++ ) {
		crc = ( crc >>> 8 ) ^ crcTable[ ( crc ^ str.charCodeAt( i ) ) & 0xFF ];
	}
	return ( ( crc ^ ( -1 ) ) >>> 0 ).toString( 16 ).toUpperCase();
}