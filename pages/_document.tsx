import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Default charset and viewport */}
        <meta charSet="UTF-8" />

        {/* Project Info */}
        <meta name="description" content="TrustedIn" />
        <meta name="author" content="TrustedIn" />

        {/* Open Graph / Facebook */}
        <meta property="og:title" content="TrustedIn" />
        <meta property="og:description" content="TrustedIn" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://trustedin.xyz/opengraph-image.png" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@trustedin" />
        <meta name="twitter:image" content="https://trustedin.xyz/opengraph-image.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}