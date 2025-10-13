// ==========================
// SELEÇÃO DE ELEMENTOS DO DOM
// ==========================
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const searchScreen = document.getElementById('searchScreen');
const resultScreen = document.getElementById('resultScreen');
const temperature = document.getElementById('temperature');
const cityName = document.getElementById('cityName');
const backBtn = document.getElementById('backBtn');

// ==========================
// CONSTANTES
// ==========================
const TIMEOUT_MS = 10000;

// ==========================
// FUNÇÕES AUXILIARES
// ==========================

// Retorna a data atual formatada (ex: "Segunda-feira, 13 de Outubro de 2025")
function obterDataAtual() {
    const hoje = new Date();
    const opcoes = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return hoje.toLocaleDateString('pt-BR', opcoes);
}

// Faz uma requisição fetch com tempo limite
async function fetchComTimeout(url, timeout = TIMEOUT_MS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
}

// ==========================
// REQUISIÇÕES À API
// ==========================

// Busca coordenadas (latitude/longitude) da cidade
async function buscarCoordenadas(cidade) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cidade)}&count=1&language=pt&format=json`;
    const resposta = await fetchComTimeout(url);
    const dados = await resposta.json();

    if (!dados.results || dados.results.length === 0) return null;

    const resultado = dados.results[0];
    return {
        latitude: resultado.latitude,
        longitude: resultado.longitude,
        nome: resultado.name,
        pais: resultado.country
    };
}

// Busca dados climáticos atuais
async function buscarDadosClima(coordenadas) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coordenadas.latitude}&longitude=${coordenadas.longitude}&current=temperature_2m&timezone=auto`;
    const resposta = await fetchComTimeout(url);
    const dados = await resposta.json();
    return dados.current;
}

// ==========================
// FUNÇÃO PRINCIPAL
// ==========================
async function buscarClima() {
    const cidade = cityInput.value.trim();
    if (!cidade) return;

    esconderMensagens();
    mostrarCarregamento();

    try {
        const coordenadas = await buscarCoordenadas(cidade);
        if (!coordenadas) return;

        const dadosClima = await buscarDadosClima(coordenadas);
        exibirClima(coordenadas.nome, coordenadas.pais, dadosClima);
    } catch (erro) {
        // Apenas loga no console para debug
        console.error('Erro ao buscar dados do clima:', erro);
    } finally {
        esconderCarregamento();
    }
}

// ==========================
// FUNÇÕES DE INTERFACE
// ==========================
function exibirClima(nome, pais, dados) {
    esconderMensagens();
    cityName.textContent = `${nome}, ${pais}`;
    temperature.textContent = `${Math.round(dados.temperature_2m)}°`;
    searchScreen.style.display = 'none';
    resultScreen.style.display = 'flex';
}

function voltarParaBusca() {
    cityInput.value = '';
    esconderMensagens();
    resultScreen.style.display = 'none';
    searchScreen.style.display = 'flex';
}

function mostrarCarregamento() {
    loading.style.display = 'block';
}

function esconderCarregamento() {
    loading.style.display = 'none';
}

function esconderMensagens() {
    loading.style.display = 'none';
}

// ==========================
// EVENTOS
// ==========================
searchBtn.addEventListener('click', buscarClima);

cityInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') buscarClima();
});

backBtn.addEventListener('click', voltarParaBusca);
