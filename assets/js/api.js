// ===== SELEÇÃO DE ELEMENTOS DO DOM =====
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const loading = document.getElementById('loading');
const error = document.getElementById('error');

// Telas
const searchScreen = document.getElementById('searchScreen');
const resultScreen = document.getElementById('resultScreen');

// Elementos da tela de resultado
const weatherIcon = document.getElementById('weatherIcon');
const temperature = document.getElementById('temperature');
const cityName = document.getElementById('cityName');
const currentDate = document.getElementById('currentDate');
const description = document.getElementById('description');
const backBtn = document.getElementById('backBtn');

// ===== CONSTANTES =====
const TIMEOUT_MS = 10000; // 10 segundos
const MENSAGENS_ERRO = {
    CIDADE_VAZIA: 'Por favor, digite o nome de uma cidade.',
    CIDADE_NAO_ENCONTRADA: 'Cidade não encontrada. Tente novamente.',
    TIMEOUT: 'A requisição demorou muito. Verifique sua conexão.',
    REDE: 'Erro de conexão. Verifique sua internet.',
    SERVIDOR: 'Erro no servidor. Tente novamente mais tarde.',
    GENERICO: 'Erro ao buscar dados. Tente novamente.'
};


// ===== FUNÇÃO: OBTER DATA ATUAL FORMATADA =====
/**
 * Retorna a data atual formatada em português
 * Exemplo: "Sexta-feira, 10 de Outubro de 2025"
 */
function obterDataAtual() {
    const hoje = new Date();
    
    const opcoes = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    
    return hoje.toLocaleDateString('pt-BR', opcoes);
}


// ===== FUNÇÃO: VALIDAR ENTRADA =====
/**
 * Valida se a entrada do usuário é válida
 * @param {string} cidade - Nome da cidade digitado
 * @returns {boolean} - True se válido, false caso contrário
 */
function validarEntrada(cidade) {
    return cidade && cidade.trim().length > 0;
}


// ===== FUNÇÃO: FETCH COM TIMEOUT =====
/**
 * Executa fetch com timeout
 * @param {string} url - URL da requisição
 * @param {number} timeout - Tempo máximo em ms
 * @returns {Promise} - Promise da requisição
 */
async function fetchComTimeout(url, timeout = TIMEOUT_MS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        return response;
    } catch (erro) {
        clearTimeout(timeoutId);
        if (erro.name === 'AbortError') {
            throw new Error('TIMEOUT');
        }
        throw erro;
    }
}


// ===== FUNÇÃO PRINCIPAL: BUSCAR CLIMA COM CACHE =====
/**
 * Função assíncrona que busca e exibe os dados do clima
 * VERSÃO COM CACHE: Usa localStorage automaticamente
 * Passos:
 * 1. Valida o input do usuário
 * 2. Busca as coordenadas da cidade (com cache)
 * 3. Busca os dados do clima (com cache)
 * 4. Exibe as informações na tela
 */
async function buscarClimaComCache() {
    // Pegar o valor digitado e remover espaços extras
    const cidade = cityInput.value.trim();
    
    // VALIDAÇÃO: verificar se o usuário digitou algo
    if (!validarEntrada(cidade)) {
        mostrarErro(MENSAGENS_ERRO.CIDADE_VAZIA);
        return;
    }

    // Limpar estado anterior e mostrar carregamento
    esconderMensagens();
    mostrarCarregamento();

    try {
        // ETAPA 1: Buscar coordenadas da cidade (COM CACHE!)
        const coordenadas = await buscarCoordenadasComCache(cidade);
        
        // Se não encontrou a cidade, mostrar erro
        if (!coordenadas) {
            mostrarErro(MENSAGENS_ERRO.CIDADE_NAO_ENCONTRADA);
            return;
        }

        // ETAPA 2: Buscar dados do clima usando as coordenadas (COM CACHE!)
        const dadosClima = await buscarDadosClimaComCache(coordenadas);

        // ETAPA 3: Exibir os dados na tela de resultado
        exibirClima(coordenadas.nome, coordenadas.pais, dadosClima);

    } catch (erro) {
        // Tratamento específico por tipo de erro
        tratarErro(erro);
    } finally {
        // Sempre esconder loading, independente do resultado
        esconderCarregamento();
    }
}


// ===== FUNÇÃO: TRATAMENTO DE ERROS =====
/**
 * Trata diferentes tipos de erro e exibe mensagem apropriada
 * @param {Error} erro - Objeto de erro capturado
 */
