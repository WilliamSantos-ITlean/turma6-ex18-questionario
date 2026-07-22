// respostas.js - Visão Administrativa de Respostas

let todosOsFormularios = [];
let todasAsPerguntas = [];
let todasAsRespostas = [];
let respostasDoFormularioAtual = [];
let formularioAtual = null;

// ==========================================
// 1. CARREGAMENTO INICIAL
// ==========================================

async function inicializarRespostas() {
    try {
        const [resFormularios, resPerguntas, resRespostas] = await Promise.all([
            fetch('http://localhost:3000/formularios'),
            fetch('http://localhost:3000/perguntas'),
            fetch('http://localhost:3000/respostas')
        ]);

        todosOsFormularios = await resFormularios.json();
        todasAsPerguntas = await resPerguntas.json();
        todasAsRespostas = await resRespostas.json();

        popularSelectFormularios();

        // Checar se veio com parâmetro 'formularioId' na URL (ex: respostas.html?formularioId=1)
        const urlParams = new URLSearchParams(window.location.search);
        const formIdUrl = urlParams.get('formularioId');

        const selectForm = document.getElementById('select-formulario-resposta');
        if (formIdUrl && selectForm) {
            selectForm.value = formIdUrl;
        } else if (todosOsFormularios.length > 0 && selectForm) {
            selectForm.value = todosOsFormularios[0].id;
        }

        carregarRespostasDoFormulario();
    } catch (error) {
        console.error('Erro ao carregar dados de respostas:', error);
    }
}

// Preenche o <select> com os formulários existentes
function popularSelectFormularios() {
    const selectForm = document.getElementById('select-formulario-resposta');
    if (!selectForm) return;

    if (todosOsFormularios.length === 0) {
        selectForm.innerHTML = '<option value="">Nenhum formulário cadastrado</option>';
        return;
    }

    let html = '<option value="">-- Escolha um Formulário --</option>';
    todosOsFormularios.forEach(form => {
        const totalResp = todasAsRespostas.filter(r => String(r.formularioId) === String(form.id)).length;
        html += `<option value="${form.id}">${form.titulo} [${form.status.toUpperCase()}] - ${totalResp} resposta(s)</option>`;
    });

    selectForm.innerHTML = html;
}

// ==========================================
// 2. BUSCA DE RESPOSTAS POR FORMULÁRIO
// ==========================================

async function carregarRespostasDoFormulario() {
    const selectForm = document.getElementById('select-formulario-resposta');
    const formId = selectForm ? selectForm.value : null;

    if (!formId) {
        formularioAtual = null;
        respostasDoFormularioAtual = [];
        atualizarEstatisticas(0, 'N/A', 0);
        renderizarTabelaRespostas([]);
        return;
    }

    try {
        // Busca o formulário selecionado
        formularioAtual = todosOsFormularios.find(f => String(f.id) === String(formId));

        // Refaz a busca de respostas para ter dados em tempo real
        const resRespostas = await fetch('http://localhost:3000/respostas');
        todasAsRespostas = await resRespostas.json();

        // Filtra estritamente comparando os IDs como String (evita incompatibilidade String vs Number do json-server)
        respostasDoFormularioAtual = todasAsRespostas.filter(r => String(r.formularioId) === String(formId));

        const totalPerguntas = (formularioAtual && formularioAtual.perguntas) ? formularioAtual.perguntas.length : 0;
        const statusForm = formularioAtual ? formularioAtual.status : 'N/A';

        atualizarEstatisticas(respostasDoFormularioAtual.length, statusForm, totalPerguntas);
        renderizarTabelaRespostas(respostasDoFormularioAtual);
    } catch (error) {
        console.error('Erro ao buscar respostas do formulário:', error);
    }
}

// ==========================================
// 3. ATUALIZAÇÃO DO DASHBOARD DE CARDS
// ==========================================

function atualizarEstatisticas(totalRespostas, status, totalPerguntas) {
    const statTotal = document.getElementById('stat-total-respostas');
    const statStatus = document.getElementById('stat-status-form');
    const statPerguntas = document.getElementById('stat-qtd-perguntas');

    if (statTotal) statTotal.textContent = totalRespostas;
    if (statStatus) {
        const statusMap = {
            publicado: 'Publicado',
            rascunho: 'Rascunho',
            encerrado: 'Encerrado'
        };
        statStatus.textContent = statusMap[status] || status;
    }
    if (statPerguntas) statPerguntas.textContent = totalPerguntas;
}

// ==========================================
// 4. RENDERIZAÇÃO DA TABELA DE RESPONDENTES
// ==========================================

