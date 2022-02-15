import {
  ComponentFactory,
  ComponentFactoryResolver,
  ComponentRef,
  Directive,
  ElementRef,
  Inject,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  Optional,
  PLATFORM_ID,
  Renderer2,
  ViewContainerRef,
} from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatSpinner } from '@angular/material/progress-spinner';
import { take } from 'rxjs/operators';
import { ngMatLoadingConfig } from './ng-material-loading.tokens';
import { NgMatLoadingConfig } from './ng-material-loading.types';

@Directive({
  selector: '[ngMatLoading]',
})
export class NgMaterialLoadingDirective implements OnInit, OnDestroy {
  @Input() set ngMatLoadingContentOpacity(value: number) {
    this.config.opacity = coerceNumberProperty(value);
  }

  @Input() set ngMatLoadingDiameter(value: number) {
    this.config.diameter = coerceNumberProperty(value);
  }

  @Input() set ngMatLoadingFreeze(value: boolean) {
    this.config.freeze = coerceBooleanProperty(value);
  }

  @Input() set ngMatLoadingColor(value: 'primary' | 'warn' | 'accent') {
    this.config.color = value;
  }

  @Input() set ngMatLoadingType(value: 'spinner' | 'progress') {
    this.config.type = value;
  }

  @Input() ngMatLoadingAttacheTo: string;

  @Input() set ngMatLoading(value: boolean) {
    const ngMatLoading = coerceBooleanProperty(value);

    if (this._ngMatLoading === ngMatLoading) {
      return;
    }

    this._ngMatLoading = ngMatLoading;

    if (!this.initialised) {
      return;
    }

    if (this.ngMatLoading) {
      this.imposeLoading();
    } else {
      this.executeOnStableZone(() => this.removeLoading());
    }
  }

  get ngMatLoading(): boolean {
    return this._ngMatLoading;
  }

  private initialised = false;

  private _ngMatLoading = false;
  private componentRef: ComponentRef<MatProgressBar | MatSpinner>;
  private prevHostPosition: string;
  private prevHostPointerEvents: string;
  private prevChildrenStyle: Map<HTMLElement, { opacity: number }> = new Map();
  private loadingElement: HTMLElement;
  private config: NgMatLoadingConfig;

  get compRef(): MatProgressBar | MatSpinner {
    const compRef = this.config.type === 'spinner'
      ? this.componentRef.injector.get(MatSpinner)
      : this.componentRef.injector.get(MatProgressBar);

    compRef.color = this.config.color;

    return compRef;
  }

  get factory(): ComponentFactory<MatProgressBar | MatSpinner> {
    return this.config.type === 'spinner'
      ? this.componentFactoryResolver.resolveComponentFactory(MatSpinner)
      : this.componentFactoryResolver.resolveComponentFactory(MatProgressBar);
  }

  constructor(
    private target: ViewContainerRef,
    private elRef: ElementRef<HTMLElement>,
    private componentFactoryResolver: ComponentFactoryResolver,
    private renderer: Renderer2,
    private zone: NgZone,
    @Inject(PLATFORM_ID) private platformId: string,
    @Optional() @Inject(ngMatLoadingConfig) private ngMatLoadingConfig: NgMatLoadingConfig
  ) {
    this.config = {
      opacity: 0.3,
      diameter: 40,
      color: 'primary',
      type: 'spinner',
      attacheTo: {
        'mat-form-field': '.mat-form-field-wrapper'
      },
      freeze: true,
      ...this.ngMatLoadingConfig
    };
  }

  ngOnInit(): void {
    this.initialised = true;

    if (this.ngMatLoading) {
      this.imposeLoading();
    } else {
      this.removeLoading();
    }
  }

  ngOnDestroy(): void {
    this.removeLoading();
  }

