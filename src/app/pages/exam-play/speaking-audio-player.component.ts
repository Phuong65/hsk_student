import { Component, input, signal, WritableSignal, effect, OnDestroy, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-speaking-audio-player',
    standalone: true,
    imports: [CommonModule],
    template: `
        @if (canRender() && src()) {
            <div class="ictu-audio-player__private-mode" [class.__loading]="isBusy()" [class.__locked]="disableControls()">
                @if (loadingError()) {
                    <div class="ictu-audio-player__error-overlay">
                        <i class="fa-solid fa-circle-exclamation"></i>
                        <span>Lỗi tải audio</span>
                        <button type="button" class="ictu-audio-player__reload-btn" (click)="reload()"><i class="fa-solid fa-rotate"></i></button>
                    </div>
                }
                <button type="button" class="ictu-audio-player__private-mode__btn" [class.paused-icon]="isPlaying()" [class.__spin]="isBusy()&&!loadingError()" [disabled]="!canPlay()||isBusy()||disableControls()" (click)="toggle()">
                    <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" viewBox="0 0 494.148 494.148">
                        <g><g>
                            <path d="M405.284,201.188L130.804,13.28C118.128,4.596,105.356,0,94.74,0C74.216,0,61.52,16.472,61.52,44.044v406.124c0,27.54,12.68,43.98,33.156,43.98c10.632,0,23.2-4.6,35.904-13.308l274.608-187.904c17.66-12.104,27.44-28.392,27.44-45.884C432.632,229.572,422.964,213.288,405.284,201.188z"/>
                        </g></g>
                    </svg>
                </button>
                <span class="ictu-audio-player__update-time">{{ fmt(currentTime) }}</span>
                <div class="ictu-audio-player__process-tag">
                    <span class="ictu-audio-player__process-line" [style.width.%]="progress"></span>
                </div>
                <span class="ictu-audio-player__ended-time">{{ fmt(duration) }}</span>
            </div>
        } @else {
            <div class="ictu-audio-player__loading">
                <i class="fa-solid fa-spinner fa-spin"></i> Đang tải audio...
            </div>
        }
    `,
    styles: [`
        :host { display: flex; align-items: center; }
        .ictu-audio-player__private-mode { display: flex; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; width: 100%; max-width: 420px; position: relative; }
        .ictu-audio-player__private-mode.__loading { opacity: 0.65; }
        .ictu-audio-player__private-mode.__locked .ictu-audio-player__private-mode__btn { cursor: default !important; opacity: 1 !important; background-color: #2d69f0 !important; }
        .ictu-audio-player__private-mode.__locked .ictu-audio-player__process-tag { pointer-events: none; }
        .ictu-audio-player__private-mode__btn { display: inline-block; border-radius: 0; padding: 12px 11px 12px 13px; font-size: 0; line-height: 0; background-color: #2d69f0 !important; outline: none !important; box-shadow: none !important; border: none !important; position: relative; height: 41px; width: 41px; cursor: pointer; flex-shrink: 0; }
        .ictu-audio-player__private-mode__btn:disabled { background-color: #94a3b8 !important; cursor: not-allowed; }
        .ictu-audio-player__private-mode__btn svg { width: 15px; height: 15px; fill: #ffffff; }
        .ictu-audio-player__private-mode__btn.paused-icon { padding: 0; width: 41px; height: 41px; display: flex; justify-content: center; align-items: center; }
        .ictu-audio-player__private-mode__btn.paused-icon::before, .ictu-audio-player__private-mode__btn.paused-icon::after { content: ''; display: block; width: 4px; height: 17px; background-color: #ffffff; margin: 0 2px; }
        .ictu-audio-player__private-mode__btn.paused-icon svg { display: none; }
        .ictu-audio-player__private-mode__btn.__spin svg { display: none; }
        .ictu-audio-player__private-mode__btn.__spin::before { content: ''; display: block; width: 17px; height: 17px; border: 3px solid rgba(255,255,255,0.3); border-top-color: #ffffff; border-radius: 50%; animation: ictu-audio-circle-spin .8s linear infinite; }
        @keyframes ictu-audio-circle-spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
        .ictu-audio-player__error-overlay { position: absolute; inset: 0; display: flex; align-items: center; gap: 6px; padding: 0 8px; z-index: 1; background: rgba(254,202,202,0.92); font-size: 12px; color: #991b1b; font-weight: 600; }
        .ictu-audio-player__error-overlay span { flex: 1; }
        .ictu-audio-player__reload-btn { display: grid; width: 28px; height: 28px; place-items: center; border: 1px solid #991b1b; border-radius: 4px; background: transparent; color: #991b1b; cursor: pointer; font-size: 14px; }
        .ictu-audio-player__reload-btn:hover { background: #fecaca; }
        .ictu-audio-player__update-time, .ictu-audio-player__ended-time { display: flex; justify-content: center; align-items: center; width: 60px; font-family: Roboto, sans-serif; font-size: 14px; color: #333333; font-weight: 500; flex-shrink: 0; }
        .ictu-audio-player__process-tag { flex: 1; display: flex; justify-content: flex-start; align-items: center; align-self: center; background-color: #dadee3; margin: 0 4px; border-radius: 999px; }
        .ictu-audio-player__process-line { height: 4px; display: inline-block; background-color: #666666; border-radius: 999px; transition: width .3s; }
        .ictu-audio-player__loading { display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; background: #f3f4f6; border-radius: 6px; color: #4b5563; font-size: 13px; font-weight: 600; }
    `]
})
export class SpeakingAudioPlayerComponent implements OnDestroy {
    readonly src = input<string>('');
    readonly cacheKey = input<string>('');
    readonly replay = input<number>(-1);
    readonly autoplay = input<boolean>(false);
    readonly canRender = input<boolean>(true);
    readonly disableControls = input<boolean>(false);
    readonly onLoadError = input<() => void>(() => {});
    readonly onReplayUsed = input<() => void>(() => {});
    readonly onEnded = input<() => void>(() => {});
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

