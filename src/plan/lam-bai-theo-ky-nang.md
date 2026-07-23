# Module: Làm Bài Theo Kỹ Năng

Giao diện cho học viên làm bài thi theo từng kỹ năng riêng lẻ: **Listening**, **Reading**, **Writing**, **Speaking**, **Core**.

> ⚠️ **CẢNH BÁO CHO AGENT KHÁC**: Project này dùng Angular module truyền thống (không standalone), PrimeNG, RxJS, `mic-recorder-to-mp3`, `@angular/cdk/drag-drop`. Các services và models nằm ở `@core/` và `@shared/`. Để tái tạo component này, bạn cần có toàn bộ hệ thống base đó. Nội dung dưới đây mô tả CHI TIẾT TỪNG DÒNG — đủ để viết lại y nguyên.

---

## 1. Vị trí & Cấu trúc thư mục

```
src/app/modules/student/features/lam-bai-theo-ky-nang/
  student-question-test.component.ts       (~1917 dòng)
  student-question-test.component.html     (~285 dòng)
  student-question-test.component.css      (~1665 dòng)
  student-question-test.component.ts.tmp.1464.cf037b976745 (~1437 dòng) — backup
```

**Selector:** `app-student-question-test`
**Class:** `StudentQuestionTestComponent`
**Implements:** `OnInit`, `OnDestroy`, `AfterViewChecked`
**Module:** `StudentModule` (module truyền thống, không standalone)

---

## 2. IMPORTS — ĐƯỜNG DẪN & MỤC ĐÍCH

### 2.1 Angular Core & Router

```typescript
import { Component, OnDestroy, OnInit, AfterViewChecked, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
```

| Import | Dùng để |
|---|---|
| `Component` | Decorator `@Component({selector, templateUrl, styleUrls})` |
| `OnDestroy` | Lifecycle hook — cleanup khi rời component |
| `OnInit` | Lifecycle hook — khởi tạo data |
| `AfterViewChecked` | Lifecycle hook — chạy sau detect changes. Dùng `attachImageErrorHandlers()` |
| `ElementRef` | Lấy native element của component (`this.elRef.nativeElement`) |
| `ActivatedRoute` | Đọc param từ URL (`this.route.snapshot.paramMap.get('...')`) |
| `Router` | Điều hướng (`this.router.navigate([...])`) |

### 2.2 RxJS

```typescript
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, finalize, map, switchMap } from 'rxjs/operators';
```

| Import | Mục đích |
|---|---|
| `Observable` | Kiểu dữ liệu cho HTTP request |
| `forkJoin` | Chạy nhiều Observables song song, chờ tất cả hoàn thành |
| `of` | Tạo Observable từ giá trị có sẵn (dùng cho empty/default cases) |
| `catchError` | Bắt lỗi pipeline |
| `finalize` | Luôn chạy khi Observable kết thúc (success hoặc error) |
| `map` | Transform dữ liệu |
| `switchMap` | Chuyển sang Observable mới, hủy Observable cũ nếu có |

### 2.3 Angular CDK

```typescript
import { CdkDragDrop } from '@angular/cdk/drag-drop';
```

| Import | Mục đích |
|---|---|
| `CdkDragDrop` | Type cho event của drag-drop paragraph questions |

### 2.4 Core Services (`@core/services/`)

| Import | Path | Mục đích |
|---|---|---|
| `AuthService` | `@core/services/auth.service` | Xác thực student: `this.auth.student`, `this.auth.accessToken` |
| `FileService` | `@core/services/file.service` | Upload file lên AWS: `uploadFileAwsWidthProgress(file, type)` |
| `NotificationService` | `@core/services/notification.service` | UI notifications: `loadingAnimationV2()`, `disableLoadingAnimationV2()`, `toastWarning()` |
| `RouteEncoderService` | `@core/services/route-encoder.service` | Mã hóa/giải mã route params: `encode()`, `decode()` |
| `DevtoolsDetectionService` | `@core/services/devtools-detection.service` | Phát hiện DevTools: `startDetection()`, `stopDetection()` |

### 2.5 Shared Models (`@shared/models/`)

| Import | Path | Fields |
|---|---|---|
| `TnQLCathi` | `@shared/models/tn-ql-ca-thi` | `form_id`, `listening_count` |
| `TnFormDetail` | `@shared/models/tn-test-form` | `skill`, `time` |
| `TnShiftStudent` | `@shared/models/tn-shift-student` | `shift_id` |
| `TnStudent` | `@shared/models/tn-student` | `id` |
| `Answer` | `@shared/models/tn-shift-test-question` | `id`, `value` |
| `TnShiftTestAnswer` | `@shared/models/tn-shift-test-answer` | `shift_id`, `shift_test_id`, `bank_question_id`, `student_id`, `student_answer` |
| `TnShiftTestState` | `@shared/models/tn-shift-test-state` | `shift_test_id`, `student_id`, `skill`, `progress`, `duration`, `time_left`, `completed` |

### 2.6 Shared Services (`@shared/services/`)

| Service | Path | Mục đích |
|---|---|---|
| `TnQLCathiService` | `@shared/services/tn-ql-ca-thi.service` | `getTnQLCathiByIds(id: string)` — lấy ca thi |
| `TnFormDetailService` | `@shared/services/tn-form-detail.service` | `getFormDetailSkillsByFormId(formId)` — lấy chi tiết form/skill |
| `TnShiftStudentService` | `@shared/services/tn-shift-student.service` | `getStudentShiftGroups(studentId)` — lấy shift của student |
| `TnShiftTestService` | `@shared/services/tn-shift-test.service` | `getStudentQuestionTest(shiftId, studentId, shiftTestId)` — lấy câu hỏi; `scoreShiftTest(testId, skill)` — chấm điểm |
| `TnShiftTestAnswerService` | `@shared/services/tn-shift-test-answer.service` | `addTnShiftTestAnswer(payload)` — lưu câu trả lời |
| `TnShiftTestStateService` | `@shared/services/tn-shift-test-state.service` | `addTnShiftTestState(payload)`, `updateTnShiftTestState(id, payload)` |

### 2.7 Environment & Third-party

```typescript
import { getLinkDownload_aws } from '@env';
// Hàm trả về URL base để download file từ AWS: /api/aws/file/{id}
// Dùng trong appendTokenToQuestionDirection() và buildAwsFileUrl()

import * as MicRecorder from 'mic-recorder-to-mp3';
// Thư viện ghi âm microphone → MP3
// Cách dùng:
//   const recorder = new MicRecorder({ bitRate: 128 });
//   recorder.start().then(() => { ... });
//   recorder.stop().getMp3().then(([buffer, blob]) => {
//     const file = new File(buffer, 'name.mp3', { type: blob.type });
//   });
```

---

## 3. INTERFACES — TỪNG FIELD CHI TIẾT

### 3.1 `StudentQuestionMedia`

```typescript
interface StudentQuestionMedia {
    type: string;           // Loại media (vd: 'audio', 'video')
    source: string;         // Nguồn (vd: 'aws', 'youtube')
    path: string;           // Đường dẫn file
    replay?: number;        // Số lần được replay (-1 = unlimited, 0 = không replay)
    exam_paper_code?: string; // Mã đề thi
}
```

### 3.2 `StudentQuestionParams`

```typescript
interface StudentQuestionParams {
    prepare: number;   // Thời gian chuẩn bị (giây) — cho câu hỏi recording
    time: number;      // Thời gian nói (giây) — cho câu hỏi recording
}
```

### 3.3 `StudentQuestionView`

```typescript
interface StudentQuestionView {
    id?: number;                      // ID câu hỏi trong DB
    shift_test_id?: number;           // ID bài thi
    bank_question_id?: number;        // ID câu hỏi từ bank đề
    group_id: number;                 // =0 nếu là parent, >0 nếu là child (group_id = parent.id)
    part: number;                     // Part number (1, 2, 3...)
    question_type: string;            // 'radio', 'select', 'selectbox', 'paragraph', 'inputbox', 'textarea', 'record'
    question_direction: string;       // HTML nội dung câu hỏi (có thể chứa [[SELECT]] marker)
    skill: string;                    // 'listening', 'reading', 'writing', 'speaking', 'core'
    answer?: string;                  // Đáp án đúng
    answer_option?: Answer[];         // Mảng các lựa chọn [{id, value}]
    answer_correct?: any;             // Đáp án đúng (có thể array hoặc string)
    question_number?: number;         // Số thứ tự câu hỏi
    media?: StudentQuestionMedia;     // Media đi kèm (audio/video)
    params?: StudentQuestionParams;   // Tham số recording (prepare, time)
    hint?: string;                    // Gợi ý
    explain?: string;                 // Giải thích
    children?: StudentQuestionView[]; // Câu hỏi con (nếu group_id=0)
    _viewKey?: string;                // Key internal cho tracking
    _globalIndex?: number;            // Index toàn cục trong parents array
}
```

### 3.4 `PartGroup`

```typescript
interface PartGroup {
    part: number;                    // Part number
    questions: StudentQuestionView[]; // Danh sách câu hỏi trong part
}
```

### 3.5 `RecordQuestionState`

```typescript
interface RecordQuestionState {
    phase: 'idle' | 'preparing' | 'recording' | 'recorded' | 'uploading' | 'uploaded' | 'error';
    prepareLeft: number;              // Giây còn lại trong giai đoạn chuẩn bị
    speakingLeft: number;             // Giây còn lại trong giai đoạn nói
    audioUrl?: string;                // URL blob/file của recording
    isSpeaking?: boolean;             // TRUE nếu đang phát hiện giọng nói
    file?: File;                      // File MP3 đã ghi
    uploadResult?: any;               // Kết quả upload (chứa fileId)
    error?: string;                   // Thông báo lỗi
    audioLoadFailed?: boolean;        // TRUE nếu audio load thất bại
}
```

---

## 4. COMPONENT FIELDS — TỪNG FIELD

### 4.1 Public Fields

| Tên field | Kiểu | Giá trị mặc định | Mục đích |
|---|---|---|---|
| `loading` | `boolean` | `false` | Đang load dữ liệu |
| `message` | `string` | `''` | Thông báo lỗi/thông tin |
| `shiftId` | `number` | — | ID ca thi (đã decode) |
| `routeShiftTestId` | `number` | — | ID bài thi (đã decode) |
| `selectedSkill` | `string` | `''` | Kỹ năng được chọn (lowercased) |
| `shift` | `TnQLCathi` | — | Dữ liệu ca thi |
| `shiftStudent` | `TnShiftStudent` | — | Student-shift association |
| `student` | `TnStudent` | — | Student profile |
| `shiftTest` | `any` | — | Dữ liệu bài thi (từ API) |
| `parents` | `StudentQuestionView[]` | `[]` | Danh sách câu hỏi parent (đã group) |
| `collapsedParts` | `{ [part: number]: boolean }` | `{}` | Part nào đang collapse trong sidebar |
| `currentParentIndex` | `number` | `0` | Index của câu hỏi hiện tại |
| `questionPanelOpen` | `boolean` | `true` | Sidebar có mở không |
| `questionPanelUnlocked` | `boolean` | `false` | Cho phép mở sidebar tự do |
| `bookmarkedKeys` | `{ [key: string]: boolean }` | `{}` | Các câu hỏi đã bookmark |
| `seenQuestionKeys` | `{ [key: string]: boolean }` | `{}` | Các câu hỏi đã xem qua |
| `localAnswers` | `{ [key: string]: any }` | `{}` | Đáp án local (chưa sync server) |
| `recordStates` | `{ [key: string]: RecordQuestionState }` | `{}` | Trạng thái recording của từng câu |
| `skillDurationValue` | `number` | `0` | Thời gian làm bài (phút) |
| `examTimeLeftSeconds` | `number` | `0` | Thời gian còn lại (giây) |
| `currentShiftTestState` | `TnShiftTestState` | — | Trạng thái bài thi trên server |
| `shiftTestStateId` | `number` | — | ID của shift test state |
| `completedQuestionIds` | `string[]` | `[]` | Các câu đã hoàn thành |
| `progressUpdatePending` | `boolean` | `false` | Có update progress đang chờ |
| `incompleteCurrentPageWarning` | `string` | `''` | Warning khi chưa trả lời đủ |
| `submitting` | `boolean` | `false` | Đang submit bài |
| `postedAnswerKeys` | `{ [key: string]: boolean }` | `{}` | Các câu đã post lên server |
| `postedAnswerValues` | `{ [key: string]: string }` | `{}` | Giá trị đã post (để dedup) |
| `violationCount` | `number` | `0` | Số lần vi phạm bảo mật |
| `securityWarningVisible` | `boolean` | `false` | Hiển thị overlay bảo mật |
| `securityWarningMessage` | `string` | `''` | Nội dung warning bảo mật |
| `submitConfirmVisible` | `boolean` | `false` | Dialog xác nhận nộp bài |
| `exitConfirmVisible` | `boolean` | `false` | Dialog xác nhận thoát |
| `scoreResultVisible` | `boolean` | `false` | Dialog kết quả điểm |
| `scoreResultData` | `{ skill?: string; point?: number; band?: string; raw?: any }` | `{}` | Dữ liệu kết quả |

### 4.2 Private Fields

| Tên field | Kiểu | Mục đích |
|---|---|---|
| `private lastPostedStateSignature` | `string` | Signature của state đã post (dedup) |
| `private lastSyncedTimeLeft` | `number` | `null` | Giá trị time_left đã sync lần cuối |
| `private lastTimeLeftSyncAt` | `number` | `0` | Timestamp sync time_left lần cuối |
| `private examSecurityActive` | `boolean` | `false` | Bảo mật đang active |
| `private allowLeaveExam` | `boolean` | `false` | Cho phép rời bài thi (sau submit) |
| `private devToolsDetected` | `boolean` | `false` | DevTools đã được phát hiện |
| `private examCountdownTimer` | `any` | — | setInterval timer cho countdown |
| `private devToolsCheckTimer` | `any` | — | setInterval timer cho devtools check |
| `private recordTimers` | `{ [key: string]: any }` | `{}` | setInterval timers cho recording countdown |
| `private recorders` | `{ [key: string]: any }` | `{}` | MicRecorder instances |
| `private recordAudioContexts` | `{ [key: string]: AudioContext }` | `{}` | AudioContext cho speaking indicator |
| `private lastBeepTime` | `number` | `0` | Timestamp phát beep lần cuối |
| `private recordAudioStreams` | `{ [key: string]: MediaStream }` | `{}` | MediaStream từ microphone |
| `private recordAudioAnimationFrames` | `{ [key: string]: number }` | `{}` | requestAnimationFrame IDs |
| `private beepAudioUrl` | `string` | — | Cached URL của beep sound WAV |

