// script.js - Banco de Perguntas, Modal e Filtros

let todasAsPerguntas = [];

// ==========================================
// 1. REQUISIÇÕES E CARREGAMENTO DE DADOS
// ==========================================

async function carregarPerguntas() {
    try {
        const response = await fetch('http://localhost:3000/perguntas');
        todasAsPerguntas = await response.json();
        aplicarFiltrosPerguntas();
    } catch (error) {
        console.error('Erro ao buscar perguntas:', error);
    }
}

// ==========================================
// 2. FILTROS (BUSCA E TIPO DE PERGUNTA)
// ==========================================

const inputBuscaPergunta = document.getElementById('search-perguntas');
const selectFiltroTipo = document.getElementById('filter-tipo-pergunta');

function aplicarFiltrosPerguntas() {
    const termoBusca = inputBuscaPergunta ? inputBuscaPergunta.value.trim().toLowerCase() : '';
    const tipoSelecionado = selectFiltroTipo ? selectFiltroTipo.value : '';

    const perguntasFiltradas = todasAsPerguntas.filter(pergunta => {
        const bateTexto = pergunta.enunciado ? pergunta.enunciado.toLowerCase().includes(termoBusca) : true;
        const bateTipo = tipoSelecionado === '' || pergunta.tipo === tipoSelecionado;
        return bateTexto && bateTipo;
    });

    renderQuestions(perguntasFiltradas);
}

// Event Listeners para Filtros
if (inputBuscaPergunta) {
    inputBuscaPergunta.addEventListener('input', aplicarFiltrosPerguntas);
}

if (selectFiltroTipo) {
    selectFiltroTipo.addEventListener('change', aplicarFiltrosPerguntas);
}

// ==========================================
// 3. RENDERIZAÇÃO DOS CARDS
// ==========================================

function renderQuestions(perguntas) {
    const traduzirTipo = {
        multipla_escolha: 'Múltipla Escolha',
        texto_longo: 'Texto Longo',
        texto_curto: 'Texto Curto',
        checkbox: 'Checkbox'
    };

    const lista = document.getElementById('container-perguntas-list');
    if (!lista) return;

    if (perguntas.length === 0) {
        lista.innerHTML = `
            <div class="card card-nested" style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
                <i class="ri-search-eye-line" style="font-size: 2.5rem; color: var(--text-muted); margin-bottom: 0.5rem; display: block;"></i>
                <h3 style="color: var(--text-secondary); margin-bottom: 0.25rem;">Nenhuma pergunta encontrada</h3>
                <p style="color: var(--text-muted); font-size: 0.875rem;">Tente ajustar sua busca ou selecionar outro tipo no filtro.</p>
            </div>
        `;
        return;
    }

    let html = '';

    perguntas.forEach(e => {
        let input = '';

        switch (e.tipo) {
            case 'multipla_escolha':
                if (e.alternativas) {
                    const opcoesMultipla = e.alternativas.map(a => `
                        <label class="custom-option">
                            <input type="radio" name="pergunta_${e.id}" value="${a}">
                            <span class="option-box"></span>
                            <span class="option-text">${a}</span>
                        </label>
                    `).join('');
                    input = `<div class="options-group">${opcoesMultipla}</div>`;
                }
                break;

            case 'checkbox':
                if (e.alternativas) {
                    const opcoesCheckbox = e.alternativas.map(a => `
                        <label class="custom-option">
                            <input type="checkbox" name="pergunta_${e.id}" value="${a}">
                            <span class="option-box"></span>
                            <span class="option-text">${a}</span>
                        </label>
                    `).join('');
                    input = `<div class="options-group">${opcoesCheckbox}</div>`;
                }
                break;

            case 'texto_curto':
                input = `<input type="text" class="form-input" placeholder="Resposta de texto curto (até 200 caracteres)" maxlength="200">`;
                break;

            case 'texto_longo':
                input = `<textarea class="form-input textarea-input" placeholder="Resposta de texto longo..." rows="3"></textarea>`;
                break;

            default:
                break;
        }

        const dataFormatada = e.criadaEm ? new Date(e.criadaEm).toLocaleDateString('pt-BR') : '01/07/2026';

        html += `
        <article class="card question-card">
            <div class="card-header">
                <span class="badge badge-purple">${traduzirTipo[e.tipo] || e.tipo}</span>
                <span class="badge badge-${e.obrigatoria ? 'danger' : 'purple'}">${e.obrigatoria ? 'Obrigatória' : 'Opcional'}</span>
            </div>
            <div class="card-body">
                <h3 class="question-title">${e.enunciado}</h3>
                ${input}
            </div>
            <div class="card-footer">
                <span class="meta-date"><i class="ri-calendar-line"></i> ${dataFormatada}</span>
                <div class="card-actions">
                    <button type="button" class="btn-icon" title="Editar" onclick="prepararEdicao('${e.id}')"><i class="ri-edit-line"></i></button>
                    <button type="button" class="btn-icon btn-icon-danger" onclick="excluirPergunta('${e.id}')" title="Excluir"><i class="ri-delete-bin-line"></i></button>
                </div>
            </div>
        </article>`;
    });

    lista.innerHTML = html;
}

