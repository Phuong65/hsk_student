import {
  Component,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  input,
  inject,
  ChangeDetectorRef,
} from '@angular/core';

import { Subscription } from 'rxjs';
import { IctuFileService } from '@app/services/ictu-file.service';

@Component({
  selector: 'app-simmer-image-component',
  standalone: true,
  imports: [],
  templateUrl: './simmer-image-component.html',
  styleUrls: ['./simmer-image-component.css'],
})
export class SimmerImageComponent implements AfterViewInit, OnDestroy {
  idFile = input.required<number>();
  idPage = input.required<number>();

  loading = true;
  imageUrl: string | null = null;

  private fileService = inject(IctuFileService);
  private cd = inject(ChangeDetectorRef);
  private observer!: IntersectionObserver;
  private sub?: Subscription;

  ngAfterViewInit(): void {
    const target = this.el.nativeElement.querySelector('.shimmer-image-wrapper');
    if (!target) return;

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.loadImage();
            this.observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '200px' }
    );

    this.observer.observe(target);
  }

  private loadImage(): void {
    const fileId = this.idFile();
    const page = this.idPage();
    if (!fileId || !page) return;

    this.loading = true;
    this.imageUrl = null;
    this.cd.detectChanges();

    this.sub = this.fileService.getLinkMediaPdfPage(fileId, page).subscribe({
      next: (url) => {
        this.imageUrl = url;
        this.cd.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cd.detectChanges();
      },
    });
  }

  onImageLoad(): void {
    this.loading = false;
    this.cd.detectChanges();
  }

  onImageError(): void {
    this.loading = false;
    this.imageUrl = null;
    this.cd.detectChanges();
  }

  constructor(private el: ElementRef) {}

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.observer?.disconnect();
  }
}
