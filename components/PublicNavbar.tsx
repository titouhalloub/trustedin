import { useState, useEffect } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';

export const PublicNavbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    // Cleanup function to restore scrolling when component unmounts
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isMenuOpen]);

  return (
    <header className="sticky top-0 z-50 flex justify-between items-center px-4 sm:px-8 py-4 shadow-sm bg-white">
      <Logo />

      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center gap-6">
        <Link href="/#features" className="text-gray-600 hover:text-indigo-600 font-medium">Features</Link>
        <Link href="/subscriptions" className="text-gray-600 hover:text-indigo-600 font-medium">Pricing</Link>
        <Link href="/auth" className="text-gray-600 hover:text-indigo-600 font-medium">Sign In</Link>
        <Button asChild>
          <Link href="/auth?view=sign_up">Get Started</Link>
        </Button>
      </nav>

      {/* Mobile Menu Button */}
      <div className="md:hidden">
        <Button onClick={() => setIsMenuOpen(true)} variant="ghost" size="icon">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Open Menu</span>
        </Button>
      </div>

      {/* Mobile Menu Panel */}
      <div className={`md:hidden fixed top-0 right-0 h-full w-64 bg-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex justify-end p-4">
          <Button onClick={() => setIsMenuOpen(false)} variant="ghost" size="icon">
            <X className="h-6 w-6" />
            <span className="sr-only">Close Menu</span>
          </Button>
        </div>
        <nav className="flex flex-col items-center gap-8 mt-8">
          <Link href="/#features" onClick={() => setIsMenuOpen(false)} className="text-lg text-gray-700 hover:text-indigo-600">Features</Link>
          <Link href="/subscriptions" onClick={() => setIsMenuOpen(false)} className="text-lg text-gray-700 hover:text-indigo-600">Pricing</Link>
          <Link href="/auth" onClick={() => setIsMenuOpen(false)} className="text-lg text-gray-700 hover:text-indigo-600">Sign In</Link>
          <Button asChild size="lg" className="w-4/5">
            <Link href="/auth?view=sign_up" onClick={() => setIsMenuOpen(false)}>Get Started</Link>
          </Button>
        </nav>
      </div>
      {isMenuOpen && <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setIsMenuOpen(false)}></div>}
    </header>
  );
};