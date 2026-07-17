import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TbTaoPhanHoiComponent } from './tb-tao-phan-hoi.component';

describe('TbTaoPhanHoiComponent', () => {
  let component: TbTaoPhanHoiComponent;
  let fixture: ComponentFixture<TbTaoPhanHoiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TbTaoPhanHoiComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TbTaoPhanHoiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
