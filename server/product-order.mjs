// Keep the database's existing order for models with the same or no explicit position.
export function sortProducts(products){
 const position=p=>Number.isSafeInteger(p.displayOrder)&&p.displayOrder>=0&&p.displayOrder<=999999?p.displayOrder:Number.POSITIVE_INFINITY;
 return products.sort((a,b)=>position(a)-position(b));
}
