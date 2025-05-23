'use client'

import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter, useParams } from 'next/navigation'
import { useState, useEffect } from 'react'

export function UpdatePasswordForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
    passwordsMatch: boolean;
  }>({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false,
    passwordsMatch: false,
  })
  const router = useRouter()
  const { lang } = useParams() as { lang: string }

  // Validate password as user types
  useEffect(() => {
    setValidationErrors({
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
      passwordsMatch: password === confirmPassword && password !== '',
    })
  }, [password, confirmPassword])

  // Check if all validation criteria are met
  const isPasswordValid = () => {
    return Object.values(validationErrors).every(value => value === true)
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate password before submission
    if (!isPasswordValid()) {
      setError('Please ensure your password meets all requirements')
      return
    }

    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      // Redirect to dashboard after successful password update
      router.push(`/${lang}/dashboard`)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Reset Your Password</CardTitle>
          <CardDescription>Please enter your new password below.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleForgotPassword}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="New password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-describedby="password-requirements"
                />
                <div id="password-requirements" className="text-xs space-y-1 mt-2">
                  <p className="font-medium">Password requirements:</p>
                  <ul className="space-y-1 pl-5 list-disc">
                    <li className={validationErrors.minLength ? "text-green-600" : "text-gray-500"}>
                      At least 8 characters
                    </li>
                    <li className={validationErrors.hasUppercase ? "text-green-600" : "text-gray-500"}>
                      At least one uppercase letter
                    </li>
                    <li className={validationErrors.hasLowercase ? "text-green-600" : "text-gray-500"}>
                      At least one lowercase letter
                    </li>
                    <li className={validationErrors.hasNumber ? "text-green-600" : "text-gray-500"}>
                      At least one number
                    </li>
                    <li className={validationErrors.hasSpecialChar ? "text-green-600" : "text-gray-500"}>
                      At least one special character
                    </li>
                  </ul>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                {confirmPassword && !validationErrors.passwordsMatch && (
                  <p className="text-xs text-red-500">Passwords do not match</p>
                )}
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || !isPasswordValid()}
              >
                {isLoading ? 'Saving...' : 'Save new password'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
