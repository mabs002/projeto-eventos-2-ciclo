/*
 * Dados públicos do site (somente leitura + inscrição).
 * Lê `eventos` e `categorias` (SELECT público pelo RLS) e inscreve via a
 * função `inscrever_participante` (supabase/migrations/20261112000000_inscricao_publica.sql).
 */
const catalogoService = (function () {
    "use strict";

    const EVENT_COLUMNS_WITH_IMAGE = `
        id,
        nome,
        slug,
        imagem_url,
        data,
        horario,
        local,
        endereco,
        responsavel,
        vagas_totais,
        vagas_restantes,
        destaque,
        descricao,
        categoria:categorias ( id, nome, slug, cor )
    `;

    const EVENT_COLUMNS_BASE = `
        id,
        nome,
        slug,
        data,
        horario,
        local,
        endereco,
        responsavel,
        vagas_totais,
        vagas_restantes,
        destaque,
        descricao,
        categoria:categorias ( id, nome, slug, cor )
    `;

    // Flag dinâmica: detecta se a tabela remota tem a coluna imagem_url
    let supportsImageUrl = true;

    // Mensagens para os `hint` lançados pela função/trigger no banco.
    const INSCRICAO_ERRORS = Object.freeze({
        nome_invalido: { field: "nome", message: "Informe seu nome completo." },
        email_invalido: { field: "email", message: "Informe um e-mail válido." },
        documento_invalido: { field: "documento", message: "Informe um CPF válido." },
        whatsapp_invalido: { field: "whatsapp", message: "Informe um WhatsApp válido com DDD." },
        data_nascimento_invalida: { field: "data_nascimento", message: "Informe uma data de nascimento válida." },
        evento_nao_encontrado: { message: "Este evento não existe mais." },
        inscricoes_encerradas: { message: "As inscrições para este evento estão encerradas." },
        vagas_esgotadas: { message: "As vagas deste evento esgotaram." },
        ja_inscrito: { field: "email", message: "Este e-mail já está inscrito neste evento." }
    });

    return Object.freeze({
        async listEventos() {
            const cols = supportsImageUrl ? EVENT_COLUMNS_WITH_IMAGE : EVENT_COLUMNS_BASE;
            let { data, error } = await window.supabaseClient
                .from("eventos")
                .select(cols)
                .order("data", { ascending: true });

            if (error && supportsImageUrl && (error.code === "42703" || error.message?.includes("imagem_url"))) {
                supportsImageUrl = false;
                const retry = await window.supabaseClient
                    .from("eventos")
                    .select(EVENT_COLUMNS_BASE)
                    .order("data", { ascending: true });
                data = retry.data;
                error = retry.error;
            }

            if (error) throw error;
            return data ?? [];
        },

        /** @returns {Promise<object|null>} null se não existir */
        async getEvento(id) {
            const cols = supportsImageUrl ? EVENT_COLUMNS_WITH_IMAGE : EVENT_COLUMNS_BASE;
            let { data, error } = await window.supabaseClient
                .from("eventos")
                .select(cols)
                .eq("id", id)
                .maybeSingle();

            if (error && supportsImageUrl && (error.code === "42703" || error.message?.includes("imagem_url"))) {
                supportsImageUrl = false;
                const retry = await window.supabaseClient
                    .from("eventos")
                    .select(EVENT_COLUMNS_BASE)
                    .eq("id", id)
                    .maybeSingle();
                data = retry.data;
                error = retry.error;
            }

            if (error) throw error;
            return data;
        },

        async listCategorias() {
            const { data, error } = await window.supabaseClient
                .from("categorias")
                .select("id, nome, slug, cor")
                .order("nome", { ascending: true });

            if (error) throw error;
            return data ?? [];
        },

        /**
         * Escuta alterações em `eventos` em tempo real (ex.: vagas mudando quando
         * alguém se inscreve). Requer a tabela na publicação `supabase_realtime`
         * (migration 20261112020000_realtime_eventos.sql). Sem isso, simplesmente não dispara.
         * @param {(evento: object) => void} callback recebe a linha atualizada (sem joins)
         * @returns {() => void} cancela a inscrição
         */
        onEventoAtualizado(callback) {
            const channel = window.supabaseClient
                .channel(`eventos-publico-${Math.random().toString(36).slice(2)}`)
                .on("postgres_changes", { event: "UPDATE", schema: "public", table: "eventos" },
                    (payload) => callback(payload.new))
                .subscribe();

            return () => window.supabaseClient.removeChannel(channel);
        },

        /**
         * Inscreve o participante no evento.
         * @returns {Promise<{ inscricaoId: number, codigo: string }>}
         * @throws {Error & { field?: string }} mensagem pronta para exibir
         */
        async inscrever(idEvento, dados) {
            const { data, error } = await window.supabaseClient.rpc("inscrever_participante", {
                p_id_evento: Number(idEvento),
                p_nome: dados.nome,
                p_email: dados.email,
                p_documento: dados.documento,
                p_data_nascimento: dados.data_nascimento,
                p_whatsapp: dados.whatsapp
            });

            if (error) {
                const hint = error.hint || "";
                const fullMsg = `${error.message || ""} ${error.details || ""} ${hint}`.toLowerCase();
                const isJaInscrito = hint === "ja_inscrito" || fullMsg.includes("já inscrito") || fullMsg.includes("ja_inscrito");

                if (isJaInscrito) {
                    const friendly = new Error("Você já está inscrito(a) nesta oficina gastronômica com este e-mail.");
                    friendly.field = "email";
                    friendly.code = "ja_inscrito";
                    friendly.cause = error;
                    throw friendly;
                }

                const known = INSCRICAO_ERRORS[hint];
                const friendly = new Error(known?.message ?? "Não foi possível concluir a inscrição. Tente novamente.");
                friendly.field = known?.field;
                friendly.cause = error;
                throw friendly;
            }

            const [row] = data ?? [];
            return { inscricaoId: row?.inscricao_id, codigo: row?.codigo };
        }
    });
})();
