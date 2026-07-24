import { Component, inject, OnInit, Type } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { take } from 'rxjs/operators';

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
    component: Type<any> | null = null;

    ngOnInit(): void {
        this.route.params.pipe(take(1)).subscribe(params => {
            const skill = params['skill'] || '';
            this.component = skill === 'speaking'
                ? SpeakingExamPlayComponent
                : ExamPlayComponent;
        });
    }
}