---

## 5. CONSTRUCTOR — 14 dependencies

```typescript
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
```

**Giải thích từng service:**

1. **ActivatedRoute** (`@angular/router`) — đọc route params: shiftId, shiftTestId, skill
2. **Router** (`@angular/router`) — điều hướng: navigate về detail, redirect khi reload
3. **AuthService** (`@core/services/auth.service`) — `this.auth.student` lấy profile, `this.auth.accessToken` lấy token
4. **NotificationService** (`@core/services/notification.service`) — `loadingAnimationV2()` bật spinner, `disableLoadingAnimationV2()` tắt, `toastWarning()` hiển thị toast
5. **RouteEncoderService** (`@core/services/route-encoder.service`) — `routeEncoder.encode()`, `routeEncoder.decode()` — mã hóa/giải mã route params (tránh lộ ID thật)
6. **TnShiftStudentService** (`@shared/services/tn-shift-student.service`) — `getStudentShiftGroups(studentId)` → lấy danh sách shift của student
7. **TnQLCathiService** (`@shared/services/tn-ql-ca-thi.service`) — `getTnQLCathiByIds(shiftId)` → lấy chi tiết ca thi
8. **TnFormDetailService** (`@shared/services/tn-form-detail.service`) — `getFormDetailSkillsByFormId(formId)` → lấy thời gian làm bài cho skill
9. **TnShiftTestService** (`@shared/services/tn-shift-test.service`) — `getStudentQuestionTest(shiftId, studentId, shiftTestId)` → lấy câu hỏi; `scoreShiftTest(testId, skill)` → chấm điểm
10. **TnShiftTestAnswerService** (`@shared/services/tn-shift-test-answer.service`) — `addTnShiftTestAnswer(payload)` → lưu câu trả lời từng câu
11. **TnShiftTestStateService** (`@shared/services/tn-shift-test-state.service`) — `addTnShiftTestState(payload)` → tạo state, `updateTnShiftTestState(id, payload)` → update progress
12. **FileService** (`@core/services/file.service`) — `uploadFileAwsWidthProgress(file, 'student_record')` → upload file ghi âm lên AWS
13. **ElementRef** (`@angular/core`) — `this.elRef.nativeElement` → DOM element gốc, dùng trong `attachImageErrorHandlers()` để querySelectorAll ảnh
14. **DevtoolsDetectionService** (`@core/services/devtools-detection.service`) — `startDetection()`, `stopDetection()` → phát hiện DevTools mở

---

## 6. ngOnInit() — CHI TIẾT TỪNG BƯỚC

```typescript
ngOnInit(): void {
    // Bước 1: Bắt đầu phát hiện DevTools (service riêng)
    this.devtoolsService.startDetection();

    // Bước 2: Đọc route params raw (dạng string)
    const rawShiftId = this.route.snapshot.paramMap.get('shiftId') || '';
    const rawShiftTestId = this.route.snapshot.paramMap.get('shiftTestId') || '';

    // Bước 3: Decode params — nếu decode thất bại thì fallback Number(raw)
    this.shiftId = this.routeEncoder.decode(rawShiftId) ?? Number(rawShiftId);
    this.routeShiftTestId = this.routeEncoder.decode(rawShiftTestId) ?? Number(rawShiftTestId);

    // Bước 4: Lowercase skill param
    this.selectedSkill = (this.route.snapshot.paramMap.get('skill') || '').toLowerCase();

    // Bước 5: Kiểm tra reload — nếu reload trong khi thi thì redirect về detail
    if (this.handleReloadDuringExam()) {
        return; // Dừng ngOnInit, không load question test
    }

    // Bước 6: Đánh dấu phiên thi đang active (sessionStorage)
    this.markExamSessionActive();

    // Bước 7: Load dữ liệu
    this.loadQuestionTest();
}
```

---

## 7. loadQuestionTest() — RxJS PIPELINE CHI TIẾT

```typescript
loadQuestionTest(): void {
    // Kiểm tra đầu vào — nếu thiếu shiftId/skill/shiftTestId/student thì báo lỗi, return
    if (!this.shiftId) { this.message = 'Exam shift not found.'; return; }
    if (!this.selectedSkill) { this.message = 'Skill not found.'; return; }
    if (!this.routeShiftTestId) { this.message = 'Exam test not found.'; return; }

    this.student = this.auth.student;
    if (!this.student?.id) { this.message = 'No matching student profile was found for this account.'; return; }

    // Bắt đầu loading
    this.loading = true;
    this.message = '';
    this.notificationService.loadingAnimationV2({ icon: 'circle', text: 'Loading exam questions...' });

    // PIPELINE:
    this.shiftStudentService.getStudentShiftGroups(this.student.id)

        .pipe(
            // switchMap 1: Tìm shiftStudent match, sau đó forkJoin 2 requests
            switchMap(shiftStudents => {
                this.shiftStudent = (shiftStudents || []).find(item => item.shift_id === this.shiftId);
                if (!this.shiftStudent) {
                    this.message = 'You do not have permission to view this exam.';
                    return of(null); // Dừng pipeline
                }
                // Chạy song song: lấy ca thi + lấy câu hỏi
                return forkJoin({
                    shifts: this.shiftService.getTnQLCathiByIds(this.shiftId.toString()),
                    shiftTest: this.shiftTestService.getStudentQuestionTest(
                        this.shiftId, this.student.id, this.routeShiftTestId
                    )
                });
            }),

            // switchMap 2: Nếu có form_id thì lấy thêm formDetails
            switchMap((result: { shifts: TnQLCathi[]; shiftTest: any }) => {
                if (!result) { return of(null); }
                this.shift = result.shifts?.[0] || null;
                if (!this.shift?.form_id) {
                    return of({ ...result, formDetails: [] });
                }
                return this.formDetailService.getFormDetailSkillsByFormId(this.shift.form_id).pipe(
                    map(formDetails => ({ ...result, formDetails }))
                );
            }),

            // map: Xử lý dữ liệu và khởi tạo state
            map((result) => {
                if (!result) { return null; }
                this.shift = result.shifts?.[0] || null;
                // Lấy thời gian làm bài từ formDetail
                this.skillDurationValue = this.resolveSkillDuration(result.formDetails || []);
                this.startExamCountdown(); // Bắt đầu đếm ngược

                this.shiftTest = this.normalizeShiftTestResponse(result.shiftTest);
                const questions = this.extractQuestions(this.shiftTest);
                this.parents = this.groupQuestions(questions, this.selectedSkill);
                this.applyAnswerOptionShuffleToParents(this.parents);

                // Reset state
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

                this.createShiftTestState(); // Tạo state trên server
                this.markActiveParentSeen();
                this.prepareActiveRecordQuestion();

                if (this.parents.length) {
                    this.activateExamSecurity(); // Bật bảo mật
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
        )
        .subscribe(); // Subscribe — không xử lý riêng vì đã handle trong pipeline
}
```

---

## 8. ALL METHODS — PSEUDOCODE CHI TIẾT

### 8.1 Question Grouping & Normalization

#### `normalizeShiftTestResponse(response: any): any`
```
nếu response là array → lấy phần tử đầu tiên
nếu không → giữ nguyên
```

#### `extractQuestions(shiftTest: any): StudentQuestionView[]`
```
nếu không có shiftTest → []
nếu shiftTest.question_test tồn tại → shiftTest.question_test
nếu shiftTest.questions tồn tại → shiftTest.questions
nếu shiftTest.question tồn tại → shiftTest.question
nếu shiftTest.data tồn tại → shiftTest.data
không → []
```
→ Handle nhiều format API khác nhau

#### `groupQuestions(rawQuestions: StudentQuestionView[], skill: string): StudentQuestionView[]`
```
Bước 1: Lọc questions theo skill (lowercase match)
Bước 2: Với mỗi question:
  - normalize group_id = Number(group_id) || 0
  - normalize part = Number(part) || 0
  - normalize answer_correct (gọi normalizeAnswerCorrect)
  - clone answer_option array
  - append auth token vào question_direction (gọi appendTokenToQuestionDirection)

Bước 3: Tách parents (group_id === 0), sort theo part
Bước 4: Tách children (group_id !== 0), sort theo question_number

Bước 5: Với mỗi parent (index):
  - Tạo _viewKey = buildQuestionKey(parent, index)
  - Gán children = children.filter(child => isChildOfParent(child, parent))
```

#### `isChildOfParent(child: StudentQuestionView, parent: StudentQuestionView): boolean`
```
return Number(child.group_id) === Number(parent.id)
    || Number(child.group_id) === Number(parent.bank_question_id)
```

#### `normalizeAnswerCorrect(value: any): any[]`
```
nếu array → giữ nguyên
nếu string → split('|').filter(Boolean)
không → []
```

#### `appendTokenToQuestionDirection(questionDirection: string): string`
```
nếu không có direction hoặc không có accessToken → giữ nguyên
Tìm tất cả src="..." trong HTML
Với mỗi src:
  - Bỏ qua nếu data: hoặc blob:
  - Bỏ qua nếu không phải số và không chứa awsFilePrefix
  - Tạo URL object, set param token = accessToken
  - Thay thế src
```

#### `buildQuestionKey(question: StudentQuestionView, index: number): string`
```
return [question.id || 'no-id', question.bank_question_id || 'no-bank-id',
        question.part || 'no-part', question.question_number || 'no-number', index].join('-')
```

### 8.2 Answer Management

#### `updateLocalAnswer(question: StudentQuestionView, value: any): void`
```
key = questionKey(question)
localAnswers[key] = value
// Reset posted flag — nếu giá trị đã post khác với giá trị mới
postedAnswerKeys[key] = (postedAnswerValues[key] === serializeStudentAnswer(question))
```

#### `answerValue(question: StudentQuestionView): any`
```
return localAnswers[questionKey(question)] ?? null
```

#### `isAnswerSelected(question: StudentQuestionView, optionId: any): boolean`
```
return String(answerValue(question) ?? '') === String(optionId)
```

#### `serializeStudentAnswer(question: StudentQuestionView): string`
```
answer = answerValue(question)
nếu null/undefined/'' → ''
nếu record question → (answer.fileId || answer.filePath || '').toString()
không → answer.toString()
```

#### `buildShiftTestAnswerPayload(question: StudentQuestionView): TnShiftTestAnswer`
```
return {
    shift_id: this.shiftId,
    shift_test_id: this.shiftTest.id,
    bank_question_id: question.bank_question_id || question.id,
    student_id: this.student.id,
    student_answer: this.serializeStudentAnswer(question)
}
```

#### `saveQuestionAnswer(question, parentQuestionId, shouldMarkParentCompleted): Observable<any>`
```
nếu !question hoặc !this.shiftTest?.id hoặc !this.student?.id → of(null)
studentAnswer = serializeStudentAnswer(question)
nếu !studentAnswer → of(null)

answerKey = questionKey(question)
nếu postedAnswerValues[answerKey] === studentAnswer:
    postedAnswerKeys[answerKey] = true
    nếu shouldMarkParentCompleted → markParentQuestionCompleted(parentQuestionId)
    of(null)

payload = buildShiftTestAnswerPayload(question)
return shiftTestAnswerService.addTnShiftTestAnswer(payload).pipe(
    map(result => {
        postedAnswerKeys[answerKey] = true
        postedAnswerValues[answerKey] = studentAnswer
        nếu shouldMarkParentCompleted → markParentQuestionCompleted(parentQuestionId)
        return result
    })
)
```

#### `saveCurrentQuestionAnswers(): void`
```
parent = currentParent
nếu !parent → return

parentQuestionId = completedQuestionId(parent)
shouldMarkParentCompleted = isCurrentParentComplete()

savableQuestions = [parent, ...parent.children].filter(q => q && serializeStudentAnswer(q))
nếu shouldMarkParentCompleted && savableQuestions.length === 0 → markParentQuestionCompleted(parentQuestionId)

nếu shouldRenderParentControl(parent) → saveQuestionAnswer(parent, ...).subscribe()
parent.children.forEach(child → saveQuestionAnswer(child, ...).subscribe())
```

#### `collectUnpostedAnswerRequests(): Observable<any>[]`
```
requests = []
parents.forEach(parent:
    parentQuestionId = completedQuestionId(parent)
    parentQuestions(parent).forEach(question:
        nếu !serializeStudentAnswer(question) → skip
        nếu postedAnswerValues[key] === serializeStudentAnswer(question) → skip
        requests.push(saveQuestionAnswer(question, parentQuestionId, false))
    )
    markParentQuestionCompleted(parentQuestionId)
)
return requests
```

#### `markParentQuestionCompleted(questionId: string): void`
```
nếu !questionId hoặc đã có trong completedQuestionIds → return
completedQuestionIds.push(questionId)
updateShiftTestStateProgress()
```

#### `completedQuestionId(question: StudentQuestionView): string`
```
return (question.bank_question_id || question.id || '').toString()
```

### 8.3 State Management

#### `createShiftTestState(): void`
```
nếu !shiftTest?.id hoặc !student?.id → return
payload = buildShiftTestStatePayload()
shiftTestStateService.addTnShiftTestState(payload).subscribe({
    next: state => {
        applyShiftTestStateResponse(state)
        lastPostedStateSignature = buildStateSignature(payload)
        lastSyncedTimeLeft = payload.time_left
        lastTimeLeftSyncAt = Date.now()
        nếu !shiftTestStateId:
            progressUpdatePending = true
            return
        nếu progressUpdatePending || completedQuestionIds.length:
            updateShiftTestStateProgress()
    }
})
```

#### `buildShiftTestStatePayload(): TnShiftTestState`
```
return {
    shift_test_id: this.shiftTest.id,
    student_id: this.student.id,
    skill: this.selectedSkill,
    progress: this.completedQuestionIds.join(','),
    duration: this.skillDurationSeconds(),
    time_left: this.examTimeLeftSeconds,
    completed: this.completedQuestionIds.length
}
```

#### `updateShiftTestStateProgress(syncType: 'progress' | 'timer' = 'progress'): void`
```
nếu !shiftTestStateId:
    progressUpdatePending = true
    return

progressUpdatePending = false
payload = buildShiftTestStatePayload()
signature = buildStateSignature(payload)
nếu signature === lastPostedStateSignature → return

shiftTestStateService.updateTnShiftTestState(shiftTestStateId, payload).subscribe({
    next: state => {
        lastPostedStateSignature = signature
        markTimeLeftSynced(payload.time_left)
        applyShiftTestStateResponse(state)
    },
    error: () => {
        nếu syncType === 'progress' → progressUpdatePending = true
    }
})
```

