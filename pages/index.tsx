import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Users, Star, Menu, X } from "lucide-react"
import Link from "next/link";
import Logo from '@/components/Logo';
import { useState, useEffect } from 'react';
import { GetServerSidePropsContext } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  }, [isMenuOpen]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-purple-100">
      {/* Navbar */}
      <header className="sticky top-0 z-50 flex justify-between items-center px-4 sm:px-8 py-4 shadow-sm bg-white">
        <Logo />

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="#features" className="text-gray-600 hover:text-indigo-600 font-medium">Features</Link>
          <Link href="#report" className="text-gray-600 hover:text-indigo-600 font-medium">Trust Report</Link>
          <Link href="/auth" className="text-gray-600 hover:text-indigo-600 font-medium">Sign In</Link>
          <Button asChild>
            <Link href="/auth">Get Started</Link>
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
            <Link href="#features" onClick={() => setIsMenuOpen(false)} className="text-lg text-gray-700 hover:text-indigo-600">Features</Link>
            <Link href="#report" onClick={() => setIsMenuOpen(false)} className="text-lg text-gray-700 hover:text-indigo-600">Trust Report</Link>
            <Link href="/auth" onClick={() => setIsMenuOpen(false)} className="text-lg text-gray-700 hover:text-indigo-600">Sign In</Link>
            <Button asChild size="lg" className="w-4/5">
              <Link href="/auth" onClick={() => setIsMenuOpen(false)}>Get Started</Link>
            </Button>
          </nav>
        </div>
        {/* Mobile Menu Overlay */}
        {isMenuOpen && <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setIsMenuOpen(false)}></div>}
      </header>

      {/* Hero Section */}
      <section className="text-center py-20 px-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
        <h2 className="text-5xl font-extrabold mb-6">The Internet Trust Layer</h2>
        <p className="text-lg mb-8 max-w-2xl mx-auto">
          Build your reputation with verified data from LinkedIn, GitHub, and beyond.
          Trustedin scores your profile so opportunities find you faster.
        </p>
        <Button asChild size="lg" className="bg-white text-indigo-600 font-semibold shadow-lg hover:bg-gray-100">
          <Link href="#signup">Get Started</Link>
        </Button>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 max-w-6xl mx-auto">
        <h3 className="text-3xl font-bold text-center mb-12 text-gray-800">Why Trustedin?</h3>
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="shadow-md hover:shadow-xl transition">
            <CardHeader>
              <Shield className="h-10 w-10 text-indigo-600" />
              <CardTitle>Verified Trust</CardTitle>
            </CardHeader>
            <CardContent>
              Profiles scored with LinkedIn + GitHub insights. No fake accounts, only real credibility.
            </CardContent>
          </Card>
          <Card className="shadow-md hover:shadow-xl transition">
            <CardHeader>
              <Users className="h-10 w-10 text-purple-600" />
              <CardTitle>Networking Confidence</CardTitle>
            </CardHeader>
            <CardContent>
              Connect with confidence—every connection has a transparent trust score.
            </CardContent>
          </Card>
          <Card className="shadow-md hover:shadow-xl transition">
            <CardHeader>
              <Star className="h-10 w-10 text-yellow-500" />
              <CardTitle>Opportunities Faster</CardTitle>
            </CardHeader>
            <CardContent>
              Let recruiters and collaborators filter by trustworthiness. No wasted time.
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Trust Report Preview */}
      <section id="report" className="bg-white py-20 px-6 shadow-inner">
        <h3 className="text-3xl font-bold text-center mb-12 text-gray-800">Your Trust Report</h3>
        <div className="max-w-3xl mx-auto bg-gradient-to-r from-indigo-50 to-purple-50 p-8 rounded-xl shadow-md">
          <p className="text-lg text-gray-700 mb-6">
            Your Trust Report combines LinkedIn achievements, GitHub contributions, and
            network authenticity into a single <span className="font-semibold">Trust Score</span>.
          </p>
          <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
            <Link href="#signup">See My Trust Report</Link>
          </Button>
        </div>
      </section>

      {/* Signup Call to Action */}
      <section id="signup" className="py-20 px-6 text-center bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
        <h3 className="text-3xl font-bold mb-6">Join Trustedin Today</h3>
        <p className="max-w-xl mx-auto mb-8">
          Build your trust profile in minutes and unlock better opportunities.
        </p>
        <Button asChild size="lg" className="bg-white text-purple-600 font-semibold hover:bg-gray-100">
          <Link href="/auth">Create My Account</Link>
        </Button>
      </section>

      {/* Footer */}
      <footer className="py-6 text-center text-gray-600 bg-white">
        <p>© {new Date().getFullYear()} Trustedin. All rights reserved.</p>
      </footer>
    </div>
  );
}

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const supabase = createPagesServerClient(ctx);
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    // If logged in, redirect to their profile page.
    return { redirect: { destination: '/profile', permanent: false } };
  }
  // If not logged in, the landing page will be rendered.
  return { props: {} };
};
