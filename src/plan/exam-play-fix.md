# Plan: Fix exam-play.component.ts (3 skill) theo pattern của speaking-exam-play

## Context

`exam-play.component.ts` (dùng cho listening/reading/writing) đang có các lỗi giống hệt `speaking-exam-play.component.ts` trước khi sửa:
1. `lastTimeLeftSync = 0` → PUT `syncState` ngay lần interval đầu tiên
2. `state.set('success')` quá sớm (sau khi `questions.set`, chưa đợi answers load)
3. Progress merge thay vì replace khi restore từ server
4. Effect không có `qs.length > 0` guard → fire 2 lần khi init
5. `syncState` PUT cả `progress` + `time_left` (dư progress)
6. `loadFormDuration` trong route-state path gây duplicate API
7. `handleTimerAndState` chưa tồn tại (dùng `loadFormDuration` cũ)

Mục tiêu: áp dụng các fix giống speaking, khớp pattern.

---

## Thay đổi

### `exam-play.component.ts`

**1. `lastTimeLeftSync` — khởi tạo bằng `Date.now()`**
- Field declaration: `private lastTimeLeftSync = Date.now();` — ✅ đã sửa
- `resetAllState()`: `this.lastTimeLeftSync = Date.now();` — ✅ đã sửa

**2. Effect guard `qs.length > 0`**
- Effect: thêm `qs && qs.length > 0` — ✅ đã sửa

**3. `syncState` — chỉ PUT `time_left`**
- Bỏ `progress:` khỏi payload — ✅ đã sửa

**4. Progress merge khi restore từ server**
- Trong `handleTimerAndState`: hiện tại `this._progress = row.progress` (replace) — cần đổi thành merge

**5. `state.set('success')`**
- Route-state path: xóa `state.set('success')` khỏi questions subscribe — ✅ đã sửa
- `loadServerAnswersAndState`: thêm `state.set('success')` sau answers loaded — ✅ đã sửa

**6. F5 fallback path: xóa `state.set('success')` sớm**
- `ngOnInit` → F5 → `forkJoin` → `getQuestions` → `map` → đang có `this.state.set('success')` — xóa

**7. `loadFormDuration` xử lý duplicate**
- Route-state path: `loadFormDuration(st)` gọi sau questions subscribe — nó query state + formDetail + createState
- `loadServerAnswersAndState` (chạy từ effect) cũng query state
- Xóa `loadFormDuration(st)` khỏi route-state path, giống speaking

---

## Danh sách thay đổi cụ thể

| # | File | Dòng | Sửa |
|---|------|------|-----|
| 1 | exam-play.component.ts | ~224 (F5 map) | Xóa `this.state.set('success')` |
| 2 | exam-play.component.ts | ~173 (route-state) | Xóa `this.loadFormDuration(st)` |
| 3 | exam-play.component.ts | ~1244 (handleTimerAndState) | Merge progress thay vì replace |

## Verification

1. `ng build` — 0 lỗi
2. Vào skill listening/reading/writing → loading chờ answers load xong mới success
3. Timer không PUT ngay (15s sau mới PUT)
4. Progress không bị ghi đè (merge đúng)
5. Không duplicate API
