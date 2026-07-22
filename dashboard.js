// dashboard.js - Mapeamento e Gráficos do Dashboard Analytics

let chartRespostas = null;
let chartTiposPerguntas = null;

async function carregarDadosDashboard() {
    try {
        const [resFormularios, resPerguntas, resRespostas] = await Promise.all([
            fetch('http://localhost:3000/formularios'),
            fetch('http://localhost:3000/perguntas'),
            fetch('http://localhost:3000/respostas')
        ]);

        const formularios = await resFormularios.json();
        const perguntas = await resPerguntas.json();
        const respostas = await resRespostas.json();

        atualizarCardsMetricas(formularios, perguntas, respostas);
        renderizarGraficoRespostasPorForm(formularios, respostas);
        renderizarGraficoTiposPerguntas(perguntas);
        renderizarUltimasSubmissoes(formularios, respostas);
    } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
    }
}

// ==========================================
// 1. CARDS DE MÉTRICAS
// ==========================================

function atualizarCardsMetricas(formularios, perguntas, respostas) {
    const elTotalForms = document.getElementById('dash-total-formularios');
    const elTotalRespostas = document.getElementById('dash-total-respostas');
    const elTotalPerguntas = document.getElementById('dash-total-perguntas');
    const elFormsPublicados = document.getElementById('dash-forms-publicados');

    if (elTotalForms) elTotalForms.textContent = formularios.length;
    if (elTotalRespostas) elTotalRespostas.textContent = respostas.length;
    if (elTotalPerguntas) elTotalPerguntas.textContent = perguntas.length;

    const ativos = formularios.filter(f => f.status === 'publicado').length;
    if (elFormsPublicados) elFormsPublicados.textContent = ativos;
}

// ==========================================
// 2. GRÁFICO 1: SUBMISSÕES POR FORMULÁRIO (BARRAS)
// ==========================================

function renderizarGraficoRespostasPorForm(formularios, respostas) {
    const ctx = document.getElementById('chart-respostas-por-form');
    if (!ctx) return;

    const labels = formularios.map(f => f.titulo.length > 20 ? f.titulo.substring(0, 20) + '...' : f.titulo);
    const data = formularios.map(f => {
        return respostas.filter(r => String(r.formularioId) === String(f.id)).length;
    });

    if (chartRespostas) chartRespostas.destroy();

    chartRespostas = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Respostas Recebidas',
                data: data,
                backgroundColor: 'rgba(99, 102, 241, 0.7)',
                borderColor: '#6366f1',
                borderWidth: 2,
                borderRadius: 8,
                hoverBackgroundColor: 'rgba(129, 140, 248, 0.9)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1, color: '#9ca3af' },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                },
                x: {
                    ticks: { color: '#9ca3af' },
                    grid: { display: false }
                }
            }
        }
    });
}

// ==========================================
// 3. GRÁFICO 2: TIPOS DE PERGUNTAS (DONUT)
// ==========================================

function renderizarGraficoTiposPerguntas(perguntas) {
    const ctx = document.getElementById('chart-tipos-perguntas');
    if (!ctx) return;

    const contagem = {
        multipla_escolha: 0,
        checkbox: 0,
        texto_curto: 0,
        texto_longo: 0
    };

    perguntas.forEach(p => {
        if (contagem[p.tipo] !== undefined) {
            contagem[p.tipo]++;
        }
    });

    if (chartTiposPerguntas) chartTiposPerguntas.destroy();

    chartTiposPerguntas = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Múltipla Escolha', 'Checkbox', 'Texto Curto', 'Texto Longo'],
            datasets: [{
                data: [
                    contagem.multipla_escolha,
                    contagem.checkbox,
                    contagem.texto_curto,
                    contagem.texto_longo
                ],
                backgroundColor: [
                    '#a855f7', // Purple
                    '#10b981', // Green
                    '#3b82f6', // Blue
                    '#f59e0b'  // Orange
                ],
                borderWidth: 0,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#9ca3af', font: { family: 'Plus Jakarta Sans', size: 12 } }
                }
            }
        }
    });
}

// ==========================================
// 4. TABELA DE ÚLTIMAS SUBMISSÕES
// ==========================================

function renderizarUltimasSubmissoes(formularios, respostas) {
    const tbody = document.getElementById('tbody-ultimas-respostas');
    if (!tbody) return;

    if (respostas.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                    Nenhuma submissão registrada no sistema.
                </td>
            </tr>
        `;
        return;
    }

    // Ordenar pelas mais recentes
    const ordenadas = [...respostas].sort((a, b) => new Date(b.enviadoEm) - new Date(a.enviadoEm)).slice(0, 5);

    let html = '';
    ordenadas.forEach(resp => {
        const formObj = formularios.find(f => String(f.id) === String(resp.formularioId));
        const tituloForm = formObj ? formObj.titulo : `Formulário #${resp.formularioId}`;

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
            <td><span class="badge badge-purple">${tituloForm}</span></td>
            <td>${dataEnvio}</td>
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

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    carregarDadosDashboard();
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