function tratarErro(erro) {
    console.error('Erro:', erro);

    let mensagem = MENSAGENS_ERRO.GENERICO;

    // Identificar tipo de erro
    if (erro.message === 'TIMEOUT') {
        mensagem = MENSAGENS_ERRO.TIMEOUT;
    } else if (erro.message.includes('Failed to fetch') || erro.message.includes('Network')) {
        mensagem = MENSAGENS_ERRO.REDE;
    } else if (erro.message.includes('500') || erro.message.includes('502') || erro.message.includes('503')) {
        mensagem = MENSAGENS_ERRO.SERVIDOR;
    }

    mostrarErro(mensagem);
}


// ===== FUNÇÃO: BUSCAR COORDENADAS DA CIDADE (ORIGINAL - SEM CACHE) =====
/**
 * Usa a API de Geocoding do Open-Meteo para converter
 * o nome da cidade em coordenadas (latitude e longitude)
 * NOTA: Esta é a versão ORIGINAL sem cache
 * Use buscarCoordenadasComCache() do cache.js para ter cache automático
 * 
 * @param {string} cidade - Nome da cidade
 * @returns {Object|null} - Objeto com coordenadas ou null se não encontrado
 */
async function buscarCoordenadas(cidade) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cidade)}&count=1&language=pt&format=json`;
    
    const resposta = await fetchComTimeout(url);
    const dados = await resposta.json();

    // Verificar se encontrou resultados
    if (!dados.results || dados.results.length === 0) {
        return null;
    }

    // Retornar as informações da primeira cidade encontrada
    const resultado = dados.results[0];
    return {
        latitude: resultado.latitude,
        longitude: resultado.longitude,
        nome: resultado.name,
        pais: resultado.country
    };
}


// ===== FUNÇÃO: BUSCAR DADOS DO CLIMA (ORIGINAL - SEM CACHE) =====
/**
 * Usa a API Open-Meteo para buscar os dados climáticos atuais
 * NOTA: Esta é a versão ORIGINAL sem cache
 * Use buscarDadosClimaComCache() do cache.js para ter cache automático
 * 
 * @param {Object} coordenadas - Objeto com latitude e longitude
 * @returns {Object} - Dados do clima atual
 */
async function buscarDadosClima(coordenadas) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coordenadas.latitude}&longitude=${coordenadas.longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`;
    
    const resposta = await fetchComTimeout(url);
    const dados = await resposta.json();

    return dados.current;
}


// ===== FUNÇÃO: BUSCAR CLIMA (ORIGINAL - SEM CACHE) =====
/**
 * Função original sem cache
 * Mantida para referência ou uso alternativo
 * Para usar cache, use buscarClimaComCache() 
 */
async function buscarClima() {
    const cidade = cityInput.value.trim();
    
    if (!validarEntrada(cidade)) {
        mostrarErro(MENSAGENS_ERRO.CIDADE_VAZIA);
        return;
    }

    esconderMensagens();
    mostrarCarregamento();

    try {
        const coordenadas = await buscarCoordenadas(cidade);
        
        if (!coordenadas) {
            mostrarErro(MENSAGENS_ERRO.CIDADE_NAO_ENCONTRADA);
            return;
        }

        const dadosClima = await buscarDadosClima(coordenadas);
        exibirClima(coordenadas.nome, coordenadas.pais, dadosClima);

    } catch (erro) {
        tratarErro(erro);
    } finally {
        esconderCarregamento();
    }
}


// ===== FUNÇÃO: EXIBIR CLIMA NA TELA =====
/**
 * Preenche os dados e alterna para a tela de resultado
 * @param {string} nome - Nome da cidade
 * @param {string} pais - Nome do país
 * @param {Object} dados - Dados climáticos
 */
function exibirClima(nome, pais, dados) {
    // Esconder mensagens de erro/carregamento
    esconderMensagens();

    // Preencher os dados nos elementos HTML
    cityName.textContent = `${nome}, ${pais}`;
    temperature.textContent = `${Math.round(dados.temperature_2m)}°`;
    currentDate.textContent = obterDataAtual();

    // Definir ícone e descrição baseado no código do clima
    const clima = obterDescricaoClima(dados.weather_code);
    
    // Define a classe do Weather Icon
    weatherIcon.className = `weather-icon wi ${clima.icone}`;
    description.textContent = clima.descricao;

    // Alternar para a tela de resultado
    searchScreen.style.display = 'none';
    resultScreen.style.display = 'flex';
}


