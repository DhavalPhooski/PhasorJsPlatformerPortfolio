import './globals.css'

export const metadata = {
  title: 'Platformer Game',
  description: 'A cool platformer game',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}