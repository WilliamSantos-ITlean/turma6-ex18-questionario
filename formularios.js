// formularios.js - Gestão, Validações, Regras de Negócio e Compartilhamento

let todosOsFormularios = [];
let todasAsPerguntas = [];

// ==========================================
// 1. CARREGAMENTO DE DADOS
// ==========================================

async function carregarDadosFormularios() {
    try {
        const [resFormularios, resPerguntas] = await Promise.all([
            fetch('http://localhost:3000/formularios'),
            fetch('http://localhost:3000/perguntas')
        ]);

        todosOsFormularios = await resFormularios.json();
        todasAsPerguntas = await resPerguntas.json();

        aplicarFiltrosFormularios();
    } catch (error) {
        console.error('Erro ao carregar dados de formulários:', error);
    }
}

// ==========================================
// 2. FILTROS
// ==========================================

const inputBuscaForm = document.getElementById('search-formularios');
const selectFiltroStatus = document.getElementById('filter-status-form');

function aplicarFiltrosFormularios() {
    const termoBusca = inputBuscaForm ? inputBuscaForm.value.trim().toLowerCase() : '';
    const statusSelecionado = selectFiltroStatus ? selectFiltroStatus.value : '';

    const formulariosFiltrados = todosOsFormularios.filter(form => {
        const bateTitulo = form.titulo ? form.titulo.toLowerCase().includes(termoBusca) : true;
        const bateStatus = statusSelecionado === '' || form.status === statusSelecionado;
        return bateTitulo && bateStatus;
    });

    renderFormularios(formulariosFiltrados);
}

if (inputBuscaForm) inputBuscaForm.addEventListener('input', aplicarFiltrosFormularios);
if (selectFiltroStatus) selectFiltroStatus.addEventListener('change', aplicarFiltrosFormularios);

// ==========================================
// 3. RENDERIZAÇÃO DOS CARDS DE FORMULÁRIO
// ==========================================

function renderFormularios(formularios) {
    const container = document.getElementById('container-formularios-list');
    if (!container) return;

    if (formularios.length === 0) {
        container.innerHTML = `
            <div class="card card-nested" style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
                <i class="ri-file-search-line" style="font-size: 2.5rem; color: var(--text-muted); margin-bottom: 0.5rem; display: block;"></i>
                <h3 style="color: var(--text-secondary); margin-bottom: 0.25rem;">Nenhum formulário encontrado</h3>
                <p style="color: var(--text-muted); font-size: 0.875rem;">Tente ajustar seus termos de busca ou filtros.</p>
            </div>
        `;
        return;
    }

    const badgeStatus = {
        publicado: '<span class="badge badge-success">Publicado</span>',
        rascunho: '<span class="badge badge-warning">Rascunho</span>',
        encerrado: '<span class="badge badge-danger">Encerrado</span>'
    };

    let html = '';

    formularios.forEach(form => {
        const totalPerguntas = form.perguntas ? form.perguntas.length : 0;
        const dataInicioStr = form.dataInicio ? new Date(form.dataInicio).toLocaleDateString('pt-BR') : '';
        const dataFimStr = form.dataFim ? new Date(form.dataFim).toLocaleDateString('pt-BR') : '';

        let vigenciaText = 'Sem período definido';
        if (dataInicioStr && dataFimStr) {
            vigenciaText = `Vigência: ${dataInicioStr} - ${dataFimStr}`;
        } else if (dataInicioStr) {
            vigenciaText = `A partir de: ${dataInicioStr}`;
        } else if (dataFimStr) {
            vigenciaText = `Até: ${dataFimStr}`;
        }

        html += `
        <article class="card form-card">
            <div class="card-header">
                ${badgeStatus[form.status] || `<span class="badge badge-purple">${form.status}</span>`}
                <span class="meta-questions-count"><i class="ri-question-line"></i> ${totalPerguntas} pergunta${totalPerguntas !== 1 ? 's' : ''}</span>
            </div>
            <div class="card-body">
                <h3 class="form-card-title">${form.titulo}</h3>
                <p class="form-card-desc">${form.descricao || 'Sem descrição cadastrada.'}</p>
                <div class="validity-box">
                    <i class="ri-time-line"></i>
                    <span>${vigenciaText}</span>
                </div>
            </div>
            <div class="card-footer">
                <div class="card-actions-full">
                    <button type="button" class="btn btn-sm btn-secondary" onclick="prepararEdicaoFormulario('${form.id}')" title="Editar"><i class="ri-edit-line"></i> Editar</button>
                    <button type="button" class="btn-icon" onclick="copiarLinkPublico('${form.id}')" title="Copiar Link Compartilhável"><i class="ri-links-line"></i></button>
                    <a href="respostas.html?formularioId=${form.id}" class="btn btn-sm btn-outline" title="Ver Respostas"><i class="ri-bar-chart-box-line"></i> Respostas</a>
                    <a href="responder.html?id=${form.id}" class="btn btn-sm btn-primary-light" title="Responder"><i class="ri-external-link-line"></i> Abrir</a>
                    <button type="button" class="btn-icon btn-icon-danger" onclick="excluirFormulario('${form.id}')" title="Excluir"><i class="ri-delete-bin-line"></i></button>
                </div>
            </div>
        </article>`;
    });

    container.innerHTML = html;
}

