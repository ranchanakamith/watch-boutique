import { openDatabase, insertProduct } from './db.js';

const db = openDatabase();
try {
  db.exec('BEGIN IMMEDIATE');
  if (db.prepare('SELECT count(*) AS count FROM products').get().count > 0) {
    console.log('Products already exist; seed skipped.');
  } else {
    for (const [title, price, brand, category, stock] of [
      ['Heritage Automatic', 1250, 'Boutique', 'mens-watches', 12],
      ['Classic Chronograph', 850, 'Boutique', 'mens-watches', 20],
      ['Ocean Sport', 650, 'Boutique', 'mens-watches', 18],
      ['Rose Elegance', 980, 'Atelier', 'womens-watches', 10],
      ['Silver Petite', 490, 'Atelier', 'womens-watches', 25],
      ['Midnight Dress', 720, 'Atelier', 'womens-watches', 15],
    ]) insertProduct(db, { title, price, brand, category, stock, description: `${title}: a sample timepiece for your boutique. Replace this demonstration listing with your actual product details.`, discountPercentage: 0, rating: 0, thumbnail: '/sample-watch.svg', images: ['/sample-watch.svg'] });
    console.log('Created six demonstration products.');
  }
  db.exec('COMMIT');
} catch (error) { db.exec('ROLLBACK'); throw error; }
finally { db.close(); }
