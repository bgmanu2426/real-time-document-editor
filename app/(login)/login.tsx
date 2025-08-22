'use client';

import Link from 'next/link';
import { useActionState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { signIn, signUp } from './actions';
import { ActionState } from '@/lib/auth/middleware';
import useSWR, { mutate } from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function Login({ mode = 'signin' }: { mode?: 'signin' | 'signup' }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const redirect = searchParams.get('redirect');
  const priceId = searchParams.get('priceId');
  const inviteId = searchParams.get('inviteId');
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    mode === 'signin' ? signIn : signUp,
    { error: '' }
  );

  // Check if user is already logged in
  const { data: user, error } = useSWR('/api/user', fetcher);

  // If user is already logged in, redirect them
  useEffect(() => {
    if (user && !error) {
      console.log('User is already logged in, redirecting...');
      router.push(redirect || '/');
    }
  }, [user, error, redirect, router]);

  // If user is already logged in, show a loading state
  if (user && !error) {
    return (
      <div className="min-h-[100dvh] relative flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-background via-background to-secondary/20">
        <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-purple-600 rounded-full blur-lg opacity-75 animate-pulse"></div>
              <div className="relative bg-gradient-to-r from-primary to-purple-600 p-3 rounded-full">
                <img src="/favicon.ico" alt="ReDocz" className="h-8 w-8 relative z-10" />
              </div>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-4">Welcome back!</h2>
          <p className="text-muted-foreground mb-4">You're already signed in. Redirecting...</p>
          <div className="flex justify-center">
            <Loader2 className="animate-spin h-6 w-6 text-primary" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] relative flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-background via-background to-secondary/20">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/10 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-72 h-72 bg-purple-500/10 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/5 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-pulse animation-delay-4000"></div>
      </div>
      
      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-purple-600 rounded-full blur-lg opacity-75 animate-pulse"></div>
            <div className="relative bg-gradient-to-r from-primary to-purple-600 p-3 rounded-full">
              <img src="/favicon.ico" alt="ReDocz" className="h-8 w-8 relative z-10" />
            </div>
          </div>
        </div>
        <div className="text-center space-y-2 mb-8">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
            {mode === 'signin'
              ? 'Welcome back'
              : 'Join us today'}
          </h2>
          <p className="text-muted-foreground text-lg">
            {mode === 'signin'
              ? 'Sign in to continue your collaborative journey'
              : 'Create your account and start collaborating'}
          </p>
        </div>
      </div>

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="backdrop-blur-xl bg-background/80 border border-border/20 rounded-2xl p-8 shadow-2xl">
          <form className="space-y-6" action={formAction}>
          <input type="hidden" name="redirect" value={redirect || ''} />
          <input type="hidden" name="priceId" value={priceId || ''} />
          <input type="hidden" name="inviteId" value={inviteId || ''} />
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-sm font-semibold text-foreground/90 tracking-wide"
              >
                Email Address
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  defaultValue={state.email}
                  required
                  maxLength={50}
                  className="rounded-xl pl-4 pr-4 py-3 bg-secondary/50 border-secondary/80 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-300 text-foreground placeholder:text-muted-foreground/60"
                  placeholder="Enter your email address"
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-sm font-semibold text-foreground/90 tracking-wide"
              >
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={
                    mode === 'signin' ? 'current-password' : 'new-password'
                  }
                  defaultValue={state.password}
                  required
                  minLength={8}
                  maxLength={100}
                  className="rounded-xl pl-4 pr-4 py-3 bg-secondary/50 border-secondary/80 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-300 text-foreground placeholder:text-muted-foreground/60"
                  placeholder="Enter your password"
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>
            </div>

            {state?.error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-destructive text-sm flex items-center space-x-2 animate-shake">
                <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{state.error}</span>
              </div>
            )}

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full rounded-xl py-3 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-primary-foreground font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:transform-none disabled:hover:scale-100"
                disabled={pending}
              >
                {pending ? (
                  <>
                    <Loader2 className="animate-spin mr-2 h-5 w-5" />
                    <span className="opacity-70">Processing...</span>
                  </>
                ) : mode === 'signin' ? (
                  <span className="flex items-center justify-center space-x-2">
                    <span>Sign In</span>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                ) : (
                  <span className="flex items-center justify-center space-x-2">
                    <span>Create Account</span>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                )}
              </Button>
            </div>
        </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/30" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-background/80 text-muted-foreground font-medium">
                  {mode === 'signin'
                    ? 'New to our platform?'
                    : 'Already have an account?'}
                </span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                href={`${mode === 'signin' ? '/sign-up' : '/sign-in'}${
                  redirect ? `?redirect=${redirect}` : ''
                }${priceId ? `&priceId=${priceId}` : ''}`}
                className="group w-full flex justify-center items-center space-x-2 py-3 px-4 border border-border/50 rounded-xl shadow-sm text-sm font-medium text-foreground bg-secondary/30 hover:bg-secondary/50 hover:border-border focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300 hover:scale-[1.01]"
              >
                <span>
                  {mode === 'signin'
                    ? 'Create an account'
                    : 'Sign in to existing account'}
                </span>
                <svg className="h-4 w-4 transform group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}