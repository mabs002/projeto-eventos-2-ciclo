/**
 * Camada de API e Integração com Supabase - GastroEventos
 */
window.EventosAPI = (function () {
    const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    // Dados de fallback caso esteja totalmente sem conexão
    const eventosFallback = [
        {
            id: 1,
            categoria_id: 1,
            categoria: { id: 1, nome: "Bolos & Doces", cor: "#f59e0b" },
            nome: "Oficina de Bolos Caseiros: Cenoura com Chocolate e Fubá Cremoso",
            destaque: true,
            data: "2026-09-12",
            horario: "14h às 17h",
            local: "Cozinha Comunitária",
            endereco: "Centro Cultural de Gastronomia - Sala 1",
            responsavel: "Dona Neusa (Boleira Tradicional)",
            vagas_totais: 20,
            vagas_restantes: 8,
            descricao: "Aprenda os segredos do bolo fofinho que não sola, a calda crocante de chocolate que quebra na mordida e o bolo de fubá cremoso com queijo, usando ingredientes simples da sua despensa."
        },
        {
            id: 2,
            categoria_id: 1,
            categoria: { id: 1, nome: "Bolos & Doces", cor: "#f59e0b" },
            nome: "Docinhos de Festa: Brigadeiro Gourmet e Beijinho Sem Segredos",
            destaque: false,
            data: "2026-09-20",
            horario: "15h às 18h",
            local: "Cozinha Didática",
            endereco: "Campus Gastronômico - Cozinha Didática",
            responsavel: "Mariana Doces Caseiros",
            vagas_totais: 25,
            vagas_restantes: 10,
            descricao: "Ponto correto da panela para enrolar, técnicas para não açucarar e receitas práticas de brigadeiro tradicional, ninho com nutella e beijinho de coco molhadinho."
        },
        {
            id: 3,
            categoria_id: 2,
            categoria: { id: 2, nome: "Comidas do Mundo", cor: "#0284c7" },
            nome: "Aprendendo a Fazer Peças de Sushi em Casa",
            destaque: true,
            data: "2026-09-15",
            horario: "19h às 21h30",
            local: "Laboratório de Culinária",
            endereco: "Centro Cultural de Gastronomia - Sala 2",
            responsavel: "Chef Paulo Tanaka",
            vagas_totais: 18,
            vagas_restantes: 4,
            descricao: "Como temperar o arroz de sushi na panela comum de arroz, enrolar hossomakis e uramakis na esteirinha sem desmanchar e preparar hot roll crocante na fritadeira."
        }
    ];

    let cacheEventos = [];

    function normalizarEvento(item) {
        if (!item) return null;
        const catNome = (item.categoria && item.categoria.nome) ? item.categoria.nome : "Geral";
        const catCor = (item.categoria && item.categoria.cor) ? item.categoria.cor : "#e04826";
        
        return {
            id: item.id,
            titulo: item.nome,
            nome: item.nome,
            categoria: catNome,
            categoria_id: item.categoria_id,
            categoriaCor: catCor,
            destaque: Boolean(item.destaque),
            dataISO: item.data,
            data: item.data,
            horario: item.horario || "",
            local: item.local || "",
            enderecoCompleto: item.endereco || "",
            endereco: item.endereco || "",
            organizador: item.responsavel || "",
            responsavel: item.responsavel || "",
            vagasTotais: Number(item.vagas_totais) || 0,
            vagasRestantes: Number(item.vagas_restantes) || 0,
            descricaoCompleta: item.descricao || "",
            descricao: item.descricao || "",
            slug: item.slug || ""
        };
    }

    async function listarEventos() {
        const client = window.supabaseClient;
        if (!client) {
            console.warn("Supabase não disponível, usando fallback.");
            cacheEventos = eventosFallback.map(normalizarEvento);
            return cacheEventos;
        }

        try {
            const { data, error } = await client
                .from("eventos")
                .select("*, categoria:categorias(*)")
                .order("data", { ascending: true });

            if (error) {
                console.error("Erro ao listar eventos do Supabase:", error);
                cacheEventos = eventosFallback.map(normalizarEvento);
                return cacheEventos;
            }

            cacheEventos = (data || []).map(normalizarEvento);
            return cacheEventos;
        } catch (err) {
            console.error("Falha ao buscar eventos:", err);
            cacheEventos = eventosFallback.map(normalizarEvento);
            return cacheEventos;
        }
    }

    async function buscarEventoPorId(id) {
        if (!id) return null;

        // Se já temos no cache, busca primeiro
        const emCache = cacheEventos.find(ev => String(ev.id) === String(id) || ev.slug === id);
        if (emCache) return emCache;

        const client = window.supabaseClient;
        if (!client) {
            return eventosFallback.map(normalizarEvento).find(ev => String(ev.id) === String(id)) || null;
        }

        try {
            // Tenta por id numérico
            let query = client.from("eventos").select("*, categoria:categorias(*)");
            if (!isNaN(Number(id))) {
                query = query.eq("id", Number(id));
            } else {
                query = query.eq("slug", id);
            }

            const { data, error } = await query.limit(1);

            if (error || !data || data.length === 0) {
                // Tenta recarregar tudo
                const lista = await listarEventos();
                return lista.find(ev => String(ev.id) === String(id) || ev.slug === id) || null;
            }

            return normalizarEvento(data[0]);
        } catch (e) {
            console.error("Erro ao buscar evento por id:", e);
            return null;
        }
    }

    function filtrarEventos(filtros, lista) {
        const base = lista && lista.length ? lista : cacheEventos;
        const termo = (filtros && filtros.termo ? filtros.termo : "").trim().toLowerCase();
        const categoria = filtros && filtros.categoria ? filtros.categoria : "";

        return base.filter(function (evento) {
            const bateTermo = !termo ||
                evento.titulo.toLowerCase().includes(termo) ||
                evento.local.toLowerCase().includes(termo) ||
                evento.organizador.toLowerCase().includes(termo) ||
                evento.descricaoCompleta.toLowerCase().includes(termo);

            const bateCategoria = !categoria || categoria === "todos" || evento.categoria.toLowerCase() === categoria.toLowerCase();
            return bateTermo && bateCategoria;
        });
    }

    function formatarData(dataISO) {
        if (!dataISO) return "";
        try {
            const partes = dataISO.split("T")[0].split("-");
            if (partes.length < 3) return dataISO;
            const ano = partes[0];
            const mes = MESES[Number(partes[1]) - 1] || "";
            const dia = Number(partes[2]);
            return dia + " de " + mes + ". " + ano;
        } catch (e) {
            return dataISO;
        }
    }

    function calcularPercentualOcupacao(evento) {
        const totais = Number(evento.vagasTotais || evento.vagas_totais) || 0;
        const restantes = Number(evento.vagasRestantes || evento.vagas_restantes) || 0;
        if (totais <= 0) return 0;
        const ocupadas = Math.max(0, totais - restantes);
        return Math.min(100, Math.round((ocupadas / totais) * 100));
    }

    function gerarCodigoConfirmacao() {
        return "INSC-" + Math.random().toString(36).slice(2, 8).toUpperCase();
    }

    async function inscreverEvento(eventoId, dados) {
        const client = window.supabaseClient;
        const idNum = Number(eventoId);
        const codigo = gerarCodigoConfirmacao();

        if (!client) {
            return {
                sucesso: true,
                codigoConfirmacao: codigo,
                nome: dados.nome,
                email: dados.email
            };
        }

        try {
            // 1. Cadastra na tabela de inscrições
            const { data: inscricao, error: errInsc } = await client
                .from("inscricoes")
                .insert({
                    nome: dados.nome.trim(),
                    email: dados.email.trim().toLowerCase(),
                    evento_id: idNum,
                    codigo_confirmacao: codigo,
                    data_inscricao: new Date().toISOString()
                })
                .select()
                .single();

            if (errInsc) {
                console.error("Erro ao salvar inscrição:", errInsc);
                return { sucesso: false, erro: "Não foi possível confirmar a inscrição no banco." };
            }

            // 2. Decrementa vaga no evento
            const { data: evData } = await client
                .from("eventos")
                .select("vagas_restantes")
                .eq("id", idNum)
                .single();

            if (evData && evData.vagas_restantes > 0) {
                await client
                    .from("eventos")
                    .update({ vagas_restantes: evData.vagas_restantes - 1 })
                    .eq("id", idNum);
            }

            return {
                sucesso: true,
                codigoConfirmacao: codigo,
                nome: dados.nome,
                email: dados.email
            };
        } catch (e) {
            console.error("Erro inesperado na inscrição:", e);
            return { sucesso: false, erro: "Falha de conexão com o servidor." };
        }
    }

    async function listarInscricoesDoUsuario(email) {
        const client = window.supabaseClient;
        if (!client || !email) return [];

        const emailLimpo = email.trim().toLowerCase();

        try {
            // 1. Tenta buscar na tabela normalizada nova (eventos_participantes)
            const { data: partData } = await client
                .from("participantes")
                .select("id")
                .ilike("email", emailLimpo)
                .maybeSingle();

            if (partData?.id) {
                const { data: inscs, error: errInsc } = await client
                    .from("eventos_participantes")
                    .select("id, created_at, evento:eventos(*, categoria:categorias(*))")
                    .eq("id_participante", partData.id)
                    .order("id", { ascending: false });

                if (!errInsc && inscs && inscs.length > 0) {
                    return inscs.map(i => ({
                        id: i.id,
                        codigo_confirmacao: `INSC-${String(i.id).padStart(6, '0')}`,
                        evento: i.evento,
                        created_at: i.created_at
                    }));
                }
            }

            // 2. Fallback para tabela legada inscricoes se existir
            const { data, error } = await client
                .from("inscricoes")
                .select("*, evento:eventos(*, categoria:categorias(*))")
                .ilike("email", emailLimpo)
                .order("id", { ascending: false });

            if (error) {
                console.warn("Nenhuma inscrição encontrada na tabela legada.");
                return [];
            }

            return data || [];
        } catch (e) {
            console.error("Falha ao buscar inscrições do usuário:", e);
            return [];
        }
    }

    async function cancelarInscricao(inscricaoId, eventoId) {
        const client = window.supabaseClient;
        if (!client) return { sucesso: false, erro: "Banco indisponível." };

        try {
            // Tenta remover na tabela normalizada eventos_participantes (trigger do banco devolve a vaga sozinho)
            const { error: errDelNew } = await client
                .from("eventos_participantes")
                .delete()
                .eq("id", inscricaoId);

            if (!errDelNew) {
                return { sucesso: true };
            }

            // Fallback tabela legada inscricoes
            await client.from("inscricoes").delete().eq("id", inscricaoId);
            if (eventoId) {
                const { data: ev } = await client
                    .from("eventos")
                    .select("vagas_restantes, vagas_totais")
                    .eq("id", eventoId)
                    .single();

                if (ev && ev.vagas_restantes < ev.vagas_totais) {
                    await client
                        .from("eventos")
                        .update({ vagas_restantes: ev.vagas_restantes + 1 })
                        .eq("id", eventoId);
                }
            }

            return { sucesso: true };
        } catch (e) {
            console.error("Erro ao cancelar:", e);
            return { sucesso: false, erro: "Falha ao processar cancelamento." };
        }
    }

    async function listarCategorias() {
        const client = window.supabaseClient;
        if (!client) return [];

        try {
            const { data, error } = await client
                .from("categorias")
                .select("*")
                .order("id", { ascending: true });

            if (error) {
                console.error("Erro ao listar categorias:", error);
                return [];
            }
            return data || [];
        } catch (e) {
            console.error("Erro inesperado ao listar categorias:", e);
            return [];
        }
    }

    return {
        listarEventos,
        buscarEventoPorId,
        filtrarEventos,
        formatarData,
        calcularPercentualOcupacao,
        gerarCodigoConfirmacao,
        inscreverEvento,
        listarInscricoesDoUsuario,
        cancelarInscricao,
        listarCategorias
    };
})();
