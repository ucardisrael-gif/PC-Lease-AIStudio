import React from 'react';
import { Laptop, Monitor } from 'lucide-react';
import { Language, LaptopProduct } from '../types';
import { INITIAL_PRODUCTS } from '../data/initialProducts';
import { ZoomImage } from './ZoomImage';

const confirmedModels = new Set(['prod-dell-5420', 'prod-dell-7410', 'prod-dell-7420', 'prod-hp-840g4', 'prod-lenovo-x1g6']);
// Seed descriptions for other devices have not been confirmed by the owner.
export const specsConfirmed = (product: LaptopProduct) => {
  if (typeof product.detailsConfirmed === 'boolean') return product.detailsConfirmed;
  if (!confirmedModels.has(product.id)) return false;
  const original = INITIAL_PRODUCTS.find(p => p.id === product.id);
  if (!original) return false;
  return product.model === original.model && product.operatingSystem === original.operatingSystem &&
    JSON.stringify(product.description) === JSON.stringify(original.description) &&
    product.cpu.family === original.cpu.family && product.cpu.generation === original.cpu.generation &&
    product.cpu.exactModel === original.cpu.exactModel && product.ramGB === original.ramGB &&
    product.storage.capacityGB === original.storage.capacityGB && product.storage.type === original.storage.type &&
    product.screen.diagonalInches === original.screen.diagonalInches && product.screen.touch === original.screen.touch;
};

export function ProductImage({ product, lang, zoomable = true }: { product: LaptopProduct; lang: Language; zoomable?: boolean }) {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [product.id, product.imagePath]);
  const examples: Record<string, string> = {
    'prod-dell-5420': '/brand/examples/dell-5420.jpg',
    'prod-dell-7410': '/brand/examples/dell-7410.jpg',
    'prod-dell-7420': '/brand/examples/dell-7420.jpg',
    'prod-hp-840g4': '/brand/examples/hp-840g4.jpg',
    'prod-lenovo-x1g6': '/brand/examples/lenovo-x1g6.jpg',
    'prod-dell-optiplex-micro': '/brand/examples/dell-7080.jpg',
    'prod-lenovo-m720q': '/brand/examples/lenovo-m720q.jpg',
  };
  const original = INITIAL_PRODUCTS.find(p => p.id === product.id);
  const custom = product.imageVerified === true && product.imagePath;
  const example = original && original.model === product.model ? examples[product.id] : undefined;
  const source = custom || example;
  if (source && !failed) {const alt=(custom && product.imageAlt?.[lang]?.trim()) || product.title[lang];const thumbnail=!custom&&example?example.replace('/examples/','/examples/normalized/').replace(/\.[^.]+$/,'.webp'):source;return zoomable?<ZoomImage src={source} thumbnailSrc={thumbnail} alt={alt} lang={lang} example={!custom} onError={()=>setFailed(true)}/>:<img src={thumbnail} alt={alt} className="h-full w-full object-contain" loading="lazy" onError={()=>setFailed(true)}/>;}
  const Icon = product.category === 'desktop' ? Monitor : Laptop;
  return <div className="flex flex-col items-center justify-center gap-3 text-center text-[var(--text-secondary)]"><Icon aria-hidden="true" className="w-16 h-16 opacity-60" /><span className="text-sm">{lang === 'he' ? 'תמונת הדגם טרם אושרה' : 'Model photo not yet confirmed'}</span></div>;
}