// ===== FUNÇÃO: OBTER DESCRIÇÃO DO CLIMA =====
/**
 * Converte o código numérico do clima em descrição e ícone
 * @param {number} codigo - Código do clima da API
 * @returns {Object} - Objeto com descrição e classe do ícone
 */
function obterDescricaoClima(codigo) {
    const codigos = {
        0: { descricao: 'Céu limpo', icone: 'wi-day-sunny' },
        1: { descricao: 'Principalmente limpo', icone: 'wi-day-sunny-overcast' },
        2: { descricao: 'Parcialmente nublado', icone: 'wi-day-cloudy' },
        3: { descricao: 'Nublado', icone: 'wi-cloudy' },
        45: { descricao: 'Neblina', icone: 'wi-fog' },
        48: { descricao: 'Nevoeiro', icone: 'wi-fog' },
        51: { descricao: 'Garoa leve', icone: 'wi-sprinkle' },
        53: { descricao: 'Garoa moderada', icone: 'wi-sprinkle' },
        55: { descricao: 'Garoa forte', icone: 'wi-showers' },
        61: { descricao: 'Chuva leve', icone: 'wi-rain' },
        63: { descricao: 'Chuva moderada', icone: 'wi-rain' },
        65: { descricao: 'Chuva forte', icone: 'wi-rain-wind' },
        71: { descricao: 'Neve leve', icone: 'wi-snow' },
        73: { descricao: 'Neve moderada', icone: 'wi-snow' },
        75: { descricao: 'Neve forte', icone: 'wi-snow-wind' },
        80: { descricao: 'Pancadas de chuva', icone: 'wi-showers' },
        81: { descricao: 'Pancadas moderadas', icone: 'wi-showers' },
        82: { descricao: 'Pancadas fortes', icone: 'wi-rain-wind' },
        95: { descricao: 'Tempestade', icone: 'wi-thunderstorm' },
        96: { descricao: 'Tempestade com granizo', icone: 'wi-storm-showers' },
        99: { descricao: 'Tempestade severa', icone: 'wi-hail' }
    };

    return codigos[codigo] || { descricao: 'Clima desconhecido', icone: 'wi-na' };
}


// ===== FUNÇÃO: VOLTAR PARA TELA DE BUSCA =====
/**
 * Retorna para a tela de busca e limpa o campo de input
 */
function voltarParaBusca() {
    cityInput.value = '';
    esconderMensagens();
    
    resultScreen.style.display = 'none';
    searchScreen.style.display = 'flex';
}


// ===== FUNÇÕES AUXILIARES: MOSTRAR/ESCONDER MENSAGENS =====

/**
 * Exibe mensagem de erro
 * @param {string} mensagem - Mensagem a ser exibida
 */
function mostrarErro(mensagem) {
    esconderMensagens();
    error.textContent = mensagem;
    error.style.display = 'block';
}

/**
 * Exibe indicador de carregamento
 */
function mostrarCarregamento() {
    loading.style.display = 'block';
}

/**
 * Esconde apenas o carregamento
 */
function esconderCarregamento() {
    loading.style.display = 'none';
}

/**
 * Esconde todas as mensagens
 */
function esconderMensagens() {
    loading.style.display = 'none';
    error.style.display = 'none';
}


// ===== EVENTOS =====

// Verificar horário e aplicar tema
function aplicarTemaHorario() {
    const horaAtual = new Date().getHours();
    const body = document.body;
    
    // Noite: entre 18h e 6h
    if (horaAtual >= 18 || horaAtual < 6) {
        body.classList.add('night-mode');
    } else {
        body.classList.remove('night-mode');
    }
}

// Aplicar tema ao carregar a página
aplicarTemaHorario();

// ===== CONFIGURAÇÃO DOS EVENT LISTENERS =====
// IMPORTANTE: Use buscarClimaComCache para ativar o sistema de cache!

// Buscar clima ao clicar no botão (COM CACHE)
searchBtn.addEventListener('click', buscarClimaComCache);

// Buscar clima ao pressionar Enter no input (COM CACHE)
cityInput.addEventListener('keypress', (evento) => {
    if (evento.key === 'Enter') {
        buscarClimaComCache();
    }
});

// Voltar para tela de busca
backBtn.addEventListener('click', voltarParaBusca);
