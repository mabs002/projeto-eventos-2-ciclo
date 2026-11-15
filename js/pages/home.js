/*
 * Página inicial (index.html): busca, destaques (carrossel) e lista filtrável.
 * Depende de: catalogoService, eventoView, dom, text, motion.
 *
 * Os filtros ficam na URL (?q=&quando=&categoria=) para permitir compartilhar
 * e voltar com o mesmo resultado.
 */
(function homePage() {
    "use strict";

    const SEARCH_DEBOUNCE_MS = 150;
    const MAX_FEATURED = 8;
    const PERIODOS = ["proximos", "mes", "todos", "encerrados"];

    const elements = {
        form: document.getElementById("form-busca"),
        search: document.getElementById("busca-eventos"),
        period: document.getElementById("filtro-periodo"),
        categorySelect: document.getElementById("filtro-categoria"),
        chips: document.getElementById("lista-categorias"),
        grid: document.getElementById("lista-eventos"),
        counter: document.getElementById("contador-eventos"),
        sectionTitle: document.getElementById("titulo-eventos"),
        activeSearchInfo: document.getElementById("busca-ativa-info"),
        linkNavInicio: document.getElementById("nav-inicio"),
        linkNavExperiencias: document.getElementById("nav-experiencias"),
        featuredSection: document.getElementById("destaques"),
        carousel: document.getElementById("carrossel-destaques"),
        prev: document.getElementById("carrossel-anterior"),
        next: document.getElementById("carrossel-proximo")
    };

    let stopRealtime = null;

    const state = {
        eventos: [],
        categorias: [],
        filtros: { termo: "", periodo: "proximos", categoriaId: "" }
    };

    /* ---------- Filtros ---------- */

    const normalize = (value) => text.slugify(value).replace(/-/g, " ");

    function matchToken(token, text) {
        if (text.includes(token)) return true;
        // Tolerância para variações no português
        if (token === "pao" && text.includes("paes")) return true;
        if (token === "paes" && text.includes("pao")) return true;
        if (token.length > 3 && token.endsWith("s") && text.includes(token.slice(0, -1))) return true;
        if (token.length > 3 && token.endsWith("es") && text.includes(token.slice(0, -2))) return true;
        return false;
    }

    function matchesBusca(evento, termo) {
        if (!termo) return true;
        const termoLimpo = normalize(termo).trim();
        if (!termoLimpo) return true;

        const tokens = termoLimpo.split(/\s+/).filter(Boolean);
        if (tokens.length === 0) return true;

        // Texto pesquisável completo: nome da oficina, chef/responsável, descrição completa, local, endereço e especialidade
        const textoEvento = normalize([
            evento.nome,
            evento.responsavel,
            evento.descricao,
            evento.local,
            evento.endereco,
            evento.categoria?.nome,
            evento.horario
        ].filter(Boolean).join(" "));

        return tokens.every((token) => matchToken(token, textoEvento));
    }

    function matchesPeriodo(evento, periodo) {
        const hoje = text.todayIso();
        switch (periodo) {
            case "proximos": return evento.data >= hoje;
            case "mes": return evento.data?.slice(0, 7) === hoje.slice(0, 7);
            case "encerrados": return evento.data < hoje;
            default: return true;
        }
    }

    function filtrar() {
        const { termo, periodo, categoriaId } = state.filtros;

        const resultado = state.eventos.filter((evento) =>
            matchesBusca(evento, termo) &&
            (!categoriaId || String(evento.categoria?.id) === String(categoriaId)) &&
            matchesPeriodo(evento, periodo)
        );

        // Encerrados: mais recentes primeiro. Demais: mais próximos primeiro.
        return periodo === "encerrados" ? resultado.reverse() : resultado;
    }

    function readFiltersFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const periodo = params.get("quando");

        state.filtros = {
            termo: (params.get("q") ?? "").slice(0, 80),
            periodo: PERIODOS.includes(periodo) ? periodo : "proximos",
            categoriaId: /^\d+$/.test(params.get("categoria") ?? "") ? params.get("categoria") : ""
        };
    }

    function writeFiltersToUrl() {
        const { termo, periodo, categoriaId } = state.filtros;
        const params = new URLSearchParams();
        if (termo) params.set("q", termo);
        if (periodo !== "proximos") params.set("quando", periodo);
        if (categoriaId) params.set("categoria", categoriaId);

        const query = params.toString();
        window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
    }

    function syncControls() {
        const { termo, periodo, categoriaId } = state.filtros;
        elements.search.value = termo;
        elements.period.value = periodo;
        elements.categorySelect.value = categoriaId;

        elements.chips.querySelectorAll("button[data-categoria]").forEach((chip) => {
            const active = chip.dataset.categoria === categoriaId;
            chip.classList.toggle("active", active);
            chip.setAttribute("aria-pressed", String(active));
        });
    }

    function setFiltro(changes) {
        state.filtros = { ...state.filtros, ...changes };
        syncControls();
        writeFiltersToUrl();
        renderGrid();
    }

    /* ---------- Render ---------- */

    function renderCategorias() {
        const options = state.categorias
            .map((categoria) => `<option value="${dom.escapeHtml(categoria.id)}">${dom.escapeHtml(categoria.nome)}</option>`)
            .join("");
        elements.categorySelect.innerHTML = `<option value="">Todas</option>${options}`;

        const chip = (id, nome, style = "") => `
            <li><button type="button" class="chip" data-categoria="${dom.escapeHtml(id)}" aria-pressed="false" ${style}>
                ${id ? '<span class="chip-dot" aria-hidden="true"></span>' : ""}${dom.escapeHtml(nome)}
            </button></li>`;

        elements.chips.innerHTML = chip("", "Todos") + state.categorias
            .map((categoria) => chip(String(categoria.id), categoria.nome, eventoView.accentStyle({ categoria })))
            .join("");
    }

    function updateSearchUI(total) {
        const { termo, categoriaId, periodo } = state.filtros;
        const isSearching = Boolean(termo);
        const hasCategory = Boolean(categoriaId);
        const isCustomPeriod = periodo && periodo !== "proximos";

        // Título dinâmico da seção
        if (elements.sectionTitle) {
            if (isSearching) {
                elements.sectionTitle.innerHTML = `Resultados da busca: <span class="highlight">“${dom.escapeHtml(termo)}”</span>`;
            } else if (hasCategory) {
                const cat = state.categorias.find((c) => String(c.id) === String(categoriaId));
                elements.sectionTitle.innerHTML = `Experiências: <span class="highlight">${dom.escapeHtml(cat ? cat.nome : "Especialidade")}</span>`;
            } else if (periodo === "encerrados") {
                elements.sectionTitle.innerHTML = `Experiências <span class="highlight">já encerradas</span>`;
            } else {
                elements.sectionTitle.innerHTML = `Todas as <span class="highlight">experiências culinárias</span>`;
            }
        }

        // Contador contextual
        if (elements.counter) {
            if (isSearching) {
                elements.counter.textContent = `${total} ${total === 1 ? "experiência encontrada para sua busca" : "experiências encontradas para sua busca"}`;
            } else {
                elements.counter.textContent = `${total} ${total === 1 ? "experiência encontrada" : "experiências encontradas"}`;
            }
        }

        // Barra informativa de filtros ativos
        if (elements.activeSearchInfo) {
            if (isSearching || hasCategory || isCustomPeriod) {
                const badges = [];
                if (isSearching) {
                    badges.push(`<span class="search-term-badge">Busca: “${dom.escapeHtml(termo)}”</span>`);
                }
                if (hasCategory) {
                    const cat = state.categorias.find((c) => String(c.id) === String(categoriaId));
                    if (cat) badges.push(`<span class="search-term-badge">Especialidade: ${dom.escapeHtml(cat.nome)}</span>`);
                }
                if (isCustomPeriod) {
                    const periodLabels = { mes: "Este mês", todos: "Todas as datas", encerrados: "Encerradas" };
                    badges.push(`<span class="search-term-badge">Quando: ${periodLabels[periodo] || periodo}</span>`);
                }

                elements.activeSearchInfo.innerHTML = `
                    ${badges.join(" ")}
                    <button type="button" class="btn-clear-search" data-action="limpar-busca">✕ Limpar filtros e ver tudo</button>
                `;
                elements.activeSearchInfo.hidden = false;
            } else {
                elements.activeSearchInfo.innerHTML = "";
                elements.activeSearchInfo.hidden = true;
            }
        }

        // Oculta os destaques quando há busca por termo ativa para focar 100% nos resultados
        if (elements.featuredSection) {
            if (isSearching) {
                elements.featuredSection.hidden = true;
            } else {
                renderFeatured();
            }
        }
    }

    function renderGrid() {
        const eventos = filtrar();
        const total = eventos.length;

        updateSearchUI(total);

        if (total === 0) {
            const sugereTodos = state.filtros.periodo !== "todos";
            const termoMsg = state.filtros.termo ? ` para “${dom.escapeHtml(state.filtros.termo)}”` : "";
            elements.grid.innerHTML = `
                <div class="empty-state" data-reveal>
                    <p class="empty-state-title">Nenhuma experiência culinária encontrada${termoMsg}</p>
                    <p>Tente buscar por outro prato, ingrediente, chef ou limpar os filtros de busca.</p>
                    <div style="display:flex; gap:10px; justify-content:center; margin-top:16px; flex-wrap:wrap;">
                        <button type="button" class="btn-cta btn-cta--sm" data-action="limpar-busca">Ver todas as experiências</button>
                        ${sugereTodos ? '<button type="button" class="btn-ghost" data-action="ver-todos">Buscar em todas as datas</button>' : ""}
                    </div>
                </div>`;
        } else {
            elements.grid.innerHTML = eventos.map((evento) => eventoView.card(evento)).join("");
        }

        motion.observe(elements.grid);
    }

    function renderFeatured() {
        const proximos = state.eventos.filter((evento) => !text.isPast(evento.data));
        const destaques = proximos.filter((evento) => evento.destaque);
        // Sem destaques marcados → mostra os próximos eventos.
        const lista = (destaques.length ? destaques : proximos).slice(0, MAX_FEATURED);

        if (lista.length === 0) {
            elements.featuredSection.hidden = true;
            return;
        }

        elements.featuredSection.hidden = false;
        elements.carousel.innerHTML = lista.map((evento) => eventoView.card(evento, { variant: "featured" })).join("");
        motion.observe(elements.carousel);
        updateCarouselButtons();
    }

    function renderLoadError() {
        elements.featuredSection.hidden = true;
        elements.counter.textContent = "";
        elements.grid.innerHTML = `
            <div class="empty-state">
                <p class="empty-state-title">Não foi possível carregar as experiências gastronômicas</p>
                <p>Verifique sua conexão e tente novamente.</p>
                <button type="button" class="btn-ghost" data-action="recarregar">Tentar novamente</button>
            </div>`;
    }

    /* ---------- Carrossel ---------- */

    function updateCarouselButtons() {
        const { scrollLeft, scrollWidth, clientWidth } = elements.carousel;
        elements.prev.disabled = scrollLeft <= 4;
        elements.next.disabled = scrollLeft + clientWidth >= scrollWidth - 4;
    }

    function scrollCarousel(direction) {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        elements.carousel.scrollBy({ left: direction * elements.carousel.clientWidth * 0.85, behavior: reduce ? "auto" : "smooth" });
    }

    /* ---------- Eventos de UI ---------- */

    function debounce(fn, wait) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), wait);
        };
    }

    function bindEvents() {
        elements.search.addEventListener("input", debounce(() => setFiltro({ termo: elements.search.value.trim() }), SEARCH_DEBOUNCE_MS));
        elements.period.addEventListener("change", () => setFiltro({ periodo: elements.period.value }));
        elements.categorySelect.addEventListener("change", () => setFiltro({ categoriaId: elements.categorySelect.value }));

        elements.chips.addEventListener("click", (event) => {
            const chip = event.target.closest("button[data-categoria]");
            if (chip) setFiltro({ categoriaId: chip.dataset.categoria });
        });

        // Ações gerais da interface (limpar busca, ver todos, tentar novamente)
        document.addEventListener("click", (event) => {
            const actionTarget = event.target.closest("[data-action]");
            if (!actionTarget) return;

            const action = actionTarget.dataset.action;
            if (action === "limpar-busca") {
                event.preventDefault();
                setFiltro({ termo: "", periodo: "proximos", categoriaId: "" });
            } else if (action === "ver-todos") {
                event.preventDefault();
                setFiltro({ periodo: "todos" });
            } else if (action === "recarregar") {
                event.preventDefault();
                load();
            }
        });

        // Alternância inteligente do estado ativo no menu
        function setActiveNav(activeId) {
            if (elements.linkNavInicio) {
                const isInicio = activeId === "inicio";
                elements.linkNavInicio.classList.toggle("active", isInicio);
                if (isInicio) elements.linkNavInicio.setAttribute("aria-current", "page");
                else elements.linkNavInicio.removeAttribute("aria-current");
            }
            if (elements.linkNavExperiencias) {
                const isExp = activeId === "experiencias";
                elements.linkNavExperiencias.classList.toggle("active", isExp);
                if (isExp) elements.linkNavExperiencias.setAttribute("aria-current", "page");
                else elements.linkNavExperiencias.removeAttribute("aria-current");
            }
        }

        if (elements.linkNavInicio) {
            elements.linkNavInicio.addEventListener("click", (e) => {
                e.preventDefault();
                setActiveNav("inicio");
                window.scrollTo({ top: 0, behavior: "smooth" });
                window.history.replaceState(null, "", window.location.pathname);
            });
        }

        // Clique em "Experiências" na barra de navegação: ativa o link, redefine a busca e rola até as oficinas
        if (elements.linkNavExperiencias) {
            elements.linkNavExperiencias.addEventListener("click", (e) => {
                e.preventDefault();
                setActiveNav("experiencias");
                setFiltro({ termo: "", periodo: "proximos", categoriaId: "" });
                document.getElementById("eventos")?.scrollIntoView({ behavior: "smooth", block: "start" });
            });
        }

        // Observa a rolagem para sincronizar automaticamente quem fica ativo (laranja)
        if ("IntersectionObserver" in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveNav("experiencias");
                    } else if (window.scrollY < 300) {
                        setActiveNav("inicio");
                    }
                });
            }, { rootMargin: "-20% 0px -60% 0px" });

            const secEventos = document.getElementById("eventos");
            if (secEventos) observer.observe(secEventos);
        }

        // "Buscar": aplica os termos/filtros e leva com scroll suave até a área de resultados
        elements.form.addEventListener("submit", (event) => {
            event.preventDefault();
            setActiveNav("experiencias");
            setFiltro({
                termo: elements.search.value.trim(),
                periodo: elements.period.value,
                categoriaId: elements.categorySelect.value
            });
            const secEventos = document.getElementById("eventos");
            if (secEventos) {
                secEventos.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        });

        elements.prev.addEventListener("click", () => scrollCarousel(-1));
        elements.next.addEventListener("click", () => scrollCarousel(1));
        elements.carousel.addEventListener("scroll", debounce(updateCarouselButtons, 60), { passive: true });
        window.addEventListener("resize", debounce(updateCarouselButtons, 120));
    }

    /* ---------- Tempo real ---------- */

    // Vagas mudaram (alguém se inscreveu): atualiza as barras no lugar.
    // Se a situação mudou (ex.: esgotou), re-renderiza para atualizar selos e filtros.
    function handleEventoAtualizado(row) {
        const evento = state.eventos.find((item) => String(item.id) === String(row.id));
        if (!evento) return;

        const before = eventoView.situacao(evento).status;
        Object.assign(evento, row, { categoria: evento.categoria }); // payload não traz o join
        const after = eventoView.situacao(evento).status;

        if (before !== after) {
            renderFeatured();
            renderGrid();
            return;
        }

        document.querySelectorAll(`[data-evento-id="${CSS.escape(String(evento.id))}"]`)
            .forEach((card) => eventoView.updateCapacity(card, evento));
    }

    /* ---------- Inicialização ---------- */

    async function load() {
        elements.grid.innerHTML = eventoView.skeletonCards(6);
        elements.carousel.innerHTML = eventoView.skeletonCards(4, "featured");
        elements.counter.textContent = "Carregando experiências culinárias...";

        try {
            const [eventos, categorias] = await Promise.all([
                catalogoService.listEventos(),
                catalogoService.listCategorias()
            ]);

            state.eventos = eventos;
            state.categorias = categorias;

            renderCategorias();
            // Categoria da URL que não existe mais → ignora.
            if (!categorias.some((categoria) => String(categoria.id) === state.filtros.categoriaId)) {
                state.filtros.categoriaId = "";
            }

            syncControls();
            renderFeatured();
            renderGrid();

            stopRealtime?.();
            stopRealtime = catalogoService.onEventoAtualizado(handleEventoAtualizado);
        } catch (error) {
            console.error("[home] Falha ao carregar eventos:", error);
            renderLoadError();
        }
    }

    function init() {
        eventoView.hydrateIcons();
        if (typeof inscricoesManager !== "undefined") {
            inscricoesManager.atualizarBadgeMenu();
        }
        readFiltersFromUrl();
        syncControls();
        bindEvents();
        load();
    }

    init();
})();
