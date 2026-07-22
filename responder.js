// responder.js - Tela Pública de Resposta com Progresso Interativo

let formularioAtual = null;
let perguntasDoFormulario = [];

// ==========================================
// 1. CARREGAMENTO DO QUESTIONÁRIO
// ==========================================

async function carregarQuestionarioPublico() {
    const urlParams = new URLSearchParams(window.location.search);
    const formId = urlParams.get('id') || urlParams.get('formularioId') || '1';

    const tituloEl = document.getElementById('public-form-titulo');
    const descEl = document.getElementById('public-form-descricao');

    try {
        const [resForm, resPerguntas] = await Promise.all([
            fetch(`http://localhost:3000/formularios/${formId}`),
            fetch('http://localhost:3000/perguntas')
        ]);

        if (!resForm.ok) {
            exibirMensagemIndisponivel('Formulário não encontrado.');
            return;
        }

        formularioAtual = await resForm.json();
        const todasPerguntas = await resPerguntas.json();

        const perguntasIds = formularioAtual.perguntas || [];
        perguntasDoFormulario = todasPerguntas.filter(p => perguntasIds.includes(String(p.id)));

        if (tituloEl) tituloEl.textContent = formularioAtual.titulo;
        if (descEl) descEl.textContent = formularioAtual.descricao || 'Preencha os campos abaixo com atenção.';

        const motivoIndisponivel = verificarDisponibilidadeFormulario(formularioAtual);
        if (motivoIndisponivel) {
            exibirMensagemIndisponivel(motivoIndisponivel);
            return;
        }

        renderizarPerguntasResponder(perguntasDoFormulario);
        adicionarListenersProgresso();
    } catch (error) {
        console.error('Erro ao carregar formulário público:', error);
        exibirMensagemIndisponivel('Não foi possível conectar ao servidor.');
    }
}

function verificarDisponibilidadeFormulario(form) {
    if (form.status !== 'publicado') {
        return `Este formulário não está disponível para respostas no momento (Status: ${form.status.toUpperCase()}).`;
    }

    const agora = new Date();

    if (form.dataInicio) {
        const inicio = new Date(form.dataInicio);
        if (agora < inicio) {
            return `Este formulário ainda não iniciou seu período de vigência. Estará disponível em ${inicio.toLocaleDateString('pt-BR')}.`;
        }
    }

    if (form.dataFim) {
        const fim = new Date(form.dataFim);
        if (agora > fim) {
            return `Este formulário foi encerrado em ${fim.toLocaleDateString('pt-BR')}. Não aceita mais submissões.`;
        }
    }

    return null;
}

function exibirMensagemIndisponivel(mensagem) {
    const container = document.getElementById('container-perguntas-responder');
    const formSubmitBtn = document.getElementById('btn-submeter-resposta');
    const progressWrapper = document.getElementById('progress-wrapper');

    if (progressWrapper) progressWrapper.style.display = 'none';

    if (container) {
        container.innerHTML = `
            <div class="card card-nested" style="text-align: center; padding: 2.5rem;">
                <i class="ri-lock-line" style="font-size: 3rem; color: var(--color-warning); margin-bottom: 0.75rem; display: block;"></i>
                <h3 style="color: var(--text-primary); margin-bottom: 0.5rem;">Questionário Indisponível</h3>
                <p style="color: var(--text-secondary); font-size: 0.95rem;">${mensagem}</p>
            </div>
        `;
    }

    if (formSubmitBtn) {
        formSubmitBtn.disabled = true;
        formSubmitBtn.style.opacity = '0.5';
        formSubmitBtn.style.cursor = 'not-allowed';
    }
}

// ==========================================
// 2. RENDERIZAÇÃO DAS PERGUNTAS PÚBLICAS
// ==========================================

