# AGENTS.md - Sistema de Gestao de Obras

## Identidade do Projeto

- Nome: O projeto ainda NAO tem nome fixo final. Tratar como "sistema".
- Sistema operacional: Windows
- Frontend: `C:\Users\leona\OneDrive\Area de Trabalho\quali\quali-frontend`
- Backend: `C:\Users\leona\OneDrive\Area de Trabalho\quali\quali-backend`
- Referencias visuais: Pasta `C:\Users\leona\OneDrive\Area de Trabalho\quali\quali` (imagens Figma/ObraFacil)

---

## Stack Tecnologica

### Frontend
- React + TypeScript + Vite
- Lucide React (icones)
- CSS customizado em `src/index.css`
- Variaveis CSS para cores, espacamentos e fontes
- Arquitetura de componentes em `src/components/`
- Context API para autenticacao (`AuthContext`)
- Toast Provider proprio para feedbacks globais

### Backend
- Spring Boot 4.x
- JPA + Hibernate
- Spring Security + JWT
- Flyway (sem migrations ativas - WARNING: No migrations found)
- MySQL (via Docker, porta padrao 3306)
- Porta padrao da aplicacao: 8080
- Lombok (usar `@Data`, `@AllArgsConstructor`, etc.)

---

## Arquitetura de Componentes Frontend

### Estrutura de Pastas

```
src/
  components/
    feedback/
      ToastProvider.tsx        # Sistema global de toast (sucesso, erro, info)
    clients/
      ClientCard.tsx           # Card individual de cliente
      ClientFormFields.tsx     # Campos de formulario de cliente (nome, email, telefone)
    constructions/
      ConstructionBoardCard.tsx     # Card do board de obras
      ConstructionDetailsFields.tsx  # Campos etapa 1 do formulario de obra
      ConstructionAddressFields.tsx # Campos etapa 2 do formulario de obra
    construction-detail/
      DetailModuleCard.tsx      # Card modular do detalhe da obra (checklist, cronograma, equipe, etc)
      DetailInfoSection.tsx     # Secao base de informacao do detalhe
      ChecklistModal.tsx        # Modal completo de checklist
      MaterialsModal.tsx         # Modal completo de materiais (CRUD: criar, somar, diminuir, excluir)
      MaterialsSection.tsx       # Secao de materiais (OBSOLETO - substituido por MaterialsModal)
      TeamModal.tsx              # Modal completo de equipe (listar, adicionar, remover colaboradores)
    modals/
      ModalShell.tsx            # Modal base reutilizavel (overlay + card + header + close)
      ConfirmActionModal.tsx    # Modal de confirmacao de acao (arquivar, excluir)
    ProtectedRoute.tsx          # Rota protegida por autenticacao
  features/
    auth/
      AuthContext.tsx           # Context de autenticacao (token, login, logout)
  lib/
    api.ts                     # Cliente HTTP centralizado com tratamento de erros
  layouts/
    AppShell.tsx               # Layout principal (sidebar + conteudo)
  pages/
    LoginPage.tsx              # Tela de login
    ConstructionsPage.tsx       # Board de obras
    ConstructionDetailPage.tsx  # Detalhe de uma obra
    ClientsPage.tsx           # Tela de clientes
  index.css                    # Estilos globais e de componentes
  app/
    router.tsx                 # Rotas da aplicacao
  main.tsx                     # Bootstrap do React (contem ToastProvider)
```

### Estilos Globais (src/index.css)

- Variaveis CSS no `:root` para:
  - Cores principais: `#17324b` (texto), `#58728b` (muted), `#5a63f6` (primaria/acento)
  - Fontes: `Nunito Sans` (corpo), `Sora` (headings via `--font-heading`)
  - Bordas, backgrounds, sombras
- Breakpoints principais: `1080px` (mobile), `1280px` (tablet), `1536px` (desktop)
- Classes de componentes sempre com BEM modificado: `.card__element--modifier`
- Hover/active states em TODOS os botoes
- Nao usar `Georgia` nem `Nunito Sans` em headings - usar variavel `--font-heading`

---