function renderizarTabelaRespostas(respostas) {
    const tbody = document.getElementById('tbody-respostas');
    if (!tbody) return;

    if (respostas.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
                    <i class="ri-inbox-line" style="font-size: 2.2rem; margin-bottom: 0.5rem; display: block; color: var(--text-muted);"></i>
                    Nenhuma resposta recebida para este formulário até o momento.
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    respostas.forEach(resp => {
        const dataEnvio = resp.enviadoEm 
            ? new Date(resp.enviadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
            : 'N/I';

        const iniciais = extrairIniciais(resp.nome);

        html += `
        <tr>
            <td>
                <div class="user-cell">
                    <div class="avatar">${iniciais}</div>
                    <span class="user-name">${resp.nome}</span>
                </div>
            </td>
            <td>${resp.email}</td>
            <td>${dataEnvio}</td>
            <td>
                <button type="button" class="btn btn-sm btn-outline" onclick="verDetalhesResposta('${resp.id}')">
                    <i class="ri-eye-line"></i> Ver Respostas
                </button>
            </td>
        </tr>`;
    });

    tbody.innerHTML = html;
}

function extrairIniciais(nome) {
    if (!nome) return 'US';
    const partes = nome.trim().split(' ');
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

// ==========================================
// 5. MODAL DE DETALHES DA RESPOSTA INDIVIDUAL
// ==========================================

const modalDetalhesResposta = document.getElementById('modal-detalhes-resposta');
const btnCloseModalDetalhes = document.getElementById('close-modal-detalhes-resposta');
const btnCloseModalDetalhesFooter = document.getElementById('btn-close-detalhes-resposta');

function verDetalhesResposta(respostaId) {
    const respostaObj = respostasDoFormularioAtual.find(r => String(r.id) === String(respostaId));
    if (!respostaObj) return;

    const avatarEl = document.getElementById('detalhe-resp-avatar');
    const nomeEl = document.getElementById('detalhe-resp-nome');
    const emailEl = document.getElementById('detalhe-resp-email');
    const dataEl = document.getElementById('detalhe-resp-data');
    const containerRespostas = document.getElementById('container-respostas-usuario-detalhes');

    if (avatarEl) avatarEl.textContent = extrairIniciais(respostaObj.nome);
    if (nomeEl) nomeEl.textContent = respostaObj.nome;
    if (emailEl) emailEl.innerHTML = `<i class="ri-mail-line"></i> ${respostaObj.email}`;
    if (dataEl) {
        const dataFmt = respostaObj.enviadoEm 
            ? new Date(respostaObj.enviadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
            : 'N/I';
        dataEl.innerHTML = `<i class="ri-time-line"></i> ${dataFmt}`;
    }

    let html = '';
    if (formularioAtual && formularioAtual.perguntas) {
        formularioAtual.perguntas.forEach(perguntaId => {
            const perguntaObj = todasAsPerguntas.find(p => String(p.id) === String(perguntaId));
            const itemResposta = respostaObj.respostas 
                ? respostaObj.respostas.find(r => String(r.perguntaId) === String(perguntaId))
                : null;

            const enunciado = perguntaObj ? perguntaObj.enunciado : `Pergunta ID ${perguntaId}`;

            let valorFormatado = '(Não respondida)';
            if (itemResposta && itemResposta.valor !== undefined && itemResposta.valor !== null && itemResposta.valor !== '') {
                if (Array.isArray(itemResposta.valor)) {
                    valorFormatado = itemResposta.valor.join(', ');
                } else {
                    valorFormatado = String(itemResposta.valor);
                }
            }

            html += `
            <div class="answer-detail-item">
                <span class="answer-question-title">${enunciado}</span>
                <div class="answer-value-badge">${valorFormatado}</div>
            </div>`;
        });
    }

    if (containerRespostas) containerRespostas.innerHTML = html;
    if (modalDetalhesResposta) modalDetalhesResposta.classList.add('active');
}

function fecharModalDetalhes() {
    if (modalDetalhesResposta) modalDetalhesResposta.classList.remove('active');
}

// Event Listeners
const selectForm = document.getElementById('select-formulario-resposta');
if (selectForm) selectForm.addEventListener('change', carregarRespostasDoFormulario);

if (btnCloseModalDetalhes) btnCloseModalDetalhes.addEventListener('click', fecharModalDetalhes);
if (btnCloseModalDetalhesFooter) btnCloseModalDetalhesFooter.addEventListener('click', fecharModalDetalhes);

window.addEventListener('click', (e) => {
    if (e.target === modalDetalhesResposta) fecharModalDetalhes();
});

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    inicializarRespostas();
    inicializarMenuMobile();
});

function inicializarMenuMobile() {
    const toggleBtn = document.getElementById('mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('mobile-open');
            const icon = toggleBtn.querySelector('i');
            if (icon) {
                icon.className = sidebar.classList.contains('mobile-open') ? 'ri-close-line' : 'ri-menu-line';
            }
        });
    }
}
