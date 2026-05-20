// mobile/app/+html.tsx
// Custom HTML structure for Expo Router Web exports
// Defines the web head layout for PWA home screen icon, touch configurations, and styles.

import { ScrollViewStyleReset } from 'expo-router/html'

export default function HTML({ children }: { children: any }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* iOS Apple Touch Icon for Home Screen Add */}
        <link rel="apple-touch-icon" href="/icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon.png" />

        {/* Web Favicons */}
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon.png" />

        {/* iOS App Styling */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="novaFit" />

        {/* CSS Reset for ScrollView on Web */}
        <ScrollViewStyleReset />

        <style>{`
          html, body {
            height: 100%;
            background-color: #0A0A0F;
          }
          body {
            overflow: hidden;
          }
          #root {
            display: flex;
            height: 100%;
            flex: 1;
          }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}