// ==========================================
// 4. EXCLUSÃO DE PERGUNTA
// ==========================================

async function excluirPergunta(id) {
    if (!confirm('Deseja realmente excluir esta pergunta?')) return;

    try {
        const response = await fetch(`http://localhost:3000/perguntas/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            carregarPerguntas();
        } else {
            alert('Não foi possível excluir a pergunta.');
        }
    } catch (error) {
        console.error('Erro ao excluir pergunta:', error);
    }
}

// ==========================================
// 5. CONTROLE DO MODAL DE PERGUNTA
// ==========================================

const modalPergunta = document.getElementById('modal-pergunta');
const btnNovaPergunta = document.getElementById('btn-nova-pergunta');
const btnCloseModal = document.getElementById('close-modal-pergunta');
const btnCancelModal = document.getElementById('btn-cancel-pergunta');
const formPergunta = document.getElementById('form-pergunta');

const selectTipo = document.getElementById('pergunta-tipo');
const sectionAlternativas = document.getElementById('section-alternativas');
const containerAlternativas = document.getElementById('container-alternativas-inputs');
const btnAddAlternativa = document.getElementById('btn-add-alternativa');
const alternativasHint = document.getElementById('alternativas-hint');

function abrirModal() {
    formPergunta.reset();
    document.getElementById('pergunta-id').value = '';
    document.getElementById('modal-pergunta-title').innerHTML = '<i class="ri-questionnaire-line"></i> Cadastrar Nova Pergunta';
    limparErros();
    atualizarSecaoAlternativas();
    if (modalPergunta) modalPergunta.classList.add('active');
}

function fecharModal() {
    if (modalPergunta) modalPergunta.classList.remove('active');
    formPergunta.reset();
    limparErros();
}

function limparErros() {
    document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
}

function atualizarSecaoAlternativas() {
    const tipo = selectTipo.value;

    if (tipo === 'multipla_escolha' || tipo === 'checkbox') {
        sectionAlternativas.classList.remove('hidden');

        const isMultipla = tipo === 'multipla_escolha';
        const min = isMultipla ? 2 : 3;
        const max = isMultipla ? 10 : 15;
        
        alternativasHint.textContent = `Mínimo ${min}, Máximo ${max} alternativas`;

        const linhasAtuais = containerAlternativas.querySelectorAll('.alternative-input-row').length;
        if (linhasAtuais < min) {
            for (let i = linhasAtuais; i < min; i++) {
                adicionarLinhaAlternativa(`Opção ${i + 1}`);
            }
        }
    } else {
        sectionAlternativas.classList.add('hidden');
    }
}

function adicionarLinhaAlternativa(placeholderText = '') {
    const tipo = selectTipo.value;
    const max = tipo === 'multipla_escolha' ? 10 : 15;
    const totalLinhas = containerAlternativas.querySelectorAll('.alternative-input-row').length;

    if (totalLinhas >= max) {
        alert(`O limite máximo para este tipo é de ${max} alternativas.`);
        return;
    }

    const row = document.createElement('div');
    row.className = 'alternative-input-row';
    row.innerHTML = `
        <span class="drag-handle"><i class="ri-more-2-fill"></i></span>
        <input type="text" class="form-input alt-item" placeholder="${placeholderText || `Opção ${totalLinhas + 1}`}">
        <button type="button" class="btn-icon btn-icon-danger btn-remove-alt"><i class="ri-subtract-line"></i></button>
    `;

    row.querySelector('.btn-remove-alt').addEventListener('click', () => removerLinhaAlternativa(row));
    containerAlternativas.appendChild(row);
}

function removerLinhaAlternativa(rowElement) {
    const tipo = selectTipo.value;
    const min = tipo === 'multipla_escolha' ? 2 : 3;
    const totalLinhas = containerAlternativas.querySelectorAll('.alternative-input-row').length;

    if (totalLinhas <= min) {
        alert(`É necessário ter no mínimo ${min} alternativas para este tipo de pergunta.`);
        return;
    }

    rowElement.remove();
}

// ==========================================
// 6. SUBMISSÃO DO FORMULÁRIO DE PERGUNTA
// ==========================================

async function salvarPergunta(event) {
    event.preventDefault();
    limparErros();

    const id = document.getElementById('pergunta-id').value;
    const enunciado = document.getElementById('pergunta-enunciado').value.trim();
    const tipo = document.getElementById('pergunta-tipo').value;
    const obrigatoria = document.getElementById('pergunta-obrigatoria').checked;

    let temErro = false;

    if (!enunciado) {
        document.getElementById('error-pergunta-enunciado').textContent = 'O enunciado da pergunta é obrigatório.';
        temErro = true;
    }

    let alternativasArr = [];
    if (tipo === 'multipla_escolha' || tipo === 'checkbox') {
        const altInputs = containerAlternativas.querySelectorAll('.alt-item');
        const min = tipo === 'multipla_escolha' ? 2 : 3;
        const max = tipo === 'multipla_escolha' ? 10 : 15;

        altInputs.forEach(input => {
            const val = input.value.trim();
            if (val) alternativasArr.push(val);
        });

        if (alternativasArr.length < min) {
            document.getElementById('error-alternativas').textContent = `Preencha pelo menos ${min} alternativas válidas.`;
            temErro = true;
        } else if (alternativasArr.length > max) {
            document.getElementById('error-alternativas').textContent = `Máximo de ${max} alternativas excedido.`;
            temErro = true;
        }

        const unicos = new Set(alternativasArr.map(a => a.toLowerCase()));
        if (unicos.size !== alternativasArr.length) {
            document.getElementById('error-alternativas').textContent = 'As alternativas não podem ter textos duplicados.';
            temErro = true;
        }
    }

    if (temErro) return;

    const payload = {
        enunciado,
        tipo,
        obrigatoria,
        criadaEm: new Date().toISOString()
    };

    if (tipo === 'multipla_escolha' || tipo === 'checkbox') {
        payload.alternativas = alternativasArr;
    }

    try {
        const url = id ? `http://localhost:3000/perguntas/${id}` : 'http://localhost:3000/perguntas';
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            fecharModal();
            carregarPerguntas();
        } else {
            alert('Ocorreu um erro ao salvar a pergunta.');
        }
    } catch (error) {
        console.error('Erro ao salvar pergunta:', error);
    }
}

