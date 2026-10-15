'use client';

import React, { useEffect, useState } from 'react';
import {
  Users,
  UserPlus,
  Edit2,
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle,
  Lock,
  Building,
  Check,
  X,
} from 'lucide-react';
import { UserItem, DepartmentItem } from '@/types';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [role, setRole] = useState('USER');
  const [active, setActive] = useState(true);

  // Permissions State
  const [canCreateOrder, setCanCreateOrder] = useState(false);
  const [viewAllStages, setViewAllStages] = useState(false);
  const [canEmbarcar, setCanEmbarcar] = useState(false);
  const [canSeparar, setCanSeparar] = useState(false);
  const [canFaturar, setCanFaturar] = useState(false);
  const [canEditOrder, setCanEditOrder] = useState(false);
  const [canCancelOrder, setCanCancelOrder] = useState(false);
  const [canManageUsers, setCanManageUsers] = useState(false);

  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, deptsRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/departments'),
      ]);

      const usersData = await usersRes.json();
      const deptsData = await deptsRes.json();

      if (usersRes.ok) setUsers(usersData.users || []);
      if (deptsRes.ok) {
        setDepartments(deptsData.departments || []);
        if (deptsData.departments?.length > 0 && !departmentId) {
          setDepartmentId(deptsData.departments[0].id);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const applyDepartmentPreset = (deptCode: string) => {
    if (deptCode === 'COMERCIAL' || deptCode === 'LICITACAO' || deptCode === 'ASSISTENCIA_TECNICA') {
      setRole('USER');
      setCanCreateOrder(true);
      setViewAllStages(true);
      setCanEditOrder(true);
      setCanCancelOrder(true);
      setCanEmbarcar(false);
      setCanSeparar(false);
      setCanFaturar(false);
      setCanManageUsers(false);
    } else if (deptCode === 'LOGISTICA' || deptCode === 'ALMOXARIFADO') {
      setRole('USER');
      setCanCreateOrder(false);
      setViewAllStages(true);
      setCanEmbarcar(true);
      setCanSeparar(true);
      setCanFaturar(false);
      setCanEditOrder(false);
      setCanCancelOrder(false);
      setCanManageUsers(false);
    } else if (deptCode === 'TRANSPORTE') {
      setRole('USER');
      setCanCreateOrder(false);
      setViewAllStages(true);
      setCanEmbarcar(false);
      setCanSeparar(false);
      setCanFaturar(false);
      setCanEditOrder(false);
      setCanCancelOrder(false);
      setCanManageUsers(false);
    } else if (deptCode === 'FATURAMENTO') {
      setRole('USER');
      setCanCreateOrder(false);
      setViewAllStages(false);
      setCanEmbarcar(false);
      setCanSeparar(false);
      setCanFaturar(true);
      setCanEditOrder(false);
      setCanCancelOrder(false);
      setCanManageUsers(false);
    } else if (deptCode === 'TI') {
      setRole('ADMIN');
      setCanCreateOrder(true);
      setViewAllStages(true);
      setCanEmbarcar(true);
      setCanSeparar(true);
      setCanFaturar(true);
      setCanEditOrder(true);
      setCanCancelOrder(true);
      setCanManageUsers(true);
    } else if (deptCode === 'GERENCIA_SUPERVISAO') {
      setRole('USER');
      setCanCreateOrder(false);
      setViewAllStages(true);
      setCanEmbarcar(false);
      setCanSeparar(false);
      setCanFaturar(false);
      setCanEditOrder(false);
      setCanCancelOrder(false);
      setCanManageUsers(false);
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setName('');
    setUsername('');
    setPassword('');
    const initialDept = departments[0];
    setDepartmentId(initialDept?.id || '');
    setActive(true);
    setFormError('');
    if (initialDept) {
      applyDepartmentPreset(initialDept.code);
    } else {
      setRole('USER');
      setCanCreateOrder(false);
      setViewAllStages(false);
      setCanEmbarcar(false);
      setCanSeparar(false);
      setCanFaturar(false);
      setCanEditOrder(false);
      setCanCancelOrder(false);
      setCanManageUsers(false);
    }
    setIsModalOpen(true);
  };

  const openEditModal = (user: UserItem) => {
    setEditingUser(user);
    setName(user.name);
    setUsername(user.username);
    setPassword('');
    setDepartmentId(user.departmentId);
    setRole(user.role);
    setActive(user.active);
    setCanCreateOrder(user.canCreateOrder);
    setViewAllStages(user.viewAllStages);
    setCanEmbarcar(user.canEmbarcar);
    setCanSeparar(user.canSeparar);
    setCanFaturar(user.canFaturar);
    setCanEditOrder(user.canEditOrder);
    setCanCancelOrder(user.canCancelOrder);
    setCanManageUsers(user.canManageUsers);
    setFormError('');
    setIsModalOpen(true);
  };

  // Helper para preset por departamento ao selecionar no select
  const handleDepartmentChange = (newDeptId: string) => {
    setDepartmentId(newDeptId);
    const dept = departments.find((d) => d.id === newDeptId);
    if (!dept) return;

    if (!editingUser) {
      applyDepartmentPreset(dept.code);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim() || !username.trim() || !departmentId) {
      setFormError('Preencha Nome, Usuário e Departamento.');
      return;
    }

    if (!editingUser && !password.trim()) {
      setFormError('A senha é obrigatória para novos usuários.');
      return;
    }

    setFormLoading(true);

    try {
      const url = editingUser ? `/api/admin/users/${editingUser.id}` : '/api/admin/users';
      const method = editingUser ? 'PUT' : 'POST';

      const payload: any = {
        name,
        username,
        departmentId,
        role,
        active,
        canCreateOrder,
        viewAllStages,
        canEmbarcar,
        canSeparar,
        canFaturar,
        canEditOrder,
        canCancelOrder,
        canManageUsers,
      };

      if (password.trim()) {
        payload.password = password.trim();
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao salvar usuário.');
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Erro ao conectar ao servidor.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleActive = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao alterar status');
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Gestão de Usuários & Permissões
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Cadastre colaboradores por departamento e configure o controle de acesso de cada esteira.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 bg-gradient-to-r from-[#163765] to-[#00a8cc] hover:from-[#112c52] hover:to-[#0092b3] text-white text-xs font-semibold rounded-2xl shadow-md shadow-cyan-900/10 transition flex items-center space-x-2 active:scale-95"
        >
          <UserPlus className="h-4 w-4" />
          <span>Novo Usuário</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs rounded-2xl flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <div className="h-8 w-8 border-3 border-[#00a8cc] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs">Carregando usuários...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Nome</th>
                  <th className="py-3.5 px-5">Login / Usuário</th>
                  <th className="py-3.5 px-5">Departamento</th>
                  <th className="py-3.5 px-5">Permissões de Acesso</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                    <td className="py-4 px-5 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center space-x-2">
                        <span>{u.name}</span>
                        {u.role === 'ADMIN' && (
                          <span className="bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                            Admin
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-5 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                      @{u.username}
                    </td>

                    <td className="py-4 px-5">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 px-2.5 py-1 rounded-lg">
                        {u.department?.name || '-'}
                      </span>
                    </td>

                    <td className="py-4 px-5">
                      <div className="flex flex-wrap gap-1 max-w-sm">
                        {u.canCreateOrder && (
                          <span className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 text-[10px] px-1.5 py-0.5 rounded">
                            Incluir Pedidos
                          </span>
                        )}
                        {u.viewAllStages && (
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] px-1.5 py-0.5 rounded">
                            Ver Todas Etapas
                          </span>
                        )}
                        {u.canEmbarcar && (
                          <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60 text-[10px] px-1.5 py-0.5 rounded">
                            Embarque (Logística)
                          </span>
                        )}
                        {u.canSeparar && (
                          <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/60 text-[10px] px-1.5 py-0.5 rounded">
                            Separação (Almoxarifado)
                          </span>
                        )}
                        {u.canFaturar && (
                          <span className="bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-900/60 text-[10px] px-1.5 py-0.5 rounded">
                            Emitir NF
                          </span>
                        )}
                        {u.canManageUsers && (
                          <span className="bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 text-[10px] px-1.5 py-0.5 rounded">
                            Admin Usuários
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-5 whitespace-nowrap">
                      {u.active ? (
                        <span className="inline-flex items-center text-emerald-700 dark:text-emerald-400 font-semibold text-[11px] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 px-2 py-0.5 rounded-full">
                          <CheckCircle className="h-3 w-3 mr-1" /> Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-red-700 dark:text-red-400 font-semibold text-[11px] bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 px-2 py-0.5 rounded-full">
                          <XCircle className="h-3 w-3 mr-1" /> Inativo
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => openEditModal(u)}
                          className="px-2.5 py-1 text-slate-600 dark:text-slate-300 hover:text-blue-600 border border-slate-200 dark:border-slate-700 hover:border-blue-300 rounded-xl transition flex items-center space-x-1"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          <span>Editar</span>
                        </button>

                        <button
                          onClick={() => handleToggleActive(u.id)}
                          className={`px-2.5 py-1 text-xs rounded-xl border transition ${
                            u.active
                              ? 'text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/30'
                              : 'text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                          }`}
                        >
                          {u.active ? 'Desativar' : 'Ativar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Criação / Edição de Usuário */}
      {isModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
          className="fixed inset-0 z-[9999] w-screen h-screen bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
        >
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="px-6 py-5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-cyan-400">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {editingUser ? 'Editar Usuário e Permissões' : 'Cadastrar Novo Usuário'}
                  </h2>
                  <p className="text-xs text-slate-400">Configure os dados de acesso e departamento</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs rounded-2xl flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nome Completo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Maria Oliveira"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00a8cc] transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Login / Usuário <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: maria.oliveira"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00a8cc] transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Departamento <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={departmentId}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00a8cc] transition"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {editingUser ? 'Alterar Senha (opcional)' : 'Senha de Acesso *'}
                  </label>
                  <input
                    type="password"
                    placeholder={editingUser ? 'Nova senha' : 'Senha do usuário'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00a8cc] transition"
                  />
                </div>
              </div>

              {/* Seção de Permissões Granulares */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                  <Shield className="h-4 w-4 text-[#00a8cc]" />
                  <span>Controle de Permissões e Acessos</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                  Marque o que este usuário está autorizado a visualizar e executar no sistema:
                </p>

                <div className="space-y-2 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 text-xs">
                  <label className="flex items-center space-x-2.5 cursor-pointer hover:text-cyan-600 dark:hover:text-cyan-400">
                    <input
                      type="checkbox"
                      checked={canCreateOrder}
                      onChange={(e) => setCanCreateOrder(e.target.checked)}
                      className="rounded text-cyan-600 focus:ring-cyan-500 h-4 w-4"
                    />
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Pode incluir pedidos TOTVS</span>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Comercial, Licitação, Assistência Técnica</p>
                    </div>
                  </label>

                  <label className="flex items-center space-x-2.5 cursor-pointer hover:text-cyan-600 dark:hover:text-cyan-400">
                    <input
                      type="checkbox"
                      checked={viewAllStages}
                      onChange={(e) => setViewAllStages(e.target.checked)}
                      className="rounded text-cyan-600 focus:ring-cyan-500 h-4 w-4"
                    />
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Visualizar todas as etapas de todos os pedidos</span>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Visão global sem restrição de esteira</p>
                    </div>
                  </label>

                  <label className="flex items-center space-x-2.5 cursor-pointer hover:text-cyan-600 dark:hover:text-cyan-400">
                    <input
                      type="checkbox"
                      checked={canEmbarcar}
                      onChange={(e) => setCanEmbarcar(e.target.checked)}
                      className="rounded text-cyan-600 focus:ring-cyan-500 h-4 w-4"
                    />
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Pode realizar Embarque de pedidos</span>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Setor de Logística (Etapa 01)</p>
                    </div>
                  </label>

                  <label className="flex items-center space-x-2.5 cursor-pointer hover:text-cyan-600 dark:hover:text-cyan-400">
                    <input
                      type="checkbox"
                      checked={canSeparar}
                      onChange={(e) => setCanSeparar(e.target.checked)}
                      className="rounded text-cyan-600 focus:ring-cyan-500 h-4 w-4"
                    />
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Pode Separar e Autorizar Faturamento</span>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Setor de Almoxarifado (Etapa 02)</p>
                    </div>
                  </label>

                  <label className="flex items-center space-x-2.5 cursor-pointer hover:text-cyan-600 dark:hover:text-cyan-400">
                    <input
                      type="checkbox"
                      checked={canFaturar}
                      onChange={(e) => setCanFaturar(e.target.checked)}
                      className="rounded text-cyan-600 focus:ring-cyan-500 h-4 w-4"
                    />
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Pode Emitir Nota Fiscal / Faturar</span>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Setor de Faturamento / Fiscal (Etapa 03)</p>
                    </div>
                  </label>

                  <label className="flex items-center space-x-2.5 cursor-pointer hover:text-cyan-600 dark:hover:text-cyan-400">
                    <input
                      type="checkbox"
                      checked={canEditOrder}
                      onChange={(e) => setCanEditOrder(e.target.checked)}
                      className="rounded text-cyan-600 focus:ring-cyan-500 h-4 w-4"
                    />
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Pode editar dados gerais do pedido</span>
                    </div>
                  </label>

                  <label className="flex items-center space-x-2.5 cursor-pointer hover:text-cyan-600 dark:hover:text-cyan-400">
                    <input
                      type="checkbox"
                      checked={canCancelOrder}
                      onChange={(e) => setCanCancelOrder(e.target.checked)}
                      className="rounded text-cyan-600 focus:ring-cyan-500 h-4 w-4"
                    />
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Pode cancelar pedidos</span>
                    </div>
                  </label>

                  <label className="flex items-center space-x-2.5 cursor-pointer hover:text-cyan-600 dark:hover:text-cyan-400">
                    <input
                      type="checkbox"
                      checked={canManageUsers}
                      onChange={(e) => setCanManageUsers(e.target.checked)}
                      className="rounded text-cyan-600 focus:ring-cyan-500 h-4 w-4"
                    />
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Pode gerenciar usuários e permissões</span>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">T.I, Gerência e Supervisão</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={formLoading}
                  className="px-4 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#163765] to-[#00a8cc] hover:from-[#112c52] hover:to-[#0092b3] text-white font-semibold text-xs rounded-xl shadow-md transition flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {formLoading ? (
                    <span>Salvando...</span>
                  ) : (
                    <span>{editingUser ? 'Atualizar Usuário' : 'Salvar Novo Usuário'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
