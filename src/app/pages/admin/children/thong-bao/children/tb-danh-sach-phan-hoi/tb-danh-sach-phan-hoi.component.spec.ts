import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TbDanhSachPhanHoiComponent } from './tb-danh-sach-phan-hoi.component';

describe('TbDanhSachPhanHoiComponent', () => {
  let component: TbDanhSachPhanHoiComponent;
  let fixture: ComponentFixture<TbDanhSachPhanHoiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TbDanhSachPhanHoiComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TbDanhSachPhanHoiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
