export const SIGN_IN_WITH_THIRD_PARTY_VALUES = [ 'microsoft' , 'google' ] as const;

export type SignInWithThirdParty = ( typeof SIGN_IN_WITH_THIRD_PARTY_VALUES )[number];

export interface SignInWithThirdPartyResponse {
	code : string,
	data : string,
	message : string,
}