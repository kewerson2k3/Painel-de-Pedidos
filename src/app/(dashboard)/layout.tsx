'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Package, Users, LogOut } from 'lucide-react';
import Link from 'next/link';
import { UserSession } from '@/types';
import ThemeToggle from '@/components/ThemeToggle';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (!res.ok) throw new Error('Não autenticado');
        return res.json();
      })
      .then((data) => {
        if (!data.user) {
          router.push('/login');
        } else {
          setUser(data.user);
        }
      })
      .catch(() => {
        router.push('/login');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center space-y-3">
          <div className="h-9 w-9 border-3 border-[#00a8cc] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Carregando painel...</p>
        </div>
      </div>
    );
  }

  const getDeptBadgeClass = (deptCode?: string) => {
    switch (deptCode) {
      case 'LICITACAO':
        return 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200/80 dark:border-amber-800/60';
      case 'ASSISTENCIA_TECNICA':
        return 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border-teal-200/80 dark:border-teal-800/60';
      case 'LOGISTICA':
        return 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200/80 dark:border-blue-800/60';
      case 'ALMOXARIFADO':
        return 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border-indigo-200/80 dark:border-indigo-800/60';
      case 'COMERCIAL':
        return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-800/60';
      case 'TI':
        return 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-400 border-cyan-200/80 dark:border-cyan-800/60';
      case 'FATURAMENTO':
        return 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border-purple-200/80 dark:border-purple-800/60';
      case 'TRANSPORTE':
        return 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border-sky-200/80 dark:border-sky-800/60';
      case 'GERENCIA_SUPERVISAO':
        return 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 border-violet-200/80 dark:border-violet-800/60';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-cyan-500 selection:text-white transition-colors duration-200">
      {/* Top Navbar */}
      <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-30 border-b border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Navigation */}
          <div className="flex items-center space-x-6 sm:space-x-8">
            <Link href="/" className="flex items-center space-x-3 group transition">
              <div className="p-1 rounded-xl bg-white dark:bg-white inline-block shadow-2xs">
                <img
                  src="/logo.png"
                  alt="RTS Logo"
                  className="h-7 sm:h-8 w-auto object-contain transition-transform group-hover:scale-105"
                />
              </div>
              <div className="hidden sm:block h-5 w-px bg-slate-200 dark:bg-slate-700" />
              <div className="hidden sm:block">
                <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white block leading-tight">
                  Painel de Pedidos
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">
                  Workflow TOTVS
                </span>
              </div>
            </Link>

            <nav className="flex items-center space-x-1">
              <Link
                href="/"
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-2 ${
                  pathname === '/'
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
                }`}
              >
                <Package className="h-4 w-4 text-[#00a8cc]" />
                <span>Pedidos & Esteira</span>
              </Link>

              {(user?.role === 'ADMIN' || user?.permissions.canManageUsers) && (
                <Link
                  href="/admin/users"
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-2 ${
                    pathname === '/admin/users'
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Users className="h-4 w-4 text-[#163765] dark:text-cyan-400" />
                  <span>Gestão de Usuários</span>
                </Link>
              )}
            </nav>
          </div>

          {/* User Profile, Theme Toggle & Logout */}
          <div className="flex items-center space-x-2.5 sm:space-x-3.5">
            {/* Theme Toggle Button */}
            <ThemeToggle />

            {/* User Profile */}
            <div className="flex items-center space-x-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#163765] to-[#00a8cc] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {getInitials(user?.name)}
              </div>
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
                  {user?.name}
                </div>
                <div className="flex items-center justify-end space-x-1.5 mt-0.5">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getDeptBadgeClass(
                      user?.departmentCode
                    )}`}
                  >
                    {user?.departmentName || 'Geral'}
                  </span>
                </div>
              </div>
            </div>

            <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

            <button
              onClick={handleLogout}
              title="Sair do sistema"
              className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition duration-150"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
