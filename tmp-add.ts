    readonly micTestResult: WritableSignal<string> = signal('');

    testMic(): void {
        this.micTestResult.set('');
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
            stream.getTracks().forEach(t => t.stop());
            this.micTestResult.set('ok');
            setTimeout(() => this.micTestResult.set(''), 3000);
        }).catch(() => {
            this.micTestResult.set('fail');
            setTimeout(() => this.micTestResult.set(''), 3000);
        });
    }

    skillLabel(s: string): string { return { listening: 'Nghe', reading: 'Đọc', writing: 'Viết', speaking: 'Nói' }[s] || s; }
