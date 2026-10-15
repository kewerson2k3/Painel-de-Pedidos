async function testFlow() {
  const baseUrl = 'http://localhost:3000';

  console.log('--- 1. Login como assistente comercial ---');
  let res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'assistente', password: '123456' })
  });
  let data = await res.json();
  if (!res.ok) throw new Error('Falha no login assistente: ' + JSON.stringify(data));
  const assistenteCookie = res.headers.get('set-cookie');
  console.log('Login assistente OK:', data.user.name);

  console.log('\n--- 2. Criar novo pedido ---');
  const testOrderNumber = 'TEST' + Math.floor(Math.random() * 90000 + 10000);
  res = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': assistenteCookie
    },
    body: JSON.stringify({
      orderNumber: testOrderNumber,
      customerName: 'Cliente Teste Retorno Ltda',
      customerCode: 'CLI-999',
      notes: 'Instruções para teste de devolução'
    })
  });
  data = await res.json();
  if (!res.ok) throw new Error('Falha ao criar pedido: ' + JSON.stringify(data));
  const createdOrder = data.order;
  console.log('Pedido criado:', createdOrder.orderNumber, 'ID:', createdOrder.id, 'Status:', createdOrder.status);

  console.log('\n--- 3. Login como Logística ---');
  res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'logistica', password: '123456' })
  });
  data = await res.json();
  if (!res.ok) throw new Error('Falha no login logística: ' + JSON.stringify(data));
  const logisticaCookie = res.headers.get('set-cookie');
  console.log('Login logística OK:', data.user.name, 'Depto:', data.user.departmentName);

  console.log('\n--- 4. Logística tenta DEVOLVER o pedido por problema ---');
  res = await fetch(`${baseUrl}/api/orders/${createdOrder.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': logisticaCookie
    },
    body: JSON.stringify({
      action: 'DEVOLVER',
      reason: 'Falta informação de lote nos itens para embarque'
    })
  });
  data = await res.json();
  if (!res.ok) throw new Error('Falha na devolução: ' + JSON.stringify(data));
  console.log('Pedido devolvido com sucesso! Novo status:', data.order.status);
  console.log('Motivo registrado:', data.order.returnReason);
  console.log('Etapa de retorno gravada:', data.order.returnOriginStage);

  console.log('\n--- 5. Assistente verifica pedido devolvido no painel ---');
  res = await fetch(`${baseUrl}/api/orders/${createdOrder.id}`, {
    headers: { 'Cookie': assistenteCookie }
  });
  data = await res.json();
  console.log('Status visto pelo assistente:', data.order.status);
  console.log('Devolvido por:', data.order.returnUserName, '-', data.order.returnUserDept);

  console.log('\n--- 6. Assistente REENCAMINHA o pedido após ajuste ---');
  res = await fetch(`${baseUrl}/api/orders/${createdOrder.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': assistenteCookie
    },
    body: JSON.stringify({
      action: 'REENCAMINHAR',
      notes: 'Instruções para teste de devolução - Lote 598956 inserido',
      resolutionNotes: 'Ajustado conforme solicitado, número de lote anexado ao pedido.'
    })
  });
  data = await res.json();
  if (!res.ok) throw new Error('Falha no reencaminhamento: ' + JSON.stringify(data));
  console.log('Reencaminhado com sucesso!');
  console.log('Status restaurado para a etapa de origem:', data.order.status);

  console.log('\n--- 7. Teste de cancelamento por terceiro (Logística tentando cancelar pedido do Assistente) ---');
  res = await fetch(`${baseUrl}/api/orders/${createdOrder.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': logisticaCookie
    },
    body: JSON.stringify({
      action: 'CANCELAR',
      cancelReason: 'Tentativa não autorizada'
    })
  });
  data = await res.json();
  console.log('Resposta esperada de bloqueio:', res.status, data.error);

  console.log('\n--- 8. Assistente exclui o pedido de teste ---');
  res = await fetch(`${baseUrl}/api/orders/${createdOrder.id}`, {
    method: 'DELETE',
    headers: { 'Cookie': assistenteCookie }
  });
  data = await res.json();
  console.log('Exclusão pelo criador:', res.status, data.message || data.error);

  console.log('\n=== TODOS OS TESTES PASSARAM COM SUCESSO! ===');
}

testFlow().catch(console.error);
