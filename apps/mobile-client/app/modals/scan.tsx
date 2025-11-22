import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { Button, StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getProductByBarcode } from '../../lib/db';

export default function ScanModal() {
  const [permission, requestPermission] = useCameraPermissions();
  const router = useRouter();
  const [scanned, setScanned] = useState(false);

  if (!permission) {
    // Camera permissions are still loading.
    return <View />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet.
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="grant permission" />
      </View>
    );
  }

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);
    
    try {
      const product = getProductByBarcode(data);
      
      if (product) {
        Alert.alert(
          "Product Found",
          `${product.name}\nPrice: $${product.sale_price}`,
          [
            { text: "Cancel", style: "cancel", onPress: () => setScanned(false) },
            { text: "Add to Cart", onPress: () => {
              // TODO: Add to cart logic
              setScanned(false);
            }}
          ]
        );
      } else {
        Alert.alert(
          "Not Found",
          `No product found with barcode: ${data}`,
          [{ text: "OK", onPress: () => setScanned(false) }]
        );
      }
    } catch (error) {
      console.error(error);
      setScanned(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView 
        style={styles.camera} 
        facing="back"
        onBarcodeScanned={handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr", "ean13", "ean8", "upc_e", "upc_a"],
        }}
      >
        <View style={styles.overlay}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
            <Text style={styles.title}>Scan Barcode</Text>
          </View>
          
          <View style={styles.finderContainer}>
            <View style={styles.finder} />
          </View>

          <View style={styles.footer}>
            <Text style={styles.hint}>Align barcode within the frame</Text>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'black',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
    color: 'white',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  closeButton: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 20,
  },
  finderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  finder: {
    width: 280,
    height: 280,
    borderWidth: 2,
    borderColor: '#3b82f6', // Blue-500
    backgroundColor: 'transparent',
    borderRadius: 20,
  },
  footer: {
    paddingBottom: 50,
    alignItems: 'center',
  },
  hint: {
    color: 'white',
    fontSize: 16,
    opacity: 0.8,
  },
});
