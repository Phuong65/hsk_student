import { Component, input, signal, WritableSignal, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-audio-player',
    standalone: true,
    imports: [CommonModule],
    template: `
        @if (canRender() && src()) {
            <div class="ictu-audio-player__private-mode" [class.__loading]="isBusy()">
                @if (loadingError()) {
                    <div class="ictu-audio-player__error-overlay">
                        <i class="fa-solid fa-circle-exclamation"></i>
                        <span>Lỗi tải audio</span>
                        <button type="button" class="ictu-audio-player__reload-btn" (click)="reload()"><i class="fa-solid fa-rotate"></i></button>
                    </div>
                }
                <button type="button" class="ictu-audio-player__private-mode__btn" [class.paused-icon]="isPlaying()" [class.__spin]="isBusy()&&!loadingError()" [disabled]="!canPlay()||isBusy()" (click)="toggle()">
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
export class AudioPlayerComponent implements OnDestroy {
    readonly src = input<string>('');
    readonly cacheKey = input<string>('');
    readonly replay = input<number>(-1);
    readonly autoplay = input<boolean>(false);
    readonly lockSeek = input<boolean>(true);
    readonly canRender = input<boolean>(true);
    readonly onLoadError = input<() => void>(() => {});
    readonly onReplayUsed = input<() => void>(() => {});

    readonly isPlaying: WritableSignal<boolean> = signal(false);
    readonly isBusy: WritableSignal<boolean> = signal(false); // loading hoặc lỗi
    readonly loadingError: WritableSignal<boolean> = signal(false); // có lỗi load
    readonly currentTimeSig: WritableSignal<number> = signal(0);
    readonly durationSig: WritableSignal<number> = signal(0);
    readonly progressSig: WritableSignal<number> = signal(0);
    // Alias getters để template không phải đổi tên
    get currentTime(): number { return this.currentTimeSig(); }
    set currentTime(v: number) { this.currentTimeSig.set(v); }
    get duration(): number { return this.durationSig(); }
    set duration(v: number) { this.durationSig.set(v); }
    get progress(): number { return this.progressSig(); }
    set progress(v: number) { this.progressSig.set(v); }

    // Mỗi instance có audio element RIÊNG — không share giữa các player
    private audio: HTMLAudioElement | null = null;

    // Static chỉ lưu progress + duration theo cache key (để resume khi navigate back)
    private static _progressMap = new Map<string, number>();
    private static _durationMap = new Map<string, number>();
    // Active instance hiện tại đang chơi nhạc (để tạm dừng khi autoplay)
    private static _activeInstance: AudioPlayerComponent | null = null;

    private _currentSrc = '';
    private _currentCacheKey = '';
    private _playedOnce = false;

    constructor() {
        effect(() => {
            // Chỉ depend cacheKey để tránh re-create audio khi src thay đổi (token rotate)
            const key = this.cacheKey();
            if (!key) return;
            if (key === this._currentCacheKey) return;
            const src = this.src();
            if (!src) return;
            this._currentCacheKey = key;
            this._currentSrc = src;
            this._playedOnce = false;

            // Hiển thị saved time NGAY (không đợi audio load) để UI không flash 0:00
            const saved = AudioPlayerComponent._progressMap.get(key) || 0;
            const cachedDur = AudioPlayerComponent._durationMap.get(key);
            if (saved > 0) this.currentTime = saved;
            if (cachedDur) {
                this.duration = cachedDur;
                this.progress = cachedDur ? (saved / cachedDur) * 100 : 0;
            }

            this.disposeAudio();
            this.createAudio(src, key);
            if (this.autoplay()) setTimeout(() => this.tryPlay(), 200);
        });
    }

    canPlay(): boolean {
        const r = this.replay();
        if (r === 0) return false;
        if (r === -1) return true;
        return r > 0 || this._playedOnce;
    }

    private applySavedSeek(a: HTMLAudioElement, key: string): void {
        const s = AudioPlayerComponent._progressMap.get(key) || 0;
        if (!s) return;
        if (a.duration && isFinite(a.duration) && s >= a.duration) return;
        // Nếu chưa đủ dữ liệu để seek, chờ loadeddata rồi thử lại
        if (a.readyState < 2) {
            const onLoaded = () => {
                a.removeEventListener('loadeddata', onLoaded);
                this.applySavedSeek(a, key);
            };
            a.addEventListener('loadeddata', onLoaded);
            return;
        }
        if (Math.abs(a.currentTime - s) <= 0.3) {
            this.currentTime = a.currentTime;
            this.progress = this.duration ? (this.currentTime / this.duration) * 100 : 0;
            return;
        }
        const target = s;
        let done = false;
        const onSeeked = () => {
            if (done) return;
            done = true;
            a.removeEventListener('seeked', onSeeked);
            this.currentTime = a.currentTime;
            this.progress = this.duration ? (this.currentTime / this.duration) * 100 : 0;
        };
        a.addEventListener('seeked', onSeeked);
        try { a.currentTime = target; } catch { /* noop */ }
        // Retry tối đa 3 lần nếu browser không áp dụng
        let attempts = 0;
        const retry = () => {
            if (done) return;
            attempts++;
            if (Math.abs(a.currentTime - target) > 0.5 && attempts < 5) {
                try { a.currentTime = target; } catch { /* noop */ }
                setTimeout(retry, 150);
            } else if (!done) {
                done = true;
                a.removeEventListener('seeked', onSeeked);
                this.currentTime = a.currentTime;
                this.progress = this.duration ? (this.currentTime / this.duration) * 100 : 0;
            }
        };
        setTimeout(retry, 200);
    }

    private createAudio(src: string, key: string): void {
        const a = document.createElement('audio');
        a.preload = 'auto';
        this.isBusy.set(true);
        this.loadingError.set(false);

        // Restore duration + progress từ static cache (nếu đã load trước đó)
        const cachedDur = AudioPlayerComponent._durationMap.get(key);
        const saved = AudioPlayerComponent._progressMap.get(key) || 0;
        if (cachedDur) {
            this.duration = cachedDur;
            this.currentTime = saved;
            this.progress = cachedDur ? (saved / cachedDur) * 100 : 0;
        }

        a.addEventListener('loadedmetadata', () => {
            if (a.duration && isFinite(a.duration)) {
                this.duration = a.duration;
                AudioPlayerComponent._durationMap.set(key, a.duration);
                // Sync UI với saved progress (chưa seek thật, chờ loadeddata)
                const s = AudioPlayerComponent._progressMap.get(key) || 0;
                if (s > 0 && this.currentTime !== s) {
                    this.currentTime = s;
                    this.progress = (s / a.duration) * 100;
                }
            }
        });

        a.addEventListener('loadeddata', () => {
            this.applySavedSeek(a, key);
        });

        const markReady = () => {
            this.isBusy.set(false);
            this.loadingError.set(false);
        };
        a.addEventListener('canplay', () => {
            markReady();
            if (a.duration && isFinite(a.duration)) {
                if (!this.duration) {
                    this.duration = a.duration;
                    AudioPlayerComponent._durationMap.set(key, a.duration);
                }
                this.applySavedSeek(a, key);
                this.progress = this.duration ? (this.currentTime / this.duration) * 100 : 0;
            }
        });
        a.addEventListener('waiting', () => { this.isBusy.set(true); });
        a.addEventListener('playing', markReady);

        a.addEventListener('timeupdate', () => {
            this.currentTime = a.currentTime;
            if (a.duration && isFinite(a.duration)) this.duration = a.duration;
            this.progress = this.duration ? (this.currentTime / this.duration) * 100 : 0;
            AudioPlayerComponent._progressMap.set(key, a.currentTime);
        });

        a.addEventListener('ended', () => {
            this.isPlaying.set(false);
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

    reload(): void {
        this.loadingError.set(false);
        this.isBusy.set(true);
        const key = this._currentCacheKey;
        const src = this._currentSrc;
        if (!key || !src) return;
        this.disposeAudio();
        this.createAudio(src, key);
    }

    private disposeAudio(): void {
        if (!this.audio) return;
        const a = this.audio;
        // Lưu currentTime trước khi dispose để resume đúng
        if (this._currentCacheKey && a.currentTime) {
            AudioPlayerComponent._progressMap.set(this._currentCacheKey, a.currentTime);
        }
        this.audio = null;
        this.isPlaying.set(false);
        try { a.pause(); } catch { /* noop */ }
        a.removeAttribute('src');
        a.load();
    }

    toggle(): void {
        if (!this.audio) return;
        if (this.audio.paused) {
            if (!this.canPlay()) return;
            // Pause instance đang phát (nếu có)
            const active = AudioPlayerComponent._activeInstance;
            if (active && active !== this) {
                active._pauseInternal();
            }
            AudioPlayerComponent._activeInstance = this;
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
        if (AudioPlayerComponent._activeInstance === this) {
            AudioPlayerComponent._activeInstance = null;
        }
    }

    private tryPlay(): void {
        if (!this.audio || !this.canPlay()) return;
        const active = AudioPlayerComponent._activeInstance;
        if (active && active !== this) {
            active._pauseInternal();
        }
        AudioPlayerComponent._activeInstance = this;
        this.audio.play().then(() => {
            this.isPlaying.set(true);
            if (!this._playedOnce) {
                this._playedOnce = true;
                this.onReplayUsed()();
            }
        }).catch(() => {});
    }

    fmt(s: number): string {
        if (!s || !isFinite(s)) return '00:00';
        const m = Math.floor(s / 60), sec = Math.floor(s % 60);
        return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    }

    ngOnDestroy(): void {
        this.disposeAudio();
    }
}