## Funcionalidades Implementadas

### 1. Autenticacao (Completo)
- Login com JWT
- Token armazenado no AuthContext
- Cliente HTTP (`api.ts`) injeta Authorization em todas as requisicoes
- Rotas protegidas com ProtectedRoute

### 2. Tela de Login (Completo - Refinado)
- Visual alinhado ao Figma/ObraFacil
- Campos: email + senha
- Erro de autenticacao tratado
- Microcopy enxuto

### 3. Tela de Obras - Board (Completo - CRUD)
- Board com 3 colunas: Em Andamento, Aguardando Inicio, Finalizada
- Busca por nome
- Contador de obras por coluna
- Cards com metricas e acoes
- Botoes: Abrir obra, Editar, Arquivar
- Modal de criar obra (2 etapas: dados principais + endereco)
- Modal de editar obra (mesmo modal, carrega dados via `GET /construction/report/{id}`)
- Modal de arquivar obra com confirmacao
- Feedback via toast
- CEP automatico (ViaCEP)

**PENDENTE nos cards**: os textos de "responsavel", "proximo marco", "distrito", "progresso" sao gerados via helpers locais (`buildBadgeText`, `buildDistrictText`, etc) e sao SIMULADOS - o backend `GET /construction` so devolve `id`, `name` e `status`. Para cards reais, e necessario enriquecer `FilterConstructionDTO` no backend.

### 4. Tela de Clientes (Completo - CRUD)
- Listagem com busca por nome/email/telefone
- Contador de registros
- Card lateral para cadastro rapido
- Modal de edicao
- Modal de arquivamento com confirmacao
- Feedback via toast
- Telefone com mascara: `(00)0 0000-0000`

### 5. Tela de Detalhe da Obra (Completo - Parcial)
- Hero com dados da obra
- Barra de metricas: progresso, equipe, prazo
- Painel de panorama e contato
- Grid de modulos: Checklist, Cronograma, Equipe, Lista de Materiais, Fotos, Reporte
- Modulo de Equipe: CRUD completo em modal (listar vinculados, adicionar, remover via PATCH /construction/update)
- Modulo de Fotos e Reporte: APENAS listagem, sem CRUD ainda
- Modulo de Materiais: CRUD completo (criar, somar, diminuir, excluir) via `PATCH /material/amount/{id}/{delta}`
- Modulo de Checklist: CRUD completo em modal (criar, marcar, desmarcar, excluir)

**PENDENTE importante**: o usuario pediu que Checklist, Lista de Materiais, Equipe e Fotos ABRAM EM MODAL, nao na aba abaixo. Atualmente:
- Checklist: ja abre em modal (OK)
- Lista de Materiais: ja abre em modal (OK)
- Equipe: ja abre em modal (OK)
- Fotos: abre na ABA `photos` (precisa migrar para modal)

### 6. Sistema de Toast (Novo - Proprio)
- Provider global em `ToastProvider.tsx`
- Tipos: success, error, info
- Entrada com animacao (toast-enter keyframe)
- Auto-close em 3.5s
- Botao de fechar manual
- Posicao: topo direito, responsivo no mobile
- Estilos em `index.css` (`.toast-viewport`, `.toast`, `.toast--success`, etc)

---

## APIs e Endpoints do Backend

### Auth
- `POST /auth/login` - Login

### Cliente
- `GET /client` - Listar clientes
- `GET /client/{id}` - Buscar cliente
- `POST /client/register` - Cadastrar
- `PATCH /client` - Editar (body: `{ id, name, email, phone }`)
- `DELETE /client/delete/soft/{clientId}` - Arquivar (soft delete)

### Obra
- `GET /construction` - Listar (RETORNA APENAS: id, name, status - PENDENTE enrichecer DTO)
- `GET /construction/report/{id}` - Detalhe completo
- `POST /construction/register` - Cadastrar
- `PATCH /construction/update` - Editar
- `PATCH /construction/status/{constructionId}/{status}` - Alterar status
- `PATCH /construction/weather/{constructionId}/{weather}` - Alterar clima
- `DELETE /construction/delete/{constructionId}` - Arquivar

