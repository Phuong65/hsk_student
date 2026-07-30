# Plan: Bookmark / Đánh dấu câu hỏi trong exam-play

## Context

Exam-play (3 skill listening/reading/writing) cần tính năng đánh dấu câu hỏi để user có thể quay lại sau.

## Thay đổi

### exam-play.component.ts

**Thêm state:**
```ts
readonly bookmarkedIds: WritableSignal<Set<string>> = signal(new Set());
readonly showBookmarkedOnly: WritableSignal<boolean> = signal(false);
```

**Thêm methods:**
```ts
toggleBookmark(q: any): void {
    const key = this.questionKey(q);
    const s = new Set(this.bookmarkedIds());
    if (s.has(key)) s.delete(key); else s.add(key);
    this.bookmarkedIds.set(s);
}

isBookmarked(q: any): boolean {
    return this.bookmarkedIds().has(this.questionKey(q));
}

toggleBookmarkFilter(): void {
    this.showBookmarkedOnly.update(v => !v);
}

getBookmarkedParents(): QV[] {
    return this.parents().filter(p => this.isBookmarked(p));
}
```

**Reset trong `resetAllState`:**
```ts
this.bookmarkedIds.set(new Set());
this.showBookmarkedOnly.set(false);
```

### exam-play.component.html

**1. Question panel sidebar** — thêm tab "Đã đánh dấu" + mặc định mở:

```html
@if (questionPanelOpen()) {
    <aside class="question-panel">
        <div class="question-panel__head">
            <h2>Danh sách câu hỏi</h2>
            <button type="button" class="question-panel__close" (click)="questionPanelOpen.set(false)"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="question-panel__tabs">
            <button type="button" [class.active]="!showBookmarkedOnly()" (click)="showBookmarkedOnly.set(false)">Tất cả</button>
            <button type="button" [class.active]="showBookmarkedOnly()" (click)="showBookmarkedOnly.set(true)">
                <i class="fa-regular fa-bookmark"></i> Đã đánh dấu ({{ bookmarkedIds().size }})
            </button>
        </div>
        <div class="question-panel__body">
            @if (!showBookmarkedOnly()) {
                @for (pg of getGroupedByPart(); track pg.part) {
                    ... (giữ nguyên cấu trúc hiện tại)
                }
            }
            @if (showBookmarkedOnly()) {
                @for (q of getBookmarkedParents(); track q.id) {
                    <button type="button" class="question-list-item"
                        [class.active]="currentParentIndex() === q._globalIndex"
                        (click)="setActiveParent(q._globalIndex!, 'menu')">
                        <div><strong>{{ getQuestionRange(q) }}</strong></div>
                    </button>
                }
                @if (getBookmarkedParents().length === 0) {
                    <div class="panel-empty">Chưa có câu hỏi nào được đánh dấu</div>
                }
            }
        </div>
    </aside>
}
```

**2. Nút đánh dấu trên mỗi câu cha** — thêm icon bookmark vào article:

```html
<article class="question-page-card" [class.question-page-card--active]="currentParent()===p" [class.question-page-card--hidden]="currentParent()!==p">
    <div class="question-page-card__header">
        <div class="question-number-badge" ...
        <button type="button" class="bookmark-btn" [class.bookmarked]="isBookmarked(p)" (click)="toggleBookmark(p)">
            <i class="fa-regular fa-bookmark"></i>
        </button>
    </div>
    ...
```

### exam-play.component.css

**Thêm CSS:**
```css
.question-panel__tabs { display: flex; border-bottom: 1px solid #e5e7eb; padding: 0 12px; gap: 0; }
.question-panel__tabs button { flex: 1; padding: 10px 8px; border: none; background: none; font-size: 13px; font-weight: 600; color: #6b7280; cursor: pointer; border-bottom: 2px solid transparent; }
.question-panel__tabs button.active { color: #4b3193; border-bottom-color: #4b3193; }
.panel-empty { padding: 24px; text-align: center; color: #9ca3af; font-size: 13px; }
.question-page-card__header { display: flex; align-items: center; justify-content: space-between; }
.bookmark-btn { width: 36px; height: 36px; border: 1px solid #d1d5db; border-radius: 6px; background: #fff; color: #9ca3af; cursor: pointer; display: grid; place-items: center; font-size: 16px; }
.bookmark-btn:hover { border-color: #f59e0b; color: #f59e0b; }
.bookmark-btn.bookmarked { border-color: #f59e0b; color: #f59e0b; background: #fffbeb; }
```

---

## Không thay đổi

- `speaking-exam-play.component.ts/.html` — không cần bookmark cho speaking
- `audio-player.component.ts` — không đổi
- Data models, services — không đổi

---

## Verification

1. `ng build` — 0 lỗi
2. Vào skill listening/reading/writing → thấy nút bookmark bên cạnh badge câu
3. Click bookmark → icon vàng, đếm tăng
4. Mở sidebar → thấy tab "Tất cả" và "Đã đánh dấu"
5. Click "Đã đánh dấu" → chỉ hiển thị câu đã bookmark
6. Sidebar mở mặc định
