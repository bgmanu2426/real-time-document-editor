'use client';

import { useState, useEffect } from 'react';
import { Palette, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { useTheme, themeColors, type ThemeColor } from '@/contexts/theme-context';

export default function ThemeControls() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Theme context variables
  let themeColor, setThemeColor;
  
  try {
    const themeContext = useTheme();
    themeColor = themeContext.themeColor;
    setThemeColor = themeContext.setThemeColor;
  } catch (error) {
    // If theme context is not available, use defaults
    themeColor = themeColors[0];
    setThemeColor = () => {};
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render anything until mounted to avoid hydration mismatch
  if (!mounted) {
    return <div className="flex items-center space-x-2 h-9 w-9" />;
  }

  const handleColorChange = (color: ThemeColor) => {
    setThemeColor(color);
    setIsOpen(false);
  };

  return (
    <div className="flex items-center space-x-2">
      {/* Theme Color Picker */}
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full p-2 h-9 w-9"
            title="Change theme color"
          >
            <Palette className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {themeColors.map((color) => (
            <DropdownMenuItem
              key={color.value}
              className="cursor-pointer flex items-center justify-between"
              onClick={() => handleColorChange(color)}
            >
              <div className="flex items-center space-x-2">
                <div 
                  className="w-4 h-4 rounded-full border border-gray-300"
                  style={{ 
                    backgroundColor: `hsl(${color.primary})`,
                  }}
                />
                <span>{color.name}</span>
              </div>
              {themeColor.value === color.value && (
                <Check className="h-4 w-4" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}