### Checklist
- `POST /checklist/{constructionId}` - Criar checklist
- `GET /checklist/construction/{constructionId}` - Buscar checklist por obra
- `DELETE /checklist/{constructionId}` - Deletar checklist
- `POST /checklist/item/{checkListId}` - Criar item
- `PUT /checklist/item/{itemId}` - Editar item
- `PATCH /checklist/item/{itemId}` - Marcar/desmarcar
- `DELETE /checklist/item/{itemId}` - Excluir item

### Materiais
- `GET /material/{constructionId}` - Listar materiais
- `POST /material` - Cadastrar (body: `{ constructionId, name, amount }`)
- `PATCH /material/amount/{materialId}/{amount}` - Alterar quantidade (somar/subtrair)
- `DELETE /material/{materialId}` - Excluir

**ATENCAO**: O backend inicialmente zera a quantidade em `Construction.addMaterial()` com `material.setAmount(0.0)`. Isso foi corrigido para preservar o valor enviado: `material.setAmount(material.getAmount() == null ? 0.0 : material.getAmount())` em `Construction.java`. Verificar se o seed/backend usa o metodo `addMaterial` ou cria diretamente para confirmar.

### Fotos
- `POST /photos/{constructionId}` - Upload multipart
- `GET /photos/construction/{constructionId}` - Listar fotos
- `PUT /photos/{photoId}` - Atualizar descricao
- `DELETE /photos/{photoId}` - Excluir foto

### Usuario/Equipe
- `GET /user?role={role}` - Listar usuarios por papel (ADMIN, ENGENHEIRO, TECNICO, MASTER)
- `PATCH /construction/workers/{constructionId}` - Atualizar trabalhadores da obra (body: `{ workersIds: number[] }`)

### Reporte
- `GET /construction/report/{id}` - Relatorio consolidado da obra

---

## DTOs Importantes do Backend

### RegisterConstructionDTO
```java
{
  name, localContact, clientId (Long),
  address: { cep, city, street, neighborhood, number, complement },
  workersIds: List<Long>,
  startDate ("dd/MM/yyyy"), endDate ("dd/MM/yyyy"),
  agreedDeadLine (Integer - dias),
  comments (String, opcional)
}
```

### UpdateConstructionDTO
```java
{
  id, name, localContact, clientId (Long),
  address: { cep, city, street, neighborhood, number, complement },
  workersIds: List<Long>,
  startDate ("dd/MM/yyyy"), endDate ("dd/MM/yyyy"),
  agreedDeadLine (Integer - dias),
  coments (String - ATENCAO: typo no campo backend)
}
```

### FilterConstructionDTO (Retorno de GET /construction)
**PENDENTE**: atualmente retorna APENAS `id`, `name`, `status`. Os textos dos cards de obra no frontend sao simulados com helpers locais. Para cards reais, este DTO precisa ser enriquecido com mais campos.

---

## Regras de Negocio e Padroes

### Formato de Datas
- Frontend para API: `dd/MM/yyyy` (ex: "14/04/2026")
- API para frontend: `dd/MM/yyyy` (ex: "14/04/2026")
- Helpers em ConstructionsPage: `formatApiDate()`, `formatInputDate()`

### Telefone
- Formato de exibicao: `(00)0 0000-0000`
- Mascara aplicada no frontend em tempo real
- Funcao `formatPhone()` em ClientsPage.tsx
- Sanitizacao: so aceita digitos, limite de 11

### CEP
- ViaCEP no frontend: `https://viacep.com.br/ws/{cep}/json/`
- Autopreenchimento: cidade, rua, bairro, complemento
- Numero continua manual

### Autenticacao
- Token JWT no Authorization header: `Bearer {token}`
- Cliente `apiRequest` em `lib/api.ts` ja injeta automaticamente
- Erros tratados com `ApiError` custom

### Null Safety
- O backend pode devolver `null` em varios campos do report
- Frontend normaliza com fallbacks em `ConstructionDetailPage`
- Tratar: `pictures`, `workers`, `client`, `daysElapsed`, `overdueDays`, `comments`, `address.complement`

