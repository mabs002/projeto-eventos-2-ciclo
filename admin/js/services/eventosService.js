/*
 * Acesso à tabela `eventos`.
 * Funções lançam o erro do Supabase; a camada de UI decide como exibir.
 */
const eventosService = (function () {
    "use strict";

    const TABLE = "eventos";
    const LIST_COLUMNS_WITH_IMAGE = `
        id,
        nome,
        slug,
        imagem_url,
        data,
        local,
        vagas_totais,
        vagas_restantes,
        categoria:categorias ( id, nome, slug )
    `;
    const LIST_COLUMNS_BASE = `
        id,
        nome,
        data,
        local,
        vagas_totais,
        vagas_restantes,
        categoria:categorias ( id, nome )
    `;

    let supportsImageUrl = true;

    return Object.freeze({
        async list() {
            const cols = supportsImageUrl ? LIST_COLUMNS_WITH_IMAGE : LIST_COLUMNS_BASE;
            let { data, error } = await window.supabaseClient
                .from(TABLE)
                .select(cols)
                .order("data", { ascending: true });

            if (error && supportsImageUrl && (error.code === "42703" || error.message?.includes("imagem_url"))) {
                supportsImageUrl = false;
                const retry = await window.supabaseClient
                    .from(TABLE)
                    .select(LIST_COLUMNS_BASE)
                    .order("data", { ascending: true });
                data = retry.data;
                error = retry.error;
            }

            if (error) throw error;
            return data ?? [];
        },

        /** Lista enxuta para filtros/selects. */
        async listOptions() {
            const { data, error } = await window.supabaseClient
                .from(TABLE)
                .select("id, nome")
                .order("nome", { ascending: true });

            if (error) throw error;
            return data ?? [];
        },

        /** Evento completo para preencher o formulário de edição. */
        async getById(id) {
            const selectFields = supportsImageUrl
                ? `id, nome, slug, imagem_url, categoria_id, data, horario, local, endereco, responsavel,
                   vagas_totais, vagas_restantes, destaque, descricao`
                : `id, nome, categoria_id, data, horario, local, endereco, responsavel,
                   vagas_totais, vagas_restantes, destaque, descricao`;

            let { data, error } = await window.supabaseClient
                .from(TABLE)
                .select(selectFields)
                .eq("id", id)
                .single();

            if (error && supportsImageUrl && (error.code === "42703" || error.message?.includes("imagem_url"))) {
                supportsImageUrl = false;
                const retry = await window.supabaseClient
                    .from(TABLE)
                    .select(`id, nome, categoria_id, data, horario, local, endereco, responsavel,
                             vagas_totais, vagas_restantes, destaque, descricao`)
                    .eq("id", id)
                    .single();
                data = retry.data;
                error = retry.error;
            }

            if (error) throw error;
            return data;
        },

        async update(id, payload) {
            let { data, error } = await window.supabaseClient
                .from(TABLE)
                .update(payload)
                .eq("id", id)
                .select("id")
                .single(); // sem linha (RLS/inexistente) → erro, em vez de "sucesso" silencioso

            if (error && (error.code === "42703" || error.message?.includes("imagem_url"))) {
                supportsImageUrl = false;
                const { imagem_url, ...fallbackPayload } = payload;
                const retry = await window.supabaseClient
                    .from(TABLE)
                    .update(fallbackPayload)
                    .eq("id", id)
                    .select("id")
                    .single();
                data = retry.data;
                error = retry.error;
            }

            if (error) throw error;
            return data;
        },

        async create(payload) {
            let { data, error } = await window.supabaseClient
                .from(TABLE)
                .insert(payload)
                .select("id")
                .single();

            if (error && (error.code === "42703" || error.message?.includes("imagem_url"))) {
                supportsImageUrl = false;
                const { imagem_url, ...fallbackPayload } = payload;
                const retry = await window.supabaseClient
                    .from(TABLE)
                    .insert(fallbackPayload)
                    .select("id")
                    .single();
                data = retry.data;
                error = retry.error;
            }

            if (error) throw error;
            return data;
        },

        async remove(id) {
            const { data, error } = await window.supabaseClient
                .from(TABLE)
                .delete()
                .eq("id", id)
                .select("id");

            if (error) throw error;
            // Sem erro e sem linhas = registro inexistente ou bloqueado pelo RLS.
            if (!data?.length) throw new Error("Nenhum evento foi excluído (inexistente ou sem permissão).");
        }
    });
})();
