import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { BehaviorSubject, fromEvent, Observable, of, Subject } from 'rxjs';
import { delay, filter, map, mergeMap, scan, takeUntil, tap, throttleTime, withLatestFrom } from 'rxjs/operators';

const PAGE_SIZE = 15;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements AfterViewInit, OnDestroy {
  @ViewChild('recordsContainer') recordsContainer: ElementRef<HTMLDivElement>;

  loading$ = new BehaviorSubject<boolean>(false);
  recordsLoading$ = new BehaviorSubject<boolean>(false);
  page$ = new BehaviorSubject<number>(0);
  records$ = this.page$.pipe(
    filter((page) => page < 10),
    tap(() => this.recordsLoading$.next(true)),
    mergeMap((page) => this.getRecords(page)),
    tap(() => this.recordsLoading$.next(false)),
    withLatestFrom(this.page$),
    scan((acc, [records, page]) => page ? [...acc, ...records] : records, [])
  );
  inputFormCtl = this.formBuilder.control('Some text');
  selectFormCtl = this.formBuilder.control(1);

  private unsubscribe$ = new Subject<void>();

  constructor(private formBuilder: FormBuilder) {
    console.log(this);
  }

  ngAfterViewInit(): void {
    fromEvent(this.recordsContainer.nativeElement, 'scroll')
      .pipe(
        map(() => this.recordsContainer.nativeElement),
        mergeMap((element) => of(element.scrollHeight - element.clientHeight - element.scrollTop < 15)),
        filter((event) => !!event && !this.recordsLoading$.value),
        throttleTime(50),
        takeUntil(this.unsubscribe$)
      )
      .subscribe(() => this.page$.next(this.page$.value + 1));
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  toggleLoading(): void {
    this.loading$.next(!this.loading$.value);
    this.recordsLoading$.next(!this.recordsLoading$.value);
  }

  private getRecords(page: number): Observable<string[]> {
    const records = [];

    for (let idx = page * PAGE_SIZE + 1; idx < page * PAGE_SIZE + PAGE_SIZE + 1; idx = idx + 1) {
      records.push(`Record ${idx}`);
    }

    return of(records).pipe(delay(1500));
  }
}