#### `buildStateSignature(payload: TnShiftTestState): string`
```
return [payload.progress || '', payload.completed || 0, payload.time_left ?? ''].join('|')
```

#### `applyShiftTestStateResponse(state: any): void`
```
nếu null/undefined → return
nếu number hoặc string → shiftTestStateId = Number(state) || shiftTestStateId
nếu object:
    shiftTestStateId = state.id || shiftTestStateId
    currentShiftTestState = { ...currentShiftTestState, ...state, id: shiftTestStateId }
```

### 8.4 Navigation

#### `setActiveParent(index: number, source: 'menu' | 'next' | 'previous' = 'menu'): void`
```
nếu index ngoài bounds → return
nếu đang recording → return (không cho chuyển câu)
nếu source = 'menu' && !canSelectMenuQuestion(index) → return

isMovingForward = index > currentParentIndex
nếu isMovingForward && !isCurrentParentComplete():
    // Hiển thị warning
    incompleteCurrentPageWarning = 'Bạn cần trả lời...'
    return

incompleteCurrentPageWarning = ''
nếu canOpenQuestionPanel() → questionPanelUnlocked = true
saveCurrentQuestionAnswers()        // Lưu câu hiện tại trước khi chuyển
cleanupActiveRecordQuestion()       // Dọn recording cũ
currentParentIndex = index
nếu canSubmitSkillTest() → questionPanelUnlocked = true
markActiveParentSeen()
prepareActiveRecordQuestion()       // Chuẩn bị recording mới (nếu có)
```

#### `previousParent(): void` → `setActiveParent(currentParentIndex - 1, 'previous')`
#### `nextParent(): void` → `setActiveParent(currentParentIndex + 1, 'next')`

#### `handleNextAction(): void`
```
nếu canSubmitSkillTest() → submitConfirmVisible = true; return
không → nextParent()
```

#### `canSelectMenuQuestion(index: number): boolean`
```
nếu index <= currentParentIndex → true (có thể quay lại câu cũ)
Duyệt từ 0 đến index-1:
    nếu i === currentParentIndex:
        nếu !isCurrentParentComplete() → false
    ngược lại:
        nếu completedQuestionIds không chứa completedQuestionId(parents[i]) → false
return true
```

#### `canSubmitSkillTest(): boolean`
```
return isLastParent() && isAllQuestionsAnswered()
```
(Là câu cuối cùng VÀ tất cả các câu đã được trả lời)

#### `isAllQuestionsAnswered(): boolean`
```
return parents.every(parent => parentQuestions(parent).every(question => isQuestionAnswered(question)))
```

#### `isCurrentParentComplete(): boolean`
```
questions = currentParentQuestions()
return questions.length === 0 || questions.every(q => isQuestionAnswered(q))
```

#### `parentQuestions(parent: StudentQuestionView): StudentQuestionView[]`
```
nếu !parent → []
khởi tạo questions = []
nếu shouldRenderParentControl(parent) && isAnswerableQuestion(parent) → thêm parent
thêm các children lọc theo isAnswerableQuestion
return questions
```

#### `isAnswerableQuestion(question: StudentQuestionView): boolean`
```
return !!question && (
    question_type === 'radio' || isSelectQuestion() || isParagraphQuestion()
    || isInputboxQuestion() || isTextareaQuestion() || isRecordQuestion()
)
```

#### `isQuestionAnswered(question: StudentQuestionView): boolean`
```
nếu !question → true
nếu record → isRecordQuestionAnswered(question)
nếu paragraph → isParagraphQuestionAnswered(question)
không → !isAnswerEmpty(answerValue(question))
```

#### `isParagraphQuestionAnswered(question: StudentQuestionView): boolean`
```
options = paragraphOptions(question)
nếu options.length === 0 → true
placed = paragraphPlacedOptions(question)
return placed.length === options.length && placed.every(Boolean)
```

#### `isRecordQuestionAnswered(question: StudentQuestionView): boolean`
```
state = recordState(question)
nếu state.phase đang preparing/recording/uploading/error → false
answer = answerValue(question)
return !!answer?.fileId || !!answer?.fileName || !!answer?.filePath || state?.phase === 'uploaded'
```

#### `isAnswerEmpty(value: any): boolean`
```
null/undefined → true
string trim rỗng → true
array length 0 → true
object không có keys → true
còn lại → false
```

### 8.5 Question Type Checks

#### `shouldRenderParentControl(parent: StudentQuestionView): boolean`
```
nếu !parent → false
nếu textarea question && có children → false (textarea chỉ ở child level)
nếu record question && có children → false (record chỉ ở child level)
return hasAnswerOptions() || isTextareaQuestion() || isInputboxQuestion() || isRecordQuestion()
```
→ Parent chỉ có control riêng nếu nó là question thực sự (không chỉ là container cho children)

#### `hasAnswerOptions(question: StudentQuestionView): boolean`
```
return !!question && Array.isArray(question.answer_option) && question.answer_option.length !== 0
```

#### `isSelectQuestion(question): boolean`
→ `question_type === 'select' || question_type === 'selectbox'`

#### `isParagraphQuestion(question): boolean`
→ `question_type === 'paragraph'`

#### `isRecordQuestion(question): boolean`
→ `question_type === 'record'`

#### `isTextareaQuestion(question): boolean`
→ `question_type === 'textarea'`

#### `isInputboxQuestion(question): boolean`
→ `question_type === 'inputbox'`

#### `hasSelectMarker(questionDirection: string): boolean`
```
text = normalizeSelectMarkerText(questionDirection)
return text.indexOf('[[SELECT]]') !== -1 || text.indexOf('[[SELECT-BLOCK]]') !== -1
```

#### `hasSelectBlockMarker(questionDirection: string): boolean`
→ `questionDirection.indexOf('[[SELECT-BLOCK]]') !== -1`

#### `normalizeSelectMarkerText(questionDirection: string): string`
→ remove HTML tags, remove spaces, UPPERCASE

### 8.6 Recording System (chi tiết nhất)

#### `recordState(question: StudentQuestionView): RecordQuestionState`
```
key = questionKey(question)
nếu chưa có recordStates[key]:
    hydrateRecordStateFromAnswer(question)  // Khôi phục từ answer đã lưu
return recordStates[key] || null
```

#### `hydrateRecordStateFromAnswer(question: StudentQuestionView): void`
```
key = questionKey(question)
answer = answerValue(question)
nếu answer không có fileId/fileName/filePath → return
recordStates[key] = {
    phase: 'uploaded',
    prepareLeft: 0,
    speakingLeft: 0,
    uploadResult: answer
}
```
→ Cho phép khôi phục trạng thái "đã upload" khi quay lại câu hỏi

#### `prepareRecordQuestion(question: StudentQuestionView): void`
```
key = questionKey(question)
nếu recordStates[key] tồn tại và phase không phải idle/error → return (đang xử lý rồi)

prepareTime = recordPrepareSeconds(question) // Mặc định 0
recordStates[key] = {
    phase: 'preparing',
    prepareLeft: prepareTime,
    speakingLeft: recordSpeakingSeconds(question) // Mặc định 30
}

nếu prepareTime <= 0:
    playBeepAndStartRecording(question) // Không cần đếm ngược prepare
    return

startPrepareCountdown(question) // Bắt đầu đếm ngược prepare
```

#### `recordPrepareSeconds(question: StudentQuestionView): number`
→ `Number(question?.params?.prepare) > 0 ? prepare : 0`

#### `recordSpeakingSeconds(question: StudentQuestionView): number`
→ `Number(question?.params?.time) > 0 ? speaking : 30`

#### `startPrepareCountdown(question: StudentQuestionView): void`
```
key = questionKey(question)
clearRecordTimer(key)

setInterval 1s:
    nếu phase !== 'preparing' → clear, return
    prepareLeft -= 1
    nếu prepareLeft <= 0:
        clear timer
        playBeepAndStartRecording(question)
```

#### `playBeepAndStartRecording(question: StudentQuestionView): void`
→ Gọi `startRecording(question)` (hiện tại không play beep riêng, beep được play trong startRecording)

#### `playBeepSound(): Promise<void>`
```
return new Promise(resolve => {
    try {
        nếu !beepAudioUrl → tạo WAV với generateBeepWavUrl(880, 0.2, 1)
        audio = new Audio(beepAudioUrl)
        audio.volume = 1
        playPromise = audio.play()
        nếu playPromise:
            playPromise.then(() => setTimeout(resolve, 250)).catch(() => resolve())
        không: setTimeout(resolve, 250)
    } catch { resolve() }
})
```

#### `generateBeepWavUrl(frequency: number, duration: number, volume: number): string`
```
Tạo WAV file in-memory:
  sampleRate = 8000
  numSamples = sampleRate * duration
  Tạo ArrayBuffer 44 + numSamples bytes
  Ghi RIFF header (WAV format)
  Ghi fmt chunk (PCM, mono, 8-bit)
  Ghi data chunk (samples)
  Với mỗi sample:
    t = i / sampleRate
    sample = sin(2 * PI * frequency * t) * volume
    fade: 100 samples đầu fade in, 100 samples cuối fade out
  Tạo Blob → URL.createObjectURL
```

#### `startRecording(question: StudentQuestionView): void`
```
key = questionKey(question)
state = recordStates[key]
nếu !state hoặc phase đang 'recording' → return

state.phase = 'recording'
state.error = ''

// Tính delay trước khi beep (tránh beep quá gần nhau)
now = Date.now()
timeSinceLastBeep = now - lastBeepTime
delay = timeSinceLastBeep < 3000 ? 3000 - timeSinceLastBeep : 500

setTimeout delay:
    playBeepSound().then(() => {
        lastBeepTime = Date.now()
        setTimeout 200ms:
            recorder = new MicRecorder({ bitRate: 128 })
            recorders[key] = recorder
            recorder.start().then(() => {
                startSpeakingIndicator(question)  // Phân tích âm thanh realtime
                startSpeakingCountdown(question)  // Đếm ngược thời gian nói
            }).catch(() => {
                state.phase = 'error'
                state.error = 'Không thể truy cập microphone.'
            })
    })
```
→ **Timing:** beep → 200ms → recording bắt đầu

#### `startSpeakingCountdown(question: StudentQuestionView): void`
```
key = questionKey(question)
state = recordStates[key]
clearRecordTimer(key)

nếu !state hoặc speakingLeft <= 0:
    stopRecording(...)
    return

setInterval 1s:
    nếu phase !== 'recording' → clear, return
    speakingLeft -= 1
    nếu speakingLeft <= 0:
        clear
        stopRecording(...)
```

#### `startSpeakingIndicator(question: StudentQuestionView): void`
```
key = questionKey(question)
state = recordStates[key]
nếu !state hoặc !navigator.mediaDevices?.getUserMedia → return

stopSpeakingIndicator(key)  // Dọn cũ nếu có

navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    AudioContextCtor = window.AudioContext || webkitAudioContext
    nếu không có → stop tracks, return

    audioContext = new AudioContextCtor()
    analyser = audioContext.createAnalyser()
    analyser.fftSize = 256
    audioContext.createMediaStreamSource(stream).connect(analyser)
    data = new Uint8Array(analyser.frequencyBinCount)

    recordAudioContexts[key] = audioContext
    recordAudioStreams[key] = stream

    // Vòng lặp detect speaking
    function detectSpeaking():
        nếu state.phase !== 'recording':
            stopSpeakingIndicator(key)
            return
        analyser.getByteFrequencyData(data)
        average = data.reduce((a,b) => a+b, 0) / data.length
        state.isSpeaking = average > 12   // Threshold
        recordAudioAnimationFrames[key] = requestAnimationFrame(detectSpeaking)

    detectSpeaking()
}).catch(() => null)
```
→ Dùng **AnalyserNode** để detect volume trung bình > 12 → bật/tắt `isSpeaking` → CSS pulse animation

#### `stopSpeakingIndicator(key: string): void`
```
cancelAnimationFrame(recordAudioAnimationFrames[key])
stop tất cả tracks của recordAudioStreams[key]
close recordAudioContexts[key]
set state.isSpeaking = false
```

#### `stopRecording(question, activeParentKey, parentQuestionId): void`
```
key = questionKey(question)
state = recordStates[key]
recorder = recorders[key]
nếu !state hoặc !recorder → return

stopSpeakingIndicator(key)
state.phase = 'recorded'

recorder.stop().getMp3().then(([buffer, blob]) => {
    createdAt = Date.now()
    file = new File(buffer, `record-${key}-${createdAt}.mp3`, { type: blob.type })
    nếu state.audioUrl → URL.revokeObjectURL(state.audioUrl)
    state.file = file
    state.audioUrl = URL.createObjectURL(file)
    uploadRecording(question, file, activeParentKey, parentQuestionId)
}).catch(() => {
    state.phase = 'error'
    state.error = 'Không thể lưu file ghi âm.'
})
```

#### `uploadRecording(question, file, activeParentKey, parentQuestionId, retryCount = 0): void`
```
key = questionKey(question)
state = recordStates[key]
nếu !state → return
state.phase = 'uploading'

fileService.uploadFileAwsWidthProgress(file, 'student_record').subscribe({
    next: upload => {
        nếu upload.state !== 'DONE' → return
        uploadedFile = upload.content?.data?.[0]
        nếu !uploadedFile?.id:
            nếu retryCount < 2 → retry sau 1.5s
            không → state.phase = 'error'; state.error = 'Upload failed'
            return

        updateLocalAnswer(question, {
            fileId: uploadedFile.id,
            fileName: file.name,
            filePath: uploadedFile.id,
            mimeType: file.type,
            duration: recordSpeakingSeconds(question),
            questionKey: key
        })

        saveQuestionAnswer(question, parentQuestionId, false).subscribe({
            next: () => {
                state.phase = 'uploaded'
                state.uploadResult = uploadedFile
                nếu state.audioUrl → URL.revokeObjectURL(state.audioUrl)
                state.audioUrl = buildAwsFileUrl(uploadedFile.id)
                nếu đang ở câu hỏi này → setTimeout prepareActiveRecordQuestion 2s
            },
            error: () => {
                nếu retryCount < 2 → retry sau 1.5s
                không → delete localAnswers[key]; state.phase = 'error'; ...
            }
        })
    },
    error: () => {
        nếu retryCount < 2 → retry 1.5s
        không → state.phase = 'error'; state.error = 'Upload file ghi âm thất bại.'
    }
})
```
→ **Retry 2 lần** nếu upload thất bại

#### `retryRecordQuestion(question: StudentQuestionView): void`
```
key = questionKey(question)
state = recordStates[key]
nếu còn file → xóa error, upload lại (gọi uploadRecording)
không → gọi prepareRecordQuestion(question) từ đầu
```

