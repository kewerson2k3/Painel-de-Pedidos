async function testUserFilterRules() {
  const baseUrl = 'http://localhost:3000';

  console.log('--- TESTE 1: Faturamento só visualiza usuários do Faturamento ---');
  let res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'faturamento', password: '123456' })
  });
  const fatCookie = res.headers.get('set-cookie');
  res = await fetch(`${baseUrl}/api/users`, { headers: { 'Cookie': fatCookie } });
  let fatUsers = (await res.json()).users;
  console.log('Usuários visíveis para Faturamento:', fatUsers.map(u => `${u.name} (${u.department.name})`));
  for (const u of fatUsers) {
    if (u.department.code !== 'FATURAMENTO') {
      throw new Error(`ERRO: Faturamento viu usuário de outro setor: ${u.department.code}`);
    }
  }
  console.log('-> Aprovado: Faturamento viu APENAS Faturamento!');

  console.log('\n--- TESTE 2: Logística visualiza Logística E Almoxarifado ---');
  res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'logistica', password: '123456' })
  });
  const logCookie = res.headers.get('set-cookie');
  res = await fetch(`${baseUrl}/api/users`, { headers: { 'Cookie': logCookie } });
  let logUsers = (await res.json()).users;
  console.log('Usuários visíveis para Logística:', logUsers.map(u => `${u.name} (${u.department.name})`));
  const deptsSeenByLog = new Set(logUsers.map(u => u.department.code));
  if (!deptsSeenByLog.has('LOGISTICA') || !deptsSeenByLog.has('ALMOXARIFADO')) {
    throw new Error('ERRO: Logística não viu ambos os setores');
  }
  for (const code of deptsSeenByLog) {
    if (code !== 'LOGISTICA' && code !== 'ALMOXARIFADO') {
      throw new Error(`ERRO: Logística viu setor não autorizado: ${code}`);
    }
  }
  console.log('-> Aprovado: Logística viu Logística e Almoxarifado!');

  console.log('\n--- TESTE 3: Almoxarifado visualiza Almoxarifado E Logística (vice-versa) ---');
  res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'almoxarifado', password: '123456' })
  });
  const almoxCookie = res.headers.get('set-cookie');
  res = await fetch(`${baseUrl}/api/users`, { headers: { 'Cookie': almoxCookie } });
  let almoxUsers = (await res.json()).users;
  console.log('Usuários visíveis para Almoxarifado:', almoxUsers.map(u => `${u.name} (${u.department.name})`));
  const deptsSeenByAlmox = new Set(almoxUsers.map(u => u.department.code));
  if (!deptsSeenByAlmox.has('LOGISTICA') || !deptsSeenByAlmox.has('ALMOXARIFADO')) {
    throw new Error('ERRO: Almoxarifado não viu ambos os setores');
  }
  for (const code of deptsSeenByAlmox) {
    if (code !== 'LOGISTICA' && code !== 'ALMOXARIFADO') {
      throw new Error(`ERRO: Almoxarifado viu setor não autorizado: ${code}`);
    }
  }
  console.log('-> Aprovado: Almoxarifado viu Almoxarifado e Logística!');

  console.log('\n--- TESTE 4: Assistente Comercial só visualiza usuários do Comercial ---');
  res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'assistente', password: '123456' })
  });
  const assCookie = res.headers.get('set-cookie');
  res = await fetch(`${baseUrl}/api/users`, { headers: { 'Cookie': assCookie } });
  let assUsers = (await res.json()).users;
  console.log('Usuários visíveis para Assistente:', assUsers.map(u => `${u.name} (${u.department.name})`));
  for (const u of assUsers) {
    if (u.department.code !== 'COMERCIAL') {
      throw new Error(`ERRO: Assistente viu usuário de outro setor: ${u.department.code}`);
    }
  }
  console.log('-> Aprovado: Comercial viu apenas Comercial!');

  console.log('\n--- TESTE 5: Faturamento com filtro inicial no seu usuário visualiza fila para agir ---');
  // Cria pedido e avança até Faturamento
  const testNum = 'FLUXO_' + Math.floor(Math.random() * 90000 + 10000);
  res = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': assCookie },
    body: JSON.stringify({ orderNumber: testNum, customerName: 'Empresa Teste Fila' })
  });
  const order = (await res.json()).order;

  // Logística embarca
  await fetch(`${baseUrl}/api/orders/${order.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Cookie': logCookie },
    body: JSON.stringify({ action: 'EMBARQUE' })
  });
  // Almoxarifado autoriza
  await fetch(`${baseUrl}/api/orders/${order.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Cookie': almoxCookie },
    body: JSON.stringify({ action: 'AUTORIZAR_FATURAMENTO' })
  });

  // Faturamento consulta pedidos com o filtro no próprio usuário logado
  let meRes = await fetch(`${baseUrl}/api/auth/me`, { headers: { 'Cookie': fatCookie } });
  let fatUserMe = (await meRes.json()).user;

  res = await fetch(`${baseUrl}/api/orders?userId=${fatUserMe.id}`, { headers: { 'Cookie': fatCookie } });
  let ordersForFat = (await res.json()).orders;
  console.log('Pedidos retornados para Faturamento filtrado em si mesmo:', ordersForFat.length);
  const foundInQueue = ordersForFat.some(o => o.id === order.id);
  if (!foundInQueue) {
    throw new Error('ERRO: Pedido em AGUARDANDO_NOTA_FISCAL não apareceu para o usuário de Faturamento agir!');
  }
  console.log('-> Aprovado: Pedido da fila apareceu para o Faturamento visualizar e agir!');

  // Faturamento age no pedido
  res = await fetch(`${baseUrl}/api/orders/${order.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Cookie': fatCookie },
    body: JSON.stringify({ action: 'EMITIR_NF', payload: { invoiceNumber: 'NF-TESTE' } })
  });
  let faturado = (await res.json()).order;
  console.log('Faturamento emitiu NF! Novo status:', faturado.status);

  console.log('\n=== TODOS OS TESTES DE FILTRO DE USUÁRIO E VISIBILIDADE FORAM APROVADOS! ===');
}

testUserFilterRules().catch(console.error);
