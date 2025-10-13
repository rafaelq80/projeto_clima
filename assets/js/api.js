// ==========================
// SELEÇÃO DE ELEMENTOS DO DOM
// ==========================

// Campos e botões da tela de busca
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');

// Elementos de mensagens
const loading = document.getElementById('loading');
const error = document.getElementById('error');

// Telas principais
const searchScreen = document.getElementById('searchScreen');
const resultScreen = document.getElementById('resultScreen');

// Elementos da tela de resultado
const temperature = document.getElementById('temperature');
const cityName = document.getElementById('cityName');
const backBtn = document.getElementById('backBtn');


// ==========================
// CONSTANTES GLOBAIS
// ==========================

// Tempo limite para requisições (10 segundos)
const TIMEOUT_MS = 10000;

// Mensagens padrão de erro
const MENSAGENS_ERRO = {
    CIDADE_VAZIA: 'Por favor, digite o nome de uma cidade.',
    CIDADE_NAO_ENCONTRADA: 'Cidade não encontrada. Tente novamente.',
    TIMEOUT: 'A requisição demorou muito. Verifique sua conexão.',
    REDE: 'Erro de conexão. Verifique sua internet.',
    SERVIDOR: 'Erro no servidor. Tente novamente mais tarde.',
    GENERICO: 'Erro ao buscar dados. Tente novamente.'
};


// ==========================
// FUNÇÕES AUXILIARES
// ==========================

// Retorna a data atual formatada em português (ex: "Segunda-feira, 13 de Outubro de 2025")
function obterDataAtual() {
    const hoje = new Date();
    const opcoes = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return hoje.toLocaleDateString('pt-BR', opcoes);
}

// Verifica se o nome da cidade foi digitado corretamente
function validarEntrada(cidade) {
    return cidade && cidade.trim().length > 0;
}

// Faz uma requisição fetch com tempo limite (timeout)
async function fetchComTimeout(url, timeout = TIMEOUT_MS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        return response;
    } catch (erro) {
        clearTimeout(timeoutId);
        if (erro.name === 'AbortError') throw new Error('TIMEOUT');
        throw erro;
    }
}


// ==========================
// FUNÇÕES PRINCIPAIS DE REQUISIÇÃO
// ==========================

// Busca as coordenadas (latitude e longitude) de uma cidade usando a API Open-Meteo
async function buscarCoordenadas(cidade) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cidade)}&count=1&language=pt&format=json`;

    const resposta = await fetchComTimeout(url);
    const dados = await resposta.json();

    // Se a cidade não for encontrada, retorna null
    if (!dados.results || dados.results.length === 0) return null;

    const resultado = dados.results[0];
    return {
        latitude: resultado.latitude,
        longitude: resultado.longitude,
        nome: resultado.name,
        pais: resultado.country
    };
}

// Busca os dados climáticos atuais de uma coordenada (latitude/longitude)
async function buscarDadosClima(coordenadas) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coordenadas.latitude}&longitude=${coordenadas.longitude}&current=temperature_2m&timezone=auto`;

    const resposta = await fetchComTimeout(url);
    const dados = await resposta.json();

    return dados.current;
}


// ==========================
// FUNÇÃO PRINCIPAL: BUSCAR CLIMA
// ==========================

async function buscarClima() {
    const cidade = cityInput.value.trim();

    // Verifica se o campo está vazio
    if (!validarEntrada(cidade)) {
        mostrarErro(MENSAGENS_ERRO.CIDADE_VAZIA);
        return;
    }

    esconderMensagens();
    mostrarCarregamento();

    try {
        // Etapa 1: Buscar coordenadas da cidade
        const coordenadas = await buscarCoordenadas(cidade);
        if (!coordenadas) {
            mostrarErro(MENSAGENS_ERRO.CIDADE_NAO_ENCONTRADA);
            return;
        }

        // Etapa 2: Buscar dados do clima
        const dadosClima = await buscarDadosClima(coordenadas);

        // Etapa 3: Exibir resultado na tela
        exibirClima(coordenadas.nome, coordenadas.pais, dadosClima);
    } catch (erro) {
        tratarErro(erro);
    } finally {
        // Esconde o "Carregando..." ao final, independente do resultado
        esconderCarregamento();
    }
}


// ==========================
// TRATAMENTO DE ERROS
// ==========================

// Exibe mensagens adequadas conforme o tipo de erro
function tratarErro(erro) {
    console.error('Erro:', erro);

    let mensagem = MENSAGENS_ERRO.GENERICO;
    if (erro.message === 'TIMEOUT') mensagem = MENSAGENS_ERRO.TIMEOUT;
    else if (erro.message.includes('Failed to fetch')) mensagem = MENSAGENS_ERRO.REDE;
    else if (erro.message.includes('500') || erro.message.includes('503')) mensagem = MENSAGENS_ERRO.SERVIDOR;

    mostrarErro(mensagem);
}


// ==========================
// FUNÇÕES DE INTERFACE (UI)
// ==========================

// Exibe as informações do clima na tela
function exibirClima(nome, pais, dados) {
    esconderMensagens();
    cityName.textContent = `${nome}, ${pais}`;
    temperature.textContent = `${Math.round(dados.temperature_2m)}°`;
    searchScreen.style.display = 'none';
    resultScreen.style.display = 'flex';
}

// Volta para a tela inicial e limpa o campo de busca
function voltarParaBusca() {
    cityInput.value = '';
    esconderMensagens();
    resultScreen.style.display = 'none';
    searchScreen.style.display = 'flex';
}

// Exibe mensagem de erro no elemento #error
function mostrarErro(mensagem) {
    esconderMensagens();
    error.textContent = mensagem;
    error.style.display = 'block';
}

// Mostra indicador de "Carregando..."
function mostrarCarregamento() {
    loading.style.display = 'block';
}

// Esconde o indicador de "Carregando..."
function esconderCarregamento() {
    loading.style.display = 'none';
}

// Esconde todas as mensagens (erro e loading)
function esconderMensagens() {
    loading.style.display = 'none';
    error.style.display = 'none';
}


// ==========================
// EVENTOS
// ==========================

// Clique no botão "Buscar"
searchBtn.addEventListener('click', buscarClima);

// Pressionar Enter no campo de texto
cityInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') buscarClima();
});

// Clique no botão "Voltar"
backBtn.addEventListener('click', voltarParaBusca);