#### `canSubmitRecordEarly(question: StudentQuestionView): boolean`
```
state = recordState(question)
return state?.phase === 'recording' && recordSpeakingSeconds(question) - state.speakingLeft >= 20
```
→ Cho phép submit sớm nếu đã nói >= 20s

#### `submitRecordEarly(question: StudentQuestionView): void`
```
key = questionKey(question)
state = recordStates[key]
nếu !state hoặc phase !== 'recording' → return
clearRecordTimer(key)
stopRecording(question, activeParentKey, parentQuestionId)  // stop và upload
```

#### `cleanupActiveRecordQuestion(): void`
```
parent = currentParent
nếu !parent → return
cleanupRecordQuestion(parent, parentKey, parentQuestionId)
parent.children.filter(isRecordQuestion).forEach(child => cleanupRecordQuestion(child, ...))
```

#### `cleanupRecordQuestion(question, activeParentKey, parentQuestionId): void`
```
nếu !question hoặc !isRecordQuestion → return
key = questionKey(question)
clearRecordTimer(key)
nếu phase === 'preparing' → phase = 'idle' (hủy prepare)
nếu phase === 'recording' && có recorder → stopRecording(...)
```

#### `onAudioLoadError(question: StudentQuestionView): void`
→ Set `state.audioLoadFailed = true`

#### `reloadAudio(question: StudentQuestionView): void`
→ Clear `audioLoadFailed`, set `audioUrl = buildAwsFileUrl(uploadResult.id) + '&t=' + Date.now()`
→ Thêm timestamp để bypass cache

#### `buildAwsFileUrl(fileId: number | string): string`
```
url = new URL(getLinkDownload_aws(fileId.toString()))
url.searchParams.set('token', auth.accessToken)
return url.toString()
```

### 8.7 Paragraph Drag-Drop

#### `dropParagraphAnswer(question: StudentQuestionView, event: CdkDragDrop): void`
```
placed = paragraphPlacedOptions(question)
bankId = paragraphBankListId(question)
targetIndex = paragraphSlotIndexFromListId(question, event.container.id)
previousIndex = paragraphSlotIndexFromListId(question, event.previousContainer.id)

// CHỈ cho phép kéo từ bank (phải) vào slot trống (trái)
nếu previousContainer.id !== bankId → return (chỉ kéo từ bank)
nếu targetIndex === -1 → return (không phải slot hợp lệ)

dragged = event.item.data
nếu !dragged → return

nếu placed[targetIndex] đã có → return (không ghi đè slot đã fill)
nếu previousIndex !== -1 → return (không kéo từ slot vào slot)

placed[targetIndex] = dragged
updateParagraphAnswerFromPlaced(question, placed)
```

#### `paragraphOptions(question: StudentQuestionView): Answer[]`
```
options = [...question.answer_option] || []
optionIds = new Set(options.map(o => String(o.id)))
correctOptions = Array.isArray(question.answer_correct) ? question.answer_correct : []

// Merge answer_correct vào options nếu chưa có
correctOptions.forEach(item => {
    nếu !item hoặc !item.id → return
    nếu optionIds đã có String(item.id) → return (tránh duplicate)
    options.push({ id: item.id, value: item.value })
    optionIds.add(String(item.id))
})

return options
```

#### `paragraphSlotCount(question: StudentQuestionView): number`
→ `max(paragraphOptions().length, answer_correct.length)`

#### `paragraphPlacedOptions(question: StudentQuestionView): (Answer | null)[]`
```
options = paragraphOptions(question)
slotCount = paragraphSlotCount(question)
optionMap = new Map(options.map(o => [String(o.id), o]))
savedIds = paragraphAnswerIds(question)
placed = savedIds.map(id => optionMap.get(id) || null)

// Fill null đến đủ slotCount
while (placed.length < slotCount) placed.push(null)

return placed.slice(0, slotCount)
```

#### `paragraphAvailableOptions(question: StudentQuestionView): Answer[]`
```
placedIds = paragraphAnswerIds(question).filter(Boolean)
return paragraphOptions(question).filter(option => !placedIds.includes(String(option.id)))
```

#### `removeParagraphAnswer(question: StudentQuestionView, index: number): void`
```
placed = paragraphPlacedOptions(question)
nếu index ngoài bounds → return
placed[index] = null
updateParagraphAnswerFromPlaced(question, placed)
```

#### `paragraphAnswerIds(question: StudentQuestionView): string[]`
→ `(answerValue(question) || '').toString().split('|')` — đáp án lưu dạng "id1|id2|id3"

#### `updateParagraphAnswerFromPlaced(question, placed: (Answer | null)[]): void`
→ `value = placed.map(o => o ? String(o.id) : '').join('|').replace(/\|+$/, '')`
→ `updateLocalAnswer(question, value)`

#### `paragraphSlotListId(question, index: number): string`
→ `${questionKey(question)}-paragraph-slot-${index}`.replace(/[^a-zA-Z0-9_-]/g, '-')

#### `paragraphSlotListIds(question: StudentQuestionView): string[]`
→ Map các index → `paragraphSlotListId(question, index)`

#### `paragraphBankListId(question: StudentQuestionView): string`
→ `${questionKey(question)}-paragraph-bank`.replace(/[^a-zA-Z0-9_-]/g, '-')

#### `paragraphSlotsListId(question: StudentQuestionView): string`
→ `${questionKey(question)}-paragraph-slots`.replace(/[^a-zA-Z0-9_-]/g, '-')

#### `paragraphConnectedListIds(question: StudentQuestionView): string[]`
→ `[paragraphBankListId(question), ...paragraphSlotListIds(question)]`

#### `paragraphSlotIndexFromListId(question, listId: string): number`
→ `paragraphSlotListIds(question).indexOf(listId)`

### 8.8 Select Box

#### `getSelectQuestionParts(questionDirection: string): string[]`
```
marker = '[[SELECT]]'
text = questionDirection
    .replace(/<\/p>\s*<p>/g, ' ')   // Nối các đoạn p
    .replace(/^\s*<p>/, '')          // Xóa mở đầu <p>
    .replace(/<\/p>\s*$/, '')        // Xóa kết thúc </p>
index = text.indexOf(marker)
nếu không tìm thấy → [text, '']
return [text.slice(0, index), text.slice(index + marker.length)]  // [trước marker, sau marker]
```

#### `getSelectBlockContent(questionDirection: string): string`
```
return questionDirection
    .replace(/\[\[SELECT-BLOCK\]\]/g, '')
    .replace(/^\s*<p>\s*<\/p>/, '')
    .trim()
```

### 8.9 Security System

#### `activateExamSecurity(): void`
```
nếu examSecurityActive → return
examSecurityActive = true

// Attach tất cả event listeners
document.addEventListener('copy', preventExamInteraction, true)
document.addEventListener('cut', preventExamInteraction, true)
document.addEventListener('paste', preventExamInteraction, true)
document.addEventListener('contextmenu', preventExamInteraction, true)
document.addEventListener('selectstart', preventExamInteraction, true)
document.addEventListener('dragstart', preventExamInteraction, true)
document.addEventListener('keydown', preventExamShortcut, true)
document.addEventListener('visibilitychange', handleVisibilityChange, true)
document.addEventListener('fullscreenchange', handleFullscreenChange, true)
window.addEventListener('resize', handleWindowResize, true)

// Bắt đầu check DevTools
checkDevToolsState()
devToolsCheckTimer = setInterval(() => checkDevToolsState(), 1000)

// Bật fullscreen
enterFullscreen()
```

#### `deactivateExamSecurity(): void`
```
nếu !examSecurityActive → return
examSecurityActive = false

// Remove tất cả event listeners
document.removeEventListener('copy', preventExamInteraction, true)
document.removeEventListener('cut', preventExamInteraction, true)
document.removeEventListener('paste', preventExamInteraction, true)
document.removeEventListener('contextmenu', preventExamInteraction, true)
document.removeEventListener('selectstart', preventExamInteraction, true)
document.removeEventListener('dragstart', preventExamInteraction, true)
document.removeEventListener('keydown', preventExamShortcut, true)
document.removeEventListener('visibilitychange', handleVisibilityChange, true)
document.removeEventListener('fullscreenchange', handleFullscreenChange, true)
window.removeEventListener('resize', handleWindowResize, true)

// Dừng check DevTools
nếu devToolsCheckTimer → clearInterval, set null

// Thoát fullscreen nếu đang ở fullscreen
nếu document.fullscreenElement → document.exitFullscreen()
```

#### `preventExamInteraction(event: Event): void`
→ `event.preventDefault()`

#### `preventExamShortcut(event: KeyboardEvent): void`
```
key = event.key.toLowerCase()
blocked =
    (event.ctrlKey && ['a', 'c', 'p', 's', 'u', 'v', 'x'].includes(key)) ||
    (event.ctrlKey && event.shiftKey && ['i', 'j'].includes(key)) ||
    key === 'f12'

nếu blocked:
    event.preventDefault()
    event.stopPropagation()
    showSecurityWarning('...')
```

#### `handleVisibilityChange = (): void`
```
nếu examSecurityActive && document.hidden:
    showSecurityWarning('Bạn vừa rời khỏi tab làm bài...')
```

#### `handleFullscreenChange = (): void`
```
nếu examSecurityActive && !document.fullscreenElement:
    showSecurityWarning('Bạn đã thoát chế độ toàn màn hình...')
```

#### `handleWindowResize = (): void`
→ `checkDevToolsState()`

#### `isDevToolsOpen(): boolean`
```
widthGap = Math.abs(window.outerWidth - window.innerWidth)
heightGap = Math.abs(window.outerHeight - window.innerHeight)
return widthGap > 120 || heightGap > 120
```
→ Phát hiện DevTools bằng cách đo chênh lệch outer vs inner window size

#### `checkDevToolsState(): void`
```
nếu !examSecurityActive → return
detected = isDevToolsOpen()
nếu detected && !devToolsDetected:
    devToolsDetected = true
    showSecurityWarning('Bạn đang mở công cụ trình duyệt...')
nếu !detected:
    devToolsDetected = false
```

#### `enterFullscreen(): async Promise<void>`
```
nếu đã fullscreen || không hỗ trợ requestFullscreen → return
try { await document.documentElement.requestFullscreen() }
catch { showSecurityWarning('Trình duyệt chưa cho phép vào toàn màn hình...') }
```

#### `continueFullscreen(): void`
→ `securityWarningVisible = false` + `enterFullscreen()`

#### `showSecurityWarning(message: string): void`
```
nếu đang hiển thị cùng message → return (tránh spam)
violationCount += 1
securityWarningMessage = message
securityWarningVisible = true
```

### 8.10 Submission & Score

#### `submitSkillTest(force = false): void`
```
nếu !shiftTest?.id || submitting → return
nếu !force && !canSubmitSkillTest() → return

submitting = true
incompleteCurrentPageWarning = ''
notificationService.loadingAnimationV2(...)

requests = collectUnpostedAnswerRequests()
saveAnswers = requests.length ? forkJoin(requests) : of([])

saveAnswers.pipe(
    switchMap(() => shiftTestService.scoreShiftTest(shiftTest.id, selectedSkill)),
    finalize(() => { submitting = false; disableLoadingAnimation() })
).subscribe({
    next: scoreResult => {
        allowLeaveExam = true
        clearExamSessionActive()
        showScoreResult(scoreResult)
    },
    error: () => message = 'Không thể nộp bài...'
})
```

#### `showScoreResult(scoreResult: any): void`
```
point = null
nếu scoreResult là number → point = scoreResult
nếu scoreResult là string → parse Number, nếu NaN thì null
nếu scoreResult là object:
    raw = scoreResult.point ?? scoreResult.last_point ?? scoreResult.raw_point
    point = raw !== null ? Number(raw) : null

skill = selectedSkill.toLowerCase()
scoreResultData = { skill, point, band: calcSkillBand(skill, point), raw: scoreResult }
scoreResultVisible = true
```

#### `calcSkillBand(skill: string, point: number | null): string`
```
nếu point === null/NaN → ''
bands = {
    listening: { A1: 8, A2: 16, B1: 24, B2: 34, C: 42 },
    reading:   { A1: 8, A2: 16, B1: 26, B2: 38, C: 46 },
    writing:   { A1: 6, A2: 18, B1: 26, B2: 40, C: 48 },
    speaking:  { A1: 4, A2: 16, B1: 26, B2: 41, C: 48 }
}
b = bands[skill]; nếu !b → ''
nếu point >= b.C → 'C'
nếu point >= b.B2 → 'B2'
nếu point >= b.B1 → 'B1'
nếu point >= b.A2 → 'A2'
nếu point >= b.A1 → 'A1'
không → 'Chưa đạt A1'
```

#### `closeScoreResult(): void`
→ `scoreResultVisible = false` + `router.navigate(['/student/ca-thi-cua-ban', shiftId])`

#### `skillResultLabel(skill: string): string`
→ Map: 'listening'→'Listening', 'reading'→'Reading', 'writing'→'Writing', 'speaking'→'Speaking', 'core'→'Core'

### 8.11 Exam Countdown

#### `startExamCountdown(): void`
```
clearExamCountdown()
examTimeLeftSeconds = skillDurationSeconds()  // duration * 60 seconds
nếu examTimeLeftSeconds <= 0 → return (không giới hạn thời gian)

examCountdownTimer = setInterval 1s:
    examTimeLeftSeconds = max(0, examTimeLeftSeconds - 1)
    syncTimeLeftToState()
    nếu examTimeLeftSeconds <= 0:
        syncTimeLeftToState(true)
        clearExamCountdown()
        incompleteCurrentPageWarning = 'Đã hết thời gian làm bài.'
        submitSkillTest(true)  // Auto submit khi hết giờ
```

#### `clearExamCountdown(): void`
→ Clear `examCountdownTimer`

#### `syncTimeLeftToState(force = false): void`
```
nếu !shiftTestStateId → return
timeLeft = max(0, examTimeLeftSeconds)
nếu !force && lastSyncedTimeLeft === timeLeft → return (không thay đổi)
nếu !force && (now - lastTimeLeftSyncAt < 15000) → return (debounce 15s)
updateShiftTestStateProgress('timer')
```

#### `skillDurationSeconds(): number`
→ `Math.max(0, Math.floor(Number(skillDurationValue) || 0) * 60)`

#### `resolveSkillDuration(formDetails: TnFormDetail[]): number`
```
detail = formDetails.find(item => item.skill.toLowerCase() === selectedSkill)
return Number(detail?.time) || 0
```