function renderizarPerguntasResponder(perguntas) {
    const container = document.getElementById('container-perguntas-responder');
    if (!container) return;

    if (perguntas.length === 0) {
        container.innerHTML = '<p class="hint-text">Este formulário ainda não possui perguntas cadastradas.</p>';
        return;
    }

    let html = '';

    perguntas.forEach((p, index) => {
        let inputHtml = '';
        const reqAsterisk = p.obrigatoria ? '<span class="required-asterisk">*</span>' : '';

        switch (p.tipo) {
            case 'multipla_escolha':
                if (p.alternativas) {
                    const opcoes = p.alternativas.map(alt => `
                        <label class="custom-option">
                            <input type="radio" name="resp_pergunta_${p.id}" value="${alt}">
                            <span class="option-box"></span>
                            <span class="option-text">${alt}</span>
                        </label>
                    `).join('');
                    inputHtml = `<div class="options-group">${opcoes}</div>`;
                }
                break;

            case 'checkbox':
                if (p.alternativas) {
                    const opcoes = p.alternativas.map(alt => `
                        <label class="custom-option">
                            <input type="checkbox" name="resp_pergunta_${p.id}" value="${alt}">
                            <span class="option-box"></span>
                            <span class="option-text">${alt}</span>
                        </label>
                    `).join('');
                    inputHtml = `<div class="options-group">${opcoes}</div>`;
                }
                break;

            case 'texto_curto':
                inputHtml = `<input type="text" class="form-input" name="resp_pergunta_${p.id}" placeholder="Sua resposta (até 200 caracteres)" maxlength="200">`;
                break;

            case 'texto_longo':
                inputHtml = `<textarea class="form-input textarea-input" name="resp_pergunta_${p.id}" placeholder="Sua resposta detalhada..." rows="3"></textarea>`;
                break;

            default:
                break;
        }

        html += `
        <div class="question-render-item card-nested" data-pergunta-id="${p.id}" data-obrigatoria="${p.obrigatoria}">
            <div class="question-render-header">
                <span class="question-number">${index + 1}</span>
                <h4 class="question-render-text">${p.enunciado} ${reqAsterisk}</h4>
            </div>
            <div class="question-input-wrapper">
                ${inputHtml}
            </div>
            <span class="field-error" id="error-pergunta-${p.id}"></span>
        </div>`;
    });

    container.innerHTML = html;
}

// ==========================================
// 3. BARRA DE PROGRESSO EM TEMPO REAL
// ==========================================

function adicionarListenersProgresso() {
    const form = document.getElementById('form-responder');
    if (!form) return;

    form.addEventListener('input', calcularProgresso);
    form.addEventListener('change', calcularProgresso);
    calcularProgresso();
}

function calcularProgresso() {
    const nome = document.getElementById('resp-nome')?.value.trim();
    const email = document.getElementById('resp-email')?.value.trim();

    // Total de etapas = Nome + Email + Qtd de Perguntas
    const totalEtapas = 2 + perguntasDoFormulario.length;
    let concluídas = 0;

    if (nome && nome.length >= 2) concluídas++;
    if (email && email.includes('@')) concluídas++;

    perguntasDoFormulario.forEach(p => {
        const wrapper = document.querySelector(`.question-render-item[data-pergunta-id="${p.id}"]`);
        if (!wrapper) return;

        let respondida = false;

        if (p.tipo === 'multipla_escolha') {
            respondida = wrapper.querySelector(`input[name="resp_pergunta_${p.id}"]:checked`) !== null;
        } else if (p.tipo === 'checkbox') {
            respondida = wrapper.querySelectorAll(`input[name="resp_pergunta_${p.id}"]:checked`).length > 0;
        } else if (p.tipo === 'texto_curto' || p.tipo === 'texto_longo') {
            const val = wrapper.querySelector(`[name="resp_pergunta_${p.id}"]`)?.value.trim();
            respondida = val && val.length > 0;
        }

        if (respondida) concluídas++;
    });

    const porcentagem = Math.round((concluídas / totalEtapas) * 100);

    const fillBar = document.getElementById('progress-fill');
    const textBar = document.getElementById('progress-percentage-text');

    if (fillBar) fillBar.style.width = `${porcentagem}%`;
    if (textBar) textBar.textContent = `${porcentagem}% Concluído`;
}

