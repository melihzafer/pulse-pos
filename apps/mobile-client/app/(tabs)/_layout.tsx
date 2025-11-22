import { Tabs, useRouter } from 'expo-router';
import { View, TouchableOpacity, StyleSheet } from 'react-native';

export default function TabLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#00f3ff',
        tabBarInactiveTintColor: '#94a3b8',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }: { color: string }) => <TabBarIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Inventory',
          tabBarIcon: ({ color }: { color: string }) => <TabBarIcon name="package" color={color} />,
        }}
      />
      <Tabs.Screen
        name="pulse"
        listeners={() => ({
          tabPress: (e) => {
            e.preventDefault();
            router.push('/modals/quick-action');
          },
        })}
        options={{
          title: '',
          tabBarIcon: () => <PulseButton />,
          tabBarButton: (props: any) => <TouchableOpacity {...props} />,
        }}
      />
    </Tabs>
  );
}

// Simple icon component (replace with actual icons later)
function TabBarIcon({ name, color }: { name: string; color: string }) {
  return (
    <View style={[styles.icon, { borderColor: color }]}>
      <View style={[styles.iconDot, { backgroundColor: color }]} />
    </View>
  );
}

// Floating Pulse Button (center FAB)
function PulseButton() {
  return (
    <View style={styles.pulseButtonContainer}>
      <View style={styles.pulseButton}>
        <View style={styles.pulseButtonInner} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderTopWidth: 0,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  icon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pulseButtonContainer: {
    width: 70,
    height: 70,
    marginTop: -30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#00f3ff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00f3ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 10,
  },
  pulseButtonInner: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#0f172a',
  },
});
