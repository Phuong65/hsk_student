# Plan: Fix local answer persistence + POST on navigation

## Context

Hiện tại khi chọn đáp án và navigate sang câu khác rồi quay lại, đáp án không được restore. Cần:

1. **Local persistence**: đáp án lưu local, khi back về câu cũ phải hiển thị đúng đáp án đã chọn (radio, select, inputbox, textarea)
2. **POST on Sau/menu click**: khi bấm "Sau" hoặc chọn câu trong menu → gọi API `shift_test_answers` POST (server tự xử lý)

## Vấn đề hiện tại

- `localAnswers` là `WritableSignal<Map<string, any>>` — mỗi `updateLocalAnswer` tạo Map mới, signal fires, template re-renders. Lý thuyết đúng, nhưng thực tế không persist.
- `questionKey(q)` dùng `String(q.id || q.bank_question_id)` — ổn định, không phụ thuộc `_viewKey`.
- `saveCurrentQuestionAnswers` gọi trong `setActiveParent` — giống bản gốc.

## Nguyên nhân

`localAnswers` dùng signal `Map<string,any>`. Template đọc `answerValue(q)` → `localAnswers().get(key)`. Khi `updateLocalAnswer` tạo Map mới, signal fires. Angular change detection chạy, template re-evaluates `answerValue(q)` → đọc từ Map mới → trả về giá trị. **Cơ chế đúng.**

Vấn đề thực tế: `answerValue(q)` dùng `questionKey(q)` ở template, nhưng `q` trong template là biến của `@for` loop. Mỗi lần re-render, Angular tạo lại các biến template. `q.id` là property trên object, không thay đổi → key ổn định.

**Lý do thực sự:** `localAnswers` là signal nhưng template không đọc trực tiếp `localAnswers()` — nó đọc qua method `answerValue(q)`. Khi Angular chạy change detection (sau DOM event), nó re-evaluate tất cả bindings → `answerValue(q)` gọi `localAnswers()` → lấy Map mới → `get(key)` trả về value. **Phải hoạt động.**

Nếu không hoạt động, nguyên nhân là `questionKey(q)` trong `updateLocalAnswer` khác với `questionKey(q)` trong `answerValue`. Cụ thể: template nhận `q` là `let-q="q"` từ `#qc`. Khi `updateLocalAnswer(q, v)` gọi `questionKey(q)`, `q` là child question object. Khi `answerValue(q)` gọi `questionKey(q)`, `q` là cùng object (từ template). Key phải giống nhau.

## Fix

### 1. Đảm bảo `questionKey` ổn định

```ts
questionKey(q: any): string {
    // Luôn dùng id — ổn định nhất
    const id = q?.id;
    if (id) return String(id);
    return String(q?.bank_question_id || q?.question_number || 0);
}
```

### 2. Force change detection

Thêm `detectChanges` trigger bằng cách đọc signal trong template:

```html
<!-- Hidden span để Angular biết localAnswers signal thay đổi -->
<span style="display:none">{{ localAnswers() }}</span>
```

Điều này buộc Angular re-evaluate `localAnswers()` mỗi khi signal fires → template re-renders toàn bộ.

### 3. `saveCurrentQuestionAnswers` giống bản gốc

Giữ nguyên pattern: gọi `saveQuestionAnswer` cho mỗi question khi navigate. Dùng `takeUntilDestroyed` fire-and-forget.

### 4. Select phải dùng native `<select>` với `[value]` và `(change)`

Hiện tại đã dùng native select. Cần đảm bảo `[value]="answerValue(q)||''"` hoạt động.

Khi `localAnswers` signal fires, `answerValue(q)` re-evaluate → trả về đáp án → `[value]` binding cập nhật DOM.

## Files to modify

### `src/app/pages/exam-play/exam-play.component.ts`
- `questionKey()` — chỉ dùng `id`, không fallback `_viewKey`
- `updateLocalAnswer()` — thêm dòng force signal read để trigger CD
- `loadStateAndTimer()` — không cần chỉnh

### `src/app/pages/exam-play/exam-play.component.html`
- Thêm `{{ localAnswers() }}` hidden span
- Đảm bảo tất cả `(change)`/`(input)` events gọi `updateLocalAnswer`

## Verification

1. Chọn radio → sang câu khác → quay lại → radio vẫn chọn
2. Select chọn option → back → đúng option
3. Inputbox gõ text → back → text còn
4. Textarea gõ → back → text còn
5. Bấm "Sau" → POST shift_test_answer (check network)
6. Bấm menu câu khác → POST shift_test_answer
