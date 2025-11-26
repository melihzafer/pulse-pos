// Force database re-seed with store credit data
// Run this in browser console (F12) after opening the app

(async function forceReseed() {
  console.log('🔄 Force re-seeding database...');
  
  const { db, seedDatabase } = await import('@pulse/core-logic');
  
  // Clear all data
  console.log('🗑️  Clearing products and customers...');
  await db.products.clear();
  await db.customers.clear();
  
  // Re-seed
  console.log('📦 Seeding with new data (including store credit)...');
  await seedDatabase();
  
  // Verify
  const customers = await db.customers.toArray();
  console.log('\n✅ Customers with credit:');
  customers.forEach(c => {
    if (c.credit_balance > 0) {
      console.log(`  - ${c.name}: ${c.credit_balance} BGN`);
    }
  });
  
  console.log('\n🎉 Re-seed complete! Refresh the page (F5).');
})();
