import { Component, signal, WritableSignal, AfterViewChecked, ElementRef, computed, inject, DestroyRef, effect, ChangeDetectorRef, OnDestroy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { switchMap, map, catchError, of, finalize, take } from 'rxjs';

import { BankQuestion } from '@models/bank-question';
import { ShiftTest } from '@models/shift-test';
import { Student } from '@models/student';
import { Shift } from '@models/shift';
import { ShiftTestState } from '@models/shift-test-state';
import { ShiftTestAnswer } from '@models/shift-test-answer';
import { FormDetail } from '@models/form-detail';
import { ShiftTestService } from '@services/shift-test.service';
import { ShiftTestStateService } from '@services/shift-test-state.service';
import { ShiftTestAnswerService } from '@services/shift-test-answer.service';
import { FormDetailService } from '@services/form-detail.service';
import { IctuFileService } from '@services/ictu-file.service';
import { IctuQueryCondition } from '@models/dto';
import { linkGetFileContentAws } from '@env';
import { tokenGetter } from '@app/app.config';

import { AudioPlayerComponent } from './audio-player.component';

interface QV extends BankQuestion {
    _viewKey?: string;
    _globalIndex?: number;
    _seqIndex?: number;
}

interface PG {
    part: number;
    questions: QV[];
    _range?: string;
}

type RecordPhase = 'idle' | 'preparing' | 'recording' | 'uploading' | 'uploaded' | 'error';

interface RecordQuestionState {
    phase: RecordPhase;
    prepareLeft: number;
    speakingLeft: number;
    audioUrl?: string;
    isSpeaking?: boolean;
    file?: File;
    uploadResult?: any;
    error?: string;
    audioLoadFailed?: boolean;
    replaysLeft?: number;
}

@Component({
    selector: 'app-exam-play',
    standalone: true,
    imports: [CommonModule, FormsModule, AudioPlayerComponent],
    templateUrl: './exam-play.component.html',
    styleUrls: ['./exam-play.component.css'],
})
export class ExamPlayComponent implements AfterViewChecked, OnDestroy {
    // Inputs
    readonly questions = input<BankQuestion[]>([]);
    readonly skill = input<string>('');
    readonly shiftName = input<string>('');
    readonly studentCode = input<string>('');
    readonly shiftId = input<number>(0);
    readonly shiftTest = input<ShiftTest | null>(null);
    readonly student = input<Student | null>(null);
    readonly shift = input<Shift | null>(null);

    // Services
    private router = inject(Router);
    private sanitizer = inject(DomSanitizer);
    private destroyRef = inject(DestroyRef);
    private cdr = inject(ChangeDetectorRef);
    private shiftTestService = inject(ShiftTestService);
    private shiftTestStateService = inject(ShiftTestStateService);
    private shiftTestAnswerService = inject(ShiftTestAnswerService);
    private formDetailService = inject(FormDetailService);
    private fileService = inject(IctuFileService);

    // State signals
    readonly parents: WritableSignal<QV[]> = signal<QV[]>([]);
    readonly currentParentIndex: WritableSignal<number> = signal(0);
    readonly questionPanelOpen: WritableSignal<boolean> = signal(false);
    readonly collapsedParts: WritableSignal<Set<number>> = signal(new Set());
    readonly seenQuestionKeys: WritableSignal<Set<string>> = signal(new Set());
    readonly completedQuestionIds: WritableSignal<Set<string>> = signal(new Set());
    readonly submitConfirmVisible: WritableSignal<boolean> = signal(false);
    readonly exitConfirmVisible: WritableSignal<boolean> = signal(false);
    readonly submitting: WritableSignal<boolean> = signal(false);
    readonly incompleteCurrentPageWarning: WritableSignal<string> = signal('');
    readonly scoreResultVisible: WritableSignal<boolean> = signal(false);
    readonly examTimeLeft: WritableSignal<number> = signal(0);
    readonly countdownDisplay: WritableSignal<string> = signal('00:00');
    countdownWarning = false;
    readonly currentParent = computed(() => this.parents()[this.currentParentIndex()] || null);
    readonly answerVersion: WritableSignal<number> = signal(0);
    readonly resolvedAudioUrls: WritableSignal<{ [id: string]: string }> = signal<{ [id: string]: string }>({});

    // Recording (global — used by template)
    readonly recordStatus: WritableSignal<RecordPhase> = signal<RecordPhase>('idle');
    readonly prepareLeft: WritableSignal<number> = signal(0);
    readonly speakingLeft: WritableSignal<number> = signal(0);
    readonly recError: WritableSignal<string> = signal('');
    readonly recAudioUrl: WritableSignal<string> = signal('');
    readonly isSpeaking: WritableSignal<boolean> = signal(false);

    // Per-question state
    private localAnswers: { [key: string]: any } = {};
    private postedAnswerKeys: { [key: string]: boolean } = {};
    private postedAnswerValues: { [key: string]: any } = {};
    private answerServerIds: { [key: string]: number } = {};
    private examCountdownTimer: any = null;
    private lastTimeLeftSync = 0;
    private stateId: number | null = null;
    private _lastSkill = '';
    private _lastQuestionsRef: any = null;

    // Recording internals (per-question keyed maps)
    private recordStates: { [key: string]: RecordQuestionState } = {};
    private recorders: { [key: string]: any } = {};
    private recordAudioContexts: { [key: string]: AudioContext } = {};
    private recordAudioStreams: { [key: string]: MediaStream } = {};
    private recordAudioAnimationFrames: { [key: string]: number } = {};
    private recordTimers: { [key: string]: any } = {};
    private beepAudioUrl = '';
    private _hasRecordUploadInProgress = false;
    private _inlineRestored = false;

    constructor() {
        effect(() => {
            const sk = this.skill();
            const qs = this.questions();
            if (qs && qs.length > 0 && sk && (sk !== this._lastSkill || qs !== this._lastQuestionsRef)) {
                this._lastSkill = sk;
                this._lastQuestionsRef = qs;
                this.resetAllState();
                this.currentParentIndex.set(0);
                this.buildParents();
            }
        });
    }

    // =================== Lifecycle ===================

    ngAfterViewChecked(): void {
        if (this._inlineRestored) return;
        const containers = document.querySelectorAll('.input-inline-direction-container');
        if (!containers.length) return;
        this._inlineRestored = true;
        containers.forEach(c => {
            const qid = c.getAttribute('data-qid');
            if (!qid) return;
            const q = this.findQuestionById(qid);
            if (!q) return;
            const val = this.answerValue(q);
            if (val == null) return;
            const inputs = c.querySelectorAll<HTMLInputElement>('input.input-inline-box');
            const parsed = this.parseInlineAnswer(val);
            inputs.forEach((inp, i) => { if (parsed[i] != null) inp.value = parsed[i]; });
        });
    }

    ngOnDestroy(): void {
        this.stopExamCountdown();
        Object.keys(this.recordAudioAnimationFrames).forEach(k => this.stopSpeakingIndicator(k));
        Object.keys(this.recordTimers).forEach(k => this.clearRecordTimer(k));
        Object.keys(this.recorders).forEach(k => {
            const r = this.recorders[k];
            if (r) { try { r.stop().getMp3().catch(() => null); } catch { /* noop */ } }
        });
        Object.keys(this.recordStates).forEach(k => {
            const st = this.recordStates[k];
            if (st?.audioUrl) URL.revokeObjectURL(st.audioUrl);
        });
        if (this.beepAudioUrl) URL.revokeObjectURL(this.beepAudioUrl);
    }

    // =================== Helpers ===================

    questionKey(q: any): string {
        return `${q?.bank_id ?? 'b'}_${q?.id ?? 'i'}_${q?.question_type ?? 't'}`;
    }

    findQuestionById(id: string): QV | null {
        for (const p of this.parents()) {
            if (String(p.id) === String(id)) return p;
            if (p.children?.length) {
                for (const c of p.children) if (String(c.id) === String(id)) return c;
            }
        }
        return null;
    }

    updateLocalAnswer(question: any, value: any): void {
        const key = this.questionKey(question);
        this.localAnswers[key] = value;
        const ser = this.serializeStudentAnswer(question);
        this.postedAnswerKeys[key] = this.postedAnswerValues[key] === ser;
        this.answerVersion.update(v => v + 1);
        this.cdr.markForCheck();
        this.rehydrateRecordStateFromAnswer(question);
    }

    answerValue(q: any): any {
        const key = this.questionKey(q);
        const v = this.localAnswers[key];
        if (v !== undefined && v !== null) return v;
        return this.postedAnswerValues[key] ?? null;
    }

    isAnswerSelected(q: any, optId: any): boolean {
        return String(this.answerValue(q)) === String(optId);
    }

    serializeStudentAnswer(q: any): string {
        const v = this.answerValue(q);
        if (v == null) return '';
        if (typeof v === 'object') return JSON.stringify(v);
        return String(v);
    }

    isLastParent(): boolean { return this.currentParentIndex() === this.parents().length - 1; }

    canSubmitSkillTest(): boolean {
        return this.isLastParent() && this.isCurrentParentComplete() && this.isAllQuestionsAnswered();
    }

    handleNextAction(): void {
        if (this.canSubmitSkillTest()) { this.askSubmitSkillTest(); return; }
        if (!this.isCurrentParentComplete()) {
            const labels: string[] = [];
            const parent = this.currentParent();
            if (parent) {
                if (this.isRecordQuestion(parent)) labels.push('ghi âm');
                if (this.isInputboxQuestion(parent) || this.isTextareaQuestion(parent)) labels.push('nhập câu trả lời');
                if (this.isSelectQuestion(parent) && !hasSelectMarker(parent.question_direction)) labels.push('chọn đáp án');
                if (parent.children?.length) {
                    parent.children.forEach(c => {
                        if (this.isRecordQuestion(c)) labels.push('ghi âm');
                        else if (this.isInputboxQuestion(c) || this.isTextareaQuestion(c)) labels.push('nhập câu trả lời');
                        else if (this.isSelectQuestion(c) && !hasSelectMarker(c.question_direction)) labels.push('chọn đáp án');
                        else if (['radio', 'checkbox', 'group-radio', 'group-input'].includes(c.question_type)) {
                            if (!this.answerValue(c)) labels.push('chọn đáp án');
                        }
                    });
                }
            }
            this.incompleteCurrentPageWarning.set('Vui lòng hoàn thành: ' + Array.from(new Set(labels)).join(', ') + ' trước khi tiếp tục.');
            return;
        }
        this.incompleteCurrentPageWarning.set('');
        this.saveCurrentAnswers();
        this.nextParent();
    }

    setActiveParent(index: number, source: 'menu' | 'next' | 'previous' = 'menu'): void {
        if (index < 0 || index >= this.parents().length) return;
        this.saveCurrentAnswers();
        this.cleanupActiveRecordQuestion();
        const oldIndex = this.currentParentIndex();
        this.currentParentIndex.set(index);
        this.markActiveParentSeen();
        setTimeout(() => this.prepareActiveRecordQuestion(), 250);
    }

    canSelectMenuQuestion(index: number): boolean {
        if (index <= this.currentParentIndex()) return true;
        return this.isCurrentParentComplete();
    }

    isAllQuestionsAnswered(): boolean {
        for (const p of this.parents()) {
            const qs = this.parentQuestions(p);
            for (const q of qs) if (!this.isQuestionAnswered(q)) return false;
        }
        return true;
    }

    isCurrentParentComplete(): boolean {
        const p = this.currentParent();
        if (!p) return false;
        const qs = this.parentQuestions(p);
        if (!qs.length) return false;
        return qs.every(q => this.isQuestionAnswered(q));
    }

    currentParentQuestions(): QV[] { return this.parentQuestions(this.currentParent()); }

    parentQuestions(p: QV | null): QV[] {
        if (!p) return [];
        if (p.children?.length) return p.children;
        return [p];
    }

    isAnswerableQuestion(q: any): boolean {
        return ['radio', 'checkbox', 'select', 'inputbox', 'textarea', 'record', 'group-radio', 'group-input'].includes(q.question_type);
    }

    isQuestionAnswered(q: any): boolean {
        const key = this.questionKey(q);
        const st = this.recordStates[key];
        if (this.isRecordQuestion(q)) {
            if (st?.phase === 'preparing' || st?.phase === 'recording' || st?.phase === 'uploading' || st?.phase === 'error') return false;
            const a = this.answerValue(q);
            return !!a?.fileId || !!a?.fileName || !!a?.filePath || st?.phase === 'uploaded';
        }
        return !this.isAnswerEmpty(this.answerValue(q));
    }

    isAnswerEmpty(v: any): boolean {
        if (v == null) return true;
        if (typeof v === 'string') return v.trim() === '';
        if (typeof v === 'object') return !v.fileId && !v.fileName && !v.filePath && Object.keys(v).length === 0;
        return false;
    }

    getGroupedByPart(): PG[] {
        const groups = new Map<number, QV[]>();
        this.parents().forEach(p => {
            const part = Number(p.part || 0);
            if (!groups.has(part)) groups.set(part, []);
            groups.get(part)!.push(p);
        });
        const result: PG[] = [];
        for (const [part, qs] of groups) {
            qs.forEach((q, i) => q._globalIndex = this.parents().indexOf(q));
            // Tính range tuần tự dựa trên _seqIndex của các câu visible (parent không có children + first/last child)
            const seqs: number[] = [];
            qs.forEach(q => {
                if (q.children?.length) {
                    const first = (q.children[0] as QV)?._seqIndex;
                    const last = (q.children[q.children.length - 1] as QV)?._seqIndex;
                    if (first != null) seqs.push(first);
                    if (last != null && last !== first) seqs.push(last);
                } else if (q._seqIndex != null) {
                    seqs.push(q._seqIndex);
                }
            });
            seqs.sort((a, b) => a - b);
            const first = seqs[0];
            const last = seqs[seqs.length - 1];
            result.push({ part, questions: qs, _range: first != null && last != null && first !== last ? `${first}–${last}` : (first != null ? String(first) : '') });
        }
        return result.sort((a, b) => a.part - b.part);
    }

    echoPart(part: number): string {
        const map: { [k: number]: string } = { 1: 'Phần 1', 2: 'Phần 2', 3: 'Phần 3', 4: 'Phần 4', 5: 'Phần 5' };
        return map[part] || `Phần ${part}`;
    }

    isPartCollapsed(part: number): boolean { return this.collapsedParts().has(part); }

    togglePartCollapse(part: number): void {
        const s = new Set(this.collapsedParts());
        if (s.has(part)) s.delete(part); else s.add(part);
        this.collapsedParts.set(s);
    }

    partQuestionCount(p: QV): number {
        if (p.children?.length) return p.children.length;
        return 1;
    }

    seqIndexOf(q: any): number {
        return Number((q as QV)?._seqIndex) || 0;
    }

    hasSeenQuestion(q: any): boolean { return this.seenQuestionKeys().has(this.questionKey(q)); }

    getQuestionRange(q: QV): string {
        if (q.children?.length) {
            const first = (q.children[0] as QV)?._seqIndex;
            const last = (q.children[q.children.length - 1] as QV)?._seqIndex;
            if (first != null && last != null) {
                const s1 = String(first), s2 = String(last);
                if (s1 === s2) return s1;
                return `${s1}-${s2}`;
            }
        }
        if (q._seqIndex != null) return String(q._seqIndex);
        const qn = q.question_number;
        if (qn != null) {
            const s = String(qn).trim();
            if (s) return s;
        }
        return String((q._globalIndex ?? 0) + 1);
    }

    getParentBadge(p: QV): string {
        if (p.children?.length) {
            const first = (p.children[0] as QV)?._seqIndex;
            const last = (p.children[p.children.length - 1] as QV)?._seqIndex;
            if (first != null && last != null && String(first) !== String(last)) {
                return `${first}-${last}`;
            }
            return String(first ?? ((p._globalIndex ?? 0) + 1));
        }
        return this.getQuestionRange(p);
    }

    getPartRange(pg: PG): string { return pg._range || ''; }

    shouldRenderParentControl(p: QV): boolean {
        if (p.children?.length) return false;
        return this.isAnswerableQuestion(p) || hasSelectMarker(p.question_direction) || hasSelectBlockMarker(p.question_direction);
    }

    hasAnswerOptions(q: any): boolean { return Array.isArray(q.answer_option) && q.answer_option.length > 0; }

    isSelectQuestion(q: any): boolean { return q.question_type === 'select'; }

    isParagraphQuestion(q: any): boolean { return q.question_type === 'paragraph'; }

    isRecordQuestion(q: any): boolean { return q.question_type === 'record'; }

    isTextareaQuestion(q: any): boolean { return q.question_type === 'textarea'; }

    isInputboxQuestion(q: any): boolean { return q.question_type === 'inputbox'; }

    isRadioQuestion(q: any): boolean { return q.question_type === 'radio' || q.question_type === 'group-radio'; }

    isCheckboxQuestion(q: any): boolean { return q.question_type === 'checkbox' || q.question_type === 'group-input'; }

    hasSelectMarker(text: string): boolean {
        if (!text) return false;
        return /\[\[[^\]]+\]\]/.test(text) && !hasSelectBlockMarker(text);
    }

    hasSelectBlockMarker(text: string): boolean {
        if (!text) return false;
        return /\{\{[^}]+\}\}/.test(text);
    }

    hasInputInlineMarker(text: string): boolean {
        if (!text) return false;
        return /\[\[[^\]]+\]\]/.test(text);
    }

    getSelectQuestionParts(text: string): string[] {
        if (!text) return ['', ''];
        const parts = text.split(/\[\[[^\]]+\]\]/);
        return parts.length >= 2 ? [parts[0], parts.slice(1).join('')] : [text, ''];
    }

    getSelectBlockContent(text: string): string {
        if (!text) return '';
        return text.replace(/\{\{[^}]+\}\}/g, '').trim();
    }

    processInputDirection(text: string): { html?: string; label?: string }[] {
        if (!text) return [];
        const result: { html?: string; label?: string }[] = [];
        const regex = /\[\[([^\]]+)\]\]/g;
        let last = 0;
        let m: RegExpExecArray | null;
        while ((m = regex.exec(text)) !== null) {
            if (m.index > last) result.push({ html: text.slice(last, m.index) });
            result.push({ label: m[1] });
            last = regex.lastIndex;
        }
        if (last < text.length) result.push({ html: text.slice(last) });
        return result;
    }

    getInputWidth(label: string): number {
        if (!label) return 60;
        let w = 0;
        for (const c of label) {
            const code = c.charCodeAt(0);
            if (code > 0x4E00) w += 18; else w += 9;
        }
        return Math.max(40, w + 14);
    }

    trustHtml(html: string): SafeHtml { return this.sanitizer.bypassSecurityTrustHtml(html || ''); }

    buildAudioUrl(path: string): string {
        if (!path) return '';
        const token = tokenGetter();
        if (path.startsWith('http')) {
            return path + (token && !path.includes('token=') ? (path.includes('?') ? '&' : '?') + `token=${token}` : '');
        }
        const base = linkGetFileContentAws(path);
        return base + (token ? `?token=${token}` : '');
    }

    resolvedAudio(path: string): string { return this.buildAudioUrl(path); }

    // =================== Audio replay count (listening) ===================

    getListeningReplayCount(): number {
        if ((this.skill() || '').toLowerCase() !== 'listening') return -1;
        const c = Number(this.shift()?.listening_count);
        return c > 0 ? c : -1;
    }

    getAudioReplayCount(q: any): number {
        const key = this.questionKey(q);
        const st = this.recordStates[key];
        if (!st) return this.getListeningReplayCount();
        return st.replaysLeft ?? this.getListeningReplayCount();
    }

    decrementAudioReplay(q: any): void {
        const key = this.questionKey(q);
        const st = this.recordStates[key] || (this.recordStates[key] = { phase: 'idle', prepareLeft: 0, speakingLeft: 0 });
        if (st.replaysLeft == null) st.replaysLeft = this.getListeningReplayCount();
        if (st.replaysLeft > 0) st.replaysLeft -= 1;
    }

    markAudioLoadFailed(q: any): void {
        const key = this.questionKey(q);
        const st = this.recordStates[key] || (this.recordStates[key] = { phase: 'idle', prepareLeft: 0, speakingLeft: 0 });
        st.audioLoadFailed = true;
    }

    reloadAudio(q: any): void {
        const key = this.questionKey(q);
        const st = this.recordStates[key];
        const path = q?.media?.path;
        if (!path) return;
        st.audioLoadFailed = false;
        this.answerVersion.update(v => v + 1);
        this.cdr.markForCheck();
    }

    // Callbacks for AudioPlayerComponent (bind per-question)
    onAudioLoadErrorForQ = (q: any) => () => this.markAudioLoadFailed(q);
    onReplayUsedForQ = (q: any) => () => this.decrementAudioReplay(q);

    processDirectionImage(html: string): string {
        if (!html) return '';
        const token = tokenGetter();
        return html.replace(/<img\s+([^>]*?)src="([^"]+)"([^>]*)>/gi, (m, pre, src, post) => {
            const base = src.startsWith('http') ? src : linkGetFileContentAws(src);
            const sep = base.includes('?') ? '&' : '?';
            const fullSrc = token ? `${base}${sep}token=${token}` : base;
            return `<img ${pre}src="${fullSrc}" ${post}>`;
        });
    }

    wordCount(v: any): number {
        if (!v) return 0;
        const s = String(v).trim();
        if (!s) return 0;
        return s.split(/\s+/).length;
    }

    // =================== Recording params ===================

    recordPrepareSeconds = (q: any): number => Math.max(0, Number(q?.params?.prepare) || 0);

    recordSpeakingSeconds = (q: any): number => {
        const t = Number(q?.params?.time);
        return t > 0 ? t : 20;
    };

    // =================== Recording core ===================

    prepareRecordQuestion(question: QV): void {
        const key = this.questionKey(question);
        const existing = this.recordStates[key];
        if (existing && existing.phase !== 'idle' && existing.phase !== 'error' && existing.phase !== 'uploaded') return;
        if (existing && existing.phase === 'uploaded') return;

        const prepareTime = this.recordPrepareSeconds(question);
        const speakingTime = this.recordSpeakingSeconds(question);

        this.recordStates[key] = {
            phase: 'preparing',
            prepareLeft: prepareTime,
            speakingLeft: speakingTime,
        };
        this.recordStatus.set('preparing');
        this.prepareLeft.set(prepareTime);
        this.speakingLeft.set(speakingTime);
        this.recError.set('');

        if (prepareTime <= 0) {
            this.playBeepAndStartRecording(question);
            return;
        }

        this.clearRecordTimer(key);
        this.recordTimers[key] = setInterval(() => {
            const st = this.recordStates[key];
            if (!st || st.phase !== 'preparing') { this.clearRecordTimer(key); return; }
            st.prepareLeft--;
            this.prepareLeft.set(st.prepareLeft);
            if (st.prepareLeft <= 0) {
                this.clearRecordTimer(key);
                this.playBeepAndStartRecording(question);
            }
        }, 1000);
    }

    private playBeepAndStartRecording(question: QV): void {
        this.playBeepSound().then(() => this.startRecordingMic(question));
    }

    private playBeepSound(): Promise<void> {
        return new Promise(resolve => {
            try {
                if (!this.beepAudioUrl) this.beepAudioUrl = this.generateBeepWav();
                const audio = new Audio(this.beepAudioUrl);
                audio.volume = 1;
                audio.play().then(() => setTimeout(resolve, 300)).catch(() => resolve());
            } catch {
                resolve();
            }
        });
    }

    private generateBeepWav(): string {
        const sr = 8000;
        const num = Math.floor(sr * 0.2);
        const buf = new ArrayBuffer(44 + num);
        const v = new DataView(buf);
        const writeStr = (off: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); };
        writeStr(0, 'RIFF');
        v.setUint32(4, num + 36, true);
        writeStr(8, 'WAVE');
        writeStr(12, 'fmt ');
        v.setUint32(16, 16, true);
        v.setUint16(20, 1, true);
        v.setUint16(22, 1, true);
        v.setUint32(24, sr, true);
        v.setUint32(28, sr, true);
        v.setUint16(32, 1, true);
        v.setUint16(34, 8, true);
        writeStr(36, 'data');
        v.setUint32(40, num, true);
        for (let i = 0; i < num; i++) {
            v.setUint8(44 + i, Math.floor((Math.sin(2 * Math.PI * 880 * (i / sr)) + 1) * 127.5));
        }
        return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
    }

    private startRecordingMic(question: QV): void {
        const key = this.questionKey(question);
        const MicRec = (window as any).MicRecorder;
        if (!MicRec) {
            this.recError.set('MicRecorder chưa sẵn sàng. Vui lòng tải lại trang.');
            if (this.recordStates[key]) this.recordStates[key].phase = 'error';
            this.recordStatus.set('error');
            return;
        }
        try {
            const recorder = new MicRec({ bitRate: 128 });
            this.recorders[key] = recorder;
            recorder.start().then(() => {
                if (this.recordStates[key]) this.recordStates[key].phase = 'recording';
                this.recordStatus.set('recording');
                this.startSpeakingIndicator(question);
                this.startSpeakingCountdown(question);
            }).catch(() => {
                if (this.recordStates[key]) this.recordStates[key].phase = 'error';
                this.recordStatus.set('error');
                this.recError.set('Không thể truy cập microphone.');
            });
        } catch {
            if (this.recordStates[key]) this.recordStates[key].phase = 'error';
            this.recordStatus.set('error');
            this.recError.set('Không thể khởi tạo recorder.');
        }
    }

    private startSpeakingCountdown(question: QV): void {
        const key = this.questionKey(question);
        const st = this.recordStates[key];
        if (!st || st.speakingLeft <= 0) { this.doStop(question); return; }
        this.clearRecordTimer(key);
        this.recordTimers[key] = setInterval(() => {
            const cur = this.recordStates[key];
            if (!cur || cur.phase !== 'recording') { this.clearRecordTimer(key); return; }
            cur.speakingLeft--;
            this.speakingLeft.set(cur.speakingLeft);
            if (cur.speakingLeft <= 0) {
                this.clearRecordTimer(key);
                this.doStop(question);
            }
        }, 1000);
    }

    private startSpeakingIndicator(question: QV): void {
        const key = this.questionKey(question);
        if (!navigator.mediaDevices?.getUserMedia) return;
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
            this.recordAudioStreams[key] = stream;
            const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
            if (!AC) {
                stream.getTracks().forEach((t: any) => t.stop());
                delete this.recordAudioStreams[key];
                return;
            }
            const ctx = new AC();
            this.recordAudioContexts[key] = ctx;
            const a = ctx.createAnalyser();
            a.fftSize = 256;
            ctx.createMediaStreamSource(stream).connect(a);
            const data = new Uint8Array(a.frequencyBinCount);
            const detect = () => {
                const cur = this.recordStates[key];
                if (!cur || cur.phase !== 'recording') {
                    this.stopSpeakingIndicator(key);
                    return;
                }
                a.getByteFrequencyData(data);
                const avg = data.reduce((x, y) => x + y, 0) / data.length;
                const speaking = avg > 12;
                cur.isSpeaking = speaking;
                this.isSpeaking.set(speaking);
                this.recordAudioAnimationFrames[key] = requestAnimationFrame(detect);
            };
            detect();
        }).catch(() => { /* ignore */ });
    }

    private stopSpeakingIndicator(key: string): void {
        if (this.recordAudioAnimationFrames[key]) {
            cancelAnimationFrame(this.recordAudioAnimationFrames[key]);
            delete this.recordAudioAnimationFrames[key];
        }
        if (this.recordAudioStreams[key]) {
            this.recordAudioStreams[key].getTracks().forEach((t: any) => t.stop());
            delete this.recordAudioStreams[key];
        }
        if (this.recordAudioContexts[key]) {
            this.recordAudioContexts[key].close().catch(() => { /* noop */ });
            delete this.recordAudioContexts[key];
        }
        if (this.recordStates[key]) this.recordStates[key].isSpeaking = false;
        this.isSpeaking.set(false);
    }

    private clearRecordTimer(key: string): void {
        if (this.recordTimers[key]) {
            clearInterval(this.recordTimers[key]);
            delete this.recordTimers[key];
        }
    }

    private doStop(question: QV): void {
        const key = this.questionKey(question);
        const st = this.recordStates[key];
        const rec = this.recorders[key];
        if (!st || !rec) return;
        this.clearRecordTimer(key);
        this.stopSpeakingIndicator(key);
        st.phase = 'uploading';
        this.recordStatus.set('uploading');
        try {
            rec.stop().getMp3().then(([buffer, blob]: any) => {
                const file = new File(buffer, 'record-' + Date.now() + '.mp3', { type: 'audio/mp3', lastModified: Date.now() });
                st.file = file;
                this.uploadRec(question, file);
            }).catch(() => {
                st.phase = 'error';
                this.recordStatus.set('error');
                this.recError.set('Lỗi lưu file ghi âm.');
            });
        } catch {
            st.phase = 'error';
            this.recordStatus.set('error');
            this.recError.set('Lỗi dừng ghi âm.');
        }
    }

    private uploadRec(question: QV, file: File, retry = 0): void {
        const key = this.questionKey(question);
        this._hasRecordUploadInProgress = true;
        this.recordStatus.set('uploading');
        this.fileService.upload(file).subscribe({
            next: (r: any) => {
                this._hasRecordUploadInProgress = false;
                if (!r) {
                    this.recordStates[key].phase = 'error';
                    this.recordStatus.set('error');
                    this.recError.set('Upload thất bại.');
                    return;
                }
                const answer = { fileId: r.id, fileName: file.name, filePath: r.id, mimeType: 'audio/mp3' };
                this.updateLocalAnswer(question, answer);
                if (this.recordStates[key]) this.recordStates[key].phase = 'uploaded';
                this.recordStatus.set('uploaded');
                this.recAudioUrl.set(this.buildAudioUrl(r.id));
                if (this.recordStates[key]) this.recordStates[key].uploadResult = answer;
                this.postAnswer(question);
                setTimeout(() => this.prepareActiveRecordQuestion(), 2000);
            },
            error: () => {
                this._hasRecordUploadInProgress = false;
                if (retry < 2) {
                    setTimeout(() => this.uploadRec(question, file, retry + 1), 1500);
                    return;
                }
                if (this.recordStates[key]) this.recordStates[key].phase = 'error';
                this.recordStatus.set('error');
                this.recError.set('Upload thất bại.');
            }
        });
    }

    retryRecord(question: QV): void {
        const key = this.questionKey(question);
        if (this.recorders[key]) { try { this.recorders[key].stop().catch(() => { /* noop */ }); } catch { /* noop */ } }
        delete this.recorders[key];
        this.clearRecordTimer(key);
        this.recAudioUrl.set('');
        this.recError.set('');
        delete this.recordStates[key];
        this.recordStatus.set('idle');
        this.startRecord(question);
    }

    private rehydrateRecordStateFromAnswer(question: QV): void {
        if (!this.isRecordQuestion(question)) return;
        const key = this.questionKey(question);
        const answer = this.answerValue(question);
        if (!answer?.fileId && !answer?.fileName && !answer?.filePath) return;
        const st = this.recordStates[key];
        if (st && (st.phase === 'preparing' || st.phase === 'recording' || st.phase === 'uploading')) return;
        this.recordStates[key] = { phase: 'uploaded', prepareLeft: 0, speakingLeft: 0, uploadResult: answer };
        this.recordStatus.set('uploaded');
        this.recAudioUrl.set(this.buildAudioUrl(answer.fileId || answer.filePath));
    }

    private hasRecordUploadInProgress(): boolean { return this._hasRecordUploadInProgress; }

    private activeRecordQuestion(): QV | null {
        const parent = this.currentParent();
        if (!parent) return null;
        if (parent.children?.length) {
            for (const child of parent.children) {
                if (!this.isRecordQuestion(child)) continue;
                if (this.isRecordQuestionAnswered(child)) continue;
                const st = this.recordStates[this.questionKey(child)];
                if (st?.phase === 'error') continue;
                return child;
            }
            return null;
        }
        if (!this.isRecordQuestion(parent)) return null;
        if (this.isRecordQuestionAnswered(parent)) return null;
        const st = this.recordStates[this.questionKey(parent)];
        if (st?.phase === 'error') return null;
        return parent;
    }

    private isRecordQuestionAnswered(question: QV): boolean {
        const st = this.recordStates[this.questionKey(question)];
        if (st?.phase === 'preparing' || st?.phase === 'recording' || st?.phase === 'uploading') return false;
        const answer = this.answerValue(question);
        if (answer?.fileId || answer?.fileName || answer?.filePath) return true;
        return st?.phase === 'uploaded' || st?.phase === 'error';
    }

    prepareActiveRecordQuestion(): void {
        if (this.hasRecordUploadInProgress()) return;
        const q = this.activeRecordQuestion();
        if (q) this.prepareRecordQuestion(q);
    }

    cleanupActiveRecordQuestion(): void {
        const parent = this.currentParent();
        if (!parent) return;
        const cleanup = (q: QV) => {
            if (!this.isRecordQuestion(q)) return;
            const key = this.questionKey(q);
            this.clearRecordTimer(key);
            const st = this.recordStates[key];
            if (!st) return;
            if (st.phase === 'preparing') st.phase = 'idle';
            if (st.phase === 'recording' && this.recorders[key]) this.doStop(q);
        };
        cleanup(parent);
        if (parent.children?.length) {
            parent.children.filter(c => this.isRecordQuestion(c)).forEach(c => cleanup(c as QV));
        }
    }

    startRecord(question: QV): void { this.prepareRecordQuestion(question); }

    recordState(q: any): RecordQuestionState {
        return this.recordStates[this.questionKey(q)] || { phase: 'idle', prepareLeft: 0, speakingLeft: 0 };
    }

    // =================== Dialogs ===================

    askSubmitSkillTest(): void { this.submitConfirmVisible.set(true); }
    cancelSubmitSkillTest(): void { this.submitConfirmVisible.set(false); }
    closeScoreResult(): void { this.scoreResultVisible.set(false); }

    confirmSubmitSkillTest(): void {
        this.submitConfirmVisible.set(false);
        this.saveCurrentAnswers();
        this.cleanupActiveRecordQuestion();
        const st = this.shiftTest();
        if (!st) return;
        this.submitting.set(true);
        this.shiftTestService.scoreShiftTest(st.id, this.skill()).pipe(
            finalize(() => this.submitting.set(false)),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe({
            next: () => {
                this.scoreResultVisible.set(true);
                const completed = new Set(this.completedQuestionIds());
                this.parents().forEach(p => completed.add(this.questionKey(p)));
                this.completedQuestionIds.set(completed);
            },
            error: () => { this.incompleteCurrentPageWarning.set('Nộp bài thất bại. Vui lòng thử lại.'); }
        });
    }

    askExitExam(): void { this.exitConfirmVisible.set(true); }
    cancelExitExam(): void { this.exitConfirmVisible.set(false); }
    confirmExitExam(): void {
        this.exitConfirmVisible.set(false);
        this.saveCurrentAnswers();
        this.cleanupActiveRecordQuestion();
        this.router.navigate(['/student-info']);
    }

    // =================== Build parents ===================

    private buildParents(): void {
        const qs = this.questions();
        const map = new Map<number, QV>();
        const childIds = new Set<number>();
        qs.forEach(q => {
            const qid = q.id;
            if (q.group_id && q.group_id !== qid) {
                childIds.add(qid);
                const parent = map.get(q.group_id);
                if (parent) {
                    parent.children = parent.children || [];
                    parent.children.push(q as QV);
                } else {
                    const base = qs.find(x => x.id === q.group_id) || q;
                    map.set(q.group_id, { ...base, children: [q as QV] } as QV);
                }
            } else {
                if (!map.has(qid)) map.set(qid, { ...q, children: undefined } as QV);
                else if (q.children?.length) {
                    const p = map.get(qid)!;
                    p.children = (p.children || []).concat(q.children as QV[]);
                }
            }
        });
        const list = Array.from(map.values()).filter(p => !childIds.has(p.id));
        // Sort theo part rồi question_number để menu đúng thứ tự
        list.sort((a, b) => {
            const pa = Number(a.part || 0), pb = Number(b.part || 0);
            if (pa !== pb) return pa - pb;
            return Number(a.question_number || 0) - Number(b.question_number || 0);
        });
        // Sort children trong từng parent theo question_number
        list.forEach(p => {
            if (p.children?.length) {
                p.children.sort((a: any, b: any) => Number(a.question_number || 0) - Number(b.question_number || 0));
            }
        });
        list.forEach((p, i) => p._globalIndex = i);

        // Gán số tuần tự 1-based cho từng câu visible (parent hoặc child trong parent có children)
        let seq = 0;
        list.forEach(p => {
            if (p.children?.length) {
                p.children.forEach(c => { (c as QV)._seqIndex = ++seq; });
            } else {
                p._seqIndex = ++seq;
            }
        });

        this.parents.set(list);
        this.currentParentIndex.set(0);
        this.markActiveParentSeen();
        this.loadServerAnswersAndState();
        setTimeout(() => this.prepareActiveRecordQuestion(), 300);
    }

    private resetAllState(): void {
        this.stopExamCountdown();
        this.localAnswers = {};
        this.postedAnswerKeys = {};
        this.postedAnswerValues = {};
        this.answerServerIds = {};
        Object.keys(this.recordAudioAnimationFrames).forEach(k => this.stopSpeakingIndicator(k));
        Object.keys(this.recordTimers).forEach(k => this.clearRecordTimer(k));
        Object.keys(this.recorders).forEach(k => {
            const r = this.recorders[k];
            if (r) { try { r.stop().getMp3().catch(() => null); } catch { /* noop */ } }
        });
        this.recordStates = {};
        this.recorders = {};
        this.recordAudioContexts = {};
        this.recordAudioStreams = {};
        this.recordAudioAnimationFrames = {};
        this.recordTimers = {};
        this._hasRecordUploadInProgress = false;
        this.parents.set([]);
        this.currentParentIndex.set(0);
        this.questionPanelOpen.set(false);
        this.collapsedParts.set(new Set());
        this.seenQuestionKeys.set(new Set());
        this.completedQuestionIds.set(new Set());
        this.submitConfirmVisible.set(false);
        this.exitConfirmVisible.set(false);
        this.submitting.set(false);
        this.incompleteCurrentPageWarning.set('');
        this.scoreResultVisible.set(false);
        this.examTimeLeft.set(0);
        this.countdownDisplay.set('--:--');
        this.answerVersion.update(v => v + 1);
        this.recordStatus.set('idle');
        this.prepareLeft.set(0);
        this.speakingLeft.set(0);
        this.recError.set('');
        this.recAudioUrl.set('');
        this.isSpeaking.set(false);
        this.resolvedAudioUrls.set({});
        this.stateId = null;
        this.lastTimeLeftSync = 0;
        this._inlineRestored = false;
    }

    private markActiveParentSeen(): void {
        const p = this.currentParent();
        if (!p) return;
        const seen = new Set(this.seenQuestionKeys());
        this.parentQuestions(p).forEach(q => seen.add(this.questionKey(q)));
        this.seenQuestionKeys.set(seen);
    }

    private loadServerAnswersAndState(): void {
        const st = this.shiftTest();
        if (!st) return;
        this.shiftTestAnswerService.query(
            [{ conditionName: 'shift_test_id', condition: IctuQueryCondition.equal, value: st.id.toString() }],
            { limit: 1000 }
        ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((res: any) => {
            const data = res.data || res || [];
            if (Array.isArray(data)) {
                data.forEach((row: any) => {
                    const q = this.findQuestionByServerId(row.bank_question_id);
                    if (!q) return;
                    const key = this.questionKey(q);
                    let parsed: any = row.student_answer;
                    try { parsed = JSON.parse(parsed); } catch { /* keep string */ }
                    this.localAnswers[key] = parsed;
                    this.postedAnswerKeys[key] = true;
                    this.postedAnswerValues[key] = this.serializeStudentAnswer(q);
                    this.answerServerIds[key] = row.id;
                    if (this.isRecordQuestion(q)) this.rehydrateRecordStateFromAnswer(q);
                });
                this.answerVersion.update(v => v + 1);
                this.cdr.markForCheck();
            }
        });

        this.shiftTestStateService.query(
            [
                { conditionName: 'shift_test_id', condition: IctuQueryCondition.equal, value: st.id.toString() },
                { conditionName: 'skill', condition: IctuQueryCondition.equal, value: this.skill() },
            ],
            { limit: 1 }
        ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((res: any) => {
            const data = res.data || res || [];
            const row = Array.isArray(data) ? data[0] : null;
            if (row) {
                this.stateId = row.id;
                this.examTimeLeft.set(row.time_left || 0);
                this.startExamCountdown();
            } else {
                this.formDetailService.query(
                    [
                        { conditionName: 'form_id', condition: IctuQueryCondition.equal, value: st.form_id.toString() },
                        { conditionName: 'skill', condition: IctuQueryCondition.equal, value: this.skill() },
                    ],
                    { limit: 1 }
                ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((fr: any) => {
                    const fd: FormDetail = fr.data?.[0] || null;
                    const dur = fd?.time || 0;
                    this.examTimeLeft.set(dur);
                    this.createState(st.id, dur);
                    this.startExamCountdown();
                });
            }
        });
    }

    private findQuestionByServerId(bqId: number): QV | null {
        for (const p of this.parents()) {
            if (Number(p.id) === Number(bqId)) return p;
            if (p.children?.length) {
                for (const c of p.children) if (Number(c.id) === Number(bqId)) return c;
            }
        }
        return null;
    }

    private createState(shiftTestId: number, duration: number): void {
        const payload: Partial<ShiftTestState> = {
            shift_test_id: shiftTestId,
            student_id: this.student()?.id ?? 0,
            skill: this.skill(),
            progress: JSON.stringify({ current: 0 }),
            duration,
            time_left: duration,
            completed: 0,
        };
        this.shiftTestStateService.create(payload as any).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((row: any) => {
            this.stateId = row?.id ?? null;
        });
    }

    private startExamCountdown(): void {
        if (this.examCountdownTimer) clearInterval(this.examCountdownTimer);
        if (this.examTimeLeft() <= 0) {
            this.countdownDisplay.set('--:--');
            return;
        }
        const initial = this.examTimeLeft();
        const m = Math.floor(initial / 60), s = initial % 60;
        this.countdownDisplay.set(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
        this.examCountdownTimer = setInterval(() => {
            const left = Math.max(0, this.examTimeLeft() - 1);
            this.examTimeLeft.set(left);
            const mm = Math.floor(left / 60), ss = left % 60;
            this.countdownDisplay.set(`${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`);
            this.countdownWarning = left < 60;
            if (Date.now() - this.lastTimeLeftSync > 30000) {
                this.lastTimeLeftSync = Date.now();
                this.syncState();
            }
            if (left <= 0 && this.examCountdownTimer) {
                clearInterval(this.examCountdownTimer);
                this.examCountdownTimer = null;
                if (this.canSubmitSkillTest()) this.confirmSubmitSkillTest();
            }
        }, 1000);
    }

    private stopExamCountdown(): void {
        if (this.examCountdownTimer) { clearInterval(this.examCountdownTimer); this.examCountdownTimer = null; }
    }

    private syncState(): void {
        if (!this.stateId) return;
        this.shiftTestStateService.update(this.stateId, {
            time_left: this.examTimeLeft(),
            progress: JSON.stringify({ current: this.currentParentIndex() }),
        } as any).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => { /* ok */ }, error: () => { /* retry */ } });
    }

    // =================== Answer posting ===================

    saveCurrentAnswers(): void {
        const parent = this.currentParent();
        if (!parent) return;
        this.parentQuestions(parent).forEach(q => {
            if (this.isAnswerEmpty(this.answerValue(q))) return;
            this.postAnswer(q);
        });
    }

    private postAnswer(q: any): void {
        const st = this.shiftTest();
        if (!st) return;
        const key = this.questionKey(q);
        const ser = this.serializeStudentAnswer(q);
        if (!ser) return;
        if (this.postedAnswerKeys[key] && this.postedAnswerValues[key] === ser) return;
        const payload: Partial<ShiftTestAnswer> = {
            shift_id: st.shift_id,
            shift_test_id: st.id,
            bank_question_id: q.id,
            student_id: st.student_id,
            student_answer: ser,
        };
        const existingId = this.answerServerIds[key];
        const op$ = existingId
            ? this.shiftTestAnswerService.update(existingId, payload as any)
            : this.shiftTestAnswerService.create(payload as any);
        op$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (row: any) => {
                if (!existingId && row?.id) this.answerServerIds[key] = row.id;
                this.postedAnswerKeys[key] = true;
                this.postedAnswerValues[key] = ser;
            },
            error: () => { /* keep postedAnswerKeys false to retry */ }
        });
    }

    previousParent(): void {
        if (this.currentParentIndex() > 0) this.setActiveParent(this.currentParentIndex() - 1, 'previous');
    }

    nextParent(): void {
        if (this.currentParentIndex() < this.parents().length - 1) this.setActiveParent(this.currentParentIndex() + 1, 'next');
    }

    parseInlineAnswer(v: any): string[] {
        if (!v) return [];
        if (typeof v === 'string') {
            try { const p = JSON.parse(v); if (Array.isArray(p)) return p; } catch { /* keep */ }
            return v.split('|');
        }
        if (Array.isArray(v)) return v;
        return [];
    }

    groupQuestions(): PG[] { return this.getGroupedByPart(); }
}

function hasSelectMarker(text: string): boolean {
    if (!text) return false;
    return /\[\[[^\]]+\]\]/.test(text) && !hasSelectBlockMarker(text);
}

function hasSelectBlockMarker(text: string): boolean {
    if (!text) return false;
    return /\{\{[^}]+\}\}/.test(text);
}
