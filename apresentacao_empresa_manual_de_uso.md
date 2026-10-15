# Manual de Uso & Apresentação Corporativa: Painel de Pedidos TOTVS

---

## 1. Visão Geral do Sistema
O **Painel de Pedidos TOTVS** é a plataforma corporativa centralizada responsável pelo rastreamento, gestão em tempo real e orquestração do ciclo de vida dos pedidos da empresa. 

Com o sistema, a comunicação entre setores deixa de depender de mensagens informais, planilhas paralelas ou e-mails dispersos. Cada departamento sabe exatamente quais pedidos estão sob sua responsabilidade, quais são urgentes e quais ações devem ser executadas.

```
[Inclusão do Pedido] ──> [1. Embarque] ──> [2. Separação] ──> [3. Faturamento] ──> [Concluído / Faturado]
 (Comercial/Assist/Lic.)   (Logística)     (Almoxarifado)     (Faturamento)
         ▲                     │                 │                  │
         │                     ▼                 ▼                  ▼
         └──────────────── DIVERGÊNCIA IDENTIFICADA (Devolução ao Solicitante)
```

---

## 2. Perfis e Atribuições por Departamento

| Departamento | Acesso & Visibilidade | Principais Responsabilidades |
| :--- | :--- | :--- |
| **Comercial / Assistência Técnica / Licitação** | Visualiza todas as etapas de pedidos criados; insere pedidos; gerencia ajustes. | • Incluir novos pedidos TOTVS.<br>• Definir prioridade (Normal ou Urgente).<br>• Preencher observações específicas por setor.<br>• Ajustar e reencaminhar pedidos devolvidos por divergência. |
| **Logística** | Visualiza a esteira completa; atua na Etapa 1. | • Conferência de expedição.<br>• Inserção obrigatória do **Romaneio**.<br>• Anexo de documentos de embarque (PDF, Excel, planilhas).<br>• Apontar divergências se houver inconformidade. |
| **Almoxarifado** | Visualiza a esteira completa; atua na Etapa 2. | • Separação física dos itens.<br>• Lançamento obrigatório de **Peso** e **Volume**.<br>• Autorização de Faturamento.<br>• Apontar divergências de estoque/separação. |
| **Transporte** | Visualiza a esteira completa e informações de entrega. | • Consulta de Romaneio e Observações de Entrega.<br>• Planejamento logístico de rotas. |
| **Faturamento** | Visualiza exclusivamente pedidos aguardando faturamento e faturados. | • Validação fiscal.<br>• Lançamento do número da **Nota Fiscal**.<br>• Anexação de Nota(s) Fiscal(is) e Boleto(s) Bancário(s).<br>• Conclusão do fluxo operacional. |
| **Gerência / Supervisão** | Visualiza todas as etapas sem poder de alteração física. | • Acompanhamento em tempo real de gargalos.<br>• Exportação de relatórios gerenciais em Excel.<br>• Análise de SLA de cada setor. |
| **T.I (Administração)** | Acesso total e irrestrito. | • Gestão de usuários e permissões granulares.<br>• Auditoria global de logs.<br>• Manutenção técnica da infraestrutura. |

---

## 3. Passo a Passo Operacional

### 3.1. Como Incluir um Novo Pedido
1. Acesse o painel e clique no botão **"+ Novo Pedido TOTVS"** no canto superior direito.
2. Preencha os campos:
   - **Nº do Pedido TOTVS** (obrigatório, numérico único).
   - **Razão Social / Nome do Cliente** (obrigatório).
   - **Tipo de Pedido**: selecione entre *Locação, Comodato, Demonstração, Venda, Serviço ou Insumo*.
   - **Valor Total (R$)** (opcional, para controle e relatórios).
   - **Caixa Urgente**: marque se o pedido tiver prioridade máxima de atendimento.
3. Preencha os direcionamentos específicos:
   - **Observação de Separação**: instruções para Almoxarifado/Logística.
   - **Observação Fiscal**: instruções tributárias para o Faturamento.
   - **Observação de Entrega**: orientações de rotas/recebimento para Transporte.
