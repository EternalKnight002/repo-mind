// app/layout.tsx
import './globals.css'
import type { ReactNode } from 'react'

export const metadata = {
  title: 'RepoMind – GitHub README Semantic Search AI',
  description: 'Semantic search over GitHub READMEs with AI summarization.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center px-4">
        <header className="py-6 text-2xl font-semibold text-blue-400">RepoMind 🔍</header>
        <main className="flex flex-col items-center w-full max-w-4xl">{children}</main>
      </body>
    </html>
  )
}
