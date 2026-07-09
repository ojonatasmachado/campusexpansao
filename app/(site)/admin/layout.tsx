import type { ReactNode } from 'react'
import './admin.css'

export const metadata = {
  title: 'CE.X · Painel Interno',
  robots: 'noindex,nofollow',
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