#### `get countdownDisplay(): string`
```
totalSeconds = max(0, examTimeLeftSeconds)
hours = floor(totalSeconds / 3600)
minutes = floor(totalSeconds % 3600 / 60)
seconds = totalSeconds % 60
nếu hours > 0 → HH:MM:SS
không → MM:SS
```

#### `get countdownWarning(): boolean`
→ `examTimeLeftSeconds > 0 && examTimeLeftSeconds <= 60` — cảnh báo đỏ khi còn <= 60s

### 8.12 Shuffle

#### `shuffleAnswerOptions(question: StudentQuestionView): Answer[]`
```
options = [...question.answer_option] || []
nếu options.length <= 1 → return
Fisher-Yates shuffle:
    for i từ length-1 xuống 1:
        randomIndex = floor(Math.random() * (i + 1))
        swap options[i] và options[randomIndex]
return options
```

#### `applyAnswerOptionShuffle(question: StudentQuestionView): void`
```
nếu !question → return
nếu question.answer_option.length > 1 → question.answer_option = shuffleAnswerOptions(question)
question.children.forEach(child → applyAnswerOptionShuffle(child))
```

#### `applyAnswerOptionShuffleToParents(parents: StudentQuestionView[]): void`
→ `parents.forEach(parent => applyAnswerOptionShuffle(parent))`

### 8.13 Reload Detection

#### `examSessionKey(): string`
→ `'student_exam_active_${shiftId}_${routeShiftTestId}_${selectedSkill}'`

#### `markExamSessionActive(): void`
→ `sessionStorage.setItem(examSessionKey(), 'active')`

#### `clearExamSessionActive(): void`
→ `sessionStorage.removeItem(examSessionKey())`

#### `isReloadNavigation(): boolean`
```
navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
return navigation?.type === 'reload' || performance.navigation?.type === 1
```

#### `handleReloadDuringExam(): boolean`
```
active = sessionStorage.getItem(examSessionKey()) === 'active'
nếu !active || !isReloadNavigation() → false

// Nếu reload trong khi thi → redirect về detail + cảnh báo
clearExamSessionActive()
notificationService.toastWarning('Bạn đã tải lại trang trong khi làm bài...')
router.navigate(['/student/ca-thi-cua-ban', shiftId])
return true
```

### 8.14 Image Error Handling (ngAfterViewChecked)

#### `attachImageErrorHandlers(): void`
```
container = elRef.nativeElement
images = container.querySelectorAll('.question-direction img:not([data-error-handled])')
images.forEach(img => {
    img.setAttribute('data-error-handled', '1')
    img.onerror = () => {
        nếu đã có img-reload-btn trong parent → return

        img.style.display = 'none'
        wrapper = document.createElement('div')
        wrapper.className = 'img-error-wrapper'
        wrapper.innerHTML = '<span class="img-error-text"><i class="pi pi-exclamation-triangle"></i> Lỗi tải hình</span>'

        btn = document.createElement('button')
        btn.type = 'button'
        btn.className = 'img-reload-btn'
        btn.innerHTML = '<i class="pi pi-refresh"></i> Tải lại'
        btn.onclick = () => {
            wrapper.remove()
            img.style.display = ''
            img.removeAttribute('data-error-handled')
            img.src = img.src  // Force reload
        }

        wrapper.appendChild(btn)
        img.parentElement.insertBefore(wrapper, img.nextSibling)
    }
})
```
→ Chạy mỗi lần AfterViewChecked, chỉ xử lý ảnh chưa có `data-error-handled`

### 8.15 Utility Methods

| Method | Logic |
|---|---|
| `skillLabel(skill)` | Map skill → chữ hoa đầu (Listening/Reading/...) |
| `echoPart(part)` | Format part: 10→"1", 11→"1.1", 20→"2" |
| `trustHtml(value)` | Return value || '' |
| `questionKey(question)` | `question?._viewKey || buildQuestionKey(question, 0)` |
| `questionDomId(question)` | `'student-question-parent-' + questionKey(question)` |
| `questionStatus(question)` | `localAnswers[key] ? 'Attempted' : 'Not Attempted'` |
| `hasSeenQuestion(index)` | `seenQuestionKeys[questionKey(parents[index])]` |
| `partQuestionCount(parent)` | `parent.children?.length || (hasAnswerOptions(parent) ? 1 : 0)` |
| `getGroupedByPart()` | Map parents → PartGroup[], sort by part, set `_globalIndex` |
| `togglePartCollapse(part)` | `collapsedParts[part] = !collapsedParts[part]` |
| `isPartCollapsed(part)` | `!!collapsedParts[part]` |
| `toggleBookmark(question)` | Toggle `bookmarkedKeys[questionKey(question)]` |
| `isBookmarked(question)` | `!!bookmarkedKeys[questionKey(question)]` |
| `get bookmarkedCount` | `Object.keys(bookmarkedKeys).filter(k => bookmarkedKeys[k]).length` |
| `setQuestionPanelOpen(open)` | Nếu open → `questionPanelUnlocked = true`; set `questionPanelOpen` |
| `canOpenQuestionPanel()` | `questionPanelUnlocked || canSubmitSkillTest()` |
| `answerWordCount(question)` | `(localAnswers[key] || '').trim() ? split(/\s+/).length : 0` |
| `getListeningReplayCount()` | Nếu skill=Listening → `Number(shift?.listening_count)` > 0 ? count : -1 |
| `trackByQuestion(index, question)` | `question.id || question.bank_question_id || index` |
| `trackByPart(index, group)` | `group.part` |
| `markActiveParentSeen()` | Set `seenQuestionKeys[questionKey(currentParent)] = true` |
| `resetTimeLeftSyncTracking()` | `lastSyncedTimeLeft = null; lastTimeLeftSyncAt = 0` |
| `markTimeLeftSynced(timeLeft)` | `lastSyncedTimeLeft = timeLeft; lastTimeLeftSyncAt = Date.now()` |
| `skillDuration()` | Return `this.skillDurationValue` |

### 8.16 ngOnDestroy — Cleanup

```typescript
ngOnDestroy(): void {
    this.devtoolsService.stopDetection();

    if (this.allowLeaveExam) {
        this.clearExamSessionActive();  // Chỉ xóa session nếu được phép (đã submit)
    }

    this.deactivateExamSecurity();      // Remove all event listeners, exit fullscreen
    this.clearExamCountdown();          // Clear countdown timer

    // Dừng tất cả speaking indicators
    Object.keys(this.recordAudioAnimationFrames).forEach(key => this.stopSpeakingIndicator(key));

    // Clear tất cả record timers
    Object.keys(this.recordTimers).forEach(key => this.clearRecordTimer(key));

    // Stop tất cả recorders đang recording
    Object.keys(this.recorders).forEach(key => {
        if (this.recordStates[key]?.phase === 'recording') {
            this.recorders[key].stop().getMp3().catch(() => null);
        }
    });

    // Revoke tất cả audio URLs
    Object.keys(this.recordStates).forEach(key => {
        if (this.recordStates[key].audioUrl) {
            URL.revokeObjectURL(this.recordStates[key].audioUrl);
        }
    });
}
```

---

## 9. HTML TEMPLATE — CHI TIẾT TỪNG ELEMENT

### 9.1 Security Overlay (dòng 1-9)

```html
<!-- Overlay bảo mật — hiện khi vi phạm -->
<div class="exam-security-overlay" *ngIf="securityWarningVisible">
    <div class="exam-security-dialog">
        <i class="pi pi-exclamation-triangle"></i>
        <h2>Cảnh báo bảo mật</h2>
        <p>{{ securityWarningMessage }}</p>         <!-- Nội dung warning động -->
        <small>Số lần cảnh báo: {{ violationCount }}</small>
        <button type="button" class="exam-security-button"
                (click)="continueFullscreen()">
            Tiếp tục làm bài toàn màn hình
        </button>
    </div>
</div>
```

### 9.2 Exit Confirm Dialog (dòng 11-21)

```html
<div class="submit-confirm-overlay exit-confirm-overlay" *ngIf="exitConfirmVisible">
    <div class="submit-confirm-dialog exit-confirm-dialog">
        <i class="pi pi-exclamation-triangle"></i>
        <h2>Xác nhận rời khỏi bài thi</h2>
        <p>Bạn có chắc chắn thoát khỏi bài thi? Khi thoát, bạn không thể làm lại bài thi này.</p>
        <div class="submit-confirm-actions">
            <button type="button" class="submit-confirm-button submit-confirm-button--secondary"
                    (click)="cancelExitExam()">Tiếp tục làm bài</button>
            <button type="button" class="submit-confirm-button submit-confirm-button--primary exit-confirm-button--danger"
                    (click)="confirmExitExam()">Thoát khỏi bài thi</button>
        </div>
    </div>
</div>
```

### 9.3 Submit Confirm Dialog (dòng 23-33)

```html
<div class="submit-confirm-overlay" *ngIf="submitConfirmVisible">
    <div class="submit-confirm-dialog">
        <i class="pi pi-send"></i>
        <h2>Xác nhận nộp bài</h2>
        <p>Bạn đã trả lời hết các câu hỏi. Sau khi nộp bài, bạn sẽ không thể chỉnh sửa đáp án.</p>
        <div class="submit-confirm-actions">
            <button type="button" class="submit-confirm-button submit-confirm-button--secondary"
                    (click)="cancelSubmitSkillTest()">Kiểm tra lại</button>
            <button type="button" class="submit-confirm-button submit-confirm-button--primary"
                    [disabled]="submitting"
                    (click)="confirmSubmitSkillTest()">Xác nhận nộp bài</button>
        </div>
    </div>
</div>
```

### 9.4 Score Result Dialog (dòng 35-50)

```html
<div class="submit-confirm-overlay" *ngIf="scoreResultVisible">
    <div class="submit-confirm-dialog score-result-dialog">
        <i class="pi pi-check-circle" style="color: #16a34a;"></i>
        <h2>Đã nộp bài thành công</h2>
        <p>Kết quả {{ skillResultLabel(scoreResultData.skill) }}</p>
        <div class="score-result-body">
            <div class="score-result-point">
                <small>Điểm</small>
                <strong>{{ scoreResultData.point !== null && scoreResultData.point !== undefined ?
                    (scoreResultData.point | number:'1.0-2') : '—' }}</strong>
            </div>
        </div>
        <div class="submit-confirm-actions score-result-actions">
            <button type="button" class="submit-confirm-button submit-confirm-button--primary score-result-close"
                    (click)="closeScoreResult()">Đóng</button>
        </div>
    </div>
</div>
```

### 9.5 Main Page Shell (dòng 52-146)

```html
<div class="student-question-page">

    <!-- Empty/Loading state -->
    <div *ngIf="!loading && message" class="student-question-empty">
        <i class="pi pi-info-circle"></i>
        <strong>{{ message }}</strong>
    </div>

    <!-- Exam shell — chỉ hiện khi đã load và có câu hỏi -->
    <section *ngIf="!loading && parents.length" class="exam-shell"
             [class.exam-shell--panel-closed]="!questionPanelOpen">

        <!-- Mobile backdrop -->
        <div *ngIf="questionPanelOpen" class="question-panel-backdrop"
             (click)="setQuestionPanelOpen(false)"></div>

        <!-- ============ SIDEBAR ============ -->
        <aside *ngIf="questionPanelOpen" class="question-panel">
            <div class="question-panel__head">
                <h2>Question List</h2>
                <button type="button" class="question-panel__close"
                        aria-label="Close question list"
                        (click)="setQuestionPanelOpen(false)">
                    <i class="pi pi-times"></i>
                </button>
            </div>

            <div class="question-panel__body">
                <!-- Loop qua từng part group -->
                <ng-container *ngFor="let partGroup of getGroupedByPart(); trackBy: trackByPart">
                    <div class="question-group-card">
                        <!-- Header: part name + question count -->
                        <div class="question-group-card__head">
                            <div>
                                <strong>{{ echoPart(partGroup.part) }}</strong>
                                <span>{{ partGroup.questions.length }} questions</span>
                            </div>
                        </div>

                        <!-- Body: danh sách câu hỏi trong part -->
                        <div class="question-group-card__body"
                             [class.collapsed]="isPartCollapsed(partGroup.part)">

                            <button type="button"
                                *ngFor="let q of partGroup.questions; let i = index; trackBy: trackByQuestion"
                                class="question-list-item"
                                [class.active]="currentParentIndex === q._globalIndex"
                                [class.question-list-item--locked]="!canSelectMenuQuestion(q._globalIndex)"
                                [disabled]="!canSelectMenuQuestion(q._globalIndex)"
                                (click)="setActiveParent(q._globalIndex, 'menu')">
                                <div>
                                    <!-- Số thứ tự 01, 02... -->
                                    <strong>{{ q._globalIndex + 1 < 10 ? '0' + (q._globalIndex + 1) : q._globalIndex + 1 }}</strong>
                                    <span>{{ hasSeenQuestion(q._globalIndex) ? 'Seen' : 'Unseen' }}</span>
                                </div>
                            </button>
                        </div>
                    </div>
                </ng-container>
            </div>
        </aside>

        <!-- ============ MAIN CONTENT ============ -->
        <main class="exam-main" *ngIf="currentParent as parent">

            <!-- Header: skill label + câu số + countdown -->
            <header class="exam-header">
                <div>
                    <span>{{ skillLabel(selectedSkill) }}</span>
                    <h1>Question {{ currentParentIndex + 1 }} of {{ parents.length }}</h1>
                </div>
                <div *ngIf="skillDurationValue > 0" class="exam-countdown"
                     [class.exam-countdown--warning]="countdownWarning">
                    <span>Time left</span>
                    <strong>{{ countdownDisplay }}</strong>
                </div>
            </header>

            <!-- Question card -->
            <article class="question-page-card" [id]="questionDomId(parent)">

                <!-- Meta: part + số câu (display: none trong CSS) -->
                <div class="question-page-meta">
                    <span>{{ echoPart(parent.part) }}</span>
                    <span>{{ partQuestionCount(parent) }} questions on this page</span>
                </div>

                <!-- Direction text (nếu parent không có control riêng) -->
                <div *ngIf="parent.question_direction && !shouldRenderParentControl(parent)"
                     class="question-direction"
                     [innerHTML]="trustHtml(parent.question_direction)"></div>

                <!-- Audio media player -->
                <div *ngIf="parent.media?.path" class="student-question-media">
                    <audio-viewer [width]="520" [height]="260"
                        [type]="parent.media.type"
                        [path]="parent.media.path"
                        [source]="parent.media.source"
                        [replay]="getListeningReplayCount()"
                        [questionId]="questionKey(parent)">
                    </audio-viewer>
                </div>

                <!-- Parent question control (nếu parent là câu hỏi thực sự) -->
                <ng-container *ngIf="shouldRenderParentControl(parent)">
                    <ng-container *ngTemplateOutlet="questionBlock;
                        context: { question: parent, index: currentParentIndex + 1, showIndex: false }">
                    </ng-container>
                </ng-container>

                <!-- Child questions -->
                <div *ngIf="parent.children?.length" class="student-question-children">
                    <section *ngFor="let question of parent.children; let i = index; trackBy: trackByQuestion"
                             class="student-question-child">
                        <ng-container *ngTemplateOutlet="questionBlock;
                            context: { question: question, index: i + 1, showIndex: true }">
                        </ng-container>
                    </section>
                </div>
            </article>
        </main>

        <!-- ============ FOOTER ============ -->
        <footer class="exam-footer">
            <div class="exam-tools">
                <button type="button" class="exam-tool-button"
                        aria-label="Toggle Question List"
                        (click)="setQuestionPanelOpen(!questionPanelOpen)">
                    <i class="pi pi-list"></i>
                </button>
            </div>
            <div class="exam-actions">
                <!-- Warning khi chưa hoàn thành trang -->
                <div *ngIf="incompleteCurrentPageWarning"
                     class="exam-navigation-warning">{{ incompleteCurrentPageWarning }}</div>

                <!-- Exit button -->
                <button type="button" class="exit-button"
                        (click)="backToDetail()"><i class="pi pi-sign-out"></i></button>

                <!-- Previous -->
                <button type="button" class="nav-button"
                        [disabled]="currentParentIndex === 0"
                        (click)="previousParent()">
                    <i class="pi pi-arrow-left"></i>
                    <span>Previous</span>
                </button>

                <!-- Next / Submit -->
                <button type="button" class="next-button"
                    [disabled]="submitting || (!canSubmitSkillTest() && (currentParentIndex === parents.length - 1 || !isCurrentParentComplete()))"
                    (click)="handleNextAction()">
                    <span>{{ canSubmitSkillTest() ? 'Submit' : 'Next' }}</span>
                    <i *ngIf="!canSubmitSkillTest()" class="pi pi-arrow-right"></i>
                </button>
            </div>
        </footer>
    </section>
</div>
```

