const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function resetDatabase() {
  console.log('==================================================');
  console.log('   INICIANDO RESET COMPLETO DO BANCO DE DADOS     ');
  console.log('==================================================');

  try {
    // 1. Limpar históricos e pedidos
    console.log('[1/4] Removendo histórico de pedidos (OrderHistory)...');
    const deletedHistories = await prisma.orderHistory.deleteMany({});
    console.log(` -> ${deletedHistories.count} registros de histórico excluídos.`);

    console.log('[2/4] Removendo pedidos (Order)...');
    const deletedOrders = await prisma.order.deleteMany({});
    console.log(` -> ${deletedOrders.count} pedidos excluídos.`);

    // 2. Limpar todos os usuários
    console.log('[3/4] Removendo usuários existentes...');
    const deletedUsers = await prisma.user.deleteMany({});
    console.log(` -> ${deletedUsers.count} usuários excluídos.`);

    // 3. Garantir a existência dos departamentos do sistema
    console.log('[4/4] Configurando departamentos padrão...');
    const departmentsData = [
      {
        name: 'T.I',
        code: 'TI',
        description: 'Administração geral e tecnologia da informação',
      },
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
        name: 'Gerência / Supervisão',
        code: 'GERENCIA_SUPERVISAO',
        description: 'Supervisão executiva e acompanhamento de todas as etapas (somente leitura)',
      },
    ];

    const deptMap = {};
    for (const dept of departmentsData) {
      const upsertedDept = await prisma.department.upsert({
        where: { code: dept.code },
        update: { name: dept.name, description: dept.description },
        create: dept,
      });
      deptMap[dept.code] = upsertedDept.id;
      console.log(` -> [OK] Departamento: ${dept.name} (${dept.code})`);
    }

    // 4. Criar o único usuário do sistema: admin / admin123
    console.log('\nCriando usuário exclusivo: admin / admin123 ...');
    const adminPasswordHash = await bcrypt.hash('admin123', 10);

    const adminUser = await prisma.user.create({
      data: {
        name: 'Administrador do Sistema',
        username: 'admin',
        password: adminPasswordHash,
        departmentId: deptMap['TI'],
        role: 'ADMIN',
        active: true,
        canCreateOrder: true,
        viewAllStages: true,
        canEmbarcar: true,
        canSeparar: true,
        canFaturar: true,
        canEditOrder: true,
        canCancelOrder: true,
        canManageUsers: true,
      },
    });

    console.log(`[SUCESSO] Usuário criado com sucesso: ${adminUser.name} (@${adminUser.username})`);

    // Validação final de contagens
    const usersCount = await prisma.user.count();
    const ordersCount = await prisma.order.count();
    const deptsCount = await prisma.department.count();

    console.log('\n==================================================');
    console.log('          ESTADO FINAL DO BANCO DE DADOS          ');
    console.log('==================================================');
    console.log(`Total de Departamentos: ${deptsCount}`);
    console.log(`Total de Usuários:      ${usersCount} (Apenas admin)`);
    console.log(`Total de Pedidos:       ${ordersCount}`);
    console.log('Login: admin');
    console.log('Senha: admin123');
    console.log('==================================================\n');
  } catch (error) {
    console.error('Erro ao resetar o banco de dados:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resetDatabase();
