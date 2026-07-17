import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TbThongKeComponent } from './tb-thong-ke.component';

describe('TbThongKeComponent', () => {
  let component: TbThongKeComponent;
  let fixture: ComponentFixture<TbThongKeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TbThongKeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TbThongKeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
