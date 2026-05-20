// mobile/app/(auth)/signup.tsx
import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ScrollView
} from 'react-native'
import { router } from 'expo-router'
import { signUp } from '../../lib/supabase'

export default function SignupScreen() {
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSignup = async () => {
    if (!name || !email || !password) return Alert.alert('Error', 'Please fill all fields')
    if (password.length < 6) return Alert.alert('Error', 'Password must be at least 6 characters')
    setLoading(true)
    const { error } = await signUp(email.trim(), password, name.trim())
    setLoading(false)
    if (error) Alert.alert('Signup Failed', error.message)
    else router.replace('/(auth)/onboarding/step1-goal')
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.inner} showsVerticalScrollIndicator={false}>
        <Text style={s.logo}>nova<Text style={s.logoAccent}>Fit</Text></Text>
        <Text style={s.subtitle}>Create your account</Text>

        <View style={s.form}>
          <Text style={s.label}>Full Name</Text>
          <TextInput style={s.input} value={name} onChangeText={setName} placeholder="John Doe" placeholderTextColor="#555" />

          <Text style={s.label}>Email</Text>
          <TextInput style={s.input} value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor="#555" autoCapitalize="none" keyboardType="email-address" />

          <Text style={s.label}>Password</Text>
          <TextInput style={s.input} value={password} onChangeText={setPassword} placeholder="••••••••" placeholderTextColor="#555" secureTextEntry />

          <TouchableOpacity style={s.btn} onPress={handleSignup} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Create Account →</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()}>
            <Text style={s.link}>Already have an account? <Text style={s.linkAccent}>Log In</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#0A0A0F' },
  inner:       { flexGrow: 1, justifyContent: 'center', padding: 28, paddingTop: 60 },
  logo:        { fontSize: 36, fontWeight: '800', color: '#fff', textAlign: 'center', letterSpacing: -1 },
  logoAccent:  { color: '#6C63FF' },
  subtitle:    { color: '#888', textAlign: 'center', marginBottom: 36, fontSize: 16 },
  form:        { gap: 12 },
  label:       { color: '#ccc', fontSize: 14, marginBottom: 2 },
  input:       { backgroundColor: '#1A1A2E', color: '#fff', borderRadius: 14, padding: 16, fontSize: 16, borderWidth: 1, borderColor: '#2A2A3E' },
  btn:         { backgroundColor: '#6C63FF', borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 8 },
  btnText:     { color: '#fff', fontWeight: '700', fontSize: 16 },
  link:        { color: '#888', textAlign: 'center', marginTop: 16, fontSize: 14 },
  linkAccent:  { color: '#6C63FF', fontWeight: '600' }
})
