# Plan: Exam State & Answer Sync

## Context

Hiện tại exam-play không lưu trạng thái (state) và đáp án lên server. Cần thêm:

1. **ShiftTestState** — POST khi bắt đầu làm skill (nếu chưa có), PUT timer mỗi 15s
2. **ShiftTestAnswer** — POST/PUT đáp án mỗi khi chọn answer và next
3. **FormDetail** — lấy thời gian làm bài từ form_details

## Data models cần tạo

### `src/app/models/shift-test-state.ts`
```ts
export interface ShiftTestState extends IctuBaseModel {
    id: number;
    shift_test_id: number;
    student_id: number;
    skill: string;
    progress: string;       // comma-separated completed question IDs
    duration: number;       // seconds
    time_left: number;      // seconds
    completed: number;      // count
}
```

### `src/app/models/form-detail.ts`
```ts
export interface FormDetail {
    id: number;
    form_id: number;
    skill: string;
    time: number;           // minutes
}
```

## Services cần tạo

### `src/app/services/shift-test-state.service.ts`
- extends `IctuBaseServiceClass<ShiftTestState>`, route `'shift-test-states'`
- Dùng kế thừa `create()`, `update()` từ base class

### `src/app/services/shift-test-answer.service.ts`
- extends `IctuBaseServiceClass<ShiftTestAnswer>`, route `'shift-test-answers'`
- Dùng kế thừa `create()`, `update()` từ base class

### `src/app/services/form-detail.service.ts`
- extends `IctuBaseServiceClass<FormDetail>`, route `'form-details'`
- Method `getByFormId(formId: number, skill: string)` query form_id + skill

## Luồng xử lý trong ExamPlayComponent

### 1. Bắt đầu làm bài

```
ExamPlayComponent init
  → Query FormDetail (form_id + skill) → duration phút
  → Query ShiftTestState (shift_test_id + student_id + skill)
    → Nếu có: restore time_left, progress, completed
    → Nếu chưa: POST shift_test_state mới
  → Bắt đầu countdown timer
```

### 2. Countdown timer

```
setInterval 1s:
  examTimeLeftSeconds -= 1
  nếu ≤ 0 → auto submit
  mỗi 15s → PUT shift_test_state (time_left)
```

### 3. Chọn đáp án + Next

```
User upd() → lưu local
User next() / setActive()
  → saveCurrentAnswers():
    Duyệt parents → questions có answer thay đổi
    Nếu chưa có id → POST shift_test_answer
    Nếu đã có id và value khác → PUT shift_test_answer
```

### 4. Nộp bài

```
confirmSubmit()
  → saveCurrentAnswers() — lưu hết
  → PUT shift_test_state (completed, time_left=0)
  → score API → hiển thị điểm
```

## Files to create

| File | Purpose |
|------|---------|
| `src/app/models/shift-test-state.ts` | ShiftTestState interface |
| `src/app/models/form-detail.ts` | FormDetail interface |
| `src/app/services/shift-test-state.service.ts` | CRUD shift-test-states |
| `src/app/services/shift-test-answer.service.ts` | CRUD shift-test-answers |
| `src/app/services/form-detail.service.ts` | CRUD form-details |

## Files to modify

| File | Changes |
|------|---------|
| `src/app/pages/exam-play/exam-play.component.ts` | Thêm: timer, state sync, answer sync, form-detail lookup |
| `src/app/pages/exam-commitment/exam-commitment.component.ts` | Truyền thêm shiftId, formId, student, shiftTest xuống |

## New inputs cho ExamPlayComponent

```ts
readonly shiftId = input<number>(0);
readonly formId = input<number>(0);
readonly studentId = input<number>(0);
readonly shiftTestId = input<number>(0);
readonly studentCodeStr = input<string>('');
```

## Key methods thêm vào ExamPlayComponent

- `initTimer(minutes: number)` — khởi tạo countdown, setInterval 1s, mỗi 15s PUT
- `queryOrCreateState()` — tìm state cũ hoặc tạo mới
- `saveCurrentAnswers()` — duyệt questions, POST/PUT shift_test_answer
- `serializeStudentAnswer(q)` — chuyển answer → string
- `submitSkillTest()` — lưu hết + update state + score
- `postedAnswerKey`, `postedAnswerValue` — dedup tránh POST trùng

## Verification

1. Build: không lỗi
2. Chọn skill → POST shift_test_state
3. Timer chạy, mỗi 15s PUT time_left
4. Chọn answer → Next → POST shift_test_answer
5. Đổi answer → PUT shift_test_answer
6. Submit → lưu hết + hiển thị điểm
