import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TbDanhSachThongBaoComponent } from './tb-danh-sach-thong-bao.component';

describe('TbDanhSachThongBaoComponent', () => {
  let component: TbDanhSachThongBaoComponent;
  let fixture: ComponentFixture<TbDanhSachThongBaoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TbDanhSachThongBaoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TbDanhSachThongBaoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
