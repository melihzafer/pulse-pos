import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function QuickActionModal() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backdrop} onPress={() => router.back()} />
      
      <View style={styles.content}>
        <Text style={styles.title}>Quick Actions</Text>
        
        <View style={styles.grid}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => {
              router.back();
              router.push('/modals/scan');
            }}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#3b82f6' }]}>
              <Ionicons name="barcode-outline" size={32} color="white" />
            </View>
            <Text style={styles.actionText}>Scan Item</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <View style={[styles.iconContainer, { backgroundColor: '#10b981' }]}>
              <Ionicons name="cart-outline" size={32} color="white" />
            </View>
            <Text style={styles.actionText}>New Sale</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <View style={[styles.iconContainer, { backgroundColor: '#f59e0b' }]}>
              <Ionicons name="add-circle-outline" size={32} color="white" />
            </View>
            <Text style={styles.actionText}>Add Product</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#64748b" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  content: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#0f172a',
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  actionButton: {
    alignItems: 'center',
    gap: 8,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
  },
  closeButton: {
    alignSelf: 'center',
    padding: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 24,
  },
});
