import { Component, inject, OnInit, signal, WritableSignal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { switchMap, map, catchError, of, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthenticationService } from '@services/authentication.service';
import { StudentService } from '@services/student.service';
import { ShiftTestService } from '@services/shift-test.service';
import { ShiftService } from '@services/shift.service';
import { IctuQueryCondition } from '@models/dto';
import { DtoObject } from '@models/dto';
import { Student } from '@models/student';
import { ShiftTest } from '@models/shift-test';
import { Shift } from '@models/shift';
import { BankQuestion } from '@models/bank-question';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';


type State = 'loading' | 'commitment' | 'skill-select' | 'error';

@Component({
    selector: 'app-exam-commitment',
    standalone: true,
    imports: [CommonModule, LoadingProgressComponent],
    templateUrl: './exam-commitment.component.html',
    styleUrls: ['./exam-commitment.component.css'],
})
export default class ExamCommitmentComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private auth = inject(AuthenticationService);
    private studentService = inject(StudentService);
    private shiftTestService = inject(ShiftTestService);
    private shiftService = inject(ShiftService);
    private destroyRef = inject(DestroyRef);
    private title = inject(Title);

    readonly state: WritableSignal<State> = signal('loading');
    readonly errorMessage: WritableSignal<string> = signal('');
    readonly shiftName: WritableSignal<string> = signal('');
    readonly studentCode: WritableSignal<string> = signal('');
    readonly agreed: WritableSignal<boolean> = signal(false);
    readonly groupedQuestions: WritableSignal<Map<string, BankQuestion[]>> = signal(new Map());
    readonly shiftId: WritableSignal<number> = signal(0);
    readonly student = signal<Student | null>(null);
    readonly shiftTest = signal<ShiftTest | null>(null);
    readonly shift = signal<Shift | null>(null);
    readonly skillOrder: string[] = ['listening', 'reading', 'writing', 'speaking'];

    readonly securityWarningVisible: WritableSignal<boolean> = signal(false);
    readonly micTestResult: WritableSignal<string> = signal('');
    readonly securityWarningMessage: WritableSignal<string> = signal('');
    readonly violationCount: WritableSignal<number> = signal(0);

    ngOnInit(): void {
        this.title.setTitle('Thi');
        this.loadExam();
    }

    loadExam(): void {
        this.state.set('loading');
        this.errorMessage.set('');
        const user = this.auth.user;
        if (!user) { this.state.set('error'); this.errorMessage.set('Bạn chưa đăng nhập.'); setTimeout(() => this.router.navigate(['/auth/login']), 1500); return; }

        this.route.params.pipe(
            map(params => {
                const shiftId = params['shiftId'];
                if (!shiftId) throw new Error('Mã ca thi không hợp lệ.');
                this.shiftId.set(+shiftId);
                this.shiftName.set(this.route.snapshot.queryParams['shiftName'] || '');
                this.studentCode.set(this.route.snapshot.queryParams['studentCode'] || '');
                return +shiftId;
            }),
            switchMap(shiftId => this.studentService.query(
                [{ conditionName: 'user_id', condition: IctuQueryCondition.equal, value: user.id.toString() }],
                { limit: 1 }
            ).pipe(
                map((res: DtoObject<Student[]>) => {
                    const d = res.data?.[0];
                    if (!d) throw new Error('STUDENT_NOT_FOUND');
                    this.student.set(d);
                    return { shiftId, studentId: d.id };
                })
            )),
            switchMap(({ shiftId, studentId }) => this.shiftTestService.query(
                [
                    { conditionName: 'shift_id', condition: IctuQueryCondition.equal, value: shiftId.toString() },
                    { conditionName: 'student_id', condition: IctuQueryCondition.equal, value: studentId.toString() },
                ],
                { limit: 1 }
            ).pipe(
                map((res: DtoObject<ShiftTest[]>) => {
                    const d = res.data?.[0];
                    if (!d) throw new Error('SHIFT_TEST_NOT_FOUND');
                    this.shiftTest.set(d);
                    return { shiftId, studentId };
                })
            )),
            switchMap(({ shiftId, studentId }) => this.shiftService.query(
                [{ conditionName: 'id', condition: IctuQueryCondition.equal, value: shiftId.toString() }],
                { limit: 1 }
            ).pipe(
                map((res: any) => {
                    const d = res.data?.[0] || res?.[0] || null;
                    if (d) this.shift.set(d);
                    return { shiftId, studentId };
                }),
                catchError(() => of({ shiftId, studentId }))
            )),
            tap(() => this.state.set('commitment')),
            catchError((err: Error) => {
                this.state.set('error');
                if (err.message === 'STUDENT_NOT_FOUND') this.errorMessage.set('Không tìm thấy hồ sơ sinh viên của bạn.');
                else if (err.message === 'SHIFT_TEST_NOT_FOUND') this.errorMessage.set('Không tìm thấy bài thi cho ca thi này.');
                else this.errorMessage.set('Có lỗi xảy ra. Vui lòng thử lại sau.');
                return of(null);
            }),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe();
    }

    acceptCommitment(): void {
        const st = this.shiftTest();
        if (!st) return;
        const map = new Map<string, BankQuestion[]>();
        for (const sk of this.skillOrder) {
            map.set(sk, []);
        }
        this.groupedQuestions.set(map);
        this.state.set('skill-select');
    }

    selectSkill(skill: string): void {
        const st = this.shiftTest();
        if (!st) return;
        this.router.navigate(['/exam', this.shiftId(), skill], {
            queryParams: {
                shiftTestId: st.id,
                shiftName: this.shiftName(),
                studentCode: this.studentCode(),
            },
            state: {
                shift: this.shift(),
                student: this.student(),
                shiftTest: st,
            }
        });
    }

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
    toggleAgreement(): void { this.agreed.update(v => !v); }
    goBack(): void { this.router.navigate(['/student-info']); }
    logout(): void { this.auth.logout(); }
    continueFullscreen(): void { this.securityWarningVisible.set(false); void this.enterFullscreen(); }
    private async enterFullscreen(): Promise<void> {
        if (document.fullscreenElement || !document.documentElement.requestFullscreen) return;
        try { await document.documentElement.requestFullscreen(); } catch { this.securityWarningMessage.set('Trình duyệt chưa cho phép vào toàn màn hình.'); this.securityWarningVisible.set(true); }
    }
}