  private imposeLoading(): void {
    if (
      isPlatformServer(this.platformId) ||
      this.componentRef
    ) {
      return;
    }

    const diameter =
      this.config.diameter ||
      Math.max(
        this.elRef.nativeElement.offsetHeight,
        this.elRef.nativeElement.offsetWidth
      );

    this.componentRef = this.target.createComponent(this.factory);

    if (this.config.type === 'spinner') {
      (this.componentRef.instance as MatSpinner).diameter = diameter;
    } else {
      this.componentRef.instance.mode = 'indeterminate';
      this.renderer.setStyle(this.elRef.nativeElement, 'min-height', '4px');
    }

    this.loadingElement = this.compRef._elementRef.nativeElement;

    this.prevHostPosition = this.elRef.nativeElement.style.position;
    this.renderer.setStyle(this.elRef.nativeElement, 'position', 'relative');

    if (this.config.freeze) {
      this.prevHostPointerEvents = this.elRef.nativeElement.style.pointerEvents;
      this.renderer.setStyle(this.elRef.nativeElement, 'pointer-events', 'none');
    }

    this.executeOnStableZone(() => {
      this.renderer.appendChild(
        this.elRef.nativeElement,
        this.loadingElement
      );

      this.renderer.setStyle(this.loadingElement, 'position', this.config.type === 'spinner' ? 'absolute' : 'sticky');

      this.renderer.setStyle(
        this.loadingElement,
        'left',
        this.config.type === 'spinner' ? `calc((100% - ${diameter}px) / 2)` : '0px'
      );
      this.renderer.setStyle(
        this.loadingElement,
        'bottom',
        this.config.type === 'spinner' ? `calc((100% - ${diameter}px) / 2)` : '0px'
      );
      this.renderer.setStyle(this.loadingElement, 'width', 'unset');

      if (this.config.type === 'spinner') {
        this.renderer.setStyle(this.loadingElement, 'width', `${diameter}px`);
        this.renderer.setStyle(
          this.loadingElement,
          'height',
          `${diameter}px`
        );
      } else {
        this.renderer.setStyle(this.loadingElement, 'min-height', '4px');
        this.renderer.setStyle(this.loadingElement, 'width', '100%');
      }

      (Array.from(this.elRef.nativeElement.children) as HTMLElement[]).forEach(
        (child: HTMLElement) => {
          if (
            child.nodeType !== Node.ELEMENT_NODE ||
            ['mat-progress-bar', 'mat-spinner'].includes(
              child.tagName.toLocaleLowerCase()
            )
          ) {
            return;
          }

          this.prevChildrenStyle.set(child, {
            opacity: child.style.opacity ? Number(child.style.opacity) : null,
          });

          this.renderer.setStyle(child, 'opacity', this.config.opacity);
        }
      );

      let attacheTo = this.ngMatLoadingAttacheTo;

      if (!attacheTo && this.config.attacheTo) {
        attacheTo = this.config.attacheTo[this.elRef.nativeElement.tagName.toLocaleLowerCase()];
      }

      if (attacheTo) {
        const newParent = this.elRef.nativeElement.querySelector(attacheTo);

        if (newParent) {
          newParent.appendChild(this.loadingElement);
        }
      }
    });
  }

  private removeLoading(): void {
    if (
      isPlatformServer(this.platformId) ||
      !this.componentRef
    ) {
      return;
    }

    this.renderer.removeStyle(this.elRef.nativeElement, 'position');

    if (this.config.freeze) {
      this.renderer.removeStyle(this.elRef.nativeElement, 'pointer-events');
    }

    if (this.prevHostPosition) {
      this.renderer.setStyle(
        this.elRef.nativeElement,
        'position',
        this.prevHostPosition
      );
    }

    if (this.prevHostPointerEvents) {
      this.renderer.setStyle(
        this.elRef.nativeElement,
        'pointer-events',
        this.prevHostPointerEvents
      );
    }

    (Array.from(this.elRef.nativeElement.children) as HTMLElement[]).forEach(
      (child: HTMLElement) => {
        if (
          child.nodeType !== Node.ELEMENT_NODE ||
          child.tagName === 'mat-progress-bar' ||
          !this.prevChildrenStyle.has(child)
        ) {
          return;
        }

        this.renderer.removeStyle(child, 'opacity');

        const style = this.prevChildrenStyle.get(child);

        if (style.opacity) {
          this.renderer.setStyle(child, 'opacity', style.opacity);
        }
      }
    );

    this.renderer.removeChild(this.elRef.nativeElement, this.loadingElement);
    this.componentRef.destroy();
    this.componentRef = null;

    this.loadingElement.remove();
  }

  private executeOnStableZone(fn: () => any): void {
    if (this.zone.isStable) {
      fn();
    } else {
      this.zone.onStable.asObservable().pipe(take(1)).subscribe(fn);
    }
  }
}
