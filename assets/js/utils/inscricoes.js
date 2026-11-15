/*
 * Gerenciador de Inscrições do Participante (GastroEventos)
 * Persiste inscrições e dados locais do participante no localStorage.
 */
const inscricoesManager = (function () {
    "use strict";

    const STORAGE_KEY = "gastro_minhas_inscricoes";
    const USER_KEY = "gastro_dados_participante";

    function listar() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.warn("[inscricoesManager] Falha ao ler inscrições:", e);
            return [];
        }
    }

    function salvar(inscricao) {
        if (!inscricao || !inscricao.evento_id) return;
        const lista = listar();
        // Evita duplicar o mesmo evento na lista local
        const filtrada = lista.filter((item) => String(item.evento_id) !== String(inscricao.evento_id));
        filtrada.unshift(inscricao);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(filtrada));
        } catch (e) {
            console.warn("[inscricoesManager] Falha ao salvar inscrição:", e);
        }
    }

    function remover(inscricaoId, eventoId) {
        const lista = listar();
        const filtrada = lista.filter((item) => {
            if (inscricaoId && String(item.id) === String(inscricaoId)) return false;
            if (eventoId && String(item.evento_id) === String(eventoId)) return false;
            return true;
        });
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(filtrada));
        } catch (e) {
            console.warn("[inscricoesManager] Falha ao remover inscrição:", e);
        }
    }

    function buscarPorEvento(eventoId) {
        if (!eventoId) return null;
        const lista = listar();
        return lista.find((item) => String(item.evento_id) === String(eventoId)) ?? null;
    }

    function estaInscrito(eventoId) {
        return Boolean(buscarPorEvento(eventoId));
    }

    function total() {
        return listar().length;
    }

    function getDadosParticipante() {
        try {
            const raw = localStorage.getItem(USER_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    function salvarDadosParticipante(dados) {
        if (!dados) return;
        try {
            localStorage.setItem(USER_KEY, JSON.stringify(dados));
        } catch (e) {
            console.warn("[inscricoesManager] Falha ao salvar dados do participante:", e);
        }
    }

    /** Atualiza o contador de inscrições no badge do menu caso exista */
    function atualizarBadgeMenu() {
        const badges = document.querySelectorAll(".nav-inscricoes-count");
        const count = total();
        badges.forEach((badge) => {
            badge.textContent = count;
            badge.style.display = count > 0 ? "inline-flex" : "none";
        });
    }

    return Object.freeze({
        listar,
        salvar,
        remover,
        buscarPorEvento,
        estaInscrito,
        total,
        getDadosParticipante,
        salvarDadosParticipante,
        atualizarBadgeMenu
    });
})();
