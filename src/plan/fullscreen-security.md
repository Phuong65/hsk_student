# Plan: Fullscreen mặc định + Khóa DevTools khi vào router làm bài

## Context

Hiện tại fullscreen chỉ bật khi user đồng ý (qua `securityWarningVisible` trong commitment). User muốn: khi vào bất kỳ router làm bài nào (`exam/:shiftId/:skill`), tự động:
1. Bật fullscreen ngay lập tức
2. Khóa DevTools (F12, right-click, Ctrl+Shift+I, Ctrl+U, Ctrl+Shift+J)
3. Khi cố gắng thoát fullscreen (Esc) → hiển thị cảnh báo yêu cầu ở lại

## Thay đổi

### Tạo file mới: `src/app/guards/exam-security.guard.ts`

```ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const examSecurityGuard: CanActivateFn = (route, state) => {
    // Kích hoạt fullscreen + khóa DevTools
    requestFullscreen();
    enableDevToolsLock();
    return true;
};

function requestFullscreen(): void {
    if (document.fullscreenElement || !document.documentElement.requestFullscreen) return;
    document.documentElement.requestFullscreen().catch(() => {});
}

function enableDevToolsLock(): void {
    // Chặn right-click
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    // Chặn phím tắt DevTools
    document.addEventListener('keydown', (e) => {
        // F12
        if (e.key === 'F12') { e.preventDefault(); return; }
        // Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+U
        if (e.ctrlKey && e.shiftKey && ['I','J'].includes(e.key.toUpperCase())) { e.preventDefault(); return; }
        if (e.ctrlKey && e.key.toUpperCase() === 'U') { e.preventDefault(); return; }
        // Escape → cảnh báo
        if (e.key === 'Escape' && document.fullscreenElement) {
            e.preventDefault();
            // Hiển thị overlay cảnh báo (dispatch event để component bắt)
            window.dispatchEvent(new CustomEvent('exam:fullscreen-escape'));
        }
    });
}
```

### Sửa `src/app/app.routes.ts`

Thêm `examSecurityGuard` vào các route làm bài:

```ts
{
    path: 'exam/:shiftId/:skill',
    canActivate: [authGuard, examSecurityGuard],
    loadComponent: () => import('@pages/exam-play/skill-router.component')
}
```

### Sửa `exam-play.component.ts` và `speaking-exam-play.component.ts`

**Thêm listener cho escape event:**

Trong `ngOnInit` hoặc constructor:
```ts
this._escapeHandler = () => {
    this.securityEscapeVisible.set(true);
};
window.addEventListener('exam:fullscreen-escape', this._escapeHandler);
```

**Thêm signal + overlay:**
```ts
readonly securityEscapeVisible: WritableSignal<boolean> = signal(false);
```

**Template của exam-play và speaking-exam-play** — thêm overlay cảnh báo khi bấm Esc:

```html
@if (securityEscapeVisible()) {
    <div class="submit-confirm-overlay">
        <div class="submit-confirm-dialog">
            <i class="fa-solid fa-triangle-exclamation" style="color:#dc2626"></i>
            <h2>Không thể thoát toàn màn hình</h2>
            <p>Bạn cần ở chế độ toàn màn hình để làm bài thi. Vui lòng không thoát.</p>
            <div class="submit-confirm-actions" style="grid-template-columns:1fr">
                <button type="button" class="submit-confirm-button submit-confirm-button--primary" (click)="resumeFullscreen()">Tiếp tục</button>
            </div>
        </div>
    </div>
}
```

**Thêm method:**
```ts
resumeFullscreen(): void {
    this.securityEscapeVisible.set(false);
    document.documentElement.requestFullscreen().catch(() => {});
}
```

**Cleanup trong ngOnDestroy:**
```ts
window.removeEventListener('exam:fullscreen-escape', this._escapeHandler);
```

### index.html — thêm meta để ngăn open in iframe (tùy chọn)

```html
<meta http-equiv="Content-Security-Policy" content="frame-ancestors 'none';">
```

---

## Không thay đổi

- `exam-commitment.component.ts/.html` — giữ nguyên (không thay đổi fullscreen hiện tại)
- Các route khác không bị ảnh hưởng (guard chỉ áp dụng cho route làm bài)
- Data models, services

---

## Verification

1. `ng build` — 0 lỗi
2. Vào bất kỳ skill làm bài (listening/reading/writing/speaking) → tự động fullscreen
3. Bấm F12 → không mở DevTools
4. Right-click → không hiện menu
5. Ctrl+Shift+I → không mở DevTools
6. Bấm Esc → hiện overlay cảnh báo, bấm "Tiếp tục" → resume fullscreen
7. Thoát khỏi bài thi → fullscreen tắt (browser tự thoát khi navigate)
