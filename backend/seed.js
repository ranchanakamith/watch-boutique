import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { openDatabase, insertProduct } from './db.js';
import { transaction } from './commerce.js';
export function seedCatalog(db) {
  const catalog = JSON.parse(readFileSync(new URL('./catalog.json', import.meta.url), 'utf8'));
  return transaction(db, () => {
    let added = 0;
    for (const { id, ...item } of catalog.products) {
      const key = `dummyjson:${id}`;
      if (db.prepare('SELECT 1 FROM catalog_imports WHERE source_key = ?').get(key)) continue;
      const product = insertProduct(db, { ...item, discountPercentage: 0, rating: 0, description: `[Sample catalog] ${item.description}` });
      db.prepare('INSERT INTO catalog_imports (source_key, product_id) VALUES (?, ?)').run(key, product.id);
      added++;
    }
    return added;
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const db = openDatabase();
  try { console.log(`Imported ${seedCatalog(db)} sample watches. Existing listings were preserved.`); }
  finally { db.close(); }
}