// ==========================================
// 4. SUBMISSÃO DE RESPOSTAS
// ==========================================

const formResponder = document.getElementById('form-responder');
if (formResponder) formResponder.addEventListener('submit', submeterRespostas);

async function submeterRespostas(event) {
    event.preventDefault();
    limparErrosPublicos();

    const nomeInput = document.getElementById('resp-nome');
    const emailInput = document.getElementById('resp-email');

    const nome = nomeInput ? nomeInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim().toLowerCase() : '';

    let temErro = false;

    if (!nome || nome.length < 2) {
        document.getElementById('error-resp-nome').textContent = 'Nome é obrigatório (mínimo de 2 caracteres).';
        temErro = true;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        document.getElementById('error-resp-email').textContent = 'Digite um e-mail válido.';
        temErro = true;
    }

    if (temErro) return;

    try {
        const resChecagem = await fetch(`http://localhost:3000/respostas?formularioId=${formularioAtual.id}`);
        const respostasExistentes = await resChecagem.json();

        const jaRespondeu = respostasExistentes.some(r => r.email && r.email.toLowerCase() === email);
        if (jaRespondeu) {
            document.getElementById('error-resp-email').textContent = 'Este e-mail já enviou uma resposta para este formulário.';
            alert('Atenção: Apenas 1 resposta por pessoa/e-mail é permitida por formulário.');
            return;
        }
    } catch (err) {
        console.error('Erro na checagem de e-mail único:', err);
    }

    const respostasArr = [];

    perguntasDoFormulario.forEach(p => {
        const wrapper = document.querySelector(`.question-render-item[data-pergunta-id="${p.id}"]`);
        const errorSpan = document.getElementById(`error-pergunta-${p.id}`);
        let valor = null;

        if (p.tipo === 'multipla_escolha') {
            const radioChecked = wrapper.querySelector(`input[name="resp_pergunta_${p.id}"]:checked`);
            if (radioChecked) valor = radioChecked.value;
        } else if (p.tipo === 'checkbox') {
            const checkedBoxes = wrapper.querySelectorAll(`input[name="resp_pergunta_${p.id}"]:checked`);
            if (checkedBoxes.length > 0) {
                valor = Array.from(checkedBoxes).map(cb => cb.value);
            }
        } else if (p.tipo === 'texto_curto' || p.tipo === 'texto_longo') {
            const textInput = wrapper.querySelector(`[name="resp_pergunta_${p.id}"]`);
            if (textInput && textInput.value.trim()) {
                valor = textInput.value.trim();
            }
        }

        if (p.obrigatoria && (!valor || (Array.isArray(valor) && valor.length === 0))) {
            if (errorSpan) errorSpan.textContent = 'Esta pergunta é obrigatória.';
            temErro = true;
        }

        if (valor !== null) {
            respostasArr.push({
                perguntaId: p.id,
                valor: valor
            });
        }
    });

    if (temErro) return;

    const payload = {
        formularioId: formularioAtual.id,
        nome: nome,
        email: email,
        respostas: respostasArr,
        enviadoEm: new Date().toISOString()
    };

    try {
        const response = await fetch('http://localhost:3000/respostas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert('🎉 Respostas enviadas com sucesso! Obrigado pela participação.');
            formResponder.reset();
            limparErrosPublicos();
            calcularProgresso();
        } else {
            alert('Erro ao enviar respostas.');
        }
    } catch (error) {
        console.error('Erro ao enviar resposta:', error);
    }
}

function limparErrosPublicos() {
    document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    carregarQuestionarioPublico();
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
