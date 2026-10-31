import React from 'react';
import {Theme} from '../types';

// The supplied originals have wide transparent margins. Frame them in CSS so
// the artwork remains untouched and readable at navigation sizes.
export function BrandLogo({theme, className=''}:{theme:Theme;className?:string}) {
  return <span className={`brand-logo ${className}`}>
    <img src="/brand/logo-originals/logo-transparent.png" className={theme==='dark'?'brand-logo-art brand-logo-art-dark':'brand-logo-art'} alt="PC-LEASE"/>
  </span>;
}