// 1-Click Copy Link
function copiarLinkPublico(id) {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    const folder = pathname.substring(0, pathname.lastIndexOf('/') + 1);
    const link = `${origin}${folder}responder.html?id=${id}`;

    navigator.clipboard.writeText(link).then(() => {
        mostrarToast('Link do formulário copiado para a área de transferência!');
    }).catch(() => {
        prompt('Copie o link do formulário abaixo:', link);
    });
}

function mostrarToast(mensagem, tipo = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    toast.innerHTML = `
        <i class="${tipo === 'success' ? 'ri-checkbox-circle-line' : 'ri-error-warning-line'} toast-icon"></i>
        <span>${mensagem}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 3500);
}

// ==========================================
// 4. MODAL DE CRIAR / EDITAR FORMULÁRIO
// ==========================================

const modalFormulario = document.getElementById('modal-formulario');
const btnNovoFormulario = document.getElementById('btn-novo-formulario');
const btnCloseModalForm = document.getElementById('close-modal-formulario');
const btnCancelModalForm = document.getElementById('btn-cancel-formulario');
const formFormulario = document.getElementById('form-formulario');
const containerSelecaoPerguntas = document.getElementById('container-selecao-perguntas');

function abrirModalFormulario() {
    formFormulario.reset();
    document.getElementById('formulario-id').value = '';
    document.getElementById('modal-formulario-title').innerHTML = '<i class="ri-file-list-3-line"></i> Criar Novo Formulário';
    limparErrosFormulario();
    renderizarSelecaoPerguntas([], false);
    if (modalFormulario) modalFormulario.classList.add('active');
}

function fecharModalFormulario() {
    if (modalFormulario) modalFormulario.classList.remove('active');
    formFormulario.reset();
    limparErrosFormulario();
}

function limparErrosFormulario() {
    document.querySelectorAll('#form-formulario .field-error').forEach(el => el.textContent = '');
}

function renderizarSelecaoPerguntas(perguntasSelecionadasIds = [], bloquearEdicaoPerguntas = false) {
    if (!containerSelecaoPerguntas) return;

    if (todasAsPerguntas.length === 0) {
        containerSelecaoPerguntas.innerHTML = '<p class="hint-text">Nenhuma pergunta cadastrada no Banco de Perguntas.</p>';
        return;
    }

    const traduzirTipo = {
        multipla_escolha: 'Múltipla Escolha',
        texto_longo: 'Texto Longo',
        texto_curto: 'Texto Curto',
        checkbox: 'Checkbox'
    };

    let html = '';
    if (bloquearEdicaoPerguntas) {
        html += '<p class="hint-text" style="color: var(--color-warning); margin-bottom: 0.75rem;"><i class="ri-lock-line"></i> As perguntas não podem ser alteradas pois o formulário já possui respostas registradas.</p>';
    }

    todasAsPerguntas.forEach(p => {
        const isChecked = perguntasSelecionadasIds.includes(String(p.id)) ? 'checked' : '';
        const isDisabled = bloquearEdicaoPerguntas ? 'disabled' : '';

        html += `
        <label class="checkbox-select-item">
            <input type="checkbox" name="perguntas_selecionadas" value="${p.id}" ${isChecked} ${isDisabled}>
            <span class="custom-checkbox"></span>
            <div class="select-item-content">
                <span class="select-item-title">${p.enunciado}</span>
                <span class="badge badge-sm badge-purple">${traduzirTipo[p.tipo] || p.tipo}</span>
            </div>
        </label>`;
    });

    containerSelecaoPerguntas.innerHTML = html;
}

// ==========================================
// 5. SALVAR E VALIDAÇÕES (POST/PUT)
// ==========================================

async function salvarFormulario(event) {
    event.preventDefault();
    limparErrosFormulario();

    const id = document.getElementById('formulario-id').value;
    const titulo = document.getElementById('form-titulo').value.trim();
    const descricao = document.getElementById('form-descricao').value.trim();
    const status = document.getElementById('form-status').value;
    const dataInicio = document.getElementById('form-data-inicio').value;
    const dataFim = document.getElementById('form-data-fim').value;

    let temErro = false;

    if (!titulo) {
        document.getElementById('error-form-titulo').textContent = 'O título do formulário é obrigatório.';
        temErro = true;
    }

    const checkboxes = containerSelecaoPerguntas.querySelectorAll('input[name="perguntas_selecionadas"]:checked');
    const perguntasIds = Array.from(checkboxes).map(cb => cb.value);

    if (perguntasIds.length === 0) {
        document.getElementById('error-form-perguntas').textContent = 'Selecione pelo menos 1 pergunta para compor o formulário.';
        temErro = true;
    }

    const agora = new Date();
    let inicioDate = dataInicio ? new Date(dataInicio) : null;
    let fimDate = dataFim ? new Date(dataFim) : null;

    if (inicioDate && fimDate) {
        if (fimDate < inicioDate) {
            document.getElementById('error-form-data-fim').textContent = 'A Data de Fim não pode ser anterior à Data de Início.';
            temErro = true;
        }
    }

    if (status === 'publicado' && fimDate && fimDate < agora) {
        document.getElementById('error-form-data-fim').textContent = 'Não é possível publicar um formulário com Data de Fim já expirada.';
        temErro = true;
    }

    if (temErro) return;

    const payload = {
        titulo,
        descricao,
        perguntas: perguntasIds,
        status,
        dataInicio: dataInicio ? new Date(dataInicio).toISOString() : null,
        dataFim: dataFim ? new Date(dataFim).toISOString() : null,
        criadoEm: new Date().toISOString()
    };

    try {
        const url = id ? `http://localhost:3000/formularios/${id}` : 'http://localhost:3000/formularios';
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            fecharModalFormulario();
            carregarDadosFormularios();
            mostrarToast('Formulário salvo com sucesso!');
        } else {
            alert('Erro ao salvar o formulário.');
        }
    } catch (error) {
        console.error('Erro ao salvar formulário:', error);
    }
}

