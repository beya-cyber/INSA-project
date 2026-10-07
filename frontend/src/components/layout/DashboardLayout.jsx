import React from 'react'
import { Outlet } from 'react-router-dom'
import ConsoleNavbar from '../common/ConsoleNavbar'

export default function DashboardLayout() {
    return (
        <div className="min-h-screen bg-[#010409]">
            <ConsoleNavbar />
            <Outlet />
        </div>
    )
}