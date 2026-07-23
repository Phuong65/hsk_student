import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Component, OnDestroy, OnInit, AfterViewChecked, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, finalize, map, switchMap } from 'rxjs/operators';
import { AuthService } from '@core/services/auth.service';
import { FileService } from '@core/services/file.service';
import { NotificationService } from '@core/services/notification.service';
import { RouteEncoderService } from '@core/services/route-encoder.service';
import { TnQLCathi } from '@shared/models/tn-ql-ca-thi';
import { TnFormDetail } from '@shared/models/tn-test-form';
import { TnShiftStudent } from '@shared/models/tn-shift-student';
import { TnStudent } from '@shared/models/tn-student';
import { Answer } from '@shared/models/tn-shift-test-question';
import { TnQLCathiService } from '@shared/services/tn-ql-ca-thi.service';
import { TnFormDetailService } from '@shared/services/tn-form-detail.service';
import { TnShiftStudentService } from '@shared/services/tn-shift-student.service';
import { TnShiftTestService } from '@shared/services/tn-shift-test.service';
import { TnShiftTestAnswerService } from '@shared/services/tn-shift-test-answer.service';
import { TnShiftTestStateService } from '@shared/services/tn-shift-test-state.service';
import { DevtoolsDetectionService } from '@core/services/devtools-detection.service';
import { TnShiftTestAnswer } from '@shared/models/tn-shift-test-answer';
import { TnShiftTestState } from '@shared/models/tn-shift-test-state';
import { getLinkDownload_aws } from '@env';
import * as MicRecorder from 'mic-recorder-to-mp3';

interface StudentQuestionMedia {
    type: string;
    source: string;
    path: string;
    replay?: number;
    exam_paper_code?: string;
}

interface StudentQuestionParams {
    prepare: number;
    time: number;
}

interface StudentQuestionView {
    id?: number;
    shift_test_id?: number;
    bank_question_id?: number;
    group_id: number;
    part: number;
    question_type: string;
    question_direction: string;
    skill: string;
    answer?: string;
    answer_option?: Answer[];
    answer_correct?: any;
    question_number?: number;
    media?: StudentQuestionMedia;
    params?: StudentQuestionParams;
    hint?: string;
    explain?: string;
    children?: StudentQuestionView[];
    _viewKey?: string;
    _globalIndex?: number;
}

interface PartGroup {
    part: number;
    questions: StudentQuestionView[];
}

interface RecordQuestionState {
    phase: 'idle' | 'preparing' | 'recording' | 'recorded' | 'uploading' | 'uploaded' | 'error';
    prepareLeft: number;
    speakingLeft: number;
    audioUrl?: string;
    isSpeaking?: boolean;
    file?: File;
    uploadResult?: any;
    error?: string;
    audioLoadFailed?: boolean;
}

@Component({
    selector: 'app-student-question-test',
    templateUrl: './student-question-test.component.html',
    styleUrls: ['./student-question-test.component.css']
})
export class StudentQuestionTestComponent implements OnInit, OnDestroy, AfterViewChecked {
    loading = false;

    message = '';

    shiftId: number;

    routeShiftTestId: number;

    selectedSkill = '';

    shift: TnQLCathi;

    shiftStudent: TnShiftStudent;

    student: TnStudent;

    shiftTest: any;

    parents: StudentQuestionView[] = [];

    collapsedParts: { [part: number]: boolean } = {};

    currentParentIndex = 0;

    questionPanelOpen = true;

    questionPanelUnlocked = false;

    bookmarkedKeys: { [key: string]: boolean } = {};

    seenQuestionKeys: { [key: string]: boolean } = {};

    localAnswers: { [key: string]: any } = {};

    recordStates: { [key: string]: RecordQuestionState } = {};

    skillDurationValue = 0;

    examTimeLeftSeconds = 0;

    currentShiftTestState: TnShiftTestState;

    shiftTestStateId: number;

    completedQuestionIds: string[] = [];

    progressUpdatePending = false;

    incompleteCurrentPageWarning = '';

    submitting = false;

    postedAnswerKeys: { [key: string]: boolean } = {};

    postedAnswerValues: { [key: string]: string } = {};

    private lastPostedStateSignature = '';

    private lastSyncedTimeLeft: number = null;

    private lastTimeLeftSyncAt = 0;

    violationCount = 0;

    securityWarningVisible = false;

    securityWarningMessage = '';

    submitConfirmVisible = false;

    exitConfirmVisible = false;

    private examSecurityActive = false;

    private allowLeaveExam = false;

    private devToolsDetected = false;

    private examCountdownTimer: any;

    private devToolsCheckTimer: any;

    private recordTimers: { [key: string]: any } = {};

    private recorders: { [key: string]: any } = {};

    private recordAudioContexts: { [key: string]: AudioContext } = {};

    private lastBeepTime = 0;

    private recordAudioStreams: { [key: string]: MediaStream } = {};

