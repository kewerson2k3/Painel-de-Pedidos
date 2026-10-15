async function testStage3FiscalReturn() {
  const baseUrl = 'http://localhost:3000';

  console.log('--- 1. Login Assistente & Criação do Pedido ---');
  let res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'assistente', password: '123456' })
  });
  const assistenteCookie = res.headers.get('set-cookie');

  const testNum = 'FISCAL_' + Math.floor(Math.random() * 90000 + 10000);
  res = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': assistenteCookie },
    body: JSON.stringify({
      orderNumber: testNum,
      customerName: 'Indústria Metalúrgica Brasil S.A.',
      customerCode: 'CLI-5544',
      notes: 'Pedido padrão para faturamento'
    })
  });
  const order = (await res.json()).order;
  console.log(`Pedido #${order.orderNumber} criado. Status inicial:`, order.status);

  console.log('\n--- 2. Logística realiza Embarque (Etapa 1 -> Etapa 2) ---');
  res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'logistica', password: '123456' })
  });
  const logisticaCookie = res.headers.get('set-cookie');

  res = await fetch(`${baseUrl}/api/orders/${order.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Cookie': logisticaCookie },
    body: JSON.stringify({ action: 'EMBARQUE', payload: { carrierName: 'Jadlog Express' } })
  });
  console.log('Etapa 1 concluída. Status:', (await res.json()).order.status);

  console.log('\n--- 3. Almoxarifado autoriza Faturamento (Etapa 2 -> Etapa 3) ---');
  res = await fetch(`${baseUrl}/api/orders/${order.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Cookie': logisticaCookie }, // logistica has canSeparar
    body: JSON.stringify({ action: 'AUTORIZAR_FATURAMENTO', payload: { separationNotes: 'Itens conferidos e separados nas caixas 1 e 2' } })
  });
  let stage3Order = (await res.json()).order;
  console.log('Etapa 2 concluída. Status:', stage3Order.status);
  if (stage3Order.status !== 'AGUARDANDO_NOTA_FISCAL') {
    throw new Error('Falha ao avançar para Etapa 3');
  }

  console.log('\n--- 4. Faturamento identifica divergência fiscal (Natureza de Operação) e DEVOLVE ---');
  res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'faturamento', password: '123456' })
  });
  const faturamentoCookie = res.headers.get('set-cookie');

  const motivoFiscal = 'Acerto fiscal necessário: Natureza de operação incompatível com o estado do cliente (CFOP 5102 para interestadual). Ajustar no TOTVS para CFOP 6102.';
  res = await fetch(`${baseUrl}/api/orders/${order.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Cookie': faturamentoCookie },
    body: JSON.stringify({
      action: 'DEVOLVER',
      payload: { reason: motivoFiscal }
    })
  });
  let returnedOrder = (await res.json()).order;
  console.log('Pedido devolvido pelo Faturamento!');
  console.log('Status atual:', returnedOrder.status);
  console.log('Etapa de origem gravada:', returnedOrder.returnOriginStage);
  console.log('Motivo:', returnedOrder.returnReason);
  console.log('Devolvido por:', returnedOrder.returnUserName, '-', returnedOrder.returnUserDept);

  if (returnedOrder.status !== 'PENDENTE_AJUSTE' || returnedOrder.returnOriginStage !== 'AGUARDANDO_NOTA_FISCAL') {
    throw new Error('Falha na gravação do retorno da Etapa 3');
  }

  console.log('\n--- 5. Assistente faz o acerto fiscal e REENCAMINHA ---');
  res = await fetch(`${baseUrl}/api/orders/${order.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Cookie': assistenteCookie },
    body: JSON.stringify({
      action: 'REENCAMINHAR',
      payload: {
        resolutionNotes: 'Pedido alterado no TOTVS com CFOP 6102 e cálculo de DIFAL validado pela contabilidade.',
        generalNotes: 'Pedido corrigido fiscalmente no TOTVS'
      }
    })
  });
  let resubmittedOrder = (await res.json()).order;
  console.log('Pedido reencaminhado pelo Assistente!');
  console.log('Novo status após reencaminhamento:', resubmittedOrder.status);

  if (resubmittedOrder.status !== 'AGUARDANDO_NOTA_FISCAL') {
    throw new Error('ERRO: Pedido NÃO retornou para AGUARDANDO_NOTA_FISCAL! Retornou para: ' + resubmittedOrder.status);
  }
  console.log('-> SUCESSO: Pedido retornou diretamente para a Etapa 3 (Aguardando Nota Fiscal)!');

  console.log('\n--- 6. Faturamento verifica fila e emite a Nota Fiscal (Etapa 4 - Faturado) ---');
  res = await fetch(`${baseUrl}/api/orders/${order.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Cookie': faturamentoCookie },
    body: JSON.stringify({
      action: 'EMITIR_NF',
      payload: {
        invoiceNumber: 'NF-104928',
        invoiceSeries: '1',
        invoiceKey: '35261012345678000199550010001049281234567890',
        invoiceNotes: 'Nota fiscal emitida com sucesso após correção do CFOP 6102.'
      }
    })
  });
  let faturadoOrder = (await res.json()).order;
  console.log('Nota Fiscal emitida com sucesso!');
  console.log('Status final:', faturadoOrder.status);
  console.log('Número da NF:', faturadoOrder.invoiceNumber);

  console.log('\n--- 7. Histórico do pedido verificado ---');
  res = await fetch(`${baseUrl}/api/orders/${order.id}`, {
    headers: { 'Cookie': assistenteCookie }
  });
  let fullOrder = (await res.json()).order;
  console.log('Eventos na linha do tempo:', fullOrder.history.length);
  for (const h of fullOrder.history) {
    console.log(`  - [${h.action}] por ${h.userName} (${h.userDept || '-'}): ${h.notes || 'Sem observações'}`);
  }

  console.log('\n=== FLUXO COMPLETO DE DEVOLUÇÃO E RETORNO FISCAL DA ETAPA 3 TESTADO E APROVADO! ===');
}

testStage3FiscalReturn().catch(console.error);
