/**
 * @fileoverview Sistema de Previsão do Tempo
 * @description Aplicação web para consulta de dados meteorológicos em tempo real.
 * Utiliza as APIs Open-Meteo (Geocoding e Weather) para buscar informações climáticas
 * de cidades ao redor do mundo.
 * 
 * @author Rafael Queiróz
 * @version 1.0.0
 * @license MIT
 */

// ===== SELEÇÃO DE ELEMENTOS DO DOM =====
/**
 * Elementos HTML manipulados pela aplicação
 * @type {HTMLElement}
 */
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const searchScreen = document.getElementById('searchScreen');
const resultScreen = document.getElementById('resultScreen');
const weatherIcon = document.getElementById('weatherIcon');
const temperature = document.getElementById('temperature');
const cityName = document.getElementById('cityName');
const currentDate = document.getElementById('currentDate');
const description = document.getElementById('description');
const backBtn = document.getElementById('backBtn');

// ===== CONSTANTES =====
/**
 * Tempo máximo de espera por resposta da API (em milissegundos)
 * @constant {number}
 * @default 10000
 */
const TIMEOUT_MS = 10000;

/**
 * Mensagens de erro padronizadas para diferentes cenários
 * @constant {Object.<string, string>}
 * @property {string} CIDADE_VAZIA - Mensagem quando input está vazio
 * @property {string} CIDADE_NAO_ENCONTRADA - Mensagem quando cidade não existe
 * @property {string} TIMEOUT - Mensagem quando requisição excede tempo limite
 * @property {string} REDE - Mensagem para erros de conexão
 * @property {string} SERVIDOR - Mensagem para erros 5xx
 * @property {string} GENERICO - Mensagem padrão para erros não identificados
 */
const MENSAGENS_ERRO = {
    CIDADE_VAZIA: 'Por favor, digite o nome de uma cidade.',
    CIDADE_NAO_ENCONTRADA: 'Cidade não encontrada. Tente novamente.',
    TIMEOUT: 'A requisição demorou muito. Verifique sua conexão.',
    REDE: 'Erro de conexão. Verifique sua internet.',
    SERVIDOR: 'Erro no servidor. Tente novamente mais tarde.',
    GENERICO: 'Erro ao buscar dados. Tente novamente.'
};

// ===== FUNÇÕES UTILITÁRIAS =====

/**
 * Obtém a data atual formatada em português
 * 
 * @returns {string} Data formatada (ex: "segunda-feira, 13 de outubro de 2025")
 * 
 * @example
 * const data = obterDataAtual();
 * console.log(data); // "segunda-feira, 13 de outubro de 2025"
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

/**
 * Valida se a entrada do usuário é válida
 * 
 * @param {string} cidade - Nome da cidade digitado pelo usuário
 * @returns {boolean} True se válido (não vazio após trim), false caso contrário
 * 
 * @example
 * validarEntrada('São Paulo');  // true
 * validarEntrada('   ');        // false
 * validarEntrada('');           // false
 */
function validarEntrada(cidade) {
    return cidade && cidade.trim().length > 0;
}

/**
 * Realiza requisição HTTP com timeout configurável
 * Utiliza AbortController para cancelar requisições que excedem o tempo limite
 * 
 * @param {string} url - URL da requisição
 * @param {number} [timeout=TIMEOUT_MS] - Tempo máximo em milissegundos
 * @returns {Promise<Response>} Promise que resolve com a resposta HTTP
 * @throws {Error} Lança erro 'TIMEOUT' se exceder tempo limite
 * @throws {Error} Propaga outros erros de rede
 * 
 * @example
 * try {
 *   const response = await fetchComTimeout('https://api.example.com', 5000);
 *   const data = await response.json();
 * } catch (erro) {
 *   if (erro.message === 'TIMEOUT') {
 *     console.log('Requisição expirou');
 *   }
 * }
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

// ===== FUNÇÕES DE API =====

/**
 * Busca coordenadas geográficas de uma cidade usando API de Geocoding
 * 
 * @async
 * @param {string} cidade - Nome da cidade a ser pesquisada
 * @returns {Promise<Object|null>} Objeto com coordenadas ou null se não encontrado
 * @returns {number} returns.latitude - Latitude da cidade
 * @returns {number} returns.longitude - Longitude da cidade
 * @returns {string} returns.nome - Nome oficial da cidade
 * @returns {string} returns.pais - País da cidade
 * @throws {Error} Lança erro se falhar na requisição HTTP
 * @throws {Error} Lança erro 'TIMEOUT' se exceder tempo limite
 * 
 * @example
 * const coords = await buscarCoordenadas('São Paulo');
 * // { latitude: -23.5505, longitude: -46.6333, nome: 'São Paulo', pais: 'Brasil' }
 * 
 * const naoEncontrada = await buscarCoordenadas('CidadeInexistente123');
 * // null
 */