### 9.6 Template `#questionBlock` (dòng 148-173)

```html
<ng-template #questionBlock let-question="question" let-index="index" let-showIndex="showIndex">
    <div class="student-question-child__body"
         [class.student-question-child__body--no-number]="!showIndex">

        <!-- Số thứ tự câu hỏi (chỉ hiện khi showIndex = true) -->
        <strong *ngIf="showIndex" class="student-question-number">{{ index }}</strong>

        <div class="student-question-child__content">

            <!-- CHECK: Select question với marker? -->
            <ng-container *ngIf="isSelectQuestion(question) && hasSelectMarker(question.question_direction);
                else normalQuestionDirection">

                <!-- CHECK: Select block ([[SELECT-BLOCK]])? -->
                <ng-container *ngIf="hasSelectBlockMarker(question.question_direction);
                    else inlineSelectQuestion">
                    <ng-container *ngTemplateOutlet="selectBlockQuestion;
                        context: { question: question }">
                    </ng-container>
                </ng-container>

                <ng-template #inlineSelectQuestion>
                    <ng-container *ngTemplateOutlet="selectInlineQuestion;
                        context: { question: question }">
                    </ng-container>
                </ng-template>
            </ng-container>

            <ng-template #normalQuestionDirection>
                <!-- Direction text cho child question -->
                <div *ngIf="question.question_direction"
                     class="question-direction question-direction--child"
                     [innerHTML]="trustHtml(question.question_direction)">
                </div>
            </ng-template>

            <!-- Nếu không phải select → render question control -->
            <ng-container *ngIf="!(isSelectQuestion(question) && hasSelectMarker(question.question_direction))">
                <ng-container *ngTemplateOutlet="questionControl;
                    context: { question: question }">
                </ng-container>
            </ng-container>

            <!-- Recording params badge -->
            <p *ngIf="isRecordQuestion(question)" class="student-question-params">
                <ng-container *ngIf="recordPrepareSeconds(question) > 0">
                    Prepare time: {{ recordPrepareSeconds(question) }}s -
                </ng-container>
                Speaking time: {{ recordSpeakingSeconds(question) }}s
            </p>
        </div>
    </div>
</ng-template>
```

### 9.7 Template `#questionControl` — 6 loại câu hỏi (dòng 175-255)

```html
<ng-template #questionControl let-question="question">

    <!-- 1. RADIO -->
    <div *ngIf="question.question_type === 'radio'" class="student-radio-list">
        <label *ngFor="let option of question.answer_option" class="student-radio-option">
            <input type="radio"
                   [name]="questionKey(question)"
                   [value]="option.id"
                   [checked]="isAnswerSelected(question, option.id)"
                   (change)="updateLocalAnswer(question, option.id)" />
            <span [innerHTML]="trustHtml(option.value)"></span>
        </label>
    </div>

    <!-- 2. SELECT DROPDOWN (standalone, không có marker) -->
    <p-dropdown *ngIf="isSelectQuestion(question) && !hasSelectMarker(question.question_direction)"
        [options]="question.answer_option"
        optionValue="id"
        appendTo="body"
        [autoDisplayFirst]="false"
        [showClear]="false"
        [ngModel]="answerValue(question)"
        placeholder=""
        styleClass="student-question-dropdown"
        panelStyleClass="student-question-dropdown-panel"
        (onChange)="updateLocalAnswer(question, $event.value)">

        <!-- Selected item template -->
        <ng-template let-option pTemplate="selectedItem">
            <span *ngIf="option" class="student-question-dropdown__content"
                  [innerHTML]="trustHtml(option.value)"></span>
        </ng-template>
        <!-- Dropdown item template -->
        <ng-template let-option pTemplate="item">
            <span class="student-question-dropdown__content"
                  [innerHTML]="trustHtml(option.value)"></span>
        </ng-template>
    </p-dropdown>

    <!-- 3. PARAGRAPH DRAG-DROP -->
    <div *ngIf="isParagraphQuestion(question)" class="student-paragraph-board">

        <!-- LEFT: Slots -->
        <div class="student-paragraph-slots">
            <div class="student-paragraph-title">Drag answers into the correct order</div>

            <div *ngFor="let option of paragraphPlacedOptions(question); let i = index"
                 class="student-paragraph-slot-row">
                <span class="student-question-number">{{ i + 1 }}</span>

                <!-- CDK Drop List — mỗi slot là 1 drop zone -->
                <div cdkDropList
                     class="student-paragraph-slot"
                     [class.student-paragraph-slot--empty]="!option"
                     [cdkDropListData]="[option]"
                     [cdkDropListConnectedTo]="[paragraphBankListId(question)]"
                     [id]="paragraphSlotListId(question, i)"
                     (cdkDropListDropped)="dropParagraphAnswer(question, $event)">

                    <div class="student-paragraph-slot__box">
                        <ng-container *ngIf="option; else emptyParagraphSlot">
                            <!-- Filled slot -->
                            <div class="student-paragraph-option-content"
                                 [innerHTML]="trustHtml(option.value)"></div>
                            <button type="button" class="student-paragraph-remove"
                                    aria-label="Xóa đáp án"
                                    (click)="removeParagraphAnswer(question, i)">
                                <i class="pi pi-times"></i>
                            </button>
                        </ng-container>
                        <ng-template #emptyParagraphSlot>
                            <span class="student-paragraph-slot__placeholder">Drag answer here</span>
                        </ng-template>
                    </div>
                </div>
            </div>
        </div>

        <!-- RIGHT: Bank (available options) -->
        <div cdkDropList
             class="student-paragraph-bank"
             [cdkDropListData]="paragraphAvailableOptions(question)"
             [cdkDropListConnectedTo]="paragraphConnectedListIds(question)"
             [id]="paragraphBankListId(question)"
             (cdkDropListDropped)="dropParagraphAnswer(question, $event)">

            <div class="student-paragraph-title">Answers</div>

            <!-- Các option còn lại trong bank -->
            <div *ngFor="let option of paragraphAvailableOptions(question)"
                 cdkDrag
                 [cdkDragData]="option"
                 class="student-paragraph-bank-item">
                <i class="pi pi-ellipsis-v"></i>
                <div class="student-paragraph-option-content"
                     [innerHTML]="trustHtml(option.value)"></div>

                <!-- Drag preview -->
                <ng-template cdkDragPreview>
                    <div class="student-paragraph-preview">
                        <div class="student-paragraph-preview__content"
                             [innerHTML]="trustHtml(option.value)"></div>
                    </div>
                </ng-template>
            </div>
        </div>
    </div>

    <!-- 4. INPUT BOX -->
    <input *ngIf="isInputboxQuestion(question)" type="text"
           class="student-answer-input"
           [value]="answerValue(question) || ''"
           (input)="updateLocalAnswer(question, $any($event.target).value)" />

    <!-- 5. TEXTAREA -->
    <div *ngIf="isTextareaQuestion(question)" class="student-answer-textarea-wrap">
        <textarea rows="4" class="student-answer-textarea"
                  [value]="answerValue(question) || ''"
                  (input)="updateLocalAnswer(question, $any($event.target).value)"></textarea>
        <div class="student-answer-word-count">{{ answerWordCount(question) }} words</div>
    </div>

    <!-- 6. RECORD (microphone) -->
    <ng-container *ngIf="isRecordQuestion(question) && recordState(question) as state">
        <div *ngIf="state.phase !== 'idle'" class="student-record-box">
            <div class="student-record-box__head">
                <!-- Microphone icon với dynamic states -->
                <i class="pi pi-microphone"
                   [class.student-record-box__icon--recording]="state.phase === 'recording'"
                   [class.student-record-box__icon--speaking]="state.phase === 'recording' && state.isSpeaking">
                </i>
                <div>
                    <!-- Phase-dependent text -->
                    <strong *ngIf="state.phase === 'preparing' && state.prepareLeft > 0">Prepare to speak</strong>
                    <strong *ngIf="state.phase === 'recording'">Recording</strong>
                    <strong *ngIf="state.phase === 'recorded'">Uploading...</strong>
                    <strong *ngIf="state.phase === 'uploading'">Uploading...</strong>
                    <span *ngIf="state.phase === 'uploaded'" class="badge-light-base badge-success-light">
                        <div style="display: flex; align-items: center;">
                            <i class="pi pi-check"></i> Submit success
                        </div>
                    </span>
                    <strong *ngIf="state.phase === 'error'">Upload failed</strong>

                    <!-- Time left texts -->
                    <span *ngIf="state.phase === 'preparing' && state.prepareLeft > 0">
                        Recording starts in {{ state.prepareLeft }}s
                    </span>
                    <span *ngIf="state.phase === 'recording'">
                        Speaking time left: {{ state.speakingLeft }}s
                    </span>

                    <!-- Submit early button -->
                    <button *ngIf="canSubmitRecordEarly(question)" type="button"
                            class="nav-button"
                            (click)="submitRecordEarly(question)">Submit answer</button>

                    <!-- Error display -->
                    <span *ngIf="state.phase === 'error'" class="student-record-box__error-text">
                        {{ state.error }}
                    </span>
                    <button *ngIf="state.phase === 'error'" type="button"
                            class="nav-button student-record-box__retry-btn"
                            (click)="retryRecordQuestion(question)">
                        <i class="pi pi-refresh"></i> Upload lại
                    </button>
                </div>
            </div>
        </div>
    </ng-container>
</ng-template>
```

### 9.8 Template `#selectInlineQuestion` (dòng 257-270)

```html
<ng-template #selectInlineQuestion let-question="question">
    <div class="student-select-inline">
        <!-- Text trước dropdown -->
        <span [innerHTML]="trustHtml(getSelectQuestionParts(question.question_direction)[0])"></span>

        <!-- Dropdown inline (giữa dòng text) -->
        <p-dropdown [options]="question.answer_option" optionValue="id"
            appendTo="body" [autoDisplayFirst]="false" [showClear]="false"
            [ngModel]="answerValue(question)" placeholder=""
            styleClass="student-question-dropdown student-question-dropdown--inline"
            (onChange)="updateLocalAnswer(question, $event.value)">
            <ng-template let-option pTemplate="selectedItem">
                <span *ngIf="option" class="student-question-dropdown__content"
                      [innerHTML]="trustHtml(option.value)"></span>
            </ng-template>
            <ng-template let-option pTemplate="item">
                <span class="student-question-dropdown__content"
                      [innerHTML]="trustHtml(option.value)"></span>
            </ng-template>
        </p-dropdown>

        <!-- Text sau dropdown -->
        <span [innerHTML]="trustHtml(getSelectQuestionParts(question.question_direction)[1])"></span>
    </div>
</ng-template>
```

### 9.9 Template `#selectBlockQuestion` (dòng 272-284)

```html
<ng-template #selectBlockQuestion let-question="question">
    <div class="student-select-block">
        <!-- Dropdown trước -->
        <p-dropdown [options]="question.answer_option" optionValue="id"
            appendTo="body" [autoDisplayFirst]="false" [showClear]="false"
            [ngModel]="answerValue(question)" placeholder=""
            styleClass="student-question-dropdown"
            (onChange)="updateLocalAnswer(question, $event.value)">
            <ng-template let-option pTemplate="selectedItem">
                <span *ngIf="option" class="student-question-dropdown__content"
                      [innerHTML]="trustHtml(option.value)"></span>
            </ng-template>
            <ng-template let-option pTemplate="item">
                <span class="student-question-dropdown__content"
                      [innerHTML]="trustHtml(option.value)"></span>
            </ng-template>
        </p-dropdown>

        <!-- Direction text sau dropdown (đã remove marker) -->
        <div class="question-direction"
             [innerHTML]="trustHtml(getSelectBlockContent(question.question_direction))"></div>
    </div>
</ng-template>
```

---

## 10. CSS — TỪNG SELECTOR BLOCK ĐẦY ĐỦ

### 10.1 Host & Global Typography

| Selector | Properties |
|---|---|
| `:host` | `display: block; min-height: 100vh; background: #ffffff; color: #1f1f28; user-select: none; font-family: Roboto, sans-serif; font-size: 14px;` |
| `.student-question-page` | `font-size: 14px; font-family: Roboto, sans-serif;` |

### 10.2 ::ng-deep Overrides

**Font enforcement:**
- `.student-question-page :not(i):not(.pi):not([class^="pi "]):not([class*=" pi "])` → `font-family: Roboto, sans-serif; font-size: 14px !important`
- `.student-question-dropdown`, `.student-question-dropdown-panel` → font-family + size (14px)
- `.student-question-dropdown .p-dropdown-label`, `.p-dropdown-item`, `.student-question-dropdown__content` → font-family + size
- `.pi`, `i[class*="pi"]`, `.p-dropdown-trigger-icon` → `font-family: 'PrimeIcons' !important`

