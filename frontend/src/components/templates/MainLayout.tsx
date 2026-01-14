import React from 'react'
import { Toaster } from 'react-hot-toast'
import { Sidebar } from '../organisms/Sidebar'

interface MainLayoutProps {
    children: React.ReactNode
}

export const MainLayout = ({ children }: MainLayoutProps) => {
    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar />
            <Toaster position="top-right" />
            <main className="flex-1 overflow-y-auto bg-gray-50">
                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    )
}