    private recordAudioAnimationFrames: { [key: string]: number } = {};

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private auth: AuthService,
        private notificationService: NotificationService,
        private routeEncoder: RouteEncoderService,
        private shiftStudentService: TnShiftStudentService,
        private shiftService: TnQLCathiService,
        private formDetailService: TnFormDetailService,
        private shiftTestService: TnShiftTestService,
        private shiftTestAnswerService: TnShiftTestAnswerService,
        private shiftTestStateService: TnShiftTestStateService,
        private fileService: FileService,
        private elRef: ElementRef,
        private devtoolsService: DevtoolsDetectionService
    ) { }

    ngOnInit(): void {
        this.devtoolsService.startDetection();
        const rawShiftId = this.route.snapshot.paramMap.get('shiftId') || '';
        const rawShiftTestId = this.route.snapshot.paramMap.get('shiftTestId') || '';
        this.shiftId = this.routeEncoder.decode(rawShiftId) ?? Number(rawShiftId);
        this.routeShiftTestId = this.routeEncoder.decode(rawShiftTestId) ?? Number(rawShiftTestId);
        this.selectedSkill = (this.route.snapshot.paramMap.get('skill') || '').toLowerCase();
        if (this.handleReloadDuringExam()) {
            return;
        }
        this.markExamSessionActive();
        this.loadQuestionTest();
    }

    loadQuestionTest(): void {
        if (!this.shiftId) {
            this.message = 'Exam shift not found.';
            return;
        }
        if (!this.selectedSkill) {
            this.message = 'Skill not found.';
            return;
        }
        if (!this.routeShiftTestId) {
            this.message = 'Exam test not found.';
            return;
        }
        this.student = this.auth.student;
        if (!this.student?.id) {
            this.message = 'No matching student profile was found for this account.';
            return;
        }

        this.loading = true;
        this.message = '';
        this.notificationService.loadingAnimationV2({ icon: 'circle', text: 'Loading exam questions...' });
        this.shiftStudentService.getStudentShiftGroups(this.student.id).pipe(
            switchMap(shiftStudents => {
                this.shiftStudent = (shiftStudents || []).find(item => item.shift_id === this.shiftId);
                if (!this.shiftStudent) {
                    this.message = 'You do not have permission to view this exam.';
                    return of(null);
                }
                return forkJoin({
                    shifts: this.shiftService.getTnQLCathiByIds(this.shiftId.toString()),
                    shiftTest: this.shiftTestService.getStudentQuestionTest(this.shiftId, this.student.id, this.routeShiftTestId)
                });
            }),
            switchMap((result: { shifts: TnQLCathi[]; shiftTest: any }) => {
                if (!result) {
                    return of(null);
                }
                this.shift = result.shifts && result.shifts.length ? result.shifts[0] : null;
                if (!this.shift?.form_id) {
                    return of({ ...result, formDetails: [] });
                }
                return this.formDetailService.getFormDetailSkillsByFormId(this.shift.form_id).pipe(
                    map(formDetails => ({ ...result, formDetails }))
                );
            }),
            map((result: { shifts: TnQLCathi[]; shiftTest: any; formDetails: TnFormDetail[] }) => {
                if (!result) {
                    return null;
                }
                this.shift = result.shifts && result.shifts.length ? result.shifts[0] : null;
                this.skillDurationValue = this.resolveSkillDuration(result.formDetails || []);
                this.startExamCountdown();
                this.shiftTest = this.normalizeShiftTestResponse(result.shiftTest);
                const questions = this.extractQuestions(this.shiftTest);
                this.parents = this.groupQuestions(questions, this.selectedSkill);
                this.applyAnswerOptionShuffleToParents(this.parents);
                this.currentParentIndex = 0;
                this.seenQuestionKeys = {};
                this.completedQuestionIds = [];
                this.progressUpdatePending = false;
                this.shiftTestStateId = null;
                this.questionPanelUnlocked = false;
                this.postedAnswerKeys = {};
                this.postedAnswerValues = {};
                this.lastPostedStateSignature = '';
                this.resetTimeLeftSyncTracking();
                this.submitting = false;
                this.createShiftTestState();
                this.markActiveParentSeen();
                this.prepareActiveRecordQuestion();
                if (this.parents.length) {
                    this.activateExamSecurity();
                }
                this.message = this.parents.length ? '' : 'No questions are available for this skill.';
                return result;
            }),
            catchError(() => {
                this.message = 'Unable to load exam questions. Please try again later.';
                return of(null);
            }),
            finalize(() => {
                this.loading = false;
                this.notificationService.disableLoadingAnimationV2();
            })
        ).subscribe();
    }

    ngOnDestroy(): void {
        this.devtoolsService.stopDetection();
        if (this.allowLeaveExam) {
            this.clearExamSessionActive();
        }
        this.deactivateExamSecurity();
        this.clearExamCountdown();
        Object.keys(this.recordAudioAnimationFrames).forEach(key => this.stopSpeakingIndicator(key));
        Object.keys(this.recordTimers).forEach(key => this.clearRecordTimer(key));
        Object.keys(this.recorders).forEach(key => {
            if (this.recordStates[key]?.phase === 'recording') {
                this.recorders[key].stop().getMp3().catch(() => null);
            }
        });
        Object.keys(this.recordStates).forEach(key => {
            if (this.recordStates[key].audioUrl) {
                URL.revokeObjectURL(this.recordStates[key].audioUrl);
            }
        });
    }

    ngAfterViewChecked(): void {
        this.attachImageErrorHandlers();
    }

    private attachImageErrorHandlers(): void {
        const container = this.elRef.nativeElement as HTMLElement;
        const images = container.querySelectorAll('.question-direction img:not([data-error-handled])');
        images.forEach((img: HTMLImageElement) => {
            img.setAttribute('data-error-handled', '1');
            img.onerror = () => {
                if (img.parentElement?.querySelector('.img-reload-btn')) {
                    return;
                }
                img.style.display = 'none';
                const wrapper = document.createElement('div');
                wrapper.className = 'img-error-wrapper';
                wrapper.innerHTML = '<span class="img-error-text"><i class="pi pi-exclamation-triangle"></i> Lỗi tải hình</span>';
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'img-reload-btn';
                btn.innerHTML = '<i class="pi pi-refresh"></i> Tải lại';
                btn.onclick = () => {
                    wrapper.remove();
                    img.style.display = '';
                    img.removeAttribute('data-error-handled');
                    img.src = img.src;
                };
                wrapper.appendChild(btn);
                img.parentElement.insertBefore(wrapper, img.nextSibling);
            };
        });
    }

    backToDetail(): void {
        this.exitConfirmVisible = true;
    }

    cancelExitExam(): void {
        this.exitConfirmVisible = false;
    }

    confirmExitExam(): void {
        this.exitConfirmVisible = false;
        this.allowLeaveExam = true;
        this.clearExamSessionActive();
        this.saveCurrentQuestionAnswers();
        void this.router.navigate(['/student/ca-thi-cua-ban', this.shiftId]);
    }

    skillLabel(skill: string): string {
        switch ((skill || '').toLowerCase()) {
            case 'listening':
                return 'Listening';
            case 'reading':
                return 'Reading';
            case 'core':
                return 'Core';
            case 'writing':
                return 'Writing';
            case 'speaking':
                return 'Speaking';
            default:
                return skill || 'Skill';
        }
    }

    getListeningReplayCount(): number {
        if ((this.selectedSkill || '').toLowerCase() !== 'listening') {
            return -1;
        }
        const count = Number(this.shift?.listening_count);
        return count > 0 ? count : -1;
    }

    trustHtml(value: string): string {
        return value || '';
    }

    echoPart(part: number): string {
        if (part === null || part === undefined) {
            return '';
        }
        const partText = part % 10 === 0 ? (part / 10).toString() : part.toString().split('').join('.');
        return 'PART '.concat(partText);
    }

    trackByQuestion(index: number, question: StudentQuestionView): number {
        return question.id || question.bank_question_id || index;
    }

    get currentParent(): StudentQuestionView {
        return this.parents[this.currentParentIndex] || null;
    }

    get bookmarkedCount(): number {
        return Object.keys(this.bookmarkedKeys).filter(key => this.bookmarkedKeys[key]).length;
    }

    setQuestionPanelOpen(open: boolean): void {
        if (open) {
            this.questionPanelUnlocked = true;
        }
        this.questionPanelOpen = open;
    }

    setActiveParent(index: number, source: 'menu' | 'next' | 'previous' = 'menu'): void {
        if (index < 0 || index >= this.parents.length) {
            return;
        }
        if (this.isRecordingInProgress()) {
            return;
        }
        if (source === 'menu' && !this.canSelectMenuQuestion(index)) {
            return;
        }
        const isMovingForward = index > this.currentParentIndex;
        if (isMovingForward && !this.isCurrentParentComplete()) {
            this.incompleteCurrentPageWarning = 'Bạn cần trả lời đầy đủ tất cả câu hỏi trên trang hiện tại trước khi chuyển sang câu khác.';
            return;
        }
        this.incompleteCurrentPageWarning = '';
        if (this.canOpenQuestionPanel()) {
            this.questionPanelUnlocked = true;
        }
        this.saveCurrentQuestionAnswers();
        this.cleanupActiveRecordQuestion();
        this.currentParentIndex = index;
        if (this.canSubmitSkillTest()) {
            this.questionPanelUnlocked = true;
        }
        this.markActiveParentSeen();
        this.prepareActiveRecordQuestion();
    }

    previousParent(): void {
        this.setActiveParent(this.currentParentIndex - 1, 'previous');
    }

    nextParent(): void {
        this.setActiveParent(this.currentParentIndex + 1, 'next');
    }

    handleNextAction(): void {
        if (this.canSubmitSkillTest()) {
            this.submitConfirmVisible = true;
            return;
        }
        this.nextParent();
    }

    cancelSubmitSkillTest(): void {
        this.submitConfirmVisible = false;
    }

    confirmSubmitSkillTest(): void {
        this.submitConfirmVisible = false;
        this.submitSkillTest();
    }

    isLastParent(): boolean {
        return this.currentParentIndex === this.parents.length - 1;
    }

    canSubmitSkillTest(): boolean {
        return this.isLastParent() && this.isAllQuestionsAnswered();
    }

    canOpenQuestionPanel(): boolean {
        return this.questionPanelUnlocked || this.canSubmitSkillTest();
    }

    canSelectMenuQuestion(index: number): boolean {
        if (index <= this.currentParentIndex) {
            return true;
        }
        for (let i = 0; i < index; i++) {
            const parent = this.parents[i];
            if (!parent) {
                return false;
            }
            if (i === this.currentParentIndex) {
                if (!this.isCurrentParentComplete()) {
                    return false;
                }
            } else if (this.completedQuestionIds.indexOf(this.completedQuestionId(parent)) === -1) {
                return false;
            }
        }
        return true;
    }

    isAllQuestionsAnswered(): boolean {
        return this.parents.every(parent => this.parentQuestions(parent).every(question => this.isQuestionAnswered(question)));
    }

    isCurrentParentComplete(): boolean {
        const questions = this.currentParentQuestions();
        return questions.length === 0 || questions.every(question => this.isQuestionAnswered(question));
    }

    private currentParentQuestions(): StudentQuestionView[] {
        return this.parentQuestions(this.currentParent);
    }

    private parentQuestions(parent: StudentQuestionView): StudentQuestionView[] {
        if (!parent) {
            return [];
        }
        const questions = this.shouldRenderParentControl(parent) && this.isAnswerableQuestion(parent) ? [parent] : [];
        return questions.concat((parent.children || []).filter(question => this.isAnswerableQuestion(question)));
    }

    private isAnswerableQuestion(question: StudentQuestionView): boolean {
        return !!question && (
            question.question_type === 'radio' ||
            this.isSelectQuestion(question) ||
            this.isParagraphQuestion(question) ||
            this.isInputboxQuestion(question) ||
            this.isTextareaQuestion(question) ||
            this.isRecordQuestion(question)
        );
    }

    private isQuestionAnswered(question: StudentQuestionView): boolean {
        if (!question) {
            return true;
        }
        if (this.isRecordQuestion(question)) {
            return this.isRecordQuestionAnswered(question);
        }
        if (this.isParagraphQuestion(question)) {
            return this.isParagraphQuestionAnswered(question);
        }
        return !this.isAnswerEmpty(this.answerValue(question));
    }

    private isParagraphQuestionAnswered(question: StudentQuestionView): boolean {
        const options = this.paragraphOptions(question);
        if (!options.length) {
            return true;
        }
        const placed = this.paragraphPlacedOptions(question);
        return placed.length === options.length && placed.every(Boolean);
    }

    private isRecordQuestionAnswered(question: StudentQuestionView): boolean {
        const state = this.recordState(question);
        if (state?.phase === 'preparing' || state?.phase === 'recording' || state?.phase === 'uploading' || state?.phase === 'error') {
            return false;
        }
        const answer = this.answerValue(question);
        return !!answer?.fileId || !!answer?.fileName || !!answer?.filePath || state?.phase === 'uploaded';
    }

    private isAnswerEmpty(value: any): boolean {
        if (value === null || value === undefined) {
            return true;
        }
        if (typeof value === 'string') {
            return value.trim().length === 0;
        }
        if (Array.isArray(value)) {
            return value.length === 0;
        }
        if (typeof value === 'object') {
            return Object.keys(value).length === 0;
        }
        return false;
    }

    toggleBookmark(question: StudentQuestionView): void {
        const key = this.questionKey(question);
        this.bookmarkedKeys[key] = !this.bookmarkedKeys[key];
    }

    isBookmarked(question: StudentQuestionView): boolean {
        return !!this.bookmarkedKeys[this.questionKey(question)];
    }

    questionStatus(question: StudentQuestionView): string {
        return this.localAnswers[this.questionKey(question)] ? 'Attempted' : 'Not Attempted';
    }

    hasSeenQuestion(index: number): boolean {
        const question = this.parents[index];
        return !!question && !!this.seenQuestionKeys[this.questionKey(question)];
    }

    private markActiveParentSeen(): void {
        const parent = this.currentParent;
        if (parent) {
            this.seenQuestionKeys[this.questionKey(parent)] = true;
        }
    }

    private prepareActiveRecordQuestion(): void {
        if (this.hasRecordUploadInProgress()) {
            return;
        }
        const recordQuestion = this.activeRecordQuestion();
        if (recordQuestion) {
            this.prepareRecordQuestion(recordQuestion);
        }
    }

    isRecordingInProgress(): boolean {
        return Object.keys(this.recordStates).some(key => ['preparing', 'recording', 'recorded', 'uploading'].indexOf(this.recordStates[key]?.phase) !== -1);
    }

    private hasRecordUploadInProgress(): boolean {
        return Object.keys(this.recordStates).some(key => ['recorded', 'uploading'].indexOf(this.recordStates[key]?.phase) !== -1);
    }

    private activeRecordQuestion(): StudentQuestionView {
        const parent = this.currentParent;
        if (!parent) {
            return null;
        }
        if (parent.children?.length) {
            const recordQuestion = parent.children.filter(question => this.isRecordQuestion(question)).find(question => !this.isRecordQuestionAnswered(question));
            return recordQuestion && this.recordState(recordQuestion)?.phase !== 'error' ? recordQuestion : null;
        }
        return this.isRecordQuestion(parent) && !this.isRecordQuestionAnswered(parent) && this.recordState(parent)?.phase !== 'error' ? parent : null;
    }

    questionDomId(question: StudentQuestionView): string {
        return 'student-question-parent-'.concat(this.questionKey(question));
    }

    partQuestionCount(parent: StudentQuestionView): number {
        if (!parent) {
            return 0;
        }
        return parent.children && parent.children.length ? parent.children.length : (this.hasAnswerOptions(parent) ? 1 : 0);
    }

    shouldRenderParentControl(parent: StudentQuestionView): boolean {
        if (!parent) {
            return false;
        }
        if (this.isTextareaQuestion(parent) && parent.children?.length) {
            return false;
        }
        if (this.isRecordQuestion(parent) && parent.children?.length) {
            return false;
        }
        return this.hasAnswerOptions(parent) || this.isTextareaQuestion(parent) || this.isInputboxQuestion(parent) || this.isRecordQuestion(parent);
    }

    hasAnswerOptions(question: StudentQuestionView): boolean {
        return !!question && Array.isArray(question.answer_option) && question.answer_option.length !== 0;
    }

    isSelectQuestion(question: StudentQuestionView): boolean {
        return !!question && (question.question_type === 'select' || question.question_type === 'selectbox');
    }

    isParagraphQuestion(question: StudentQuestionView): boolean {
        return !!question && question.question_type === 'paragraph';
    }

    isRecordQuestion(question: StudentQuestionView): boolean {
        return !!question && question.question_type === 'record';
    }

    isTextareaQuestion(question: StudentQuestionView): boolean {
        return !!question && question.question_type === 'textarea';
    }

    isInputboxQuestion(question: StudentQuestionView): boolean {
        return !!question && question.question_type === 'inputbox';
    }

    hasSelectMarker(questionDirection: string): boolean {
        const text = this.normalizeSelectMarkerText(questionDirection);
        return text.indexOf('[[SELECT]]') !== -1 || text.indexOf('[[SELECT-BLOCK]]') !== -1;
    }

    hasSelectBlockMarker(questionDirection: string): boolean {
        return !!questionDirection && questionDirection.indexOf('[[SELECT-BLOCK]]') !== -1;
    }

    getSelectQuestionParts(questionDirection: string): string[] {
        const marker = '[[SELECT]]';
        const text = (questionDirection || '').replace(/<\/p>\s*<p>/g, ' ').replace(/^\s*<p>/, '').replace(/<\/p>\s*$/, '');
        const index = text.indexOf(marker);
        if (index === -1) {
            return [text, ''];
        }
        return [text.slice(0, index), text.slice(index + marker.length)];
    }

    getSelectBlockContent(questionDirection: string): string {
        return (questionDirection || '').replace(/\[\[SELECT-BLOCK\]\]/g, '').replace(/^\s*<p>\s*<\/p>/, '').trim();
    }

    updateLocalAnswer(question: StudentQuestionView, value: any): void {
        const key = this.questionKey(question);
        this.localAnswers[key] = value;
        this.postedAnswerKeys[key] = this.postedAnswerValues[key] === this.serializeStudentAnswer(question);
    }

    answerValue(question: StudentQuestionView): any {
        return this.localAnswers[this.questionKey(question)] ?? null;
    }

    isAnswerSelected(question: StudentQuestionView, optionId: any): boolean {
        return String(this.answerValue(question) ?? '') === String(optionId);
    }

    paragraphOptions(question: StudentQuestionView): Answer[] {
        const options = Array.isArray(question?.answer_option) ? [...question.answer_option] : [];
        const optionIds = new Set(options.map(option => String(option.id)));
        const correctOptions = Array.isArray(question?.answer_correct) ? question.answer_correct : [];
        correctOptions.forEach((item, index) => {
            if (!item || typeof item !== 'object' || item.id === undefined || item.value === undefined) {
                return;
            }
            if (optionIds.has(String(item.id))) {
                return;
            }
            options.push({ id: item.id, value: item.value } as Answer);
            optionIds.add(String(item.id));
        });
        return options;
    }

    paragraphSlotCount(question: StudentQuestionView): number {
        const optionCount = this.paragraphOptions(question).length;
        const correctCount = Array.isArray(question?.answer_correct) ? question.answer_correct.length : 0;
        return Math.max(optionCount, correctCount);
    }

    paragraphPlacedOptions(question: StudentQuestionView): (Answer | null)[] {
        const options = this.paragraphOptions(question);
        const slotCount = this.paragraphSlotCount(question);
        const optionMap = new Map(options.map(option => [String(option.id), option]));
        const savedIds = this.paragraphAnswerIds(question);
        const placed = savedIds.map(id => optionMap.get(id) || null);
        while (placed.length < slotCount) {
            placed.push(null);
        }
        return placed.slice(0, slotCount);
    }

    paragraphAvailableOptions(question: StudentQuestionView): Answer[] {
        const placedIds = this.paragraphAnswerIds(question).filter(Boolean);
        return this.paragraphOptions(question).filter(option => placedIds.indexOf(String(option.id)) === -1);
    }

    paragraphSlotsListId(question: StudentQuestionView): string {
        return `${this.questionKey(question)}-paragraph-slots`.replace(/[^a-zA-Z0-9_-]/g, '-');
    }

    paragraphBankListId(question: StudentQuestionView): string {
        return `${this.questionKey(question)}-paragraph-bank`.replace(/[^a-zA-Z0-9_-]/g, '-');
    }

    removeParagraphAnswer(question: StudentQuestionView, index: number): void {
        const placed = this.paragraphPlacedOptions(question);
        if (index < 0 || index >= placed.length) {
            return;
        }
        placed[index] = null;
        this.updateParagraphAnswerFromPlaced(question, placed);
    }

    private paragraphAnswerIds(question: StudentQuestionView): string[] {
        const answer = (this.answerValue(question) || '').toString();
        if (!answer) {
            return [];
        }
        return answer.split('|');
    }

    private updateParagraphAnswerFromPlaced(question: StudentQuestionView, placed: (Answer | null)[]): void {
        const value = placed.map(option => option ? String(option.id) : '').join('|').replace(/\|+$/g, '');
        this.updateLocalAnswer(question, value);
    }

    answerWordCount(question: StudentQuestionView): number {
        const answer = (this.localAnswers[this.questionKey(question)] || '').toString().trim();
        return answer ? answer.split(/\s+/).length : 0;
    }

    prepareRecordQuestion(question: StudentQuestionView): void {
        const key = this.questionKey(question);
        if (this.recordStates[key] && this.recordStates[key].phase !== 'idle' && this.recordStates[key].phase !== 'error') {
            return;
        }
        const prepareTime = this.recordPrepareSeconds(question);
        this.recordStates[key] = {
            phase: 'preparing',
            prepareLeft: prepareTime,
            speakingLeft: this.recordSpeakingSeconds(question)
        };
        if (prepareTime <= 0) {
            this.playBeepAndStartRecording(question);
            return;
        }
        this.startPrepareCountdown(question);
    }

    retryRecordQuestion(question: StudentQuestionView): void {
        const key = this.questionKey(question);
        const state = this.recordStates[key];
        if (state?.file) {
            state.error = '';
            this.uploadRecording(question, state.file, this.currentParent ? this.questionKey(this.currentParent) : '', this.currentParent ? this.completedQuestionId(this.currentParent) : this.completedQuestionId(question));
            return;
        }
        this.prepareRecordQuestion(question);
    }

    recordPrepareSeconds(question: StudentQuestionView): number {
        const prepare = Number(question?.params?.prepare);
        return prepare > 0 ? prepare : 0;
    }

    recordSpeakingSeconds(question: StudentQuestionView): number {
        const speaking = Number(question?.params?.time);
        return speaking > 0 ? speaking : 30;
    }

    onAudioLoadError(question: StudentQuestionView): void {
        const key = this.questionKey(question);
        const state = this.recordStates[key];
        if (state) {
            state.audioLoadFailed = true;
        }
    }

    reloadAudio(question: StudentQuestionView): void {
        const key = this.questionKey(question);
        const state = this.recordStates[key];
        if (!state || !state.uploadResult?.id) {
            return;
        }
        state.audioLoadFailed = false;
        state.audioUrl = this.buildAwsFileUrl(state.uploadResult.id) + '&t=' + Date.now();
    }

    recordState(question: StudentQuestionView): RecordQuestionState {
        const key = this.questionKey(question);
        if (!this.recordStates[key]) {
            this.hydrateRecordStateFromAnswer(question);
        }
        return this.recordStates[key] || null;
    }

    canSubmitRecordEarly(question: StudentQuestionView): boolean {
        const state = this.recordState(question);
        return state?.phase === 'recording' && this.recordSpeakingSeconds(question) - state.speakingLeft >= 20;
    }

    submitRecordEarly(question: StudentQuestionView): void {
        const key = this.questionKey(question);
        const state = this.recordStates[key];
        if (!state || state.phase !== 'recording') {
            return;
        }
        this.clearRecordTimer(key);
        this.stopRecording(question, this.currentParent ? this.questionKey(this.currentParent) : '', this.currentParent ? this.completedQuestionId(this.currentParent) : this.completedQuestionId(question));
    }

    private hydrateRecordStateFromAnswer(question: StudentQuestionView): void {
        const key = this.questionKey(question);
        const answer = this.answerValue(question);
        if (!answer?.fileId && !answer?.fileName && !answer?.filePath) {
            return;
        }
        this.recordStates[key] = {
            phase: 'uploaded',
            prepareLeft: 0,
            speakingLeft: 0,
            uploadResult: answer
        };
    }

    private startPrepareCountdown(question: StudentQuestionView): void {
        const key = this.questionKey(question);
        this.clearRecordTimer(key);
        if (this.recordStates[key].prepareLeft <= 0) {
            this.playBeepAndStartRecording(question);
            return;
        }
        this.recordTimers[key] = setInterval(() => {
            const state = this.recordStates[key];
            if (!state || state.phase !== 'preparing') {
                this.clearRecordTimer(key);
                return;
            }
            state.prepareLeft -= 1;
            if (state.prepareLeft <= 0) {
                this.clearRecordTimer(key);
                this.playBeepAndStartRecording(question);
            }
        }, 1000);
    }

    private playBeepAndStartRecording(question: StudentQuestionView): void {
        this.startRecording(question);
    }

    private beepAudioUrl: string;

    private playBeepSound(): Promise<void> {
        return new Promise(resolve => {
            try {
                if (!this.beepAudioUrl) {
                    this.beepAudioUrl = this.generateBeepWavUrl(880, 0.2, 1);
                }
                const audio = new Audio(this.beepAudioUrl);
                audio.volume = 1;
                const playPromise = audio.play();
                if (playPromise) {
                    playPromise.then(() => {
                        setTimeout(resolve, 250);
                    }).catch(() => resolve());
                } else {
                    setTimeout(resolve, 250);
                }
            } catch {
                resolve();
            }
        });
    }

    private generateBeepWavUrl(frequency: number, duration: number, volume: number): string {
        const sampleRate = 8000;
        const numSamples = Math.floor(sampleRate * duration);
        const dataSize = numSamples;
        const fileSize = 44 + dataSize;
        const buffer = new ArrayBuffer(fileSize);
        const view = new DataView(buffer);
        const writeString = (offset: number, str: string) => {
            for (let i = 0; i < str.length; i++) {
                view.setUint8(offset + i, str.charCodeAt(i));
            }
        };
        writeString(0, 'RIFF');
        view.setUint32(4, fileSize - 8, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate, true);
        view.setUint16(32, 1, true);
        view.setUint16(34, 8, true);
        writeString(36, 'data');
        view.setUint32(40, dataSize, true);
        for (let i = 0; i < numSamples; i++) {
            const t = i / sampleRate;
            const sample = Math.sin(2 * Math.PI * frequency * t) * volume;
            const fade = i < 100 ? i / 100 : (numSamples - i < 100 ? (numSamples - i) / 100 : 1);
            view.setUint8(44 + i, Math.floor((sample * fade + 1) * 127.5));
        }
        const blob = new Blob([buffer], { type: 'audio/wav' });
        return URL.createObjectURL(blob);
    }

    private startRecording(question: StudentQuestionView): void {
        const key = this.questionKey(question);
        const state = this.recordStates[key];
        if (!state || state.phase === 'recording') {
            return;
        }
        state.phase = 'recording';
        state.error = '';
        const now = Date.now();
        const timeSinceLastBeep = now - this.lastBeepTime;
        const delay = timeSinceLastBeep < 3000 ? 3000 - timeSinceLastBeep : 500;
        setTimeout(() => {
            this.playBeepSound().then(() => {
                this.lastBeepTime = Date.now();
                setTimeout(() => {
                    const recorder = new MicRecorder({ bitRate: 128 });
                    this.recorders[key] = recorder;
                    recorder.start().then(() => {
                        this.startSpeakingIndicator(question);
                        this.startSpeakingCountdown(question);
                    }).catch(() => {
                        state.phase = 'error';
                        state.error = 'Không thể truy cập microphone.';
                    });
                }, 200);
            });
        }, delay);
    }

    private startSpeakingCountdown(question: StudentQuestionView): void {
        const key = this.questionKey(question);
        const state = this.recordStates[key];
        this.clearRecordTimer(key);
        if (!state || state.speakingLeft <= 0) {
            this.stopRecording(question, this.currentParent ? this.questionKey(this.currentParent) : '', this.currentParent ? this.completedQuestionId(this.currentParent) : this.completedQuestionId(question));
            return;
        }
        this.recordTimers[key] = setInterval(() => {
            const currentState = this.recordStates[key];
            if (!currentState || currentState.phase !== 'recording') {
                this.clearRecordTimer(key);
                return;
            }
            currentState.speakingLeft -= 1;
            if (currentState.speakingLeft <= 0) {
                this.clearRecordTimer(key);
                this.stopRecording(question, this.currentParent ? this.questionKey(this.currentParent) : '', this.currentParent ? this.completedQuestionId(this.currentParent) : this.completedQuestionId(question));
            }
        }, 1000);
    }

    private startSpeakingIndicator(question: StudentQuestionView): void {
        const key = this.questionKey(question);
        const state = this.recordStates[key];
        if (!state || !navigator.mediaDevices?.getUserMedia) {
            return;
        }
        this.stopSpeakingIndicator(key);
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
            const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContextCtor) {
                stream.getTracks().forEach(track => track.stop());
                return;
            }
            const audioContext: AudioContext = new AudioContextCtor();
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            audioContext.createMediaStreamSource(stream).connect(analyser);
            const data = new Uint8Array(analyser.frequencyBinCount);
            this.recordAudioContexts[key] = audioContext;
            this.recordAudioStreams[key] = stream;
            const detectSpeaking = () => {
                const currentState = this.recordStates[key];
                if (!currentState || currentState.phase !== 'recording') {
                    this.stopSpeakingIndicator(key);
                    return;
                }
                analyser.getByteFrequencyData(data);
                const average = data.reduce((total, value) => total + value, 0) / data.length;
                currentState.isSpeaking = average > 12;
                this.recordAudioAnimationFrames[key] = requestAnimationFrame(detectSpeaking);
            };
            detectSpeaking();
        }).catch(() => null);
    }

    private stopSpeakingIndicator(key: string): void {
        if (this.recordAudioAnimationFrames[key]) {
            cancelAnimationFrame(this.recordAudioAnimationFrames[key]);
            delete this.recordAudioAnimationFrames[key];
        }
        if (this.recordAudioStreams[key]) {
            this.recordAudioStreams[key].getTracks().forEach(track => track.stop());
            delete this.recordAudioStreams[key];
        }
        if (this.recordAudioContexts[key]) {
            this.recordAudioContexts[key].close().catch(() => null);
            delete this.recordAudioContexts[key];
        }
        if (this.recordStates[key]) {
            this.recordStates[key].isSpeaking = false;
        }
    }

    private stopRecording(question: StudentQuestionView, activeParentKey: string, parentQuestionId: string): void {
        const key = this.questionKey(question);
        const state = this.recordStates[key];
        const recorder = this.recorders[key];
        if (!state || !recorder) {
            return;
        }
        this.stopSpeakingIndicator(key);
        state.phase = 'recorded';
        recorder.stop().getMp3().then(([buffer, blob]) => {
            const createdAt = Date.now();
            const file = new File(buffer, `record-${key}-${createdAt}.mp3`, {
                type: blob.type,
                lastModified: createdAt
            });
            if (state.audioUrl) {
                URL.revokeObjectURL(state.audioUrl);
            }
            state.file = file;
            state.audioUrl = URL.createObjectURL(file);
            this.uploadRecording(question, file, activeParentKey, parentQuestionId);
        }).catch(() => {
            state.phase = 'error';
            state.error = 'Không thể lưu file ghi âm.';
        });
    }

    private buildAwsFileUrl(fileId: number | string): string {
        const url = new URL(getLinkDownload_aws(fileId.toString()));
        url.searchParams.set('token', this.auth.accessToken);
        return url.toString();
    }

    private uploadRecording(question: StudentQuestionView, file: File, activeParentKey: string, parentQuestionId: string, retryCount = 0): void {
        const key = this.questionKey(question);
        const state = this.recordStates[key];
        if (!state) {
            return;
        }
        state.phase = 'uploading';
        this.fileService.uploadFileAwsWidthProgress(file, 'student_record').subscribe({
            next: upload => {
                if (upload.state !== 'DONE') {
                    return;
                }
                const uploadedFile = upload.content?.data?.[0];
                if (!uploadedFile?.id) {
                    if (retryCount < 2) {
                        setTimeout(() => this.uploadRecording(question, file, activeParentKey, parentQuestionId, retryCount + 1), 1500);
                        return;
                    }
                    state.phase = 'error';
                    state.error = 'Upload file ghi âm thất bại.';
                    return;
                }
                this.updateLocalAnswer(question, {
                    fileId: uploadedFile.id,
                    fileName: file.name,
                    filePath: uploadedFile.id,
                    mimeType: file.type,
                    duration: this.recordSpeakingSeconds(question),
                    questionKey: key
                });
                this.saveQuestionAnswer(question, parentQuestionId, false).subscribe({
                    next: () => {
                        state.phase = 'uploaded';
                        state.uploadResult = uploadedFile;
                        if (state.audioUrl) {
                            URL.revokeObjectURL(state.audioUrl);
                        }
                        state.audioUrl = this.buildAwsFileUrl(uploadedFile.id);
                        if (this.currentParent && this.questionKey(this.currentParent) === activeParentKey) {
                            setTimeout(() => this.prepareActiveRecordQuestion(), 2000);
                        }
                    },
                    error: () => {
                        if (retryCount < 2) {
                            setTimeout(() => this.uploadRecording(question, file, activeParentKey, parentQuestionId, retryCount + 1), 1500);
                            return;
                        }
                        delete this.localAnswers[key];
                        state.uploadResult = null;
                        state.phase = 'error';
                        state.error = 'Lưu đáp án ghi âm thất bại.';
                    }
                });
            },
            error: () => {
                if (retryCount < 2) {
                    setTimeout(() => this.uploadRecording(question, file, activeParentKey, parentQuestionId, retryCount + 1), 1500);
                    return;
                }
                state.phase = 'error';
                state.error = 'Upload file ghi âm thất bại.';
            }
        });
    }

    private cleanupActiveRecordQuestion(): void {
        const parent = this.currentParent;
        if (!parent) {
            return;
        }
        const parentKey = this.questionKey(parent);
        const parentQuestionId = this.completedQuestionId(parent);
        this.cleanupRecordQuestion(parent, parentKey, parentQuestionId);
        (parent.children || []).filter(question => this.isRecordQuestion(question)).forEach(question => this.cleanupRecordQuestion(question, parentKey, parentQuestionId));
    }

    private cleanupRecordQuestion(question: StudentQuestionView, activeParentKey: string, parentQuestionId: string): void {
        if (!question || !this.isRecordQuestion(question)) {
            return;
        }
        const key = this.questionKey(question);
        this.clearRecordTimer(key);
        if (this.recordStates[key]?.phase === 'preparing') {
            this.recordStates[key].phase = 'idle';
        }
        if (this.recordStates[key]?.phase === 'recording' && this.recorders[key]) {
            this.stopRecording(question, activeParentKey, parentQuestionId);
        }
    }

    private clearRecordTimer(key: string): void {
        if (this.recordTimers[key]) {
            clearInterval(this.recordTimers[key]);
            delete this.recordTimers[key];
        }
    }

    dropParagraphAnswer(question: StudentQuestionView, event: CdkDragDrop<(Answer | null)[]>): void {
        const placed = this.paragraphPlacedOptions(question);
        const bankId = this.paragraphBankListId(question);
        const targetIndex = this.paragraphSlotIndexFromListId(question, event.container.id);
        const previousIndex = this.paragraphSlotIndexFromListId(question, event.previousContainer.id);

        if (event.previousContainer.id !== bankId || targetIndex === -1) {
            return;
        }

        const dragged = event.item.data as Answer;
        if (!dragged) {
            return;
        }

        // Fixed slots only: never reorder left side, only fill empty slot from right bank
        if (placed[targetIndex]) {
            return;
        }

        // Prevent moving from left back into another left slot via drag; use X button only.
        if (previousIndex !== -1) {
            return;
        }

        placed[targetIndex] = dragged;
        this.updateParagraphAnswerFromPlaced(question, placed);
    }

    private paragraphSlotIndexFromListId(question: StudentQuestionView, listId: string): number {
        return this.paragraphSlotListIds(question).indexOf(listId);
    }

    paragraphSlotListId(question: StudentQuestionView, index: number): string {
        return `${this.questionKey(question)}-paragraph-slot-${index}`.replace(/[^a-zA-Z0-9_-]/g, '-');
    }

    paragraphSlotListIds(question: StudentQuestionView): string[] {
        return this.paragraphOptions(question).map((_option, index) => this.paragraphSlotListId(question, index));
    }

    paragraphConnectedListIds(question: StudentQuestionView): string[] {
        return [this.paragraphBankListId(question)].concat(this.paragraphSlotListIds(question));
    }

    getGroupedByPart(): PartGroup[] {
        const partMap = new Map<number, StudentQuestionView[]>();
        this.parents.forEach((q, idx) => {
            q._globalIndex = idx;
            const part = q.part || 1;
            if (!partMap.has(part)) {
                partMap.set(part, []);
            }
            partMap.get(part)!.push(q);
        });
        return Array.from(partMap.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([part, questions]) => ({ part, questions }));
    }

    togglePartCollapse(part: number): void {
        this.collapsedParts[part] = !this.collapsedParts[part];
    }

    isPartCollapsed(part: number): boolean {
        return !!this.collapsedParts[part];
    }

    trackByPart(index: number, group: PartGroup): number {
        return group.part;
    }

    private createShiftTestState(): void {
        if (!this.shiftTest?.id || !this.student?.id) {
            return;
        }
        const payload = this.buildShiftTestStatePayload();
        this.shiftTestStateService.addTnShiftTestState(payload).subscribe({
            next: state => {
                this.applyShiftTestStateResponse(state);
                this.lastPostedStateSignature = this.buildStateSignature(payload);
                this.lastSyncedTimeLeft = payload.time_left;
                this.lastTimeLeftSyncAt = Date.now();
                if (!this.shiftTestStateId) {
                    this.progressUpdatePending = true;
                    return;
                }
                if (this.progressUpdatePending || this.completedQuestionIds.length) {
                    this.updateShiftTestStateProgress();
                }
            }
        });
    }

    private applyShiftTestStateResponse(state: any): void {
        if (state === null || state === undefined) {
            return;
        }
        if (typeof state === 'number' || typeof state === 'string') {
            this.shiftTestStateId = Number(state) || this.shiftTestStateId;
            if (this.shiftTestStateId) {
                this.currentShiftTestState = {
                    ...this.currentShiftTestState,
                    id: this.shiftTestStateId
                };
            }
            return;
        }
        if (typeof state !== 'object') {
            return;
        }
        this.shiftTestStateId = state.id || this.shiftTestStateId;
        this.currentShiftTestState = {
            ...this.currentShiftTestState,
            ...state,
            id: this.shiftTestStateId
        };
    }

    private buildShiftTestStatePayload(): TnShiftTestState {
        return {
            shift_test_id: this.shiftTest.id,
            student_id: this.student.id,
            skill: this.selectedSkill,
            progress: this.completedQuestionIds.join(','),
            duration: this.skillDurationSeconds(),
            time_left: this.examTimeLeftSeconds,
            completed: this.completedQuestionIds.length
        };
    }

    private skillDuration(): number {
        return this.skillDurationValue;
    }

    private skillDurationSeconds(): number {
        return Math.max(0, Math.floor(Number(this.skillDurationValue) || 0) * 60);
    }

    private startExamCountdown(): void {
        this.clearExamCountdown();
        this.examTimeLeftSeconds = this.skillDurationSeconds();
        if (this.examTimeLeftSeconds <= 0) {
            return;
        }
        this.examCountdownTimer = setInterval(() => {
            this.examTimeLeftSeconds = Math.max(0, this.examTimeLeftSeconds - 1);
            this.syncTimeLeftToState();
            if (this.examTimeLeftSeconds <= 0) {
                this.syncTimeLeftToState(true);
                this.clearExamCountdown();
                this.incompleteCurrentPageWarning = 'Đã hết thời gian làm bài.';
                this.submitSkillTest(true);
            }
        }, 1000);
    }

    private examSessionKey(): string {
        return ['student_exam_active', this.shiftId || 0, this.routeShiftTestId || 0, this.selectedSkill || 'unknown'].join('_');
    }

    private markExamSessionActive(): void {
        sessionStorage.setItem(this.examSessionKey(), 'active');
    }

    private clearExamSessionActive(): void {
        sessionStorage.removeItem(this.examSessionKey());
    }

    private isReloadNavigation(): boolean {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return navigation?.type === 'reload' || performance.navigation?.type === 1;
    }

    private handleReloadDuringExam(): boolean {
        const active = sessionStorage.getItem(this.examSessionKey()) === 'active';
        if (!active || !this.isReloadNavigation()) {
            return false;
        }
        this.clearExamSessionActive();
        this.notificationService.toastWarning('Bạn đã tải lại trang trong khi làm bài. Hệ thống đưa bạn về chi tiết ca thi.');
        void this.router.navigate(['/student/ca-thi-cua-ban', this.shiftId]);
        return true;
    }

    private activateExamSecurity(): void {
        if (this.examSecurityActive) {
            return;
        }
        this.examSecurityActive = true;
        document.addEventListener('copy', this.preventExamInteraction, true);
        document.addEventListener('cut', this.preventExamInteraction, true);
        document.addEventListener('paste', this.preventExamInteraction, true);
        document.addEventListener('contextmenu', this.preventExamInteraction, true);
        document.addEventListener('selectstart', this.preventExamInteraction, true);
        document.addEventListener('dragstart', this.preventExamInteraction, true);
        document.addEventListener('keydown', this.preventExamShortcut, true);
        document.addEventListener('visibilitychange', this.handleVisibilityChange, true);
        document.addEventListener('fullscreenchange', this.handleFullscreenChange, true);
        window.addEventListener('resize', this.handleWindowResize, true);
        this.checkDevToolsState();
        this.devToolsCheckTimer = setInterval(() => this.checkDevToolsState(), 1000);
        void this.enterFullscreen();
    }

    private deactivateExamSecurity(): void {
        if (!this.examSecurityActive) {
            return;
        }
        this.examSecurityActive = false;
        document.removeEventListener('copy', this.preventExamInteraction, true);
        document.removeEventListener('cut', this.preventExamInteraction, true);
        document.removeEventListener('paste', this.preventExamInteraction, true);
        document.removeEventListener('contextmenu', this.preventExamInteraction, true);
        document.removeEventListener('selectstart', this.preventExamInteraction, true);
        document.removeEventListener('dragstart', this.preventExamInteraction, true);
        document.removeEventListener('keydown', this.preventExamShortcut, true);
        document.removeEventListener('visibilitychange', this.handleVisibilityChange, true);
        document.removeEventListener('fullscreenchange', this.handleFullscreenChange, true);
        window.removeEventListener('resize', this.handleWindowResize, true);
        if (this.devToolsCheckTimer) {
            clearInterval(this.devToolsCheckTimer);
            this.devToolsCheckTimer = null;
        }
        if (document.fullscreenElement) {
            void document.exitFullscreen().catch(() => null);
        }
    }

    continueFullscreen(): void {
        this.securityWarningVisible = false;
        void this.enterFullscreen();
    }

    private async enterFullscreen(): Promise<void> {
        if (document.fullscreenElement || !document.documentElement.requestFullscreen) {
            return;
        }
        try {
            await document.documentElement.requestFullscreen();
        } catch {
            this.securityWarningMessage = 'Trình duyệt chưa cho phép vào toàn màn hình. Vui lòng bấm nút tiếp tục một lần nữa.';
            this.securityWarningVisible = true;
        }
    }

    private showSecurityWarning(message: string): void {
        if (this.securityWarningVisible && this.securityWarningMessage === message) {
            return;
        }
        this.violationCount += 1;
        this.securityWarningMessage = message;
        this.securityWarningVisible = true;
    }

    private isDevToolsOpen(): boolean {
        const widthGap = Math.abs(window.outerWidth - window.innerWidth);
        const heightGap = Math.abs(window.outerHeight - window.innerHeight);
        return widthGap > 120 || heightGap > 120;
    }

    private checkDevToolsState(): void {
        if (!this.examSecurityActive) {
            return;
        }
        const detected = this.isDevToolsOpen();
        if (detected && !this.devToolsDetected) {
            this.devToolsDetected = true;
            this.showSecurityWarning('Bạn đang mở công cụ trình duyệt. Vui lòng tắt công cụ này và quay lại chế độ toàn màn hình để tiếp tục làm bài.');
            return;
        }
        if (!detected) {
            this.devToolsDetected = false;
        }
    }

    private handleWindowResize = (): void => {
        this.checkDevToolsState();
    };

    private preventExamInteraction = (event: Event): void => {
        event.preventDefault();
    };

    private preventExamShortcut = (event: KeyboardEvent): void => {
        const key = event.key.toLowerCase();
        const blocked =
            (event.ctrlKey && ['a', 'c', 'p', 's', 'u', 'v', 'x'].includes(key)) ||
            (event.ctrlKey && event.shiftKey && ['i', 'j'].includes(key)) ||
            key === 'f12';
        if (blocked) {
            event.preventDefault();
            event.stopPropagation();
            this.showSecurityWarning('Bạn vừa mở công cụ bị chặn hoặc phím tắt không được phép. Vui lòng quay lại chế độ toàn màn hình để tiếp tục làm bài.');
        }
    };

    private handleVisibilityChange = (): void => {
        if (this.examSecurityActive && document.hidden) {
            this.showSecurityWarning('Bạn vừa rời khỏi tab làm bài. Hành động này đã được ghi nhận.');
        }
    };

    private handleFullscreenChange = (): void => {
        if (this.examSecurityActive && !document.fullscreenElement) {
            this.showSecurityWarning('Bạn đã thoát chế độ toàn màn hình. Vui lòng quay lại để tiếp tục làm bài.');
        }
    };

    private clearExamCountdown(): void {
        if (this.examCountdownTimer) {
            clearInterval(this.examCountdownTimer);
            this.examCountdownTimer = null;
        }
    }

    private resetTimeLeftSyncTracking(): void {
        this.lastSyncedTimeLeft = null;
        this.lastTimeLeftSyncAt = 0;
    }

    private syncTimeLeftToState(force = false): void {
        if (!this.shiftTestStateId) {
            return;
        }
        const timeLeft = Math.max(0, this.examTimeLeftSeconds);
        if (!force && this.lastSyncedTimeLeft === timeLeft) {
            return;
        }
        const now = Date.now();
        if (!force && now - this.lastTimeLeftSyncAt < 15000) {
            return;
        }
        this.updateShiftTestStateProgress('timer');
    }

    private buildStateSignature(payload: TnShiftTestState): string {
        return [payload.progress || '', payload.completed || 0, payload.time_left ?? ''].join('|');
    }

    private markTimeLeftSynced(timeLeft: number): void {
        this.lastSyncedTimeLeft = timeLeft;
        this.lastTimeLeftSyncAt = Date.now();
    }

    get countdownDisplay(): string {
        const totalSeconds = Math.max(0, this.examTimeLeftSeconds);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        if (hours > 0) {
            return [hours, minutes, seconds].map(value => String(value).padStart(2, '0')).join(':');
        }
        return [minutes, seconds].map(value => String(value).padStart(2, '0')).join(':');
    }

    get countdownWarning(): boolean {
        return this.examTimeLeftSeconds > 0 && this.examTimeLeftSeconds <= 60;
    }

    private resolveSkillDuration(formDetails: TnFormDetail[]): number {
        const detail = (formDetails || []).find(item => (item.skill || '').toLowerCase() === this.selectedSkill);
        return Number(detail?.time) || 0;
    }

    private shuffleAnswerOptions(question: StudentQuestionView): Answer[] {
        const options = Array.isArray(question?.answer_option) ? [...question.answer_option] : [];
        if (options.length <= 1) {
            return options;
        }
        for (let index = options.length - 1; index > 0; index--) {
            const randomIndex = Math.floor(Math.random() * (index + 1));
            [options[index], options[randomIndex]] = [options[randomIndex], options[index]];
        }
        return options;
    }

    private applyAnswerOptionShuffle(question: StudentQuestionView): void {
        if (!question) {
            return;
        }
        if (Array.isArray(question.answer_option) && question.answer_option.length > 1) {
            question.answer_option = this.shuffleAnswerOptions(question);
        }
        (question.children || []).forEach(child => this.applyAnswerOptionShuffle(child));
    }

    private applyAnswerOptionShuffleToParents(parents: StudentQuestionView[]): void {
        (parents || []).forEach(parent => this.applyAnswerOptionShuffle(parent));
    }

    private serializeStudentAnswer(question: StudentQuestionView): string {
        const answer = this.answerValue(question);
        if (answer === null || answer === undefined || answer === '') {
            return '';
        }
        if (this.isRecordQuestion(question)) {
            return (answer?.fileId || answer?.filePath || '').toString();
        }
        return answer.toString();
    }

    private buildShiftTestAnswerPayload(question: StudentQuestionView): TnShiftTestAnswer {
        return {
            shift_id: this.shiftId,
            shift_test_id: this.shiftTest.id,
            bank_question_id: question.bank_question_id || question.id,
            student_id: this.student.id,
            student_answer: this.serializeStudentAnswer(question)
        };
    }

    private submitSkillTest(force = false): void {
        if (!this.shiftTest?.id || this.submitting || (!force && !this.canSubmitSkillTest())) {
            return;
        }
        this.submitting = true;
        this.incompleteCurrentPageWarning = '';
        this.notificationService.loadingAnimationV2({ icon: 'circle', text: 'Submitting answers...' });
        const requests = this.collectUnpostedAnswerRequests();
        const saveAnswers = requests.length ? forkJoin(requests) : of([]);
        saveAnswers.pipe(
            switchMap(() => this.shiftTestService.scoreShiftTest(this.shiftTest.id, this.selectedSkill)),
            finalize(() => {
                this.submitting = false;
                this.notificationService.disableLoadingAnimationV2();
            })
        ).subscribe({
            next: scoreResult => {
                this.allowLeaveExam = true;
                this.clearExamSessionActive();
                this.showScoreResult(scoreResult);
            },
            error: () => this.message = 'Không thể nộp bài. Vui lòng thử lại sau.'
        });
    }

    scoreResultVisible = false;
    scoreResultData: { skill?: string; point?: number; band?: string; raw?: any } = {};

    private showScoreResult(scoreResult: any): void {
        let point: number = null;
        if (typeof scoreResult === 'number') {
            point = scoreResult;
        } else if (typeof scoreResult === 'string' && scoreResult !== '') {
            const parsed = Number(scoreResult);
            point = Number.isNaN(parsed) ? null : parsed;
        } else if (scoreResult && typeof scoreResult === 'object') {
            const raw = scoreResult.point ?? scoreResult.last_point ?? scoreResult.raw_point ?? null;
            point = raw !== null && raw !== undefined ? Number(raw) : null;
        }
        const skill = (this.selectedSkill || '').toLowerCase();
        this.scoreResultData = {
            skill,
            point,
            band: this.calcSkillBand(skill, point),
            raw: scoreResult
        };
        this.scoreResultVisible = true;
    }

    closeScoreResult(): void {
        this.scoreResultVisible = false;
        void this.router.navigate(['/student/ca-thi-cua-ban', this.shiftId]);
    }

    skillResultLabel(skill: string): string {
        switch ((skill || '').toLowerCase()) {
            case 'listening': return 'Listening';
            case 'reading': return 'Reading';
            case 'writing': return 'Writing';
            case 'speaking': return 'Speaking';
            case 'core': return 'Core';
            default: return skill || 'Kỹ năng';
        }
    }

    private calcSkillBand(skill: string, point: number | null): string {
        if (point === null || Number.isNaN(point)) {
            return '';
        }
        const bands: { [key: string]: { A1: number; A2: number; B1: number; B2: number; C: number } } = {
            listening: { A1: 8, A2: 16, B1: 24, B2: 34, C: 42 },
            reading: { A1: 8, A2: 16, B1: 26, B2: 38, C: 46 },
            writing: { A1: 6, A2: 18, B1: 26, B2: 40, C: 48 },
            speaking: { A1: 4, A2: 16, B1: 26, B2: 41, C: 48 }
        };
        const b = bands[(skill || '').toLowerCase()];
        if (!b) return '';
        if (point >= b.C) return 'C';
        if (point >= b.B2) return 'B2';
        if (point >= b.B1) return 'B1';
        if (point >= b.A2) return 'A2';
        if (point >= b.A1) return 'A1';
        return 'Chưa đạt A1';
    }

    private collectUnpostedAnswerRequests(): Observable<any>[] {
        const requests: Observable<any>[] = [];
        this.parents.forEach(parent => {
            const parentQuestionId = this.completedQuestionId(parent);
            this.parentQuestions(parent).forEach(question => {
                if (!this.serializeStudentAnswer(question) || this.postedAnswerValues[this.questionKey(question)] === this.serializeStudentAnswer(question)) {
                    return;
                }
                requests.push(this.saveQuestionAnswer(question, parentQuestionId, false));
            });
            this.markParentQuestionCompleted(parentQuestionId);
        });
        return requests;
    }

    private saveQuestionAnswer(question: StudentQuestionView, parentQuestionId: string, shouldMarkParentCompleted: boolean): Observable<any> {
        if (!question || !this.shiftTest?.id || !this.student?.id) {
            return of(null);
        }
        const studentAnswer = this.serializeStudentAnswer(question);
        if (!studentAnswer) {
            return of(null);
        }
        const answerKey = this.questionKey(question);
        if (this.postedAnswerValues[answerKey] === studentAnswer) {
            this.postedAnswerKeys[answerKey] = true;
            if (shouldMarkParentCompleted) {
                this.markParentQuestionCompleted(parentQuestionId);
            }
            return of(null);
        }
        const payload = this.buildShiftTestAnswerPayload(question);
        return this.shiftTestAnswerService.addTnShiftTestAnswer(payload).pipe(map(result => {
            this.postedAnswerKeys[answerKey] = true;
            this.postedAnswerValues[answerKey] = studentAnswer;
            if (shouldMarkParentCompleted) {
                this.markParentQuestionCompleted(parentQuestionId);
            }
            return result;
        }));
    }

    private saveCurrentQuestionAnswers(): void {
        const parent = this.currentParent;
        if (!parent) {
            return;
        }
        const parentQuestionId = this.completedQuestionId(parent);
        const shouldMarkParentCompleted = this.isCurrentParentComplete();
        const savableQuestions = [parent, ...(parent.children || [])].filter(question => question && this.serializeStudentAnswer(question));
        if (shouldMarkParentCompleted && !savableQuestions.length) {
            this.markParentQuestionCompleted(parentQuestionId);
        }
        if (this.shouldRenderParentControl(parent)) {
            this.saveQuestionAnswer(parent, parentQuestionId, shouldMarkParentCompleted).subscribe();
        }
        (parent.children || []).forEach(question => this.saveQuestionAnswer(question, parentQuestionId, shouldMarkParentCompleted).subscribe());
    }

    private markParentQuestionCompleted(questionId: string): void {
        if (!questionId || this.completedQuestionIds.indexOf(questionId) !== -1) {
            return;
        }
        this.completedQuestionIds.push(questionId);
        this.updateShiftTestStateProgress();
    }

    private completedQuestionId(question: StudentQuestionView): string {
        return (question.bank_question_id || question.id || '').toString();
    }

    private updateShiftTestStateProgress(syncType: 'progress' | 'timer' = 'progress'): void {
        if (!this.shiftTestStateId) {
            this.progressUpdatePending = true;
            return;
        }
        this.progressUpdatePending = false;
        const payload = this.buildShiftTestStatePayload();
        const stateSignature = this.buildStateSignature(payload);
        if (stateSignature === this.lastPostedStateSignature) {
            return;
        }
        this.shiftTestStateService.updateTnShiftTestState(this.shiftTestStateId, payload).subscribe({
            next: state => {
                this.lastPostedStateSignature = stateSignature;
                this.markTimeLeftSynced(payload.time_left);
                this.applyShiftTestStateResponse(state);
            },
            error: () => {
                if (syncType === 'progress') {
                    this.progressUpdatePending = true;
                }
            }
        });
    }

    private normalizeShiftTestResponse(response: any): any {
        if (Array.isArray(response)) {
            return response.length ? response[0] : null;
        }
        return response;
    }

    private extractQuestions(shiftTest: any): StudentQuestionView[] {
        if (!shiftTest) {
            return [];
        }
        if (Array.isArray(shiftTest.question_test)) {
            return shiftTest.question_test;
        }
        if (Array.isArray(shiftTest.questions)) {
            return shiftTest.questions;
        }
        if (Array.isArray(shiftTest.question)) {
            return shiftTest.question;
        }
        if (Array.isArray(shiftTest.data)) {
            return shiftTest.data;
        }
        return [];
    }

    private groupQuestions(rawQuestions: StudentQuestionView[], skill: string): StudentQuestionView[] {
        const questions = (rawQuestions || [])
            .filter(question => (question.skill || '').toLowerCase() === skill)
            .map(question => ({
                ...question,
                group_id: Number(question.group_id) || 0,
                part: Number(question.part) || 0,
                answer_correct: this.normalizeAnswerCorrect(question.answer_correct),
                answer_option: Array.isArray(question.answer_option) ? [...question.answer_option] : [],
                question_direction: this.appendTokenToQuestionDirection(question.question_direction)
            }));
        const parents = questions
            .filter(question => question.group_id === 0)
            .sort((a, b) => (a.part || 0) - (b.part || 0));
        const children = questions
            .filter(question => question.group_id !== 0)
            .sort((a, b) => (a.question_number || 0) - (b.question_number || 0));
        parents.forEach((parent, index) => {
            parent._viewKey = this.buildQuestionKey(parent, index);
            parent.children = children.filter(child => this.isChildOfParent(child, parent));
        });
        return parents;
    }

    private appendTokenToQuestionDirection(questionDirection: string): string {
        if (!questionDirection || !this.auth?.accessToken) {
            return questionDirection;
        }
        const awsFilePrefix = getLinkDownload_aws('');
        const awsFileUrl = new URL(awsFilePrefix);
        return questionDirection.replace(/src="([^"]+)"/g, (match, src) => {
            const normalizedSrc = (src || '').trim();
            if (!normalizedSrc || normalizedSrc.startsWith('data:') || normalizedSrc.startsWith('blob:')) {
                return match;
            }
            if (!/^\d+$/.test(normalizedSrc) && normalizedSrc.indexOf(awsFilePrefix) !== 0 && normalizedSrc.indexOf('/api/aws/file/') === -1) {
                return match;
            }
            try {
                const url = new URL(/^\d+$/.test(normalizedSrc) ? getLinkDownload_aws(normalizedSrc) : normalizedSrc, awsFilePrefix);
                if (url.origin !== awsFileUrl.origin || url.pathname.indexOf('/api/aws/file/') === -1) {
                    return match;
                }
                url.searchParams.set('token', this.auth.accessToken);
                return 'src="'.concat(url.toString(), '"');
            } catch {
                return match;
            }
        });
    }

    private normalizeAnswerCorrect(value: any): any[] {
        if (Array.isArray(value)) {
            return value;
        }
        if (typeof value === 'string') {
            return value.split('|').filter(Boolean);
        }
        return [];
    }

    private isChildOfParent(child: StudentQuestionView, parent: StudentQuestionView): boolean {
        return Number(child.group_id) === Number(parent.id) || Number(child.group_id) === Number(parent.bank_question_id);
    }

    private normalizeSelectMarkerText(questionDirection: string): string {
        return (questionDirection || '').replace(/<[^>]*>/g, '').replace(/\s+/g, '').toUpperCase();
    }

    questionKey(question: StudentQuestionView): string {
        return question?._viewKey || this.buildQuestionKey(question, 0);
    }

    private buildQuestionKey(question: StudentQuestionView, index: number): string {
        return [
            question?.id || 'no-id',
            question?.bank_question_id || 'no-bank-id',
            question?.part || 'no-part',
            question?.question_number || 'no-number',
            index
        ].join('-');
    }
}
