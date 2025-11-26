// Store Credit Fix Script
// Copy this ENTIRE file content and paste into browser console (F12)

(async () => {
  console.log('🔧 Starting Store Credit Fix...\n');
  
  try {
    // Import database
    const { db } = await import('/src/../../../packages/core-logic/src/database/dexieDb.ts');
    
    console.log('✅ Database imported successfully\n');
    
    // Check current customers
    const customers = await db.customers.toArray();
    console.log(`📋 Found ${customers.length} customers in database\n`);
    
    // Update credit balances
    const updates = [
      { name: 'Jane Smith', credit: 100 },
      { name: 'John Doe', credit: 50 },
      { name: 'Ali Yılmaz', credit: 25 },
      { name: 'Ayşe Demir', credit: 60 }
    ];
    
    console.log('💰 Updating credit balances...\n');
    
    for (const update of updates) {
      const customer = await db.customers.where('name').equals(update.name).first();
      
      if (customer) {
        await db.customers.update(customer.id, {
          credit_balance: update.credit,
          updated_at: new Date().toISOString()
        });
        console.log(`✅ ${update.name}: ${update.credit} BGN`);
      } else {
        console.log(`⚠️  Customer not found: ${update.name}`);
      }
    }
    
    console.log('\n🎉 Done! Credit balances updated successfully!');
    console.log('\n📌 Next steps:');
    console.log('1. Go to POS screen');
    console.log('2. Add items to cart');
    console.log('3. Select customer (Jane Smith has 100 BGN credit)');
    console.log('4. Click Pay button');
    console.log('5. Store Credit section should now appear!\n');
    
    // Show updated customers
    const updatedCustomers = await db.customers.toArray();
    console.table(updatedCustomers.map(c => ({
      Name: c.name,
      Credit: `${(c.credit_balance || 0).toFixed(2)} BGN`,
      Points: c.points || c.loyalty_points || 0,
      Tier: c.tier || 'bronze'
    })));
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.log('\n💡 Try alternative method:');
    console.log('Delete database and reload:');
    console.log('  const { db } = await import("@pulse/core-logic");');
    console.log('  await db.delete();');
    console.log('  location.reload();');
  }
})();