---

## Pendencias Técnicas Identificadas

### Alta Prioridade

1. **Materiais, Equipe, Fotos - Migrar para modal**
   - Usuario pediu que Checklist, Lista de Materiais, Equipe e Fotos ABRAM EM MODAL, nao na aba abaixo
   - Checklist: ja esta em modal (OK)
   - Lista de Materiais: ja esta em modal (OK)
   - Equipe: ja esta em modal (OK)
   - Fotos: currently in TAB `photos` - NEEDS conversion to modal

2. **FilterConstructionDTO enriquecido**
   - Backend `GET /construction` so devolve `id`, `name`, `status`
   - Frontend usa textos simulados nos cards
   - Precisa adicionar campos no DTO backend para ter dados reais

3. **TYPO no campo de comments**
   - No `UpdateConstructionDTO` o campo e `coments` (sem 'm')
   - O frontend envia `coments` para matchar com o backend
   - Deveria ser corrigido para `comments` no backend

### Media Prioridade

4. **Paginação**
   - Backend pagina com `size=20` na maioria dos endpoints
   - Frontend nao trata paginacao ainda
   - Acima de 20 registros, itens vao "sumir"

5. **Equipe - CRUD completo**
   - Listar usuarios por papel
   - Alocar/desalocar trabalhadores na obra
   - Ainda nao tem tela propria

6. **Reporte - Definir escopo**
   - O que significa "gerar reporte"?
   - Visualizacao consolidada? PDF? Compartilhamento?
   - Definir antes de implementar

7. **Flyway sem migrations**
   - WARNING no startup: `No migrations found`
   - Se for usar migrations, criar a primeira

### Baixa Prioridade

8. **Estilos responsivos**
   - Algumas telas podem precisar ajuste fino em mobile
   - Testar em resolucoes menores

9. **Acessibilidade**
   - Validar navegacao por teclado
   - Testar leitores de tela

10. ** Seeds/Initializers**
    - `DevUserInitializer.java` - cria usuario teste `teste@quali.com / 123456`
    - `DevConstructionInitializer.java` - cria obras de exemplo
    - Verificar se rodsam em cada startup

---

## CSS - Classes Principais

### Botoes
- `.primary-button` - Acao principal (roxo)
- `.ghost-page-button` - Acao secundaria/transparente
- `.secondary-page-button` - Acao secundaria com borda
- `.icon-button` - Icone isolado (X fechar, sino)
- `.checklist-toggle` - Toggle de marcar item
- `.checklist-toggle--done` - Toggle quando ja marcado
- `.key-link` - Link de atalho nos modulos
- `.detail-back-button` - Botao voltar

**Estados**: TODOS botoes tem `hover`, `active`, `focus-visible`

### Layout
- `.shell` - Layout principal (sidebar + main)
- `.shell__nav` - Navegacao lateral
- `.page-stack` - Container de conteudo
- `.detail-header-grid` - Grid 2 colunas (principal + lateral)
- `.detail-module-grid` - Grid de modulos do detalhe
- `.works-board` - Board de obras
- `.board-column` - Coluna do board
- `.board-card` - Card de obra

### Modais
- `.modal-overlay` - Backdrop do modal
- `.modal-card` - Card do modal
- `.modal-card__header` - Header do modal
- `.modal-card__actions` - Footer com botoes de acao
- `.works-modal` - Modal de obra
- `.clients-modal` - Modal de cliente
- `.clients-modal--danger` - Modal de危险操作 (arquivar)
- `.checklist-modal` - Modal de checklist (largura 816px, padding 19x22px, escala 1.2x)
- `.materials-modal` - Modal de materiais (largura 816px, padding 19x22px, mesmo padrao do checklist)
- `.team-modal` - Modal de equipe (largura 816px, padding 19x22px, mesmo padrao)

### Formularios
- `.field` - Campo com label
- `.field--full` - Campo largura total
- `.search-field` - Campo de busca
- `.select-field` - Campo select
- `.textarea-field` - Campo textarea
- `.form-error` - Mensagem de erro
- `.feedback` - Mensagem de feedback/loading

