# 🍽️ GastroEventos — Sistema Web Culinário Completo (Padrão 2º Ciclo)

Projeto desenvolvido e atualizado com toda a **nova arquitetura modular, recursos e melhorias implementadas pelo professor**, adaptado 100% para a identidade e estética de **culinária e gastronomia (GastroEventos)**.

---

## 🚀 O que foi integrado das modificações do professor:

### 1. 🎨 Estética Culinária com Tema Claro & Escuro (Light / Dark Mode)
- **Alternador de tema dinâmico** com animação circular fluida via **View Transitions API** (`assets/js/theme.js`):
  - **Bistrô Noir (Escuro)**: Café espresso, chocolate amargo, bordas âmbar e brilho em páprica/açafrão.
  - **Artisan Bakery & Cream (Claro)**: Tons quentes de linho, creme suave, baunilha e café torrado.
- **Logotipo adaptativo (`logo-gastro.svg`)**: O cloche de chef e a tipografia mantêm legibilidade e contraste perfeitos em ambos os modos.
- **Microinterações e Aurora Hero**: Efeitos de brilho orgânico (*blobs*) com tons de páprica, açafrão e alecrim.

### 2. ⚡ Movimento e Animações Fluidas (`assets/js/motion.js`)
- Animações escalonadas (*stagger reveal*) usando `IntersectionObserver`.
- Carrossel de destaques interativo com botões direcionais e transições suaves.
- Suporte total a `prefers-reduced-motion` para acessibilidade.

### 3. 🗂️ Arquitetura Modular em Camadas
O código foi completamente reestruturado em módulos profissionais e desacoplados:
- **`assets/js/utils/`**:
  - `dom.js`: Utilitários DOM seguros com escape HTML contra ataques XSS.
  - `modal.js`: Sistema de modais acessíveis baseado no elemento nativo `<dialog>`, com animações, diálogos de confirmação e formulários modais.
  - `pagination.js`: Controle de paginação modular para tabelas.
  - `text.js`: Utilitários de texto, geração automática de slugs e formatação de datas.
  - `validation.js`: Sistema declarativo de validação de formulários com regras reutilizáveis.
- **`assets/js/supabaseClient.js`**: Instância única e centralizada do cliente Supabase.
- **`js/services/catalogoService.js`**: Camada de dados públicos do site com escuta em tempo real.
- **`js/components/eventoView.js`**: Componentes reutilizáveis (cards gastronômicos, barra de capacidade/vagas, badges de data, etc.).
- **`js/pages/`**: Controladores dedicados para `home.js`, `evento.js` e `inscricao.js`.

### 4. 🔄 Vagas em Tempo Real (Supabase Realtime)
- O site escuta alterações na tabela `eventos` via WebSocket (`catalogoService.onEventoAtualizado`).
- Quando uma inscrição é realizada, a barra de progresso e o contador de vagas são atualizados **imediatamente na tela de todos os usuários conectados sem precisar recarregar a página**.

### 5. 🛡️ Segurança, RLS e Controle Automático de Vagas
- **Trigger `ajustar_vagas_evento()`**: Desconta a vaga no banco ao registrar uma inscrição e devolve automaticamente caso uma inscrição seja cancelada ou excluída.
- **Função RPC `inscrever_participante()`**:
  - Validação estrita no servidor (nome, CPF com 11 dígitos, WhatsApp com DDD, data de nascimento).
  - Bloqueio de inscrições em oficinas já encerradas.
  - Prevenção contra inscrições duplicadas no mesmo evento.
  - Reaproveitamento inteligente do cadastro do participante por e-mail.
  - Retorno imediato do código de confirmação da experiência (`INSC-00000X`).
- **Políticas RLS**: O visitante anônimo apenas lê dados públicos de eventos e categorias e realiza inscrições seguras pela RPC, enquanto dados pessoais e painel administrativo exigem autenticação.

### 6. 🧑‍🍳 Painel Administrativo Completo com Modais
- **`admin/index.html`**: Acesso rápido às áreas de Experiências, Categorias Culinárias, Inscritos e Chefs.
- **`admin/eventos.html` & `admin/js/pages/eventos.js`**:
  - Listagem completa com categorias e status (aberto/encerrado).
  - Cadastro e edição de experiências através de **janelas modais**.
  - Validação completa e geração automática de slug.
  - Exclusão com confirmação e verificação de inscrições vinculadas.
- **`admin/categorias.html` & `admin/js/pages/categorias.js`**:
  - Gestão de especialidades culinárias (Massas, Confeitaria, Vinhos, Carnes, etc.).
  - Cores personalizadas e contagem em tempo real de oficinas vinculadas.
- **`admin/inscritos.html` & `admin/js/pages/inscritos.js`**:
  - Tabela paginada com filtro dinâmico por oficina e sincronização na URL (`?evento=ID&pagina=N`).
  - Remoção de inscrição com devolução instantânea da vaga.