### 10.3 Security Overlay & Dialog

| Selector | Key Properties |
|---|---|
| `.exam-security-overlay` | `position: fixed; inset: 0; z-index: 999999; display: grid; place-items: center; background: rgba(15, 23, 42, 0.72); padding: 20px;` |
| `.exam-security-dialog` | `display: grid; gap: 12px; width: min(420px, 100%); padding: 26px; border: 1px solid #fecaca; border-radius: 14px; background: #ffffff; text-align: center;` |
| `.exam-security-dialog i` | `color: #dc2626; font-size: 34px;` |
| `.exam-security-dialog h2` | `margin: 0; font-size: 20px; font-weight: 800;` |
| `.exam-security-dialog p` | `margin: 0; color: #374151; font-size: 14px; line-height: 1.5;` |
| `.exam-security-dialog small` | `color: #991b1b; font-size: 14px; font-weight: 700;` |
| `.exam-security-button` | `min-height: 42px; border: 0; border-radius: 8px; background: #1f4f8f; color: #ffffff; cursor: pointer; font-size: 14px; font-weight: 700;` |

### 10.4 Submit Confirm Dialog

| Selector | Key Properties |
|---|---|
| `.submit-confirm-overlay` | `position: fixed; inset: 0; z-index: 999998; display: grid; place-items: center; background: rgba(15, 23, 42, 0.58); padding: 20px;` |
| `.submit-confirm-dialog` | `display: grid; gap: 12px; width: min(440px, 100%); padding: 26px; border: 1px solid #cbd5e1; border-radius: 14px; background: #ffffff; text-align: center;` |
| `.submit-confirm-dialog i` | `color: #1f4f8f; font-size: 34px;` |
| `.submit-confirm-dialog h2` | `margin: 0; font-size: 20px; font-weight: 800;` |
| `.submit-confirm-actions` | `display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 6px;` |
| `.submit-confirm-button` | `min-height: 42px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 700;` |
| `.submit-confirm-button--secondary` | `border: 1px solid #cbd5e1; background: #ffffff; color: #111827;` |
| `.submit-confirm-button--primary` | `border: 1px solid #1f4f8f; background: #1f4f8f; color: #ffffff;` |
| `.submit-confirm-button:disabled` | `cursor: not-allowed; opacity: 0.7;` |

### 10.5 Exit Confirm (override submit-confirm)

| Selector | Override |
|---|---|
| `.exit-confirm-dialog` | `border-color: #fecaca` (red tint) |
| `.exit-confirm-dialog > i` | `color: #dc2626` |
| `.exit-confirm-button--danger` | `border-color: #dc2626; background: #dc2626` |

### 10.6 Exam Shell Layout

| Selector | Properties |
|---|---|
| `.exam-shell` | `position: relative; display: grid; grid-template-columns: 312px minmax(0, 1fr); min-height: 100vh; padding-bottom: 64px; background: #ffffff;` |
| `.exam-shell--panel-closed` | `grid-template-columns: minmax(0, 1fr);` |
| `.exam-shell--panel-closed .exam-footer` | `padding-left: 16px;` |

### 10.7 Question Panel (Sidebar)

| Selector | Properties |
|---|---|
| `.question-panel-backdrop` | `display: none;` (chỉ hiện ở mobile) |
| `.question-panel` | `position: sticky; top: 0; height: calc(100vh - 60px); display: flex; flex-direction: column; border-right: 1px solid #e9e6f5; border-radius: 0 6px 6px 0; background: #ffffff; overflow: hidden; z-index: 2;` |
| `.question-panel__head` | `flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; padding: 18px 18px 12px;` |
| `.question-panel__head h2` | `margin: 0; color: #15151f; font-size: 16px; font-weight: 700;` |
| `.question-panel__close` | `display: grid; width: 32px; height: 32px; place-items: center; border: 0; border-radius: 8px; background: transparent; color: #111827; cursor: pointer;` |
| `.question-panel__body` | `flex: 1; overflow-y: auto; padding: 0 12px 12px;` |

### 10.8 Question Filter Tabs

| Selector | Properties |
|---|---|
| `.question-filter` | `display: flex; justify-content: center; gap: 10px; padding: 8px 6px 24px;` |
| `.question-filter__item` | `min-height: 38px; padding: 0 18px; border: 1px solid #e2e0ea; border-radius: 999px; background: #ffffff; font-weight: 600;` |
| `.question-filter__item.active` | `border-color: #4b3193; background: #4b3193; color: #ffffff;` |

### 10.9 Question Group Card

| Selector | Properties |
|---|---|
| `.question-group-card` | `margin: 0 4px 10px; border: 1px solid #dedde6; border-radius: 5px; padding: 8px;` |
| `.question-group-card__head` | `display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 0 2px 10px;` |
| `.question-group-card__head strong` | `color: #2d2d38; font-size: 15px; font-weight: 800;` |
| `.question-group-card__collapse` | `width: 24px; height: 24px; color: #4b3193;` |

### 10.10 Question List Item

| Selector | Properties |
|---|---|
| `.question-list-item` | `display: grid; grid-template-columns: minmax(0, 1fr); align-items: center; gap: 8px; width: 100%; min-height: 48px; margin-top: 8px; padding: 7px 8px; border: 1px solid #e0e0e5; border-radius: 4px; background: #ffffff; cursor: pointer;` |
| `.question-list-item.active` | `border-color: #dedbef; background: #e8e6f2;` |
| `.question-list-item--locked:not(.active)` | `cursor: not-allowed; opacity: 0.55; pointer-events: none;` |
| `.question-list-item strong` | `color: #111827; font-size: 14px; font-weight: 800;` |
| `.question-list-item div span` | `opacity: 0.52; font-weight: 500;` |

### 10.11 Main Content Area

| Selector | Properties |
|---|---|
| `.exam-main` | `min-height: calc(100vh - 60px); padding: 48px 64px 96px; overflow-x: hidden;` |
| `.exam-header` | `display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: start; gap: 16px; max-width: 760px; margin: 0 auto 48px;` |
| `.exam-header h1` | `margin: 0; color: #111827; font-size: 16px; font-weight: 800;` |
| `.exam-countdown` | `justify-self: end; min-width: 120px; padding: 10px 14px; border: 1px solid #dedbef; border-radius: 8px; background: #f7f5ff; text-align: center;` |
| `.exam-countdown strong` | `color: #111827; font-size: 18px; font-weight: 800; letter-spacing: 0.04em;` |
| `.exam-countdown--warning` | `border-color: #fecaca; background: #fef2f2;` `span, strong → color: #b91c1c;` |
| `.question-page-card` | `max-width: 760px; margin: 0 auto;` |
| `.question-direction` | `color: #282831; font-size: 14px; font-weight: 500; line-height: 1.75; white-space: pre-line;` |
| `.question-direction ::ng-deep img` | `max-width: 100%; height: auto;` |
| `.student-question-media` | `margin: 18px 0 24px; padding: 10px; border: 1px solid #e5e7eb; border-radius: 6px;` |

### 10.12 Child Questions

| Selector | Properties |
|---|---|
| `.student-question-children` | `display: grid; gap: 26px; margin-top: 26px;` |
| `.student-question-child` | `padding: 0; border: 0; background: transparent;` |
| `.student-question-child__body` | `display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 12px;` |
| `.student-question-child__body--no-number` | `display: block;` |
| `.student-question-number` | `display: grid; width: 28px; height: 28px; place-items: center; border: 1px solid #dedde6; border-radius: 50%; font-weight: 800;` |
| `.student-question-params` | `display: inline-flex; padding: 5px 10px; border-radius: 999px; color: #4b3193; background: #f0eef9; font-weight: 700;` |

### 10.13 Select/Dropdown

| Selector | Properties |
|---|---|
| `.student-select-inline` | `display: flex; flex-wrap: wrap; gap: 5px; align-items: center;` |
| `.student-select-block` | `display: grid; gap: 12px;` |
| `::ng-deep .student-question-dropdown` | `min-width: 90px; width: auto;` |
| `::ng-deep .p-dropdown.student-question-dropdown` | `display: inline-flex !important; min-height: 28px; height: 28px; border-radius: 2px;` |
| `::ng-deep .student-question-dropdown .p-dropdown-trigger` | `width: 24px; height: 28px;` |
| `::ng-deep .student-question-dropdown-panel` | `border-radius: 12px; box-shadow: 0 14px 40px rgba(15,23,42,0.14); scrollbar-width: thin;` |
| `::ng-deep .student-question-dropdown-panel .p-dropdown-item` | `min-height: 40px; padding: 10px 12px; border-radius: 10px; transition: background 0.15s ease;` |
| `.p-dropdown-item.p-highlight, .p-dropdown-item:hover` | `color: #1e3a8a; background: #eef4ff;` |
| `.student-question-dropdown__content` | `display: flex; align-items: center; height: 22px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;` |

### 10.14 Radio

| Selector | Properties |
|---|---|
| `.student-radio-list` | `display: grid; gap: 9px; margin-top: 10px;` |
| `.student-radio-option` | `display: flex; align-items: center; gap: 10px; min-height: 52px; padding: 0 10px; border: 1px solid #d8d8de; border-radius: 4px; cursor: pointer;` |
| `.student-radio-option:hover` | `border-color: #4b3193; background: #fbfaff;` |

### 10.15 Paragraph Board

| Selector | Properties |
|---|---|
| `.student-paragraph-board` | `display: grid; grid-template-columns: minmax(0, 1fr) 276px; margin-top: 14px; border: 1px solid #c6c6c6;` |
| `.student-paragraph-slots` | `display: flex; flex-direction: column; gap: 10px; min-height: 440px; padding: 26px 34px 28px;` |
| `.student-paragraph-bank` | `display: grid; align-content: start; gap: 10px; min-height: 440px; padding: 20px 28px 28px; border-left: 1px solid #e5e7eb; background: #eeeeee;` |
| `.student-paragraph-slot__box` | `min-height: 31px; padding: 5px 6px 5px 10px; border: 2px dashed #b3b3b3; background: #f7f8fa; transition: all 0.15s ease;` |
| `.student-paragraph-slot--empty .student-paragraph-slot__box` | `cursor: copy;` |
| `.student-paragraph-bank-item` | `min-height: 68px; padding: 22px 12px 10px; border: 1px solid #9a9a9a; cursor: move; transition: all 0.15s ease;` |
| `.student-paragraph-remove` | `position: absolute; top: 5px; right: 5px; width: 22px; height: 22px; background: #dc2626; opacity: 0; transform: scale(0.88); transition: all 0.15s ease;` |
| `.student-paragraph-slot__box:hover .student-paragraph-remove` | `opacity: 1; transform: scale(1);` |
| `.student-paragraph-preview` | `min-width: 220px; padding: 14px 12px; box-shadow: 0 16px 34px rgba(15,23,42,0.22);` |

### 10.16 CDK Drag-Drop Overrides

| Selector | Properties |
|---|---|
| `.student-paragraph-bank-item.cdk-drag-placeholder` | `display: none;` |
| `.cdk-drag-animating` | `transition: transform 0ms;` |
| `.cdk-drag-preview.student-paragraph-bank-item` | `box-sizing: border-box; background: #ffffff; box-shadow: 0 12px 28px rgba(15,23,42,0.18); cursor: copy;` |
| `.cdk-drag-placeholder` | `opacity: 0.25;` |
| `.student-paragraph-slots.cdk-drop-list-dragging` | `cursor: copy;` |

### 10.17 Input & Textarea

| Selector | Properties |
|---|---|
| `.student-answer-input, .student-answer-textarea` | `width: 100%; border: 1px solid #cfcfd6; border-radius: 3px; outline: none;` |
| `.student-answer-input` | `max-width: 420px; height: 34px; padding: 0 8px;` |
| `.student-answer-textarea` | `min-height: 96px; padding: 10px; resize: vertical;` |
| `.student-answer-word-count` | `color: #6b7280; font-size: 14px; font-weight: 600; text-align: right;` |
| `:focus` (cả input và textarea) | `border-color: #4b3193;` |

### 10.18 Recording UI

| Selector | Properties |
|---|---|
| `.student-record-box` | `display: grid; gap: 12px; margin-top: 10px; padding: 14px; border: 1px solid #d8d8de; border-radius: 6px;` |
| `.student-record-box__head` | `display: flex; align-items: center; gap: 12px;` |
| `.student-record-box__head i` | `width: 42px; height: 42px; border-radius: 50%; color: #4b3193; background: #f0eef9; font-size: 18px;` |
| `.--recording` | `color: #dc2626 !important; background: #fee2e2 !important;` |
| `.--speaking` | `color: #ffffff !important; background: #16a34a !important; box-shadow: 0 0 0 8px rgba(22,163,74,.16); animation: pulse 0.65s infinite alternate;` |
| `.badge-light-base` | `padding: 6px 12px; border-radius: 4px; font-weight: 500; font-size: 13px; display: inline-flex;` |
| `.badge-success-light` | `background: #22C03C1A; color: #22C03C;` |
| `.student-record-box__retry-btn` | `border: 1px solid #dc2626; border-radius: 6px; background: #ffffff; color: #dc2626;` |
| `.student-record-box__reload-btn` | `width: 32px; height: 32px; border-radius: 50%; border: 1px solid #d1d5db; transition: color 0.15s ease;` |

### 10.19 Footer

| Selector | Properties |
|---|---|
| `.exam-footer` | `position: fixed; right: 0; bottom: 0; left: 0; display: flex; align-items: center; justify-content: space-between; min-height: 56px; padding: 8px 16px; border-top: 1px solid #dedde7; background: #ffffff; z-index: 5;` |
| `.exam-tool-button, .exit-button, .nav-button, .next-button` | `height: 44px; border: 1px solid #c9c9d1; border-radius: 5px; font-weight: 700;` |
| `.nav-button, .next-button` | `min-width: 124px; padding: 0 16px;` |
| `.next-button` | `border-color: #26006d; background: #26006d; color: #ffffff;` |
| `.exit-button` | `width: 44px; border: 0; background: transparent;` |
| `:disabled` | `cursor: not-allowed; opacity: 0.45;` |
| `.exam-navigation-warning` | `max-width: 360px; color: #b91c1c; font-weight: 700;` |

### 10.20 Score Result

