import { Component, signal, WritableSignal, AfterViewChecked, ElementRef, computed, inject, DestroyRef, effect, ChangeDetectorRef, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Router, ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { switchMap, map, catchError, of, finalize, take, forkJoin } from 'rxjs';

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
import { DtoObject } from '@models/dto';
import { linkGetFileContentAws } from '@env';
import { tokenGetter } from '@app/app.config';
import { StudentService } from '@services/student.service';
import { ShiftService } from '@services/shift.service';
import { AuthenticationService } from '@services/authentication.service';

import { SpeakingAudioPlayerComponent } from '../../speaking-audio-player.component';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

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
    selector: 'app-speaking-exam-play',
    standalone: true,
    imports: [CommonModule, FormsModule, SpeakingAudioPlayerComponent, LoadingProgressComponent, MatButtonModule, MatIconModule, MatTooltipModule],
    templateUrl: './speaking-exam-play.component.html',
    styleUrls: ['./speaking-exam-play.component.css'],
})
export class SpeakingExamPlayComponent implements AfterViewChecked, OnDestroy, OnInit {
    // Internal signals (đã từng là inputs, giờ load từ route params + API)
    readonly questions: WritableSignal<BankQuestion[]> = signal<BankQuestion[]>([]);
    readonly skill: WritableSignal<string> = signal<string>('');
    readonly shiftName: WritableSignal<string> = signal<string>('');
    readonly studentCode: WritableSignal<string> = signal<string>('');
    readonly shiftId: WritableSignal<number> = signal<number>(0);
    readonly shiftTest: WritableSignal<ShiftTest | null> = signal<ShiftTest | null>(null);
    readonly student: WritableSignal<Student | null> = signal<Student | null>(null);
    readonly shift: WritableSignal<Shift | null> = signal<Shift | null>(null);

    // Services
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private sanitizer = inject(DomSanitizer);
    private destroyRef = inject(DestroyRef);
    private cdr = inject(ChangeDetectorRef);
    private shiftTestService = inject(ShiftTestService);
    private shiftTestStateService = inject(ShiftTestStateService);
    private shiftTestAnswerService = inject(ShiftTestAnswerService);
    private formDetailService = inject(FormDetailService);
    private fileService = inject(IctuFileService);
    private studentService = inject(StudentService);
    private authService = inject(AuthenticationService);
    private shiftService = inject(ShiftService);

    // State signals
    readonly parents: WritableSignal<QV[]> = signal<QV[]>([]);
    readonly partGroups: WritableSignal<PG[]> = signal<PG[]>([]);
    readonly currentPartIndex: WritableSignal<number> = signal(0);
    readonly currentPart = computed(() => this.partGroups()[this.currentPartIndex()] || null);
    readonly questionPanelOpen: WritableSignal<boolean> = signal(false);
    readonly collapsedParts: WritableSignal<Set<number>> = signal(new Set());
    readonly seenQuestionKeys: WritableSignal<Set<string>> = signal(new Set());
    readonly completedQuestionIds: WritableSignal<Set<string>> = signal(new Set());
    readonly submitConfirmVisible: WritableSignal<boolean> = signal(false);
    readonly exitConfirmVisible: WritableSignal<boolean> = signal(false);
    readonly state: WritableSignal<'loading' | 'success' | 'error'> = signal('loading');
    readonly submitting: WritableSignal<boolean> = signal(false);
    readonly incompleteCurrentPageWarning: WritableSignal<string> = signal('');
    readonly scoreResultVisible: WritableSignal<boolean> = signal(false);
    readonly examTimeLeft: WritableSignal<number> = signal(0);
    readonly countdownDisplay: WritableSignal<string> = signal('00:00');
    countdownWarning = false;
    readonly answerVersion: WritableSignal<number> = signal(0);
    readonly resolvedAudioUrls: WritableSignal<{ [id: string]: string }> = signal<{ [id: string]: string }>({});
    readonly activeRecordKey: WritableSignal<string | null> = signal<string | null>(null);
    private _recordQuestionOrder: string[] = [];

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
    private _queryShiftTestId = 0;
    private _timerLoaded = false;

