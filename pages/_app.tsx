import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { useState } from 'react';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import { SessionContextProvider, Session } from '@supabase/auth-helpers-react';
import { ChatProvider } from '../contexts/ChatContext';
import { AuthGuard } from '@/components/AuthGuard';
import { Toaster } from '@/components/ui/toaster';
import { ChatDock } from '@/components/messaging/ChatDock';

function MyApp({ Component, pageProps }: AppProps<{ initialSession: Session }>) {
  // Create a new supabase browser client on every render.
  // This is the correct way to initialize the client.
  const [supabaseClient] = useState(() =>
    createPagesBrowserClient({
      // supabaseUrl and supabaseKey are read from environment variables
    })
  );

  return (
    <SessionContextProvider supabaseClient={supabaseClient} initialSession={pageProps.initialSession}>
      <ChatProvider>
        <AuthGuard>
          <Component {...pageProps} />
        </AuthGuard>
        <ChatDock />
        <Toaster />
      </ChatProvider>
    </SessionContextProvider>
  );
}

export default MyApp;