| Selector | Properties |
|---|---|
| `.score-result-dialog` | `text-align: center;` |
| `.score-result-point` | `background: linear-gradient(135deg, #1e40af, #3b82f6); color: #fff; border-radius: 18px; padding: 20px 32px; min-width: 180px;` |
| `.score-result-point strong` | `font-size: 44px; font-weight: 850;` |
| `.score-result-close` | `width: 100%; max-width: 320px;` |

### 10.21 Image Error

| Selector | Properties |
|---|---|
| `.img-error-wrapper` | `display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; border: 1px solid #fca5a5; border-radius: 8px; background: #fef2f2;` |
| `.img-error-text` | `color: #dc2626; font-size: 12px; font-weight: 700;` |
| `.img-reload-btn` | `padding: 4px 10px; border: 0; border-radius: 6px; background: #dc2626; color: #ffffff; font-size: 11px; font-weight: 800;` |

### 10.22 Animation Keyframes

```css
@keyframes student-record-speaking-pulse {
    from { transform: scale(1); }
    to   { transform: scale(1.08); }
}
```

### 10.23 Responsive Breakpoints

**≤1024px:**
- `.exam-shell`: `grid-template-columns: 280px minmax(0, 1fr)`
- `.exam-main`: `padding: 40px 28px 96px`

**≤767px (Mobile):**
- `.exam-shell`: `display: block; padding-bottom: 64px;`
- `.question-panel-backdrop`: `display: block; position: fixed; inset: 0; z-index: 9998; background: rgba(15,23,42,0.38);`
- `.question-panel`: `position: fixed; top: 0; left: 0; z-index: 9999; width: min(300px, 85vw); height: 100vh; transform: translateX(-100%); visibility: hidden; transition: transform 0.2s ease;`
- `.exam-shell:not(.exam-shell--panel-closed) .question-panel`: `transform: translateX(0); visibility: visible;`
- `.exam-main`: `padding: 20px 10px 108px; max-width: 100%;`
- `.exam-header`: `grid-template-columns: 1fr; margin-bottom: 24px;`
- `.exam-countdown`: `justify-self: start;`
- `.exam-footer`: `flex-wrap: wrap; gap: 8px;`
- `.exam-actions`: `width: 100%; flex-wrap: wrap;`
- `.nav-button, .next-button, .exit-button`: `min-width: 0; flex: 1 1 auto;`

**≤549px:**
- `.exam-main`: `padding: 18px 10px 112px;`
- `.question-page-card`: `padding: 14px;`
- `.submit-confirm-dialog, .exam-security-dialog`: `width: calc(100% - 20px);`

**≤900px (Paragraph board responsive):**
- `.student-paragraph-board`: `grid-template-columns: 1fr;` (xếp chồng)
- `.student-paragraph-slots, .student-paragraph-bank`: `min-height: auto; padding: 16px;`

### 10.24 Color Scheme

| Family | Colors |
|---|---|
| **Purple** | `#4b3193` (chủ đạo), `#26006d` (next button), `#f0eef9`/`#f7f5ff` (bg), `#e8e6f2` (active list), `#dedbef` (border) |
| **Blue** | `#1f4f8f` (button primary), `#1e40af`/`#3b82f6` (gradient score), `#1e3a8a` (dropdown highlight), `#eef4ff` (dropdown hover bg) |
| **Red** | `#dc2626` (error/danger), `#fecaca` (border), `#fef2f2`/`#fee2e2` (bg), `#991b1b`/`#b91c1c` (text) |
| **Green** | `#16a34a` (speaking icon), `#22C03C` (success badge), `rgba(22,163,74,.16)` (glow) |
| **Neutral** | `#111827` (text), `#374151`/`#4b5563`/`#6b7280` (secondary text), `#ffffff` (bg), `#e0e0e5`/`#d8d8de`/`#c6c6c6`/`#9a9a9a` (borders) |

### 10.25 Z-index Stack

| z-index | Element |
|---|---|
| `2` | `.question-panel` (sidebar sticky) |
| `5` | `.exam-footer` (fixed bottom) |
| `9998` | `.question-panel-backdrop` (mobile only) |
| `9999` | `.question-panel` (mobile drawer position fixed) |
| `999998` | `.submit-confirm-overlay` |
| `999999` | `.exam-security-overlay` |

---

## 11. DATA FLOW DIAGRAM

### 11.1 Lifecycle Sequence

```
ngOnInit()
  ├─ devtoolsService.startDetection()
  ├─ Read route params → shiftId, shiftTestId, skill
  ├─ decode params (RouteEncoderService)
  ├─ handleReloadDuringExam()
  │   └─ Nếu reload → redirect /ca-thi-cua-ban/:shiftId
  ├─ markExamSessionActive() → sessionStorage
  └─ loadQuestionTest()
       └─ shiftStudentService.getStudentShiftGroups(student.id)
            └─ switchMap → forkJoin:
                 ├─ shiftService.getTnQLCathiByIds(shiftId)
                 └─ shiftTestService.getStudentQuestionTest(shiftId, studentId, shiftTestId)
                      └─ switchMap → formDetailService.getFormDetailSkillsByFormId(formId)
                           └─ map → normalize + group + shuffle + init + activateSecurity
                                ├─ normalizeShiftTestResponse()
                                ├─ extractQuestions()
                                ├─ groupQuestions() → parents + children
                                ├─ applyAnswerOptionShuffleToParents()
                                ├─ startExamCountdown() → setInterval 1s
                                ├─ createShiftTestState() → API
                                ├─ markActiveParentSeen()
                                ├─ prepareActiveRecordQuestion()
                                └─ activateExamSecurity()
```

### 11.2 Navigation Flow

```
setActiveParent(index, source)
  ├─ Kiểm tra recording → không cho chuyển nếu đang ghi
  ├─ canSelectMenuQuestion() → không cho chọn câu chưa mở khóa
  ├─ isCurrentParentComplete() → bắt buộc trả lời hết trang mới được next
  ├─ saveCurrentQuestionAnswers() → gọi API save từng câu
  ├─ cleanupActiveRecordQuestion() → dừng/dọn recording cũ
  ├─ currentParentIndex = index
  ├─ markActiveParentSeen()
  └─ prepareActiveRecordQuestion() → chuẩn bị recording mới nếu có
```

### 11.3 Recording Flow

```
[Mở câu hỏi recording]
prepareRecordQuestion()
  ├─ prepareLeft > 0 ? startPrepareCountdown() : chuyển sang recording
  │
  ├─ startPrepareCountdown() → setInterval 1s
  │   └─ prepareLeft <= 0 → playBeepAndStartRecording()
  │
  ├─ startRecording()
  │   ├─ Delay: 500ms-3000ms (tránh beep overlap)
  │   ├─ playBeepSound() → Audio 880Hz, 0.2s
  │   ├─ Delay: 200ms
  │   ├─ new MicRecorder({ bitRate: 128 })
  │   ├─ recorder.start()
  │   ├─ startSpeakingIndicator() → AnalyserNode → detect speaking
  │   └─ startSpeakingCountdown() → setInterval 1s
  │       └─ speakingLeft <= 0 → stopRecording(question ...)
  │
  ├─ [User có thể bấm Submit answer sớm nếu đã nói >= 20s]
  │
  ├─ stopRecording()
  │   ├─ stopSpeakingIndicator()
  │   ├─ recorder.stop().getMp3() → File MP3
  │   └─ uploadRecording(file)
  │
  └─ uploadRecording()
      ├─ fileService.uploadFileAwsWidthProgress(file, 'student_record')
      ├─ Retry tối đa 2 lần nếu thất bại
      ├─ updateLocalAnswer({ fileId, fileName, ... })
      ├─ saveQuestionAnswer() → API lưu đáp án
      └─ state.phase = 'uploaded'
```

### 11.4 Submit Flow

```
[Bấm Submit / Hết giờ]
handleNextAction() / submitSkillTest(force)
  ├─ collectUnpostedAnswerRequests()
  │   └─ Duyệt parents → parentQuestions → serializeStudentAnswer
  │       → Nếu chưa posted → push saveQuestionAnswer()
  ├─ forkJoin(requests) — lưu tất cả đáp án chưa post
  ├─ shiftTestService.scoreShiftTest(shiftTest.id, selectedSkill)
  │   └─ API chấm điểm
  └─ showScoreResult(scoreResult)
      ├─ Parse point từ number/string/object
      ├─ calcSkillBand() → A1/C dựa trên thresholds
      └─ scoreResultVisible = true → user nhìn thấy điểm

[User bấm Đóng]
closeScoreResult()
  └─ router.navigate(['/student/ca-thi-cua-ban', shiftId])
```

### 11.5 Security Flow

```
activateExamSecurity()
  ├─ document.addEventListener('copy', preventExamInteraction, true)
  ├─ document.addEventListener('cut', preventExamInteraction, true)
  ├─ document.addEventListener('paste', preventExamInteraction, true)
  ├─ document.addEventListener('contextmenu', preventExamInteraction, true)
  ├─ document.addEventListener('selectstart', preventExamInteraction, true)
  ├─ document.addEventListener('dragstart', preventExamInteraction, true)
  ├─ document.addEventListener('keydown', preventExamShortcut, true)
  │   └─ Chặn: Ctrl+C/V/A/S/U/P/X, Ctrl+Shift+I/J, F12
  ├─ document.addEventListener('visibilitychange', handleVisibilityChange, true)
  │   └─ Nếu document.hidden → security warning
  ├─ document.addEventListener('fullscreenchange', handleFullscreenChange, true)
  │   └─ Nếu !fullscreen → security warning
  ├─ window.addEventListener('resize', handleWindowResize, true)
  │   └─ checkDevToolsState()
  ├─ checkDevToolsState() → isDevToolsOpen() (outerWidth - innerWidth > 120)
  ├─ setInterval(checkDevToolsState, 1000)
  └─ enterFullscreen() → document.documentElement.requestFullscreen()

deactivateExamSecurity()
  └─ Remove tất cả listeners + clearInterval + exitFullscreen()
```

### 11.6 Error Handling

```
ngAfterViewChecked()
  └─ attachImageErrorHandlers()
      └─ .question-direction img không có data-error-handled
          └─ onerror → ẩn ảnh + tạo nút "Tải lại" (reload với cache-bust)

Recording error handling:
  ├─ startRecording() catch → 'Không thể truy cập microphone.'
  ├─ stopRecording() catch → 'Không thể lưu file ghi âm.'
  ├─ uploadRecording() retry 2 lần → 'Upload file ghi âm thất bại.'
  └─ saveQuestionAnswer() retry 2 lần → 'Lưu đáp án ghi âm thất bại.'
```

---

## 12. DEPENDENCIES CẦN CÓ

```json
{
    "dependencies": {
        "@angular/cdk": "^15.0.0 || ^16.0.0 || ^17.0.0",
        "mic-recorder-to-mp3": "^2.2.0",
        "primeng": "^15.0.0 || ^16.0.0 || ^17.0.0",
        "primeicons": "^6.0.0",
        "rxjs": "^7.8.0"
    }
}
```

**Services path alias (tsconfig.json):**
```json
{
    "paths": {
        "@core/*": ["src/app/core/*"],
        "@shared/*": ["src/app/shared/*"],
        "@env": ["src/environments/environment.ts"]
    }
}
```

**Environment file cần có (src/environments/environment.ts):**
- Hàm `getLinkDownload_aws(fileId: string): string` trả về URL `/api/aws/file/{fileId}`

**Models cần có:**
- `TnQLCathi` — `form_id`, `listening_count`
- `TnFormDetail` — `skill: string`, `time: number`
- `TnShiftStudent` — `shift_id: number`
- `TnStudent` — `id: number`
- `Answer` — `id: number`, `value: string`
- `TnShiftTestAnswer` — `shift_id`, `shift_test_id`, `bank_question_id`, `student_id`, `student_answer`
- `TnShiftTestState` — `shift_test_id`, `student_id`, `skill`, `progress`, `duration`, `time_left`, `completed`

**Services cần có:**
- `AuthService` — `student: TnStudent`, `accessToken: string`
- `FileService` — `uploadFileAwsWidthProgress(file, type): Observable`
- `NotificationService` — `loadingAnimationV2(config)`, `disableLoadingAnimationV2()`, `toastWarning(msg)`
- `RouteEncoderService` — `encode(value: number): string`, `decode(value: string): number`
- `DevtoolsDetectionService` — `startDetection()`, `stopDetection()`
- `TnShiftStudentService` — `getStudentShiftGroups(studentId): Observable<TnShiftStudent[]>`
- `TnQLCathiService` — `getTnQLCathiByIds(ids: string): Observable<TnQLCathi[]>`
- `TnFormDetailService` — `getFormDetailSkillsByFormId(formId): Observable<TnFormDetail[]>`
- `TnShiftTestService` — `getStudentQuestionTest(shiftId, studentId, shiftTestId): Observable<any>`, `scoreShiftTest(testId, skill): Observable<any>`
- `TnShiftTestAnswerService` — `addTnShiftTestAnswer(payload): Observable<any>`
- `TnShiftTestStateService` — `addTnShiftTestState(payload): Observable<any>`, `updateTnShiftTestState(id, payload): Observable<any>`

---

## 13. FILE BACKUP CŨ

`student-question-test.component.ts.tmp.1464.cf037b976745` (~1437 dòng) — phiên bản cũ hơn.

| Tính năng | Bản cũ | Bản hiện tại |
|---|---|---|
| `AfterViewChecked` | ❌ | ✅ (image error handler) |
| `DevtoolsDetectionService` | ❌ | ✅ |
| `RouteEncoderService` | ❌ (raw Number) | ✅ (decode) |
| Audio media component | ❌ | ✅ `getListeningReplayCount()` |
| Beep sound (WAV synthesis) | ❌ | ✅ `generateBeepWavUrl()`, `playBeepSound()` |
| Speaking indicator (AnalyserNode) | ❌ | ✅ Audio context + pulse animation |
| `recordPrepareSeconds` mặc định | 10s | 0s |
| Paragraph drag behavior | `moveItemInArray` (reorder) | Fixed-slot drag từ bank |
| Score result dialog | ❌ (submit xong redirect) | ✅ Dialog band điểm + gradient card |
| `submitSkillTest()` | `scoreShiftTest(id)` không skill param | Có `selectedSkill` |
| Audio error handling | ❌ | ✅ `onAudioLoadError()`, `reloadAudio()` |
| Paragraph merge `answer_correct` | ❌ | ✅ (merge vào options) |
| `ngOnDestroy` revoke URLs | ❌ | ✅ revokeObjectURL |

---

*Tài liệu này mô tả chi tiết từng dòng code module `lam-bai-theo-ky-nang`. Agent khác đọc vào có thể tái tạo y nguyên component mà không cần mở source code gốc.*