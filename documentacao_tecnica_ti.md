# Documentação Técnica: Painel de Pedidos TOTVS
**Destinado à Equipe de Tecnologia da Informação (T.I) & Infraestrutura**

---

## 1. Arquitetura e Stack Tecnológica

O sistema foi desenvolvido utilizando as melhores práticas modernas do ecossistema Node.js / React:

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router com Server Components e Server Actions / Route Handlers).
- **Linguagem**: [TypeScript 5](https://www.typescriptlang.org/) com verificação estrita de tipos (`strict: true`).
- **Camada de Persistência**: [Prisma ORM 5](https://www.prisma.io/).
- **Banco de Dados**: SQLite otimizado para alta concorrência em ambiente de produção (modo WAL).
- **Estilização**: Tailwind CSS com suporte a Dark Mode completo via classe `dark`.
- **Autenticação**: Sessão stateless baseada em JWT assinado com chave secreta segura (`jose` / cookies HTTP-only).

---

## 2. Otimização de Performance e Alta Concorrência (SQLite em WAL Mode)

### 2.1. O Problema do SQLite Padrão
Por padrão, o SQLite opera com journaling tradicional (`journal_mode = DELETE`), onde qualquer operação de escrita bloqueia o banco inteiro, impedindo que outros usuários façam leituras (`SQLITE_BUSY: database is locked`). Em um cenário com dezenas de usuários simultâneos atualizando pedidos e consultando esteiras, isso gerava lentidão e travamentos.

### 2.2. A Solução Implementada em `src/lib/prisma.ts`
Foi configurado o modo **WAL (Write-Ahead Logging)** e pragmas avançados de memória:

```typescript
// Configuração automática na inicialização da conexão
await Promise.all([
  prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;'),
  prisma.$queryRawUnsafe('PRAGMA synchronous = NORMAL;'),
  prisma.$queryRawUnsafe('PRAGMA busy_timeout = 10000;'),
  prisma.$queryRawUnsafe('PRAGMA temp_store = MEMORY;'),
  prisma.$queryRawUnsafe('PRAGMA cache_size = -64000;'),
]);
```

- **`journal_mode = WAL`**: Escritores gravam em um arquivo de log `.db-wal` sem bloquear leituras. Múltiplos leitores podem acessar o banco simultaneamente sem conflito.
- **`synchronous = NORMAL`**: Reduz drasticamente a quantidade de `fsync` em disco, aumentando o throughput de I/O em até 10x sem risco de corrupção em sistemas operacionais modernos.
- **`busy_timeout = 10000`**: Evita erros imediatos de lock. Se dois processos tentarem escrever no exato mesmo milissegundo, o SQLite aguarda até 10 segundos antes de falhar.
- **`cache_size = -64000`**: Aloca 64 MB de cache dedicado na memória RAM do servidor para consultas instantâneas.
- **`temp_store = MEMORY`**: Tabelas e ordenações temporárias são processadas na RAM, sem escrita desnecessária em disco.

### 2.3. Índices de Banco de Dados (`prisma/schema.prisma`)
Para suportar dezenas de milhares de pedidos com paginação e ordenação instantâneas:
- `@@index([orderNumber])` -> Busca exata e rápida pelo número do pedido TOTVS.
- `@@index([status])` -> Filtragem instantânea das abas da esteira operacional.
- `@@index([createdById])` -> Filtro por solicitante do pedido.
- `@@index([isUrgent])` -> Priorização dos pedidos marcados como urgentes.
- `@@index([createdAt])` -> Filtro rápido por intervalo de datas (De / Até).
- `@@index([status, createdAt])` -> Índice composto que otimiza a listagem ordenada de pedidos ativos.

---

## 3. Segurança e Proteção de Dados

### 3.1. Rota Segura de Upload de Arquivos (`src/app/api/upload/route.ts`)
A rota de upload implementa camadas de proteção contra vulnerabilidades comuns:
1. **Autenticação Obrigatória**: Somente usuários autenticados com token JWT válido podem fazer upload.
2. **Whitelisting Rigoroso de Extensões**:
   - Permitidas: `.pdf`, `.xlsx`, `.xls`, `.csv`, `.docx`, `.doc`, `.png`, `.jpg`, `.jpeg`, `.txt`.
   - Bloqueio automático de executáveis e scripts (`.exe`, `.bat`, `.sh`, `.js`, `.php`, `.py`, etc.).
3. **Proteção Contra Path Traversal (`../`)**: O nome original do arquivo é sanitizado via `path.basename` e apenas caracteres seguros (`[a-zA-Z0-9_-]`) são preservados.
4. **Nomes Únicos com Hash Criptográfico**:
   - Formato: `${Date.now()}-${crypto.randomBytes(8).toString('hex')}-${sanitizedBase}${ext}`.
   - Isso elimina risco de sobreposição de arquivos entre pedidos diferentes.
5. **Limite Máximo de Tamanho**: Validação de até 30 MB por arquivo para evitar negação de serviço (DoS) por consumo de disco.

### 3.2. Mascaramento Departamental em Nível de API
Para atender às exigências de conformidade interna e privacidade:
- `fiscalNotes` (Observações Fiscais): Somente o Faturamento, o criador do pedido e Administradores (T.I) recebem este dado no payload da API.
- `separationNotes` (Observações de Separação): Somente Logística, Almoxarifado, o criador do pedido e Administradores recebem este dado.
- `deliveryNotes` (Observações de Entrega): Restrito a Transporte, criador e Administradores.
- Usuários não autorizados recebem valor `null`, garantindo que inspeções no DevTools do navegador não revelem dados sigilosos de outros setores.

### 3.3. Proteção no Cadastro de Usuários (RBAC Presets)
No painel administrativo (`admin/users`), cada departamento possui templates pré-configurados:
- **Comercial / Assistência / Licitação**: Inclusão de pedidos, visualização global, edição e cancelamento.
- **Logística & Almoxarifado**: Permissão para registrar Embarque, Separação e Autorizar Faturamento.
- **Faturamento**: Permissão estrita para Faturar e Emitir NF.
- **T.I**: Administrador com todas as flags ativas.
- **Gerência / Supervisão**: Visualização global com proibição total de escrita/edição.

---

## 4. Procedimento de Atualização e Deploy na VPS

Sempre que novas atualizações forem enviadas para o repositório, execute os passos abaixo na VPS:

```bash
# 1. Acessar o diretório da aplicação na VPS
cd /caminho/do/projeto/Painel-de-Pedidos

# 2. Obter as alterações do repositório
git pull origin main

# 3. Instalar novas dependências (se houver)
npm install

# 4. Sincronizar o schema do Prisma com o banco de dados de produção
npx prisma db push

# 5. Gerar o Prisma Client atualizado
npx prisma generate

# 6. Compilar o projeto Next.js para produção
npm run build

# 7. Reiniciar o serviço via PM2 (ou systemd)
pm2 reload painel-pedidos || pm2 restart painel-pedidos
```

> [!IMPORTANT]
> **Executar na VPS**: Como houve adição de novas colunas no banco (`romaneio`, `weight`, `volume`, `embarqueAttachment`, `invoiceFiles`, `boletoFiles`) e novos índices, o comando `npx prisma db push` **deve ser executado na VPS**.

---

## 5. Rotina de Backup do Banco de Dados SQLite

O arquivo do banco de dados encontra-se em `prisma/dev.db`.

Como o banco opera em modo WAL, existem até 3 arquivos:
- `dev.db` (Arquivo principal)
- `dev.db-wal` (Write-ahead log)
- `dev.db-shm` (Shared memory index)

### Script Recomendado de Backup Seguro (Hot Backup sem parar a aplicação)
Para fazer backup a quente sem correr risco de inconsistência durante gravações:

```bash
# Cria snapshot consistente usando o próprio comando sqlite3
sqlite3 /caminho/do/projeto/prisma/dev.db ".backup '/caminho/dos/backups/backup_pedidos_$(date +\%Y\%m\%d_\%H\%M\%S).db'"
```

Recomenda-se adicionar essa linha em uma tarefa no `crontab` da VPS para execução diária ou a cada 6 horas.
