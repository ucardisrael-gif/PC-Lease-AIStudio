import React from 'react';
import {Theme} from '../types';

// Approved PL laptop assets are tightly framed and have a dedicated dark variant.
export function BrandLogo({theme, className=''}:{theme:Theme;className?:string}) {
  return <span className={`brand-logo ${className}`}>
    <img src={theme==='dark'?'/brand/current/logo-dark.svg':'/brand/current/logo.svg'} className={theme==='dark'?'brand-logo-art brand-logo-art-dark':'brand-logo-art'} alt="PC-LEASE" width="1000" height="260"/>
  </span>;
}
