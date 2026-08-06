import { Component, inject, OnInit, Type } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { take } from 'rxjs/operators';

import { ShiftTestService } from '@services/shift-test.service';
import { ExamPlayComponent } from './children/exam-play/exam-play.component';
import { SpeakingExamPlayComponent } from './children/speaking-exam-play/speaking-exam-play.component';

@Component({
    selector: 'app-skill-router',
    standalone: true,
    imports: [CommonModule],
    template: `
        <ng-container *ngComponentOutlet="component" />
    `,
})
export default class SkillRouterComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private shiftTestService = inject(ShiftTestService);
    component: Type<any> | null = null;

    ngOnInit(): void {
        const shiftTestIdParam = this.route.snapshot.queryParamMap.get('shiftTestId') || '';
        const shiftTestId = Number(shiftTestIdParam);
        if (/^[1-9]\d*$/.test(shiftTestIdParam) && Number.isSafeInteger(shiftTestId)) {
            this.shiftTestService.update(shiftTestId, { status: 1 }).pipe(take(1)).subscribe({
                error: () => {},
            });
        }

        this.route.params.pipe(take(1)).subscribe(params => {
            const skill = params['skill'] || '';
            this.component = skill === 'speaking'
                ? SpeakingExamPlayComponent
                : ExamPlayComponent;
        });
    }
}