    canPlay(): boolean {
        const r = this.replay();
        if (r === 0) return false;
        if (r === -1) return true;
        return r > 0 || this._playedOnce;
    }

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
        // Khi autoplay chuyển từ false→true (activeRecordKey trùng), phát audio
        effect(() => {
            const shouldPlay = this.autoplay();
            if (!shouldPlay || !this.audio) return;
            if (!this.audio.paused) return;
            if (this.audio.readyState < 2) {
                const onCanPlay = () => {
                    this.audio?.removeEventListener('canplay', onCanPlay);
                    this.tryPlay();
                };
                this.audio.addEventListener('canplay', onCanPlay);
                return;
            }
            this.tryPlay();
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
            this.onEnded()();
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
        if (!this.audio || !this.canPlay()) return;
        const active = (window as any).__activeSpeakingAudio;
        if (active && active !== this) {
            active._pauseInternal();
        }
        (window as any).__activeSpeakingAudio = this;
        this.audio.play().then(() => {
            this.isPlaying.set(true);
            if (!this._playedOnce) {
                this._playedOnce = true;
                this.onReplayUsed()();
            }
        }).catch(() => {});
    }

    toggle(): void {
        if (!this.audio) return;
        if (this.disableControls()) return;
        if (this.audio.paused) {
            if (!this.canPlay()) return;
            const active = (window as any).__activeSpeakingAudio;
            if (active && active !== this) {
                active._pauseInternal();
            }
            (window as any).__activeSpeakingAudio = this;
            this.audio.play().then(() => {
                this.isPlaying.set(true);
                if (!this._playedOnce) {
                    this._playedOnce = true;
                    this.onReplayUsed()();
                }
            }).catch(() => {});
        } else {
            this._pauseInternal();
        }
    }

    private _pauseInternal(): void {
        if (!this.audio) return;
        this.audio.pause();
        this.isPlaying.set(false);
        if ((window as any).__activeSpeakingAudio === this) {
            (window as any).__activeSpeakingAudio = null;
        }
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
