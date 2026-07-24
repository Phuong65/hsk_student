import { Component, input, signal, WritableSignal, effect, OnDestroy, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-speaking-audio-player',
    standalone: true,
    imports: [CommonModule],
    template: `
        @if (canRender() && src()) {
            <div class="ictu-speaking-audio-player">
                @if (loadingError()) {
                    <div class="ictu-speaking-error">
                        <i class="fa-solid fa-circle-exclamation"></i>
                        <span>Lỗi tải audio</span>
                        <button type="button" class="ictu-speaking-retry" (click)="reload()"><i class="fa-solid fa-rotate"></i></button>
                    </div>
                } @else {
                    <span class="ictu-speaking-time">{{ fmt(currentTime) }}</span>
                    <div class="ictu-speaking-progress"><span [style.width.%]="progress"></span></div>
                    <span class="ictu-speaking-time">{{ fmt(duration) }}</span>
                }
            </div>
        }
    `,
    styles: [`
        :host { display: flex; align-items: center; }
        .ictu-speaking-audio-player { display: flex; align-items: center; gap: 8px; width: 100%; max-width: 420px; padding: 6px 12px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; }
        .ictu-speaking-audio-player .ictu-speaking-time { font-size: 13px; font-weight: 600; color: #15803d; font-family: Roboto, sans-serif; flex-shrink: 0; min-width: 40px; }
        .ictu-speaking-audio-player .ictu-speaking-progress { flex: 1; height: 6px; background: #bbf7d0; border-radius: 999px; overflow: hidden; }
        .ictu-speaking-audio-player .ictu-speaking-progress span { display: block; height: 100%; background: #16a34a; border-radius: 999px; transition: width .3s; }
        .ictu-speaking-error { display: flex; align-items: center; gap: 6px; padding: 4px 8px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; color: #991b1b; font-size: 12px; font-weight: 600; }
        .ictu-speaking-retry { width: 24px; height: 24px; border: 1px solid #991b1b; border-radius: 4px; background: transparent; color: #991b1b; cursor: pointer; font-size: 12px; display: grid; place-items: center; }
    `]
})
export class SpeakingAudioPlayerComponent implements OnDestroy {
    readonly src = input<string>('');
    readonly cacheKey = input<string>('');
    readonly autoplay = input<boolean>(false);
    readonly canRender = input<boolean>(true);
    readonly onLoadError = input<() => void>(() => {});
    readonly ended = output<void>();

    readonly isPlaying: WritableSignal<boolean> = signal(false);
    readonly isBusy: WritableSignal<boolean> = signal(true);
    readonly loadingError: WritableSignal<boolean> = signal(false);
    currentTime = 0;
    duration = 0;
    progress = 0;

    private audio: HTMLAudioElement | null = null;
    private static _progressMap = new Map<string, number>();
    private static _durationMap = new Map<string, number>();
    static _endedMap = new Map<string, boolean>();
    static isMediaEnded(key: string): boolean { return SpeakingAudioPlayerComponent._endedMap.get(key) === true; }

    private _currentKey = '';
    private _playedOnce = false;

    constructor() {
        effect(() => {
            const key = this.cacheKey();
            if (!key || key === this._currentKey) return;
            const src = this.src();
            if (!src) return;
            this._currentKey = key;
            this._playedOnce = false;
            SpeakingAudioPlayerComponent._endedMap.delete(key);

            const saved = SpeakingAudioPlayerComponent._progressMap.get(key) || 0;
            const dur = SpeakingAudioPlayerComponent._durationMap.get(key);
            if (saved > 0) this.currentTime = saved;
            if (dur) { this.duration = dur; this.progress = saved / dur * 100; }

            this.disposeAudio();
            this.createAudio(src, key);
            if (this.autoplay()) setTimeout(() => this.tryPlay(), 200);
        });
    }

    private createAudio(src: string, key: string): void {
        const a = document.createElement('audio');
        a.preload = 'auto';
        this.isBusy.set(true);
        this.loadingError.set(false);

        a.addEventListener('loadedmetadata', () => {
            if (a.duration && isFinite(a.duration)) {
                this.duration = a.duration;
                SpeakingAudioPlayerComponent._durationMap.set(key, a.duration);
            }
        });
        a.addEventListener('canplay', () => { this.isBusy.set(false); });
        a.addEventListener('waiting', () => { this.isBusy.set(true); });
        a.addEventListener('playing', () => { this.isBusy.set(false); });
        a.addEventListener('timeupdate', () => {
            this.currentTime = a.currentTime;
            if (a.duration && isFinite(a.duration)) this.duration = a.duration;
            this.progress = this.duration ? this.currentTime / this.duration * 100 : 0;
            SpeakingAudioPlayerComponent._progressMap.set(key, a.currentTime);
        });
        a.addEventListener('ended', () => {
            this.isPlaying.set(false);
            SpeakingAudioPlayerComponent._endedMap.set(key, true);
            this.ended.emit();
        });
        a.addEventListener('error', () => {
            this.isBusy.set(false);
            this.loadingError.set(true);
            this.onLoadError()();
        });

        a.src = src;
        this.audio = a;
        a.load();
    }

    private tryPlay(): void {
        if (!this.audio) return;
        this.audio.play().then(() => {
            this.isPlaying.set(true);
            if (!this._playedOnce) this._playedOnce = true;
        }).catch(() => {});
    }

    reload(): void {
        const key = this._currentKey;
        const src = this.src();
        if (!key || !src) return;
        this.disposeAudio();
        this.createAudio(src, key);
        setTimeout(() => this.tryPlay(), 200);
    }

    private disposeAudio(): void {
        if (!this.audio) return;
        if (this._currentKey && this.audio.currentTime)
            SpeakingAudioPlayerComponent._progressMap.set(this._currentKey, this.audio.currentTime);
        this.audio = null;
        this.isPlaying.set(false);
        try { this.audio?.pause(); } catch { }
    }

    fmt(s: number): string {
        if (!s || !isFinite(s)) return '00:00';
        const m = Math.floor(s / 60), sec = Math.floor(s % 60);
        return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    }

    ngOnDestroy(): void { this.disposeAudio(); }
}
