import { Component, computed, DestroyRef, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { switchMap, map, catchError, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthenticationService } from '@services/authentication.service';
import { StudentService } from '@services/student.service';
import { ShiftStudentService } from '@services/shift-student.service';
import { IctuQueryCondition } from '@models/dto';
import { DtoObject } from '@models/dto';
import { Student } from '@models/student';
import { ShiftStudentWithShift } from '@models/shift-student';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';

@Component({
    selector: 'app-student-info',
    standalone: true,
    imports: [CommonModule, LoadingProgressComponent],
    templateUrl: './student-info.component.html',
    styleUrls: ['./student-info.component.css'],
})
export default class StudentInfoComponent implements OnInit {
    private auth: AuthenticationService = inject(AuthenticationService);
    private studentService: StudentService = inject(StudentService);
    private shiftStudentService: ShiftStudentService = inject(ShiftStudentService);
    private router: Router = inject(Router);
    private destroyRef: DestroyRef = inject(DestroyRef);
    private title: Title = inject(Title);

    readonly state: WritableSignal<'loading' | 'error' | 'success'> = signal('loading');
    readonly student: WritableSignal<Student | null> = signal(null);
    readonly shiftRegistrations: WritableSignal<ShiftStudentWithShift[]> = signal([]);
    readonly userName: WritableSignal<string> = signal('');
    readonly loadingShiftId: WritableSignal<number | null> = signal(null);

    readonly errorMessage: WritableSignal<string> = signal('');

    readonly activeRegistrations = computed(() =>
        this.shiftRegistrations().filter(r => r.shift?.status === 1)
    );

    readonly shiftStudentCode = computed(() => {
        const regs = this.shiftRegistrations();
        return regs.length > 0 ? regs[0].student_code : '';
    });

    avatarSrc(): string {
        const s = this.student();
        if (s?.avatar) return s.avatar;
        const n = s?.id ? (s.id % 10) + 1 : 1;
        return `/images/user/avatar-${n}.jpg`;
    }

    ngOnInit(): void {
        this.title.setTitle('Thông tin sinh viên');
        this.loadData();
    }

    goToExam(reg: ShiftStudentWithShift): void {
        this.router.navigate(['/exam', reg.shift.id], {
            queryParams: {
                shiftName: reg.shift.name || '',
                studentCode: reg.student_code || '',
            }
        });
    }

    logout(): void {
        this.auth.logout();
    }

    loadData(): void {
        this.state.set('loading');
        this.errorMessage.set('');

        const user = this.auth.user;
        if (!user) {
            this.state.set('error');
            this.errorMessage.set('Bạn chưa đăng nhập. Đang chuyển hướng...');
            setTimeout(() => this.router.navigate(['/auth/login']), 1500);
            return;
        }

        this.userName.set(user.display_name || user.username || '');

        this.studentService.query(
            [
                {
                    conditionName: 'user_id',
                    condition: IctuQueryCondition.equal,
                    value: user.id.toString(),
                },
            ],
            { limit: 1 } 
        ).pipe(
            switchMap((res: DtoObject<Student[]>) => {
                const studentData = res.data?.[0];
                if (!studentData) {
                    throw new Error('STUDENT_NOT_FOUND');
                }
                this.student.set(studentData);
                return this.shiftStudentService.query(
                    [
                        {
                            conditionName: 'student_id',
                            condition: IctuQueryCondition.equal,
                            value: studentData.id.toString(),
                        },
                    ],
                    { with: 'shift' }
                );
            }),
            map((res: DtoObject<ShiftStudentWithShift[]>) => {
                this.shiftRegistrations.set(res.data ?? []);
                this.state.set('success');
            }),
            catchError((err: Error) => {
                this.state.set('error');
                if (err.message === 'STUDENT_NOT_FOUND') {
                    this.errorMessage.set('Không tìm thấy hồ sơ sinh viên của bạn.');
                } else {
                    this.errorMessage.set('Có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại sau.');
                }
                return of(null);
            }),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe();
    }
}
