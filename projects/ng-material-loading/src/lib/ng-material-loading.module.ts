import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { NgMaterialLoadingDirective } from './ng-material-loading.directive';
import { ngMatLoadingConfig } from './ng-material-loading.tokens';
import { NgMatLoadingConfig } from './ng-material-loading.types';

@NgModule({
  declarations: [NgMaterialLoadingDirective],
  imports: [CommonModule, MatProgressBarModule, MatProgressSpinnerModule],
  exports: [NgMaterialLoadingDirective]
})
export class NgMaterialLoadingModule {
  static forRoot(config?: NgMatLoadingConfig): ModuleWithProviders<NgMaterialLoadingModule> {
    return {
      ngModule: NgMaterialLoadingModule,
      providers: [
        { provide: ngMatLoadingConfig, useValue: config || {} }
      ]
    };
  }
}
