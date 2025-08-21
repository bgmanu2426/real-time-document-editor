'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'light';

export interface ThemeColor {
  name: string;
  value: string;
  primary: string;
  primaryForeground: string;
}

export const themeColors: ThemeColor[] = [
  {
    name: 'Blue',
    value: 'blue',
    primary: '217 91% 59%', // blue-500 in HSL
    primaryForeground: '0 0% 98%'
  },
  {
    name: 'Green',  
    value: 'green',
    primary: '142 76% 36%', // green-500 in HSL
    primaryForeground: '0 0% 98%'
  },
  {
    name: 'Orange',
    value: 'orange', 
    primary: '25 95% 53%', // orange-500 in HSL
    primaryForeground: '0 0% 98%'
  },
  {
    name: 'Red',
    value: 'red',
    primary: '0 84% 60%', // red-500 in HSL
    primaryForeground: '0 0% 98%'
  }
];

interface ThemeContextType {
  mode: ThemeMode;
  themeColor: ThemeColor;
  setThemeColor: (color: ThemeColor) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const mode: ThemeMode = 'light'; // Fixed to light mode only
  const [themeColor, setThemeColorState] = useState<ThemeColor>(themeColors[0]);
  const [mounted, setMounted] = useState(false);

  // Load theme color preference from localStorage
  useEffect(() => {
    const savedColor = localStorage.getItem('theme-color');
    
    if (savedColor) {
      const color = themeColors.find(c => c.value === savedColor);
      if (color) {
        setThemeColorState(color);
      }
    }
    
    setMounted(true);
    
    // Force apply initial theme immediately when mounted
    const root = document.documentElement;
    const initialColor = savedColor ? themeColors.find(c => c.value === savedColor) || themeColors[0] : themeColors[0];
    root.style.setProperty('--primary', initialColor.primary);
    root.style.setProperty('--primary-foreground', initialColor.primaryForeground);
    
    // Ensure light mode is always applied
    root.classList.remove('dark');
  }, []); 

  // Apply theme changes to document
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    
    // Ensure light mode is always applied
    root.classList.remove('dark');
    
    // Apply theme color as CSS variables
    root.style.setProperty('--primary', themeColor.primary);
    root.style.setProperty('--primary-foreground', themeColor.primaryForeground);
    
    // Save theme color to localStorage
    localStorage.setItem('theme-color', themeColor.value);
    
    // Remove any stored theme mode to prevent confusion
    localStorage.removeItem('theme-mode');
  }, [themeColor, mounted]);



  const setThemeColor = (color: ThemeColor) => {
    setThemeColorState(color);
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ mode, themeColor, setThemeColor }}>
      {children}
    </ThemeContext.Provider>
  );
};