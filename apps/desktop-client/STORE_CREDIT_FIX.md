# Store Credit Fix - Browser Console Komutu

## Tarayıcı Console'ına (F12) yapıştır:

```javascript
(async () => {
  console.log('🔧 Store Credit Fix başlıyor...\n');
  
  // Database'i import et
  const coreLogic = await import('@pulse/core-logic');
  const db = coreLogic.db;
  
  console.log('✅ Database bağlandı\n');
  
  // Müşterileri güncelle
  const updates = [
    { name: 'Jane Smith', credit: 100 },
    { name: 'John Doe', credit: 50 },
    { name: 'Ali Yılmaz', credit: 25 },
    { name: 'Ayşe Demir', credit: 60 }
  ];
  
  console.log('💰 Krediler güncelleniyor...\n');
  
  for (const update of updates) {
    const customer = await db.customers.where('name').equals(update.name).first();
    
    if (customer) {
      await db.customers.update(customer.id, {
        credit_balance: update.credit,
        updated_at: new Date().toISOString()
      });
      console.log(`✅ ${update.name}: ${update.credit} BGN`);
    } else {
      console.log(`⚠️ Bulunamadı: ${update.name}`);
    }
  }
  
  console.log('\n🎉 Tamamlandı! Krediler güncellendi!');
  console.log('\n📌 Şimdi:');
  console.log('1. POS ekranına git');
  console.log('2. Sepete ürün ekle');
  console.log('3. Jane Smith\'i seç (100 BGN kredisi var)');
  console.log('4. "Öde" butonuna tıkla');
  console.log('5. Store Credit artık görünecek! 🎉\n');
  
  // Güncellenmiş müşterileri göster
  const all = await db.customers.toArray();
  console.table(all.map(c => ({
    'İsim': c.name,
    'Kredi': `${(c.credit_balance || 0).toFixed(2)} BGN`,
    'Puan': c.points || c.loyalty_points || 0,
    'Tier': c.tier || 'bronze'
  })));
})();
```

## VEYA Tam Reset (Tüm veritabanını sil):

```javascript
(async () => {
  const coreLogic = await import('@pulse/core-logic');
  const db = coreLogic.db;
  await db.delete();
  console.log('✅ Database silindi! Sayfa yenileniyor...');
  setTimeout(() => location.reload(), 1000);
})();
```

## Kullanım:

1. **F12** tuşuna bas (Developer Tools açılır)
2. **Console** sekmesine git
3. Yukarıdaki kodu **kopyala-yapıştır**
4. **Enter** tuşuna bas
5. Sonuçları izle! ✅
