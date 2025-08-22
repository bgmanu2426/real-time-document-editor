'use client';

import Link from 'next/link';
import { useState, Suspense, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, User as UserIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { signOut } from '@/app/(login)/actions';
import { useRouter } from 'next/navigation';
import { User } from '@/lib/db/schema';
import useSWR, { mutate } from 'swr';

import { siteConfig } from '@/lib/config';

const fetcher = (url: string) => fetch(url).then((res) => res.json());



function UserMenu() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { data: user, error, mutate: mutateUser, isLoading } = useSWR<User>('/api/user', fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    errorRetryCount: 1,
    errorRetryInterval: 500,
    refreshInterval: 1000, // Check every second for auth changes
    shouldRetryOnError: false,
    dedupingInterval: 500,
  });
  const router = useRouter();

  // Debug logging
  useEffect(() => {
    console.log('UserMenu - User data:', user);
    console.log('UserMenu - Error:', error);
    console.log('UserMenu - IsLoading:', isLoading);
  }, [user, error, isLoading]);

  // Force revalidation on mount and listen for storage/focus events
  useEffect(() => {
    // Immediately revalidate on mount
    mutateUser();
    
    const handleStorageChange = () => {
      mutateUser();
    };
    
    const handleFocus = () => {
      mutateUser();
    };
    
    // Listen for storage changes (cross-tab login)
    window.addEventListener('storage', handleStorageChange);
    // Listen for window focus (user might have logged in)
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [mutateUser]);

  async function handleSignOut() {
    await signOut();
    mutate('/api/user');
    router.push('/');
  }

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center space-x-4">
        <div className="h-9 w-20 bg-secondary/30 rounded-xl animate-pulse"></div>
        <div className="h-9 w-20 bg-secondary/30 rounded-xl animate-pulse"></div>
      </div>
    );
  }

  // If there's an error or user is null/undefined (not logged in)
  if (error || !user) {
    return (
      <div className="flex items-center space-x-4">
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/sign-in">Sign In</Link>
        </Button>
        <Button asChild className="rounded-full">
          <Link href="/sign-up">Sign Up</Link>
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <DropdownMenuTrigger>
        <Avatar className="cursor-pointer size-9">
          <AvatarImage alt={user.name || ''} />
          <AvatarFallback>
            {user.email
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5 text-sm font-medium text-foreground">
          <div className="flex items-center">
            <UserIcon className="mr-2 h-4 w-4" />
            <span className="truncate">{user.name || user.email}</span>
          </div>
        </div>
        <DropdownMenuSeparator />
        <form action={handleSignOut} className="w-full">
          <button type="submit" className="flex w-full">
            <DropdownMenuItem className="w-full flex-1 cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function Header() {
  return (
    <header className="border-b border-border bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center">
          <img src="/favicon.ico" alt="ReDocz" className="h-6 w-6" />
          <span className="ml-2 text-xl font-semibold text-foreground">{siteConfig.name}</span>
        </Link>
        <div className="flex items-center space-x-4">
          <Suspense fallback={
            <div className="flex items-center space-x-3">
              <div className="h-9 w-20 bg-secondary/30 rounded-xl animate-pulse"></div>
              <div className="h-9 w-20 bg-secondary/30 rounded-xl animate-pulse"></div>
            </div>
          }>
            <UserMenu />
          </Suspense>
        </div>
      </div>
    </header>
  );
}