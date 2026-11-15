/*
 * Página de detalhes (evento.html?id=N).
 * Depende de: catalogoService, eventoView, dom, text, motion.
 */
(function eventoPage() {
    "use strict";

    const elements = {
        skeleton: document.getElementById("detalhe-skeleton"),
        content: document.getElementById("detalhe-conteudo"),
        notFound: document.getElementById("detalhe-nao-encontrado"),
        breadcrumb: document.getElementById("breadcrumb-titulo")
    };

    const { ICONS } = eventoView;

    const capitalize = (value) => value ? value.charAt(0).toUpperCase() + value.slice(1) : "";

    function readId() {
        const id = new URLSearchParams(window.location.search).get("id");
        return /^\d+$/.test(id ?? "") ? id : null;
    }

    function infoItem(icon, label, value) {
        if (!value) return "";
        return `
            <li class="info-item">
                <span class="info-icon">${icon}</span>
                <span>
                    <span class="info-label">${dom.escapeHtml(label)}</span>
                    <span class="info-value">${dom.escapeHtml(value)}</span>
                </span>
            </li>`;
    }

    function ctaHtml(evento, situacao) {
        const estaInscrito = typeof inscricoesManager !== "undefined" && inscricoesManager.buscarPorEvento(evento.id);
        if (estaInscrito) {
            return `
                <div class="enrolled-box" style="margin-top: 16px;">
                    <span class="enrolled-badge">✓ Inscrição Confirmada</span>
                    <p style="font-size: 14px; margin: 4px 0;">Você já garantiu sua vaga à mesa nesta oficina!</p>
                    <div style="font-size: 13px; color: var(--color-text-muted);">
                        Código: <strong class="enrolled-code">${dom.escapeHtml(estaInscrito.codigo)}</strong>
                    </div>
                    <a class="btn-cta btn-cta--block" href="meu-perfil.html" style="margin-top: 8px;">
                        Ver em Minhas Inscrições
                    </a>
                </div>
            `;
        }

        const nota = {
            encerrado: "Esta experiência culinária já aconteceu.",
            esgotado: "Todas as vagas à mesa foram preenchidas."
        }[situacao.status];

        return eventoView.inscricaoCta(evento, { block: true }) + (nota ? `<p class="cta-note">${nota}</p>` : "");
    }

    function render(evento) {
        const situacao = eventoView.situacao(evento);
        const { weekday } = text.dateParts(evento.data);
        const categoria = evento.categoria?.nome ?? "Experiência";
        const imagemUrl = eventoView.getImage(evento);
        const imgTag = imagemUrl
            ? `<img class="event-cover-img" src="${dom.escapeHtml(imagemUrl)}" alt="${dom.escapeHtml(evento.nome)}" onerror="this.style.display='none'; this.parentElement.classList.remove('has-image');" />`
            : "";
        const mapsUrl = evento.endereco
            ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(evento.endereco)}`
            : null;

        elements.content.innerHTML = `
            <article class="detail-layout" ${eventoView.accentStyle(evento)}>
                <header class="detail-hero${imagemUrl ? " has-image" : ""}" data-reveal="scale">
                    ${imgTag}
                    <span class="event-cover-watermark" aria-hidden="true">${dom.escapeHtml(categoria)}</span>
                    ${eventoView.dateBadge(evento.data)}
                    <div class="detail-hero-text">
                        <div class="detail-tags">
                            <span class="tag tag--glass">${dom.escapeHtml(categoria)}</span>
                            ${evento.destaque ? '<span class="tag tag--highlight">Destaque na Cozinha</span>' : ""}
                        </div>
                        <h1 class="detail-title">${dom.escapeHtml(evento.nome)}</h1>
                        <p class="detail-subtitle">${dom.escapeHtml(capitalize(weekday))}, ${dom.escapeHtml(text.formatDateLong(evento.data))}</p>
                    </div>
                </header>

                <div class="detail-columns">
                    <section class="detail-main" data-reveal>
                        <h2 class="detail-section-title">Sobre a experiência</h2>
                        <p class="detail-description">${dom.escapeHtml(evento.descricao ?? "Descrição do menu e oficina em breve.")}</p>

                        <h2 class="detail-section-title">Informações do workshop</h2>
                        <ul class="info-list">
                            ${infoItem(ICONS.calendar, "Data", text.formatDateLong(evento.data))}
                            ${infoItem(ICONS.clock, "Horário", evento.horario)}
                            ${infoItem(ICONS.pin, "Cozinha / Local", evento.local)}
                            ${infoItem(ICONS.map, "Endereço", evento.endereco)}
                            ${infoItem(ICONS.user, "Chef / Responsável", evento.responsavel)}
                        </ul>
                        ${mapsUrl ? `<a class="btn-ghost" href="${mapsUrl}" target="_blank" rel="noopener noreferrer">${ICONS.map} Ver localização no mapa</a>` : ""}
                    </section>

                    <aside class="detail-aside" data-reveal>
                        <div class="ticket-card">
                            <p class="ticket-label">Oficina Gastronômica</p>
                            ${eventoView.progress(evento)}
                            ${ctaHtml(evento, situacao)}
                        </div>
                    </aside>
                </div>
            </article>
        `;

        elements.breadcrumb.textContent = evento.nome;
        document.title = `${evento.nome} | GastroEventos`;
        elements.skeleton.hidden = true;
        elements.content.hidden = false;
        motion.observe(elements.content);
    }

    function showNotFound() {
        elements.skeleton.hidden = true;
        elements.content.hidden = true;
        elements.notFound.hidden = false;
        elements.breadcrumb.textContent = "Evento não encontrado";
    }

    function showError() {
        showNotFound();
        elements.notFound.querySelector(".empty-state-title").textContent = "Não foi possível carregar o evento";
        elements.notFound.querySelector("p:not(.empty-state-title)").textContent = "Verifique sua conexão e tente novamente.";
    }

    // Vagas atualizadas em tempo real enquanto a página está aberta.
    function watch(evento) {
        catalogoService.onEventoAtualizado((row) => {
            if (String(row.id) !== String(evento.id)) return;

            const before = eventoView.situacao(evento).aberto;
            Object.assign(evento, row, { categoria: evento.categoria });

            if (eventoView.situacao(evento).aberto !== before) {
                render(evento); // abriu/fechou: troca o botão de inscrição
            } else {
                eventoView.updateCapacity(elements.content, evento);
            }
        });
    }

    async function init() {
        if (typeof inscricoesManager !== "undefined") {
            inscricoesManager.atualizarBadgeMenu();
        }
        const id = readId();
        if (!id) {
            showNotFound();
            return;
        }

        try {
            const evento = await catalogoService.getEvento(id);
            if (evento) {
                render(evento);
                watch(evento);
            } else {
                showNotFound();
            }
        } catch (error) {
            console.error("[evento] Falha ao carregar:", error);
            showError();
        }
    }

    init();
})();
