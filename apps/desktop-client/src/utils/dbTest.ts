import { db } from '@pulse/core-logic';
import { v4 as uuidv4 } from 'uuid';

const SAMPLE_WORKSPACE_ID = '550e8400-e29b-41d4-a716-446655440000';

/**
 * Database Testing Utilities
 * Open browser console and type: window.dbTest.[functionName]()
 */
export const dbTest = {
  /**
   * Check database status
   */
  async checkDb() {
    console.log('🔍 Checking database...');
    try {
      await db.open();
      console.log('✅ Database:', db.name, 'Version:', db.verno);
      console.log('✅ Database is open');
      
      const tables = db.tables.map(t => t.name);
      console.log('📋 Tables:', tables);
      
      return { status: 'ok', name: db.name, version: db.verno, tables };
    } catch (error) {
      console.error('❌ Database error:', error);
      return { status: 'error', error };
    }
  },

  /**
   * List all cashiers
   */
  async listCashiers() {
    console.log('👥 Listing cashiers...');
    try {
      const cashiers = await db.cashiers.toArray();
      console.log(`Found ${cashiers.length} cashiers:`);
      cashiers.forEach(c => {
        console.log(`  ${c.is_active ? '✅' : '❌'} ${c.username} (${c.role}) - PIN: ${c.pin_code} ${c._deleted ? '[DELETED]' : ''}`);
      });
      return cashiers;
    } catch (error) {
      console.error('❌ Error:', error);
      return [];
    }
  },

  /**
   * Create default admin
   */
  async createAdmin() {
    console.log('🔑 Creating admin user...');
    try {
      const existing = await db.cashiers.where('username').equals('admin').first();
      
      if (existing) {
        console.log('⚠️ Admin already exists:', existing);
        return { status: 'exists', cashier: existing };
      }

      const adminId = uuidv4();
      await db.cashiers.add({
        id: adminId,
        workspace_id: SAMPLE_WORKSPACE_ID,
        username: 'admin',
        pin_code: '1234',
        full_name: 'Administrator',
        is_active: true,
        role: 'admin',
        created_at: new Date().toISOString(),
        _synced: false,
        _dirty: true,
      });

      console.log('✅ Admin created!');
      console.log('📋 Username: admin');
      console.log('📋 PIN: 1234');
      
      return { status: 'created' };
    } catch (error) {
      console.error('❌ Error:', error);
      return { status: 'error', error };
    }
  },

  /**
   * Test login
   */
  async testLogin(username: string = 'admin', pin: string = '1234') {
    console.log('🔐 Testing login...');
    console.log('Username:', username);
    console.log('PIN:', pin);
    
    try {
      const allCashiers = await db.cashiers.toArray();
      console.log('Total cashiers:', allCashiers.length);
      
      const cashier = allCashiers.find(c => 
        c.username.toLowerCase() === username.toLowerCase() &&
        c.pin_code === pin &&
        c.is_active &&
        !c._deleted
      );

      if (cashier) {
        console.log('✅ Login successful!');
        console.log('User:', cashier.full_name);
        console.log('Role:', cashier.role);
        return { status: 'success', cashier };
      } else {
        console.log('❌ Login failed');
        console.log('Looking for:', { username, pin });
        console.log('Available cashiers:');
        allCashiers.forEach(c => {
          console.log(`  - ${c.username} / ${c.pin_code} (active: ${c.is_active}, deleted: ${c._deleted})`);
        });
        return { status: 'failed' };
      }
    } catch (error) {
      console.error('❌ Error:', error);
      return { status: 'error', error };
    }
  },

  /**
   * Delete all cashiers (for testing)
   */
  async deleteAllCashiers() {
    console.log('🗑️ Deleting all cashiers...');
    try {
      const count = await db.cashiers.count();
      await db.cashiers.clear();
      console.log(`✅ Deleted ${count} cashiers`);
      return { status: 'ok', deleted: count };
    } catch (error) {
      console.error('❌ Error:', error);
      return { status: 'error', error };
    }
  },

  /**
   * Reset database (delete everything)
   */
  async resetDb() {
    console.log('⚠️ Resetting database...');
    const confirm = window.confirm('Are you sure you want to delete ALL data?');
    if (!confirm) {
      console.log('❌ Cancelled');
      return { status: 'cancelled' };
    }

    try {
      await db.delete();
      console.log('✅ Database deleted');
      console.log('🔄 Refresh the page to reinitialize');
      return { status: 'ok' };
    } catch (error) {
      console.error('❌ Error:', error);
      return { status: 'error', error };
    }
  }
};

// Make it available globally for console testing
if (typeof window !== 'undefined') {
  (window as typeof window & { dbTest: typeof dbTest }).dbTest = dbTest;
  console.log('🔧 Database test utilities loaded. Type "dbTest" in console to see available commands.');
  console.log('   dbTest.checkDb() - Check database status');
  console.log('   dbTest.listCashiers() - List all cashiers');
  console.log('   dbTest.createAdmin() - Create admin user');
  console.log('   dbTest.testLogin() - Test login with admin/1234');
  console.log('   dbTest.deleteAllCashiers() - Delete all cashiers');
  console.log('   dbTest.resetDb() - Reset entire database');
}
