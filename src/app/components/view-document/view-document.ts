import {
    Component,
    effect,
    input,
    InputSignal,
    OnDestroy,
    OnInit,
    signal,
    WritableSignal,
} from '@angular/core';
export interface CourseLessonPlanContentPageItem {
    start : number;
    end : number;
    id_file : number;
}
import { SimmerImageComponent } from '@app/components/lazy-image-component/simmer-image-component';
import { SafeResourceUrlPipe } from '@app/pipes/safe-resource-url.pipe';
import { PlyrModule } from '@app/module/ngx-plyr/public_api';
import { Subject } from 'rxjs';

type UrlType = 'youtube' | 'google_drive' | 'other';

@Component({
    selector: 'app-view-document',
    standalone: true,
    imports: [SimmerImageComponent, SafeResourceUrlPipe, PlyrModule],
    templateUrl: './view-document.html',
    styleUrl: './view-document.css',
})
export class ViewDocument implements OnInit, OnDestroy {

    type_view: InputSignal<string> = input.required<string>();
    link: InputSignal<string> = input<string>();
    form_document: InputSignal<CourseLessonPlanContentPageItem> =
        input<CourseLessonPlanContentPageItem>();
    urlType: WritableSignal<UrlType> = signal<UrlType>('other');
    linkRegxr: WritableSignal<string> = signal<string>('');
    plyrSources: WritableSignal<Plyr.Source[]> = signal<Plyr.Source[]>([]);
    listidPage: number[] = [];

    private destroy$ = new Subject<void>();
    playerOptions = {
        controls: [
            'play-large',
            'play',
            'progress',
            'current-time',
            'mute',
            'volume',
            'settings',
            'fullscreen',
        ],
    };

    audioOptions = {
        controls: ['play', 'progress', 'current-time', 'mute', 'volume'],
    };
    ngOnInit(): void {
        if (this.type_view() === 'EXCERPT_FROM_DOCUMENT' && this.form_document()) {
            this.listidPage = [
                ...this.createNumberList(this.form_document().start, this.form_document().end),
            ];
            return;
        }

        if (!this.link()) {
            this.plyrSources.set([]);
            return;
        }
        if (this.type_view() === 'LINK') {
            this.checkUrl();
            this.plyrSources.set([]);
            return;
        }
        if (this.type_view() === 'VIDEO') {
            this.reloadPlyr([
                { src: this.link(), type: 'video/mp4' },
            ]);
            return;
        }
        if (this.type_view() === 'YOUTUBE') {
            this.checkUrl();
            this.reloadPlyr([
                {
                    src: this.extractYouTubeId(this.linkRegxr()),
                    provider: 'youtube',
                },
            ]);
            return;
        }
        if (this.type_view() === 'AUDIO') {
            this.reloadPlyr([
                { src: this.link(), type: 'audio/mpeg' },
            ]);
        }
    }
    // viewEffect = effect(() => {
    //     const type = this.type_view();
    //     const link = this.link();
    //     const form = this.form_document();
    //     if (type === 'EXCERPT_FROM_DOCUMENT' && form) {
    //         this.listidPage = [
    //             ...this.createNumberList(form.start, form.end),
    //         ];
    //         return;
    //     }

    //     if (!link) {
    //         this.plyrSources.set([]);
    //         return;
    //     }
    //     if (type === 'LINK') {
    //         this.checkUrl();
    //         this.plyrSources.set([]);
    //         return;
    //     }
    //     if (type === 'VIDEO') {
    //         this.reloadPlyr([
    //             { src: link, type: 'video/mp4' },
    //         ]);
    //         return;
    //     }
    //     if (type === 'YOUTUBE') {
    //         this.checkUrl();
    //         this.reloadPlyr([
    //             {
    //                 src: this.extractYouTubeId(this.linkRegxr()),
    //                 provider: 'youtube',
    //             },
    //         ]);
    //         return;
    //     }
    //     if (type === 'AUDIO') {
    //         this.reloadPlyr([
    //             { src: link, type: 'audio/mpeg' },
    //         ]);
    //     }
    // });

    private reloadPlyr(sources: Plyr.Source[]) {
        this.plyrSources.set([]);
        queueMicrotask(() => {
            this.plyrSources.set(sources);
        });
    }

    private checkUrl() {
        const link = this.link();
        if (!link) return;

        const u = link.toLowerCase().trim();

        if (u.includes('youtube.com') || u.includes('youtu.be')) {
            this.urlType.set('youtube');
            const id = this.extractYouTubeId(link);
            this.linkRegxr.set(`https://www.youtube.com/watch?v=${id}`);
        } else if (u.includes('drive.google.com')) {
            this.urlType.set('google_drive');
            this.linkRegxr.set(link);
        } else {
            this.urlType.set('other');
            this.linkRegxr.set(link);
        }
    }

    extractYouTubeId(url: string): string {
        const reg = /(?:v=|embed\/|youtu\.be\/)([\w-]{11})/;
        return url.match(reg)?.[1] ?? '';
    }

    createNumberList(start: number, end: number): number[] {
        if (end < start) return [];
        return Array.from(
            { length: end - start + 1 },
            (_, i) => start + i
        );
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        console.log('aaaaaaaaaaaaaaaaaaaa');
    }
}
