const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('--- Iniciando Seed do Banco de Dados ---');

  // 1. Criar Departamentos Padrão
  const departmentsData = [
    {
      name: 'Comercial',
      code: 'COMERCIAL',
      description: 'Inclusão de pedidos TOTVS e acompanhamento de ponta a ponta',
    },
    {
      name: 'Assistência Técnica',
      code: 'ASSISTENCIA_TECNICA',
      description: 'Pedidos de assistência técnica, peças e serviços',
    },
    {
      name: 'Licitação',
      code: 'LICITACAO',
      description: 'Pedidos e faturamentos vinculados a editais e licitações',
    },
    {
      name: 'Logística',
      code: 'LOGISTICA',
      description: 'Embarque de pedidos e autorização de faturamento',
    },
    {
      name: 'Almoxarifado',
      code: 'ALMOXARIFADO',
      description: 'Separação física de mercadorias, embarque e autorização de faturamento',
    },
    {
      name: 'Transporte',
      code: 'TRANSPORTE',
      description: 'Transporte e distribuição de cargas e mercadorias',
    },
    {
      name: 'Faturamento',
      code: 'FATURAMENTO',
      description: 'Emissão e registro de Notas Fiscais',
    },
    {
      name: 'T.I',
      code: 'TI',
      description: 'Administração geral e tecnologia da informação',
    },
    {
      name: 'Gerência / Supervisão',
      code: 'GERENCIA_SUPERVISAO',
      description: 'Supervisão executiva e acompanhamento de todas as etapas (somente leitura)',
    },
  ];

  const deptMap = {};

  for (const dept of departmentsData) {
    const createdDept = await prisma.department.upsert({
      where: { code: dept.code },
      update: { name: dept.name, description: dept.description },
      create: dept,
    });
    deptMap[dept.code] = createdDept.id;
    console.log(`[OK] Departamento configurado: ${dept.name} (${dept.code})`);
  }

  // 2. Hash de senhas
  const adminPassword = await bcrypt.hash('admin123', 10);
  const defaultPassword = await bcrypt.hash('123456', 10);

  // 3. Usuários Padrão (Apenas o Administrador Geral)
  const usersData = [
    {
      name: 'Administrador do Sistema',
      username: 'admin',
      password: adminPassword,
      departmentId: deptMap['TI'],
      role: 'ADMIN',
      canCreateOrder: true,
      viewAllStages: true,
      canEmbarcar: true,
      canSeparar: true,
      canFaturar: true,
      canEditOrder: true,
      canCancelOrder: true,
      canManageUsers: true,
    },
  ];

  for (const user of usersData) {
    const existing = await prisma.user.findUnique({
      where: { username: user.username },
    });

    if (!existing) {
      await prisma.user.create({
        data: user,
      });
      console.log(`[OK] Usuário criado: ${user.name} (@${user.username})`);
    } else {
      console.log(`[INFO] Usuário já existe: @${user.username}`);
    }
  }

  console.log('--- Seed Concluído com Sucesso! ---');
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