### 7. 📸 Fotos Temáticas e Capas Culinárias de Alta Resolução
- **Capas com fotos gastronômicas** nos cards da página inicial (vitrine e carrossel), no cabeçalho da oficina (`evento.html`) e no resumo de inscrição (`inscricao.html`).
- **Resolução inteligente com fallback automático**:
  1. Se o evento possuir uma URL ou caminho de foto cadastrado (`imagem_url`), ele é utilizado.
  2. Caso contrário, o sistema mapeia fotos temáticas culinárias em alta resolução pelo slug do evento ou categoria (massas italianas, confeitaria/macarons, pães levain, degustação de vinhos, sushi master, carnes nobres, cozinha vegana).
  3. Se a imagem falhar ao carregar ou o usuário estiver sem internet, o visual recorre automaticamente aos gradientes originais das categorias.
- **Suporte a fotos locais**: Criada a pasta `assets/images/eventos/` para você colocar fotos locais do computador (ex: `massas.jpg`, `confeitaria.jpg`, etc.) ou inserir URLs diretamente no formulário do painel do chef (`admin/eventos.html`).
- **`admin/usuarios.html` & `admin/js/pages/usuarios.js`**:
  - Gestão de contas do painel com atribuição de papéis (Administrador / Chef Líder e Chef / Organizador) e status (Ativo / Inativo).
- **`admin/js/guard.js`**: Proteção de rotas no `<head>` com `data-auth="required"` para impedir que o conteúdo do painel apareça antes da validação da sessão (sem "flash" de tela).

### 7. ☁️ Supabase Edge Function (`supabase/functions/admin-users/`)
- Função serverless TypeScript em Deno para realizar operações administrativas seguras via `auth.admin` utilizando a `SERVICE_ROLE_KEY` no servidor, mantendo as credenciais restritas longe do navegador.

---

## 🗄️ Estrutura de Pastas do Projeto

```text
projeto-eventos-2-ciclo-main/
├── admin/                         # Painel Administrativo do Chef
│   ├── js/
│   │   ├── pages/                 # Controladores de cada tela do admin
│   │   │   ├── categorias.js
│   │   │   ├── eventos.js
│   │   │   ├── inscritos.js
│   │   │   ├── login.js
│   │   │   └── usuarios.js
│   │   ├── services/              # Camada de serviços (CRUD e Supabase Auth)
│   │   │   ├── authService.js
│   │   │   ├── categoriasService.js
│   │   │   ├── eventosService.js
│   │   │   ├── inscricoesService.js
│   │   │   └── usuariosService.js
│   │   └── guard.js               # Proteção de acesso e sessão
│   ├── categorias.html
│   ├── eventos.html
│   ├── index.html
│   ├── inscritos.html
│   ├── login.html
│   └── usuarios.html
├── assets/
│   ├── css/
│   │   └── styles.css             # Design tokens e estilos culinários globais
│   ├── images/
│   │   └── logo-gastro.svg        # Logotipo GastroEventos com cloche e vapor
│   └── js/
│       ├── utils/                 # Biblioteca utilitária (DOM, modal, paginação, etc.)
│       │   ├── dom.js
│       │   ├── modal.js
│       │   ├── pagination.js
│       │   ├── text.js
│       │   └── validation.js
│       ├── motion.js              # Animações de scroll e revelação
│       ├── supabaseClient.js      # Cliente centralizado do Supabase
│       └── theme.js               # Alternador de tema Claro / Escuro
├── js/
│   ├── components/
│   │   └── eventoView.js          # Componentes visuais dos eventos culinários
│   ├── pages/
│   │   ├── evento.js              # Detalhe do workshop gastronômico
│   │   ├── home.js                # Página inicial com busca e carrossel
│   │   └── inscricao.js           # Formulário e confirmação de vaga
│   └── services/
│       └── catalogoService.js     # Consulta pública e realtime
├── supabase/
│   ├── functions/admin-users/     # Edge Function para gestão de contas
│   └── migrations/                # Migrations SQL organizadas por data
├── banco_supabase.sql             # Script SQL consolidado completo (All-in-one)
├── cadastro.html                  # Cadastro de participante
├── evento.html                    # Detalhes da oficina
├── index.html                     # Vitrine principal de experiências
├── inscricao.html                 # Inscrição na experiência culinária
├── login.html                     # Login de participante
├── meu-perfil.html                # Minhas inscrições e cancelamento
├── supabase-credentials.js        # Credenciais ativas do Supabase
└── LEIA-ME.md
```

---

## 💻 Como Rodar o Projeto

1. Abra a pasta no **VS Code**:
   `C:\Users\maria\Desktop\projeto-eventos-2-ciclo-main`
2. Clique com o botão direito em `index.html` e escolha **"Open with Live Server"**.
3. O projeto abrirá no navegador pronto para uso com temas claro/escuro, tempo real e busca integrada!
