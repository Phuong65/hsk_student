import { Subject } from "rxjs";

export type AppState = 'loading' | 'error' | 'success';

export interface UploadAnimation {
    percent : number;
    title : string;
    observer : Subject<number>
}
