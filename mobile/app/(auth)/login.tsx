// mobile/app/(auth)/login.tsx
import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator
} from 'react-native'
import { router } from 'expo-router'
import { signIn } from '../../lib/supabase'

export default function LoginScreen() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert('Error', 'Please enter email and password')
    setLoading(true)
    const { error } = await signIn(email.trim(), password)
    setLoading(false)
    if (error) Alert.alert('Login Failed', error.message)
    else router.replace('/(tabs)/home')
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.inner}>
        {/* Logo */}
        <Text style={s.logo}>nova<Text style={s.logoAccent}>Fit</Text></Text>
        <Text style={s.tagline}>AI-powered fitness, built for you</Text>

        {/* Form */}
        <View style={s.form}>
          <Text style={s.label}>Email</Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#555"
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            importantForAutofill="yes"
            autoCorrect={false}
          />

          <Text style={s.label}>Password</Text>
          <TextInput
            style={s.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#555"
            secureTextEntry
            textContentType="password"
            autoComplete="current-password"
            importantForAutofill="yes"
            autoCorrect={false}
          />

          <TouchableOpacity style={s.btn} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Log In</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
            <Text style={s.link}>Don't have an account? <Text style={s.linkAccent}>Sign Up</Text></Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#0A0A0F' },
  inner:       { flex: 1, justifyContent: 'center', padding: 28 },
  logo:        { fontSize: 42, fontWeight: '800', color: '#fff', textAlign: 'center', letterSpacing: -1 },
  logoAccent:  { color: '#6C63FF' },
  tagline:     { color: '#888', textAlign: 'center', marginBottom: 40, fontSize: 15 },
  form:        { gap: 12 },
  label:       { color: '#ccc', fontSize: 14, marginBottom: 2 },
  input:       { backgroundColor: '#1A1A2E', color: '#fff', borderRadius: 14, padding: 16, fontSize: 16, borderWidth: 1, borderColor: '#2A2A3E' },
  btn:         { backgroundColor: '#6C63FF', borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 8 },
  btnText:     { color: '#fff', fontWeight: '700', fontSize: 16 },
  link:        { color: '#888', textAlign: 'center', marginTop: 16, fontSize: 14 },
  linkAccent:  { color: '#6C63FF', fontWeight: '600' }
})
