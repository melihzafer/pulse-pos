import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { getProducts, getTodaySales, getLowStockProducts } from '../../lib/db';
import { Product, Sale } from '@pulse/core-logic';

export default function DashboardScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [todaySales, setTodaySales] = useState<Sale[]>([]);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [prods, sales, lowStock] = await Promise.all([
        getProducts(),
        getTodaySales(),
        getLowStockProducts(),
      ]);
      setProducts(prods);
      setTodaySales(sales);
      setLowStockCount(lowStock.length);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const todayRevenue = todaySales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
  const transactionCount = todaySales.length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00f3ff" />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.subtitle}>Welcome to Pulse Mobile</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Today's Sales</Text>
            <Text style={styles.cardValue}>{todayRevenue.toFixed(2)} BGN</Text>
            <Text style={styles.cardSubtext}>{transactionCount} transactions</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Total Products</Text>
            <Text style={styles.cardValue}>{products.length}</Text>
            <Text style={styles.cardSubtext}>in inventory</Text>
          </View>

          <View style={[styles.card, lowStockCount > 0 && styles.cardWarning]}>
            <Text style={styles.cardTitle}>Low Stock Items</Text>
            <Text style={[styles.cardValue, lowStockCount > 0 && styles.warningText]}>
              {lowStockCount}
            </Text>
            {lowStockCount > 0 && (
              <Text style={styles.cardSubtext}>⚠️ Needs attention</Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  card: {
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  cardWarning: {
    borderColor: 'rgba(251, 146, 60, 0.3)',
  },
  cardTitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00f3ff',
  },
  warningText: {
    color: '#fb923c',
  },
  cardSubtext: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
});
