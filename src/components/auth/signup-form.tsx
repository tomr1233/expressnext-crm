'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'

interface SignUpFormProps {
  onSuccess?: () => void
  onSwitchToLogin?: () => void
}

export function SignUpForm({ onSuccess, onSwitchToLogin }: SignUpFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [confirmationCode, setConfirmationCode] = useState('')
  const { signUp, confirmSignUp } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    setLoading(true)

    try {
      await signUp(email, password)
      setShowConfirmation(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred during sign up')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmation = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await confirmSignUp(email, confirmationCode, password)
      onSuccess?.()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred during confirmation')
    } finally {
      setLoading(false)
    }
  }

  if (showConfirmation) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Confirm Your Account</CardTitle>
          <CardDescription>
            Enter the confirmation code sent to your email
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleConfirmation} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="confirmationCode">Confirmation Code</Label>
              <Input
                id="confirmationCode"
                type="text"
                placeholder="Enter confirmation code"
                value={confirmationCode}
                onChange={(e) => setConfirmationCode(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Account
            </Button>
            <Button
              type="button"
              variant="link"
              className="w-full"
              onClick={() => setShowConfirmation(false)}
              disabled={loading}
            >
              Back to sign up
            </Button>
          </form>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign Up</CardTitle>
        <CardDescription>
          Create a new account to get started
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign Up
          </Button>
          {onSwitchToLogin && (
            <Button
              type="button"
              variant="link"
              className="w-full"
              onClick={onSwitchToLogin}
              disabled={loading}
            >
              Already have an account? Sign in
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  )
}