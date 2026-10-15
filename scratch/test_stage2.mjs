async function testStage2Return() {
  const baseUrl = 'http://localhost:3000';

  // Login assistente
  let res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'assistente', password: '123456' })
  });
  const assistenteCookie = res.headers.get('set-cookie');

  // Criar pedido
  const testNum = 'STAGE2_' + Math.floor(Math.random() * 90000 + 10000);
  res = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': assistenteCookie },
    body: JSON.stringify({ orderNumber: testNum, customerName: 'Cliente Etapa 2 Ltda' })
  });
  const order = (await res.json()).order;
  console.log('1. Pedido criado:', order.orderNumber, 'Status:', order.status);

  // Login logística para avançar para Etapa 2
  res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'logistica', password: '123456' })
  });
  const logisticaCookie = res.headers.get('set-cookie');

  res = await fetch(`${baseUrl}/api/orders/${order.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Cookie': logisticaCookie },
    body: JSON.stringify({ action: 'EMBARQUE', payload: { carrierName: 'Transportadora Alfa' } })
  });
  console.log('2. Logística realizou embarque. Novo status:', (await res.json()).order.status);

  // Login faturamento (Almoxarifado)
  res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'faturamento', password: '123456' })
  });
  const almoxCookie = res.headers.get('set-cookie');

  // Almoxarifado devolve o pedido por falta de peça em estoque
  res = await fetch(`${baseUrl}/api/orders/${order.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Cookie': almoxCookie },
    body: JSON.stringify({
      action: 'DEVOLVER',
      payload: { reason: 'Item 2 sem saldo no estoque físico do Almoxarifado' }
    })
  });
  let rawJson = await res.json();
  if (!res.ok) {
    console.error('Erro na resposta:', res.status, rawJson);
    return;
  }
  let retData = rawJson.order;
  console.log('3. Almoxarifado devolveu por divergência. Status:', retData.status);
  console.log('   Etapa de origem gravada:', retData.returnOriginStage);

  // Criador reencaminha
  res = await fetch(`${baseUrl}/api/orders/${order.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Cookie': assistenteCookie },
    body: JSON.stringify({
      action: 'REENCAMINHAR',
      payload: { resolutionNotes: 'Item substituído pelo código compatível no TOTVS.' }
    })
  });
  let reencData = (await res.json()).order;
  console.log('4. Assistente reencaminhou. Status restaurado diretamente para:', reencData.status);
  if (reencData.status !== 'AGUARDANDO_SEPARACAO') {
    throw new Error('ERRO: Não voltou para AGUARDANDO_SEPARACAO! Voltou para: ' + reencData.status);
  }

  // Limpeza
  await fetch(`${baseUrl}/api/orders/${order.id}`, {
    method: 'DELETE',
    headers: { 'Cookie': assistenteCookie }
  });
  console.log('5. Pedido limpo após teste.');
  console.log('=== TESTE DE RETORNO DIRETO PARA ETAPA DE ORIGEM APROVADO! ===');
}

testStage2Return().catch(console.error);
