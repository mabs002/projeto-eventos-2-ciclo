/**
 * Sistema de Autenticação e Sessão - GastroEventos
 */
window.Auth = (function () {
    const STORAGE_KEY = "gastro_user";

    function getUser() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error("Erro ao ler sessão:", e);
            return null;
        }
    }

    function setUser(user) {
        if (!user) {
            localStorage.removeItem(STORAGE_KEY);
        } else {
            // Não salvar senha no localStorage por segurança
            const { senha, ...safeUser } = user;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(safeUser));
        }
    }

    function logout(redirectUrl) {
        localStorage.removeItem(STORAGE_KEY);
        if (redirectUrl) {
            window.location.href = redirectUrl;
        } else {
            // Identifica se estamos dentro da pasta admin/ ou na raiz
            const isInAdmin = window.location.pathname.includes("/admin/");
            window.location.href = isInAdmin ? "../index.html" : "index.html";
        }
    }

    async function login(email, senha) {
        const client = window.supabaseClient;
        if (!client) {
            return { sucesso: false, erro: "Conexão com banco de dados indisponível." };
        }

        const emailLimpo = (email || "").trim().toLowerCase();
        const senhaLimpa = (senha || "").trim();

        if (!emailLimpo || !senhaLimpa) {
            return { sucesso: false, erro: "Informe e-mail e senha." };
        }

        try {
            const { data, error } = await client
                .from("usuarios")
                .select("id, nome, email, senha, papel, status, criado_em")
                .ilike("email", emailLimpo)
                .limit(1);

            if (error) {
                console.error("Erro no login:", error);
                return { sucesso: false, erro: "Erro ao consultar usuário no banco de dados." };
            }

            if (!data || data.length === 0) {
                return { sucesso: false, erro: "E-mail ou senha incorretos." };
            }

            const usuario = data[0];

            if (usuario.senha !== senhaLimpa) {
                return { sucesso: false, erro: "E-mail ou senha incorretos." };
            }

            if (usuario.status !== "ativo") {
                return { sucesso: false, erro: "Esta conta está inativa. Entre em contato com a organização." };
            }

            setUser(usuario);
            return { sucesso: true, user: usuario };
        } catch (err) {
            console.error("Erro inesperado no login:", err);
            return { sucesso: false, erro: "Falha de conexão com o servidor." };
        }
    }

    async function register(nome, email, senha) {
        const client = window.supabaseClient;
        if (!client) {
            return { sucesso: false, erro: "Conexão com banco de dados indisponível." };
        }

        const nomeLimpo = (nome || "").trim();
        const emailLimpo = (email || "").trim().toLowerCase();
        const senhaLimpa = (senha || "").trim();

        if (nomeLimpo.length < 3) {
            return { sucesso: false, erro: "O nome deve ter no mínimo 3 caracteres." };
        }

        if (!emailLimpo || !emailLimpo.includes("@")) {
            return { sucesso: false, erro: "Informe um e-mail válido." };
        }

        if (senhaLimpa.length < 4) {
            return { sucesso: false, erro: "A senha deve ter no mínimo 4 caracteres." };
        }

        try {
            // Verifica se o e-mail já existe
            const { data: existente } = await client
                .from("usuarios")
                .select("id")
                .ilike("email", emailLimpo);

            if (existente && existente.length > 0) {
                return { sucesso: false, erro: "Já existe uma conta cadastrada com este e-mail." };
            }

            const novoUsuario = {
                nome: nomeLimpo,
                email: emailLimpo,
                senha: senhaLimpa,
                papel: "usuario",
                status: "ativo"
            };

            const { data, error } = await client
                .from("usuarios")
                .insert(novoUsuario)
                .select("id, nome, email, papel, status, criado_em")
                .single();

            if (error) {
                console.error("Erro ao cadastrar usuário:", error);
                return { sucesso: false, erro: "Erro ao salvar no banco de dados." };
            }

            setUser(data);
            return { sucesso: true, user: data };
        } catch (err) {
            console.error("Erro inesperado no cadastro:", err);
            return { sucesso: false, erro: "Falha de conexão com o servidor." };
        }
    }

    function requireAuth(redirectUrl) {
        const user = getUser();
        if (!user) {
            const current = encodeURIComponent(window.location.pathname + window.location.search);
            const isInAdmin = window.location.pathname.includes("/admin/");
            const target = isInAdmin ? "login.html" : "login.html";
            window.location.href = target + "?redirect=" + current;
            return false;
        }
        return user;
    }

    function requireAdmin() {
        const user = getUser();
        const isInAdmin = window.location.pathname.includes("/admin/");
        const loginPath = isInAdmin ? "login.html" : "admin/login.html";

        if (!user || user.papel !== "administrador") {
            const current = encodeURIComponent(window.location.pathname + window.location.search);
            window.location.href = loginPath + "?redirect=" + current;
            return false;
        }
        return user;
    }

    function updateHeader() {
        const nav = document.querySelector(".header-menu .navigation");
        if (!nav) return;

        const user = getUser();
        const isInAdmin = window.location.pathname.includes("/admin/");

        // Se estivermos dentro da área admin
        if (isInAdmin) {
            // Adiciona informações do admin logado ou link de login
            const sairItem = nav.querySelector("a[href='login.html'], a[href*='login']");
            if (sairItem) {
                sairItem.addEventListener("click", function (e) {
                    e.preventDefault();
                    logout("login.html");
                });
            }
            return;
        }

        // Se estivermos no site público
        // Remove itens dinâmicos anteriores de auth se existirem
        const itensDinamicos = nav.querySelectorAll(".item-auth-dynamic");
        itensDinamicos.forEach(it => it.remove());

        // Remove também o botão estático antigo "Explorar Sabores" se quisermos substituir por login/perfil
        const btnExplorar = nav.querySelector(".call-to-action");
        if (btnExplorar && btnExplorar.closest(".item")) {
            btnExplorar.closest(".item").remove();
        }

        if (user) {
            const primeiroNome = user.nome.split(" ")[0];

            // Link Minhas Inscrições
            const liInscricoes = document.createElement("li");
            liInscricoes.className = "item item-auth-dynamic";
            const isPerfilActive = window.location.pathname.endsWith("meu-perfil.html") ? "active" : "";
            liInscricoes.innerHTML = `<a class="link ${isPerfilActive}" href="meu-perfil.html">Minhas Inscrições</a>`;
            nav.appendChild(liInscricoes);

            // Se for admin, link para o Painel
            if (user.papel === "administrador") {
                const liAdmin = document.createElement("li");
                liAdmin.className = "item item-auth-dynamic";
                liAdmin.innerHTML = `<a class="link" href="admin/index.html" style="color: var(--pink-primary); font-weight:700;">⚙️ Painel Admin</a>`;
                nav.appendChild(liAdmin);
            }

            // Badge do usuário
            const liUser = document.createElement("li");
            liUser.className = "item item-auth-dynamic";
            liUser.innerHTML = `
                <a class="nav-user-badge" href="meu-perfil.html" title="Meu Perfil">
                    <span>👤</span>
                    <span>Olá, ${primeiroNome}</span>
                </a>
            `;
            nav.appendChild(liUser);

            // Botão Sair
            const liLogout = document.createElement("li");
            liLogout.className = "item item-auth-dynamic";
            liLogout.innerHTML = `<button type="button" class="btn-nav-logout" id="btn-header-logout">Sair</button>`;
            nav.appendChild(liLogout);

            const btnLogout = document.getElementById("btn-header-logout");
            if (btnLogout) {
                btnLogout.addEventListener("click", () => logout("index.html"));
            }
        } else {
            // Não logado: Exibe Entrar e Cadastrar
            const liLogin = document.createElement("li");
            liLogin.className = "item item-auth-dynamic";
            const isLoginActive = window.location.pathname.endsWith("login.html") ? "active" : "";
            liLogin.innerHTML = `<a class="link ${isLoginActive}" href="login.html">Entrar</a>`;
            nav.appendChild(liLogin);

            const liCadastro = document.createElement("li");
            liCadastro.className = "item item-auth-dynamic";
            liCadastro.innerHTML = `<a href="cadastro.html" class="call-to-action" style="text-decoration:none; display:inline-block;">Criar conta</a>`;
            nav.appendChild(liCadastro);
        }
    }

    document.addEventListener("DOMContentLoaded", updateHeader);

    return {
        getUser,
        setUser,
        logout,
        login,
        register,
        requireAuth,
        requireAdmin,
        updateHeader
    };
})();
