import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';

export const examSecurityGuard: CanActivateFn = () => {
    requestFullscreen();
    enableDevToolsLock();
    return true;
};

function requestFullscreen(): void {
    if (document.fullscreenElement || !document.documentElement.requestFullscreen) return;
    document.documentElement.requestFullscreen().catch(() => {});
}

function enableDevToolsLock(): void {
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F12') { e.preventDefault(); return; }
        if (e.ctrlKey && e.shiftKey && ['I', 'J'].includes(e.key.toUpperCase())) { e.preventDefault(); return; }
        if (e.ctrlKey && e.key.toUpperCase() === 'U') { e.preventDefault(); return; }
        if (e.key === 'Escape' && document.fullscreenElement) {
            e.preventDefault();
            window.dispatchEvent(new CustomEvent('exam:fullscreen-escape'));
        }
    });
    // Phát hiện khi user thoát fullscreen (F11, nút OS title bar, Alt+F4...)
    let wasFullscreen = false;
    document.addEventListener('fullscreenchange', () => {
        if (wasFullscreen && !document.fullscreenElement) {
            window.dispatchEvent(new CustomEvent('exam:fullscreen-escape'));
        }
        wasFullscreen = !!document.fullscreenElement;
    });
}
