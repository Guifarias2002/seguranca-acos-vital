'use client'
export const dynamic = 'force-dynamic'
import { useEffect } from 'react'
export default function Page() {
  useEffect(() => { window.location.href = '/index.html' }, [])
  return null
}