async function prepararEdicao(id) {
    try {
        const response = await fetch(`http://localhost:3000/perguntas/${id}`);
        const pergunta = await response.json();

        abrirModal();
        document.getElementById('modal-pergunta-title').innerHTML = '<i class="ri-edit-line"></i> Editar Pergunta';
        document.getElementById('pergunta-id').value = pergunta.id;
        document.getElementById('pergunta-enunciado').value = pergunta.enunciado;
        document.getElementById('pergunta-tipo').value = pergunta.tipo;
        document.getElementById('pergunta-obrigatoria').checked = pergunta.obrigatoria;

        atualizarSecaoAlternativas();

        if (pergunta.alternativas && (pergunta.tipo === 'multipla_escolha' || pergunta.tipo === 'checkbox')) {
            containerAlternativas.innerHTML = '';
            pergunta.alternativas.forEach(alt => {
                adicionarLinhaAlternativa(alt);
            });
            const inputs = containerAlternativas.querySelectorAll('.alt-item');
            pergunta.alternativas.forEach((alt, idx) => {
                if (inputs[idx]) inputs[idx].value = alt;
            });
        }
    } catch (error) {
        console.error('Erro ao buscar pergunta para edição:', error);
    }
}

// Event Listeners
if (btnNovaPergunta) btnNovaPergunta.addEventListener('click', abrirModal);
if (btnCloseModal) btnCloseModal.addEventListener('click', fecharModal);
if (btnCancelModal) btnCancelModal.addEventListener('click', fecharModal);

if (selectTipo) selectTipo.addEventListener('change', () => {
    containerAlternativas.innerHTML = '';
    atualizarSecaoAlternativas();
});

if (btnAddAlternativa) btnAddAlternativa.addEventListener('click', () => adicionarLinhaAlternativa());
if (formPergunta) formPergunta.addEventListener('submit', salvarPergunta);

window.addEventListener('click', (e) => {
    if (e.target === modalPergunta) fecharModal();
});

// Inicialização
document.addEventListener('DOMContentLoaded', carregarPerguntas);