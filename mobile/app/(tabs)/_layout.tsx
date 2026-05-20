// mobile/app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router'
import { View, StyleSheet } from 'react-native'
import Svg, { Path, Circle, Rect } from 'react-native-svg'

function HomeIcon({ color }: { color: string }) {
  return <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M3 12L12 3L21 12V21H15V15H9V21H3V12Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
  </Svg>
}
function DumbellIcon({ color }: { color: string }) {
  return <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Rect x="2" y="10" width="3" height="4" rx="1" stroke={color} strokeWidth={1.8} />
    <Rect x="19" y="10" width="3" height="4" rx="1" stroke={color} strokeWidth={1.8} />
    <Rect x="5" y="8" width="3" height="8" rx="1" stroke={color} strokeWidth={1.8} />
    <Rect x="16" y="8" width="3" height="8" rx="1" stroke={color} strokeWidth={1.8} />
    <Path d="M8 12H16" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
}
function ForkIcon({ color }: { color: string }) {
  return <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2V8M12 8C12 10.2 10.5 12 8.5 12H7V22M17 2V6C17 7.1 16.1 8 15 8H13V22" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
}
function ChatIcon({ color }: { color: string }) {
  return <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M21 15C21 16.1046 20.1046 17 19 17H7L3 21V5C3 3.89543 3.89543 3 5 3H19C20.1046 3 21 3.89543 21 5V15Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    <Path d="M8 10H16M8 13H13" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
}
function CameraIcon({ color }: { color: string }) {
  return <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M23 19C23 20.1 22.1 21 21 21H3C1.9 21 1 20.1 1 19V8C1 6.9 1.9 6 3 6H7L9 3H15L17 6H21C22.1 6 23 6.9 23 8V19Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    <Circle cx="12" cy="13" r="4" stroke={color} strokeWidth={1.8} />
  </Svg>
}
function ProfileIcon({ color }: { color: string }) {
  return <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth={1.8} />
    <Path d="M4 21C4 17.134 7.58172 14 12 14C16.4183 14 20 17.134 20 21" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
}
function LogIcon({ color }: { color: string }) {
  return <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="18" height="18" rx="3" stroke={color} strokeWidth={1.8} />
    <Path d="M7 8H17M7 12H14M7 16H11" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    <Circle cx="17" cy="16" r="2.5" stroke={color} strokeWidth={1.5} />
    <Path d="M16 16L16.8 16.8" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
}

const ACTIVE = '#7C5CFC'
const INACTIVE = '#444455'

function TabIcon({ children }: { children: React.ReactNode }) {
  return <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 2 }}>{children}</View>
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: {
        backgroundColor: '#0D0D14',
        borderTopColor: '#1A1A2A',
        borderTopWidth: 1,
        height: 70,
        paddingBottom: 12,
        paddingTop: 8,
      },
      tabBarActiveTintColor: ACTIVE,
      tabBarInactiveTintColor: INACTIVE,
      tabBarLabelStyle: { fontSize: 10, fontWeight: '600', letterSpacing: 0.3, marginTop: 2 },
    }}>
      <Tabs.Screen name="home"    options={{ title: 'Home',      tabBarIcon: ({ color }) => <TabIcon><HomeIcon    color={color} /></TabIcon> }} />
      <Tabs.Screen name="workout" options={{ title: 'Train',     tabBarIcon: ({ color }) => <TabIcon><DumbellIcon color={color} /></TabIcon> }} />
      <Tabs.Screen name="diet"    options={{ title: 'Nutrition', tabBarIcon: ({ color }) => <TabIcon><ForkIcon    color={color} /></TabIcon> }} />
      <Tabs.Screen name="log"     options={{ title: 'Daily Log', tabBarIcon: ({ color }) => <TabIcon><LogIcon     color={color} /></TabIcon> }} />
      <Tabs.Screen name="chat"    options={{ title: 'AI Coach',  tabBarIcon: ({ color }) => <TabIcon><ChatIcon    color={color} /></TabIcon> }} />
      <Tabs.Screen name="camera"  options={{ title: 'Scan',      tabBarIcon: ({ color }) => <TabIcon><CameraIcon  color={color} /></TabIcon> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile',   tabBarIcon: ({ color }) => <TabIcon><ProfileIcon color={color} /></TabIcon> }} />
    </Tabs>
  )
}

const styles = StyleSheet.create({})