async function buscarCoordenadas(cidade) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cidade)}&count=1&language=pt&format=json`;
    const resposta = await fetchComTimeout(url);
    const dados = await resposta.json();

    if (!dados.results || dados.results.length === 0) {
        return null;
    }

    const resultado = dados.results[0];
    return {
        latitude: resultado.latitude,
        longitude: resultado.longitude,
        nome: resultado.name,
        pais: resultado.country
    };
}

/**
 * Busca dados meteorológicos atuais usando coordenadas geográficas
 * 
 * @async
 * @param {Object} coordenadas - Objeto contendo latitude e longitude
 * @param {number} coordenadas.latitude - Latitude da localização
 * @param {number} coordenadas.longitude - Longitude da localização
 * @returns {Promise<Object>} Dados climáticos atuais
 * @returns {number} returns.temperature_2m - Temperatura em graus Celsius
 * @returns {number} returns.relative_humidity_2m - Umidade relativa em %
 * @returns {number} returns.wind_speed_10m - Velocidade do vento em km/h
 * @returns {number} returns.weather_code - Código do clima (0-99)
 * @throws {Error} Lança erro se falhar na requisição HTTP
 * @throws {Error} Lança erro 'TIMEOUT' se exceder tempo limite
 * 
 * @example
 * const coords = { latitude: -23.5505, longitude: -46.6333 };
 * const clima = await buscarDadosClima(coords);
 * // { 
 * //   temperature_2m: 25.5,
 * //   relative_humidity_2m: 65,
 * //   wind_speed_10m: 10.5,
 * //   weather_code: 0
 * // }
 */
async function buscarDadosClima(coordenadas) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coordenadas.latitude}&longitude=${coordenadas.longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`;
    const resposta = await fetchComTimeout(url);
    const dados = await resposta.json();
    return dados.current;
}

// ===== FUNÇÃO PRINCIPAL =====

/**
 * Função principal que orquestra o fluxo de busca de clima
 * Valida entrada, busca coordenadas, obtém dados climáticos e atualiza interface
 * 
 * @async
 * @returns {Promise<void>}
 * @throws {Error} Erros são tratados internamente e exibidos ao usuário
 * 
 * @fires mostrarErro - Dispara quando há erro de validação ou API
 * @fires mostrarCarregamento - Dispara ao iniciar busca
 * @fires esconderCarregamento - Dispara ao finalizar busca
 * @fires exibirClima - Dispara quando dados são obtidos com sucesso
 * 
 * @example
 * // Chamado automaticamente ao clicar no botão de busca
 * // ou pressionar Enter no campo de input
 * await buscarClima();
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

/**
 * Trata diferentes tipos de erro e exibe mensagem apropriada
 * Identifica erros de timeout, rede e servidor para feedback específico
 * 
 * @param {Error} erro - Objeto de erro capturado
 * @returns {void}
 * 
 * @example
 * try {
 *   await fetch('https://api.example.com');
 * } catch (erro) {
 *   tratarErro(erro);
 *   // Exibe mensagem adequada ao tipo de erro
 * }
 */
function tratarErro(erro) {
    console.error('Erro:', erro);
    let mensagem = MENSAGENS_ERRO.GENERICO;

    if (erro.message === 'TIMEOUT') {
        mensagem = MENSAGENS_ERRO.TIMEOUT;
    } else if (erro.message.includes('Failed to fetch') || erro.message.includes('Network')) {
        mensagem = MENSAGENS_ERRO.REDE;
    } else if (erro.message.includes('500') || erro.message.includes('502') || erro.message.includes('503')) {
        mensagem = MENSAGENS_ERRO.SERVIDOR;
    }

    mostrarErro(mensagem);
}

// ===== FUNÇÕES DE INTERFACE =====

