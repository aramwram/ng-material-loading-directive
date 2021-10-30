import { InjectionToken } from '@angular/core';

import { NgMatLoadingConfig } from './ng-material-loading.types';

export const ngMatLoadingConfig = new InjectionToken<NgMatLoadingConfig>(
  'ng-material-loading-config'
);
