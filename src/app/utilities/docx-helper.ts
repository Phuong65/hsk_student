/**
 * Convert point (pt) to half-point (docx font size)
 * Example: 13pt -> 26
 */
export function ptToHalfPoint ( pt : number ) : number {
    return pt * 2;
}

/**
 * Convert centimeter (cm) to twips
 * 1 cm ≈ 567 twips
 */
export function cmToTwip ( cm : number ) : number {
    return Math.round( cm * 567 );
}

/**
 * Line spacing helper
 * 1.0  -> 240
 * 1.5  -> 276
 * 2.0  -> 480
 */
export function lineSpacing ( lines : 1 | 1.5 | 2 ) : number {
    switch ( lines ) {
        case 1:
            return 240;
        case 1.5:
            return 276;
        case 2:
            return 480;
        default:
            return 276;
    }
}

/**
 * A4 page size (twips)
 */
export const A4_PAGE_SIZE = {
    width  : 11906 ,
    height : 16838
};

/**
 * A4 Portrait & Landscape (twips)
 */
export const A4_PORTRAIT = {
    width: 11906,
    height: 16838
};

export const A4_LANDSCAPE = {
    width: 16838,
    height: 11906
};