4. Clique em **"Cadastrar Pedido"**. O pedido entrará automaticamente na **Etapa 1 - Aguardando Embarque**.

---

### 3.2. Pedidos Urgentes
- Pedidos marcados como **Urgentes** são exibidos com **alerta pulsante em vermelho suave** e são automaticamente ordenados no **topo da esteira**, garantindo que as equipes operacionais priorizem seu atendimento imediato.

---

### 3.3. Etapa 1: Confirmar Embarque (Logística)
1. Ao receber a carga ou documentação inicial, o operador de Logística clica no pedido e seleciona **"Confirmar Embarque"**.
2. Preencha:
   - **Romaneio** *(obrigatório)*: código ou número do romaneio expedido.
   - **Anexar Arquivo**: selecione arquivo complementar (PDF, XLSX, DOC, etc.).
   - **Observação de Separação**: confirme ou complemente as instruções para a equipe de separação.
3. Clique em **"Confirmar Embarque"**. O status avança para **Aguardando Separação**.

---

### 3.4. Etapa 2: Separação e Autorização de Faturamento (Almoxarifado)
1. O Almoxarifado localiza o pedido na aba **"Separação"** e clica em **"Autorizar Faturamento"**.
2. O sistema exibe o número do **Embarque / Romaneio** registrado na etapa anterior.
3. Preencha:
   - **Peso** *(obrigatório)*: ex: `12.5 kg`.
   - **Volume** *(obrigatório)*: ex: `2 caixas / 1 pallet`.
   - **Observação de Separação**: detalhes adicionais sobre embalagem ou lote.
4. Clique em **"Autorizar Faturamento"**. O status avança para **Aguardando Nota Fiscal**.

---

### 3.5. Etapa 3: Emissão de Nota Fiscal (Faturamento)
1. O setor de Faturamento acessa o pedido e clica em **"Emitir Nota Fiscal"**.
2. O sistema exibe o número de **Embarque / Romaneio** para conferência.
3. Preencha:
   - **Número da Nota Fiscal** *(obrigatório)*: ex: `000.145.290`.
   - **Anexar Nota(s) Fiscal(is)**: anexe 1 ou mais arquivos em PDF/XML.
   - **Anexar Boleto(s)**: anexe 1 ou mais boletos bancários gerados.
   - **Observação Fiscal**: observações tributárias relevantes.
4. Clique em **"Finalizar Faturamento"**. O pedido é concluído e atinge o status **Faturado**.

---

### 3.6. Devolução por Divergência (Problema na Carga ou Cadastro)
Se qualquer setor identificar inconformidades (como falta de estoque, erro de tributação ou divergência cadastral):
1. O operador clica no botão **"Devolver"** no detalhe do pedido.
2. Descreve o motivo detalhado da divergência.
3. O pedido passa para o status **"Pendente de Ajuste"** e retorna ao painel do solicitante.
4. O solicitante ajusta o pedido no TOTVS e clica em **"Ajustar & Reencaminhar"**. O pedido retorna exatamente para a etapa em que o problema foi apontado, sem retrabalho desnecessário.

---

### 3.7. Filtros por Intervalo de Datas e Exportação para Excel
1. **Filtro de Data (De / Até)**: localizado no topo ao lado do botão de atualização. Permite selecionar períodos específicos de inclusão de pedidos.
2. **Exportar Excel**: gera instantaneamente um arquivo `.csv` codificado em UTF-8 BOM com delimitador ponto e vírgula (`;`), abrindo diretamente no Excel com todas as colunas operacionais, nomes dos anexos, histórico, pesos, volumes e observações. Todos os colaboradores possuem acesso à exportação.

---

## 4. Segurança e Privacidade das Informações
- **Observações Departamentais Protegidas**: instruções fiscais são restritas ao faturamento; instruções de separação são restritas ao almoxarifado/logística; instruções de entrega ao transporte. O criador e administradores possuem visão integral.
- **Auditoria Completa**: todas as ações (quem embarcou, quem separou, quem faturou, data e horário exatos) ficam gravadas na Linha do Tempo de cada pedido.
