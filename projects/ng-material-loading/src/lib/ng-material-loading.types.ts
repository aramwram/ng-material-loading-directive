export interface NgMatLoadingConfig {
  opacity?: number;
  diameter?: number;
  color?: 'primary' | 'warn' | 'accent';
  type?: 'spinner' | 'progress';
  attacheTo?: { [key: string]: string; } // host to target map
}
