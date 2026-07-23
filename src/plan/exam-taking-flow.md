# Plan: Exam-Taking Flow

## Sequence

```
Click shift (status=1) trên student-info
  → navigate /exam/:shiftId
  → state = 'loading'

  Bước 1 — Load bài thi (shift_tests):
    auth.user → StudentService.query(
      [{ conditionName: 'user_id', condition: IctuQueryCondition.equal, value: user.id.toString() }],
      { limit: 1 }
    ) → student.id

    ShiftTestService.query(
      [
        { conditionName: 'shift_id', condition: IctuQueryCondition.equal, value: shiftId.toString() },
        { conditionName: 'student_id', condition: IctuQueryCondition.equal, value: studentId.toString() }
      ],
      { limit: 1 }
    ) → ShiftTest (bài thi)

  Bước 2 — Hiển thị cam kết:
    state = 'commitment'

  Bước 3 — User click "Tôi cam kết":
    → ShiftTestService.getQuestions(shiftTest.id)
    → GET shift-tests/{id}/questions
    → res.data = BankQuestion[]
    → state = 'exam'
    → render câu hỏi

  (Nếu click "Quay lại" → navigate /student-info)
```

**Load bài thi → Cam kết → (sau cam kết mới) Load câu hỏi → Thi.**

## Files to Create

### 1. `src/app/models/shift-test.ts` — ShiftTest model
```ts
export interface ShiftTest extends IctuBaseModel {
    id: number;
    shift_id: number;
    student_id: number;
    form_id: number;
    test_num: number;
    score: number | null;
    status: number;
    time_start: string | null;
    time_end: string | null;
}
```

### 2. `src/app/services/shift-test.service.ts` — ShiftTestService
- extends `IctuBaseServiceClass<ShiftTest>`, route `'shift-tests'`
- `getQuestions(shiftTestId: number): Observable<BankQuestion[]>`
  - `this.http.get<DtoObject<BankQuestion[]>>(\`\${this.api}\${shiftTestId}/questions\`).pipe(map(r => r.data))`

### 3. `src/app/pages/exam/exam.component.ts` — ExamComponent
Standalone, default export (lazy load).

Signals: `state`, `student`, `shiftTest`, `questions`, `currentQuestionIndex`, `answers`, `errorMessage`

States: `'loading' | 'commitment' | 'exam' | 'error'`

`ngOnInit()`:
```
route.params.shiftId
  → StudentService.query(
      [{ conditionName: 'user_id', condition: IctuQueryCondition.equal, value: user.id.toString() }],
      { limit: 1 }
    ) → student
  → ShiftTestService.query(
      [
        { conditionName: 'shift_id', condition: IctuQueryCondition.equal, value: shiftId.toString() },
        { conditionName: 'student_id', condition: IctuQueryCondition.equal, value: studentId.toString() }
      ],
      { limit: 1 }
    ) → shiftTest
  → state = 'commitment'

`acceptCommitment()`:
```
ShiftTestService.getQuestions(shiftTest.id) → questions[]
  → state = 'exam'
```

`goBack()`: `router.navigate(['/student-info'])`

### 4. `src/app/pages/exam/exam.component.html`
- **loading**: spinner (`LoadingProgressComponent`)
- **commitment**: cam kết + "Tôi cam kết" → `acceptCommitment()` + "Quay lại" → `goBack()`
- **exam**: render từ questions. Support radio/checkbox/inputbox; còn lại placeholder
- **error**: message + retry + logout

### 5. `src/app/pages/exam/exam.component.css`

## Files to Modify

### 6. `src/app/pages/student-info/student-info.component.ts`
```ts
goToExam(shiftId: number): void {
    this.router.navigate(['/exam', shiftId]);
}
```

### 7. `src/app/pages/student-info/student-info.component.html`
- `<tr>` thêm `(click)="goToExam(reg.shift.id)"` + `style="cursor: pointer"` (chỉ active shift status=1)
- Status "Đang mở" → đổi thành link "Vào thi"

### 8. `src/app/app.routes.ts`
```ts
{
    path: 'exam/:shiftId',
    canActivate: [authGuard],
    loadComponent: () => import('@pages/exam/exam.component')
}
```

## Patterns (reuse student-info)
- Standalone, default export
- `inject()`, signals, `switchMap` → `catchError` → `takeUntilDestroyed`
- `DtoObject<T>`, `IctuQueryCondition.equal`, `IctuConditionParam`
- `LoadingProgressComponent`

## Verification
1. `ng serve` — compile ok
2. `/student-info` → click ca thi active → `/exam/{shiftId}`
3. Loading → ShiftTest loaded → commitment page
4. Click "Tôi cam kết" → API load questions → BankQuestion[] render
5. Click "Quay lại" → về student-info
6. Error → retry