    ngOnInit(): void {
        this.state.set('loading');
        // Ưu tiên route state (từ commitment navigate sang) — không cần API
        const navState = history.state as any;
        const restoreFromState = navState?.shift && navState?.student && navState?.shiftTest;

        if (restoreFromState) {
            this.shift.set(navState.shift);
            this.student.set(navState.student);
            this.shiftTest.set(navState.shiftTest);
            const qp = this.route.snapshot.queryParams;
            this.shiftName.set(qp['shiftName'] || '');
            this.studentCode.set(qp['studentCode'] || '');
            this.shiftId.set(+this.route.snapshot.params['shiftId'] || 0);
            this.skill.set(this.route.snapshot.params['skill'] || '');
            // Chỉ load questions
            const st = navState.shiftTest;
            if (st?.id) {
                this.shiftTestService.getQuestions(st.id).pipe(
                    take(1),
                    takeUntilDestroyed(this.destroyRef)
                ).subscribe({
                    next: allQ => {
                        const skill = this.skill().toLowerCase();
                        this.state.set('success');
                        this.questions.set(allQ.filter(q => (q.skill || '').toLowerCase() === skill));
                    },
                    error: () => this.state.set('error'),
                });
            }
            // Load thời gian từ form_detail
            this.loadFormDuration(st);
            return;
        }

        // Fallback: F5 refresh — load từ API
        this.route.params.pipe(
            take(1),
            map(params => {
                this.shiftId.set(+params['shiftId'] || 0);
                this.skill.set(params['skill'] || '');
            }),
            switchMap(() => this.route.queryParams.pipe(take(1))),
            map(qp => {
                this.shiftName.set(qp['shiftName'] || '');
                this.studentCode.set(qp['studentCode'] || '');
                this._queryShiftTestId = +qp['shiftTestId'] || 0;
            }),
            switchMap(() => {
                const sid = this.shiftId();
                const user = this.authService.user;
                if (!sid || !user) return of(null);
                return forkJoin({
                    student: this.studentService.query(
                        [{ conditionName: 'user_id', condition: IctuQueryCondition.equal, value: user.id.toString() }],
                        { limit: 1 }
                    ).pipe(map(r => r.data?.[0])),
                    shift: this.shiftService.query(
                        [{ conditionName: 'id', condition: IctuQueryCondition.equal, value: sid.toString() }],
                        { limit: 1 }
                    ).pipe(map((r: any) => r.data?.[0] || r?.[0] || null)),
                    shiftTest: this._queryShiftTestId
                        ? this.shiftTestService.query(
                            [{ conditionName: 'id', condition: IctuQueryCondition.equal, value: this._queryShiftTestId.toString() }],
                            { limit: 1 }
                        ).pipe(map(r => r.data?.[0]))
                        : of(null),
                }).pipe(
                    switchMap(({ student, shift, shiftTest }) => {
                        this.student.set(student || null);
                        this.shift.set(shift || null);
                        this.shiftTest.set(shiftTest || null);
                        if (!shiftTest?.id) return of(null);
                        return this.shiftTestService.getQuestions(shiftTest.id).pipe(
                            map(allQ => {
                                const skill = this.skill().toLowerCase();
                                this.questions.set(allQ.filter(q => (q.skill || '').toLowerCase() === skill));
                                this.state.set('success');
                                // Load timer ngay (state hoặc form_detail)
                                this.loadFormDuration(shiftTest);
                            })
                        );
                    })
                );
            }),
            catchError(err => {
                console.error('Failed to load exam data', err);
                this.state.set('error');
                return of(null);
            }),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe();
    }

    constructor() {
        effect(() => {
            const sk = this.skill();
            const qs = this.questions();
            if (sk && (sk !== this._lastSkill || qs !== this._lastQuestionsRef)) {
                this._lastSkill = sk;
                this._lastQuestionsRef = qs;
                this.resetAllState();
                this.currentPartIndex.set(0);
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

    canSubmitSkillTest(): boolean {
        const pg = this.partGroups();
        return this.currentPartIndex() === pg.length - 1 && this.isCurrentPartComplete() && this.isAllPartsAnswered();
    }

    isLastPart(): boolean {
        return this.currentPartIndex() === this.partGroups().length - 1;
    }

    handleNextAction(): void {
        if (this.canSubmitSkillTest()) { this.askSubmitSkillTest(); return; }
        if (!this.isCurrentPartComplete()) {
            this.incompleteCurrentPageWarning.set('Vui lòng hoàn thành các câu hỏi trong phần này trước khi tiếp tục.');
            return;
        }
        this.incompleteCurrentPageWarning.set('');
        this.saveCurrentAnswers();
        this.nextParent();
    }

    setActivePart(index: number): void {
        const groups = this.partGroups();
        if (index < 0 || index >= groups.length) return;
        this.saveCurrentAnswers();
        this.cleanupActiveRecordQuestion();
        this.currentPartIndex.set(index);
        this.markActivePartSeen();
        this.buildRecordQuestionOrder();
        setTimeout(() => this.prepareActiveRecordQuestion(), 250);
    }

    isAllPartsAnswered(): boolean {
        for (const pg of this.partGroups()) {
            for (const p of pg.questions) {
                const qs = this.parentQuestions(p);
                for (const q of qs) if (!this.isQuestionAnswered(q)) return false;
            }
        }
        return true;
    }

    isCurrentPartComplete(): boolean {
        const part = this.currentPart();
        if (!part) return false;
        for (const p of part.questions) {
            const qs = this.parentQuestions(p);
            for (const q of qs) if (!this.isQuestionAnswered(q)) return false;
        }
        return true;
    }

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
            if (typeof a === 'string') return a.trim() !== '' || st?.phase === 'uploaded';
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

    hasRecordChild(p: any): boolean {
        return p?.children?.some?.(c => c.question_type === 'record') ?? false;
    }

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
    onMediaEndedForQ = (q: any) => () => {
        if (!this.isRecordQuestion(q)) return;
        if (this.isRecordQuestionAnswered(q)) return;
        // Chỉ allow record nếu đây là câu activeRecord hiện tại
        if (this.questionKey(q) !== this.activeRecordKey()) return;
        setTimeout(() => this.prepareRecordQuestion(q as QV), 2000);
    };

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

    formatSeconds(seconds: number): string {
        if (seconds >= 60) {
            const m = Math.floor(seconds / 60);
            const s = seconds % 60;
            return s > 0 ? `${m} phút ${s}s` : `${m} phút`;
        }
        return `${seconds}s`;
    }

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
                const answer = { fileId: String(r.id), fileName: file.name, filePath: String(r.id), mimeType: 'audio/mp3' };
                this.updateLocalAnswer(question, String(r.id));
                if (this.recordStates[key]) this.recordStates[key].phase = 'uploaded';
                this.recordStatus.set('uploaded');
                this.recAudioUrl.set(this.buildAudioUrl(String(r.id)));
                if (this.recordStates[key]) this.recordStates[key].uploadResult = answer;
                this.postAnswer(question);
                // Chuyển sang câu tiếp theo — audio của câu đó sẽ tự chạy (autoplay = true khi activeRecordKey trùng)
                this.advanceToNextRecord();
                // Đợi DOM render audio mới, audio tự chạy, khi ended sẽ trigger record
                setTimeout(() => this.prepareActiveRecordQuestion(), 500);
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
        if (!this.recordStates[key]?.uploadResult?.fileId) return;
        this.recError.set('');
        if (this.recordStates[key]) this.recordStates[key].phase = 'uploading';
        this.recordStatus.set('uploading');
        // Cho phép re-POST
        this.postedAnswerKeys[key] = false;
        this.postAnswer(question);
    }

    private rehydrateRecordStateFromAnswer(question: QV): void {
        if (!this.isRecordQuestion(question)) return;
        const key = this.questionKey(question);
        const answer = this.answerValue(question);
        let fileId: string | undefined;
        if (typeof answer === 'string') fileId = answer;
        else if (answer?.fileId) fileId = String(answer.fileId);
        else if (answer?.filePath) fileId = String(answer.filePath);
        if (!fileId) return;
        const st = this.recordStates[key];
        if (st && (st.phase === 'preparing' || st.phase === 'recording' || st.phase === 'uploading')) return;
        this.recordStates[key] = { phase: 'uploaded', prepareLeft: 0, speakingLeft: 0, uploadResult: { fileId } };
        this.recordStatus.set('uploaded');
        this.recAudioUrl.set(this.buildAudioUrl(fileId));
    }

    private hasRecordUploadInProgress(): boolean { return this._hasRecordUploadInProgress; }

    private activeRecordQuestion(): QV | null {
        const activeKey = this.activeRecordKey();
        if (!activeKey) return null;
        const q = this.findQuestionByKey(activeKey);
        if (!q || !this.isRecordQuestion(q)) return null;
        if (this.isRecordQuestionAnswered(q)) return null;
        const st = this.recordStates[activeKey];
        if (st?.phase === 'error') return null;
        // Nếu câu có media và media chưa ended → chờ
        if (q.media?.path && !SpeakingAudioPlayerComponent.isMediaEnded(activeKey)) return null;
        return q;
    }

    private isRecordQuestionAnswered(question: QV): boolean {
        const st = this.recordStates[this.questionKey(question)];
        if (st?.phase === 'preparing' || st?.phase === 'recording' || st?.phase === 'uploading') return false;
        const answer = this.answerValue(question);
        if (answer?.fileId || answer?.fileName || answer?.filePath) return true;
        return st?.phase === 'uploaded' || st?.phase === 'error';
    }

    private buildRecordQuestionOrder(): void {
        this._recordQuestionOrder = [];
        const part = this.currentPart();
        if (!part) return;
        for (const p of part.questions) {
            if (p.children?.length) {
                for (const c of p.children) {
                    if (this.isRecordQuestion(c)) this._recordQuestionOrder.push(this.questionKey(c));
                }
            } else if (this.isRecordQuestion(p)) {
                this._recordQuestionOrder.push(this.questionKey(p));
            }
        }
        // Tìm câu đầu tiên chưa upload làm active
        let foundNext = false;
        for (const key of this._recordQuestionOrder) {
            const answer = this.answerValue(this.findQuestionByKey(key));
            if (!answer || this.isAnswerEmpty(answer)) {
                this.activeRecordKey.set(key);
                foundNext = true;
                break;
            }
        }
        // Nếu tất cả đã nộp và còn part kế → activeRecordKey = null (advanceToNextRecord sẽ chuyển part)
        if (!foundNext && this._recordQuestionOrder.length > 0) {
            this.activeRecordKey.set(null);
        }
    }

    private findQuestionByKey(key: string): any {
        for (const p of this.parents()) {
            if (this.questionKey(p) === key) return p;
            if (p.children?.length) {
                for (const c of p.children) if (this.questionKey(c) === key) return c;
            }
        }
        return null;
    }

    private advanceToNextRecord(): void {
        const current = this.activeRecordKey();
        // Nếu còn câu record tiếp theo trong _recordQuestionOrder
        if (current) {
            const idx = this._recordQuestionOrder.indexOf(current);
            if (idx >= 0 && idx < this._recordQuestionOrder.length - 1) {
                this.activeRecordKey.set(this._recordQuestionOrder[idx + 1]);
                return;
            }
        }
        // Hết câu trong part hiện tại → chuyển part
        this.activeRecordKey.set(null);
        if (this.currentPartIndex() < this.partGroups().length - 1) {
            setTimeout(() => this.nextParent(), 1000);
        }
    }

    prepareActiveRecordQuestion(): void {
        if (this.hasRecordUploadInProgress()) return;
        const q = this.activeRecordQuestion();
        if (q) this.prepareRecordQuestion(q);
    }

    cleanupActiveRecordQuestion(): void {
        const part = this.currentPart();
        if (!part) return;
        part.questions.forEach(parent => {
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
        });
    }

    startRecord(question: QV): void { this.prepareRecordQuestion(question); }

    canSubmitRecordEarly = (q: any): boolean => {
        const state = this.recordStates[this.questionKey(q)];
        if (!state || state.phase !== 'recording') return false;
        const total = this.recordSpeakingSeconds(q);
        const elapsed = total - state.speakingLeft;
        return elapsed >= 15;
    }

    submitRecordEarly(question: QV): void {
        const key = this.questionKey(question);
        const st = this.recordStates[key];
        if (!st || st.phase !== 'recording') return;
        this.clearRecordTimer(key);
        this.doStop(question);
    }

    recordState(q: any): RecordQuestionState {
        const key = this.questionKey(q);
        const existing = this.recordStates[key];
        if (existing) return existing;
        // Nếu câu đã có answer (uploaded trước đó) thì trả về phase = 'uploaded'
        if (this.isRecordQuestion(q) && !this.isAnswerEmpty(this.answerValue(q))) {
            return { phase: 'uploaded', prepareLeft: 0, speakingLeft: 0 };
        }
        return { phase: 'idle', prepareLeft: 0, speakingLeft: 0 };
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

    reloadPage(): void { location.reload(); }
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
        // Group theo part cho speaking
        const groups = this.getGroupedByPart();
        this.partGroups.set(groups);
        this.currentPartIndex.set(0);
        this.markActivePartSeen();
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
        this.partGroups.set([]);
        this.currentPartIndex.set(0);
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
        this._progress = [];
        this.resolvedAudioUrls.set({});
        this.stateId = null;
        this.lastTimeLeftSync = 0;
        this._inlineRestored = false;
    }

    private markActivePartSeen(): void {
        const part = this.currentPart();
        if (!part) return;
        const seen = new Set(this.seenQuestionKeys());
        part.questions.forEach(p => {
            this.parentQuestions(p).forEach(q => seen.add(this.questionKey(q)));
        });
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
            // Sau khi restore answers (hoặc không có answer nào), xây danh sách câu record theo thứ tự
            this.buildRecordQuestionOrder();
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
                        { conditionName: 'form_id', condition: IctuQueryCondition.equal, value: String(st.form_id ?? '') },
                        { conditionName: 'skill', condition: IctuQueryCondition.equal, value: this.skill() },
                    ],
                    { limit: 1 }
                ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((fr: any) => {
                    const fd: FormDetail = fr.data?.[0] || null;
                    const minutes = fd?.time || 0;
                    const seconds = minutes * 60;
                    this.examTimeLeft.set(seconds);
                    this.createState(st.id, seconds);
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

    private loadFormDuration(st: ShiftTest | null): void {
        if (!st) return;
        const formId = st.form_id || this.shift()?.form_id || 0;
        if (!formId) return;
        // Chỉ restore timer từ state đã có (không tạo mới — việc đó do loadServerAnswersAndState)
        this.shiftTestStateService.query(
            [
                { conditionName: 'shift_test_id', condition: IctuQueryCondition.equal, value: st.id.toString() },
                { conditionName: 'skill', condition: IctuQueryCondition.equal, value: this.skill() },
            ],
            { limit: 1 }
        ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((res: any) => {
            const row = res.data?.[0] || null;
            if (row) {
                this.stateId = row.id;
                this.examTimeLeft.set(row.time_left || 0);
                // Restore progress từ server
                if (row.progress) {
                    try {
                        if (Array.isArray(row.progress)) this._progress = row.progress;
                    } catch { /* ignore */ }
                }
                this.startExamCountdown();
            }
        });
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

    private _progress: Array<{ part: number; question_id: number }> = [];
    private _answerSyncInterval: any = null;

    private startExamCountdown(): void {
        if (this.examCountdownTimer) clearInterval(this.examCountdownTimer);
        if (this._answerSyncInterval) clearInterval(this._answerSyncInterval);
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
            if (Date.now() - this.lastTimeLeftSync > 15000) {
                this.lastTimeLeftSync = Date.now();
                this.syncState();
            }
            if (left <= 0 && this.examCountdownTimer) {
                clearInterval(this.examCountdownTimer);
                this.examCountdownTimer = null;
                if (this.canSubmitSkillTest()) this.confirmSubmitSkillTest();
            }
        }, 1000);
        // Sync answers mỗi 15s: post những câu chưa post
        this._answerSyncInterval = setInterval(() => {
            this.syncUnpostedAnswers();
        }, 15000);
    }

    private syncUnpostedAnswers(): void {
        for (const p of this.parents()) {
            const qs = this.parentQuestions(p);
            for (const q of qs) {
                const key = this.questionKey(q);
                const ser = this.serializeStudentAnswer(q);
                if (!ser) continue;
                if (this.postedAnswerKeys[key] && this.postedAnswerValues[key] === ser) continue;
                this.postAnswer(q);
            }
        }
    }

    private stopExamCountdown(): void {
        if (this.examCountdownTimer) { clearInterval(this.examCountdownTimer); this.examCountdownTimer = null; }
        if (this._answerSyncInterval) { clearInterval(this._answerSyncInterval); this._answerSyncInterval = null; }
    }

    private syncState(): void {
        if (!this.stateId) return;
        this.shiftTestStateService.update(this.stateId, {
            time_left: this.examTimeLeft(),
            progress: this._progress,
        } as any).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => { /* ok */ }, error: () => { /* retry */ } });
    }

    // =================== Answer posting ===================

    saveCurrentAnswers(): void {
        const part = this.currentPart();
        if (!part) return;
        part.questions.forEach(parent => {
            this.parentQuestions(parent).forEach(q => {
                if (this.isAnswerEmpty(this.answerValue(q))) return;
                this.postAnswer(q);
            });
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
                this.updateProgressForParent(q);
            },
            error: () => { /* keep postedAnswerKeys false to retry */ }
        });
    }

    private updateProgressForParent(question: any): void {
        const parent = this.parents().find(p =>
            String(p.id) === String(question.id) || p.children?.some(c => String(c.id) === String(question.id))
        );
        if (!parent) return;
        const qs = this.parentQuestions(parent);
        const isComplete = qs.length > 0 && qs.every(q => this.isQuestionAnswered(q));
        if (!isComplete) return;
        const parentId = Number(parent.id);
        if (this._progress.some(item => item.question_id === parentId)) return;
        this._progress.push({ part: Number(parent.part || 0), question_id: parentId });
        this.syncProgress();
    }

    private syncProgress(): void {
        if (!this.stateId) return;
        this.shiftTestStateService.update(this.stateId, { progress: this._progress } as any)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({ error: () => { } });
    }

    previousParent(): void {
        if (this.currentPartIndex() > 0) this.setActivePart(this.currentPartIndex() - 1);
    }

    nextParent(): void {
        if (this.currentPartIndex() < this.partGroups().length - 1) this.setActivePart(this.currentPartIndex() + 1);
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