### Cards
- `.client-card` - Card de cliente
- `.board-card` - Card de obra no board
- `.module-card` - Card modular do detalhe
- `.detail-card` - Card de informacao no detalhe
- `.photo-card` - Card de foto

### Lists
- `.stack-list` - Lista com espacamento
- `.list-row` - Linha de lista
- `.detail-list-row` - Linha de lista no detalhe
- `.key-value-list` - Lista chave-valor

### Status
- `.status-pill` - Pill de status
- `.status-pill--scheduled` - Aguardando
- `.status-pill--in_progress` - Em andamento
- `.status-pill--completed` - Concluido
- `.weather-pill` - Pill de clima
- `.work-status-pill` - Pill de status da obra

### Feedback
- `.toast-viewport` - Container de toasts
- `.toast` - Toast individual
- `.toast--success` / `.toast--error` / `.toast--info` - Variantes
- `.success-copy` - Texto de sucesso inline
- `.form-error` - Texto de erro inline

### Tipografia
- Variavel `--font-body` = `Nunito Sans`
- Variavel `--font-heading` = `Sora`
- `.section-title` / `.panel__title` / `.hero-title` - Usam `var(--font-heading)`
- `.eyebrow` - Texto sobre/titulo pequeno
- `.section-copy` - Paragrafo descritivo
- `.panel__copy` - Paragrafo de panel

---

## Fluxos de Teste por Tela

### Login
1. Acessar `/`
2. Fazer login com `teste@quali.com` / `123456`
3. Verificar redirecionamento para `/obras`
4. Testar credenciais invalidas

### Clientes
1. Acessar `/clientes`
2. Buscar cliente
3. Cadastrar novo cliente (com mascara de telefone)
4. Editar cliente existente
5. Arquivar cliente (com confirmacao)
6. Verificar toast de sucesso

### Obras
1. Acessar `/obras`
2. Buscar obra
3. Criar nova obra (2 etapas)
4. Editar obra existente
5. Arquivar obra
6. Abrir detalhe de uma obra
7. Verificar toast de sucesso

### Detalhe da Obra
1. Abrir uma obra
2. Verificar hero e metricas
3. Testar Checklist modal (criar, adicionar item, marcar, desmarcar, excluir)
4. Navegar pela aba de Materiais (PENDENTE: migrar para modal)
5. Verificar metricas

---

## Como Subir o Ambiente

### Backend
```bash
cd C:\Users\leona\OneDrive\Area de Trabalho\quali\quali-backend
# Garantir que MySQL esta rodando (Docker)
docker ps  # verificar container mysql
# Se nao estiver: docker run -d --name mysql-quali -p 3306:3306 -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=quali mysql:8
./mvnw spring-boot:run
# ou: ./mvnw clean compile && ./mvnw spring-boot:run
# Verificar porta: netstat -ano | findstr :8080
```

### Frontend
```bash
cd C:\Users\leona\OneDrive\Area de Trabalho\quali\quali-frontend
npm install  # se primeira vez
npm run dev
# ou: npx vite build (producao)
```

### Resolver Conflito de Porta 8080
```bash
netstat -ano | findstr :8080
# Identificar PID
taskkill /PID {PID} /F
```

---

## Ordem de Implementacao Recomendada

1. ~~Migrar Lista de Materiais para modal (igual checklist)~~ ✅
2. ~~Migrar Equipe para modal~~ ✅
3. Migrar Fotos para modal
4. Corrigir FilterConstructionDTO para dados reais nos cards
5. Corrigir typo `coments` -> `comments` no backend
6. Equipe CRUD completo
7. Reporte - definir escopo e implementar
8. Paginação no frontend
9. QA final

---

## Referencias Visuais

- Figma/ObraFacil: `C:\Users\leona\OneDrive\Area de Trabalho\quali\`
  - `obras.png` - Board de obras
  - `imagens de referencia\obra.png` - Detalhe de obra
  - Pasta `quali` - Prints gerados

---

## Contato de Teste

- Email: `teste@quali.com`
- Senha: `123456`