/**
 * Atualiza a interface com os dados meteorológicos obtidos
 * Preenche elementos HTML e alterna da tela de busca para tela de resultado
 * 
 * @param {string} nome - Nome da cidade
 * @param {string} pais - Nome do país
 * @param {Object} dados - Dados climáticos da API
 * @param {number} dados.temperature_2m - Temperatura em Celsius
 * @param {number} dados.weather_code - Código do clima
 * @returns {void}
 * 
 * @example
 * const dados = { temperature_2m: 25.5, weather_code: 0 };
 * exibirClima('São Paulo', 'Brasil', dados);
 * // Atualiza tela com: "São Paulo, Brasil", "26°", ícone de sol
 */
function exibirClima(nome, pais, dados) {
    esconderMensagens();
    
    cityName.textContent = `${nome}, ${pais}`;
    temperature.textContent = `${Math.round(dados.temperature_2m)}°`;
    currentDate.textContent = obterDataAtual();

    const clima = obterDescricaoClima(dados.weather_code);
    weatherIcon.className = `weather-icon wi ${clima.icone}`;
    description.textContent = clima.descricao;

    searchScreen.style.display = 'none';
    resultScreen.style.display = 'flex';
}

/**
 * Converte código numérico do clima em descrição e ícone visual
 * Mapeia códigos WMO (World Meteorological Organization) para interface
 * 
 * @param {number} codigo - Código do clima (0-99)
 * @returns {Object} Objeto com descrição e classe do ícone
 * @returns {string} returns.descricao - Descrição em português do clima
 * @returns {string} returns.icone - Classe CSS do Weather Icons
 * 
 * @see {@link https://open-meteo.com/en/docs|Open-Meteo Weather Codes}
 * 
 * @example
 * obterDescricaoClima(0);
 * // { descricao: 'Céu limpo', icone: 'wi-day-sunny' }
 * 
 * obterDescricaoClima(61);
 * // { descricao: 'Chuva leve', icone: 'wi-rain' }
 * 
 * obterDescricaoClima(999);
 * // { descricao: 'Clima desconhecido', icone: 'wi-na' }
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

/**
 * Retorna para a tela de busca e limpa o estado da aplicação
 * Reseta campo de input, mensagens e alterna visualização de telas
 * 
 * @returns {void}
 * 
 * @example
 * voltarParaBusca();
 * // Limpa input, esconde mensagens, volta para tela de busca
 */
function voltarParaBusca() {
    cityInput.value = '';
    esconderMensagens();
    resultScreen.style.display = 'none';
    searchScreen.style.display = 'flex';
}

/**
 * Exibe mensagem de erro na interface
 * 
 * @param {string} mensagem - Texto da mensagem a ser exibida
 * @returns {void}
 * 
 * @example
 * mostrarErro('Cidade não encontrada');
 */
function mostrarErro(mensagem) {
    esconderMensagens();
    error.textContent = mensagem;
    error.style.display = 'block';
}

/**
 * Exibe indicador de carregamento
 * 
 * @returns {void}
 */
function mostrarCarregamento() {
    loading.style.display = 'block';
}

/**
 * Oculta indicador de carregamento
 * 
 * @returns {void}
 */
function esconderCarregamento() {
    loading.style.display = 'none';
}

/**
 * Oculta todas as mensagens (erro e carregamento)
 * 
 * @returns {void}
 */
function esconderMensagens() {
    loading.style.display = 'none';
    error.style.display = 'none';
}

// ===== TEMA DINÂMICO =====

/**
 * Aplica tema visual baseado no horário local
 * Modo noturno: 18h-6h | Modo diurno: 6h-18h
 * 
 * @returns {void}
 * 
 * @example
 * aplicarTemaHorario();
 * // Se for 20h: adiciona classe 'night-mode' ao body
 * // Se for 14h: remove classe 'night-mode' do body
 */
function aplicarTemaHorario() {
    const horaAtual = new Date().getHours();
    const body = document.body;
    
    if (horaAtual >= 18 || horaAtual < 6) {
        body.classList.add('night-mode');
    } else {
        body.classList.remove('night-mode');
    }
}

// ===== INICIALIZAÇÃO E EVENTOS =====

// Aplicar tema ao carregar a página
aplicarTemaHorario();

/**
 * Event Listener: Busca clima ao clicar no botão
 * @event click
 */
searchBtn.addEventListener('click', buscarClima);

/**
 * Event Listener: Busca clima ao pressionar Enter no input
 * @event keypress
 */
cityInput.addEventListener('keypress', (evento) => {
    if (evento.key === 'Enter') {
        buscarClima();
    }
});

/**
 * Event Listener: Retorna à tela de busca ao clicar no botão voltar
 * @event click
 */
backBtn.addEventListener('click', voltarParaBusca);