async function prepararEdicaoFormulario(id) {
    try {
        const [resForm, resRespostas] = await Promise.all([
            fetch(`http://localhost:3000/formularios/${id}`),
            fetch(`http://localhost:3000/respostas?formularioId=${id}`)
        ]);

        const form = await resForm.json();
        const respostas = await resRespostas.json();

        const temRespostas = respostas.length > 0;

        abrirModalFormulario();
        document.getElementById('modal-formulario-title').innerHTML = '<i class="ri-edit-line"></i> Editar Formulário';
        document.getElementById('formulario-id').value = form.id;
        document.getElementById('form-titulo').value = form.titulo || '';
        document.getElementById('form-descricao').value = form.descricao || '';
        document.getElementById('form-status').value = form.status || 'rascunho';

        if (form.dataInicio) {
            document.getElementById('form-data-inicio').value = form.dataInicio.substring(0, 16);
        }
        if (form.dataFim) {
            document.getElementById('form-data-fim').value = form.dataFim.substring(0, 16);
        }

        renderizarSelecaoPerguntas(form.perguntas || [], temRespostas);
    } catch (error) {
        console.error('Erro ao buscar formulário para edição:', error);
    }
}

// ==========================================
// 6. EXCLUSÃO COM CHECAGEM DE RESPOSTAS (REGRA 7)
// ==========================================

async function excluirFormulario(id) {
    try {
        const resRespostas = await fetch(`http://localhost:3000/respostas?formularioId=${id}`);
        const respostas = await resRespostas.json();

        if (respostas.length > 0) {
            alert(`Atenção: Este formulário possui ${respostas.length} resposta(s) vinculada(s) e não pode ser excluído fisicamente para preservar o histórico.\n\nAltere seu status para 'encerrado' para desativá-lo.`);
            return;
        }

        if (!confirm('Deseja realmente excluir este formulário?')) return;

        const response = await fetch(`http://localhost:3000/formularios/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            carregarDadosFormularios();
            mostrarToast('Formulário excluído.');
        } else {
            alert('Não foi possível excluir o formulário.');
        }
    } catch (error) {
        console.error('Erro ao excluir formulário:', error);
    }
}

// Event Listeners
if (btnNovoFormulario) btnNovoFormulario.addEventListener('click', abrirModalFormulario);
if (btnCloseModalForm) btnCloseModalForm.addEventListener('click', fecharModalFormulario);
if (btnCancelModalForm) btnCancelModalForm.addEventListener('click', fecharModalFormulario);
if (formFormulario) formFormulario.addEventListener('submit', salvarFormulario);

window.addEventListener('click', (e) => {
    if (e.target === modalFormulario) fecharModalFormulario();
});

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    carregarDadosFormularios();
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
