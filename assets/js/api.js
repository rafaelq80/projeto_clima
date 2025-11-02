/**
 * @fileoverview Sistema de Previsão do Tempo - Versão com Segurança Aprimorada
 * @description Aplicação web para consulta de dados meteorológicos em tempo real.
 * Utiliza as APIs Open-Meteo (Geocoding e Weather) para buscar informações climáticas
 * de cidades ao redor do mundo.
 * 
 * @author Rafael Queiroz
 * @version 2.1.0 - Segurança Aprimorada
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
const forecastGrid = document.getElementById('forecastGrid');

// ===== CONSTANTES =====
/**
 * Tempo máximo de espera por resposta da API (em milissegundos)
 * @constant {number}
 * @default 10000
 */
const TIMEOUT_MS = 10000;

/**
 * Intervalo mínimo entre buscas consecutivas (throttling)
 * @constant {number}
 * @default 2000
 */
const INTERVALO_MINIMO_MS = 2000;

/**
 * Tamanho máximo permitido para nome de cidade
 * @constant {number}
 * @default 100
 */
const MAX_TAMANHO_CIDADE = 100;

/**
 * Mensagens de erro padronizadas para diferentes cenários
 * @constant {Object.<string, string>}
 */
const MENSAGENS_ERRO = {
    CIDADE_VAZIA: 'Por favor, digite o nome de uma cidade.',
    CIDADE_INVALIDA: 'Nome de cidade inválido. Use apenas letras, números e hífens.',
    CIDADE_NAO_ENCONTRADA: 'Cidade não encontrada. Tente novamente.',
    TIMEOUT: 'A requisição demorou muito. Verifique sua conexão.',
    REDE: 'Erro de conexão. Verifique sua internet.',
    SERVIDOR: 'Erro no servidor. Tente novamente mais tarde.',
    AGUARDAR: 'Aguarde alguns segundos antes de buscar novamente.',
    GENERICO: 'Erro ao buscar dados. Tente novamente.',
    DADOS_INVALIDOS: 'Dados recebidos são inválidos. Tente outra cidade.'
};

// ===== VARIÁVEIS DE CONTROLE DE THROTTLING =====
/**
 * Flag para prevenir múltiplas requisições simultâneas
 * @type {boolean}
 */
let buscaEmAndamento = false;

/**
 * Timestamp da última busca realizada
 * @type {number}
 */
let ultimaBusca = 0;

/**
 * Timeout para debouncing do input
 * @type {number}
 */
let timeoutInput;

// ===== DETECÇÃO DE AMBIENTE =====
/**
 * Verifica se está em modo de produção
 * @constant {boolean}
 */
const MODO_PRODUCAO = window.location.hostname !== 'localhost' && 
                      window.location.hostname !== '127.0.0.1';

// ===== FUNÇÕES DE SEGURANÇA =====

/**
 * Sanitiza texto removendo caracteres potencialmente perigosos
 * Protege contra XSS e injection attacks
 * 
 * @param {string} texto - Texto a ser sanitizado
 * @returns {string} Texto limpo e seguro
 * 
 * @example
 * sanitizarTexto('<script>alert("xss")</script>');
 * // 'scriptalert(xss)/script'
 */
function sanitizarTexto(texto) {
    if (!texto || typeof texto !== 'string') return '';
    
    return texto
        .replace(/[<>"'`]/g, '') // Remove caracteres perigosos HTML/JS
        .replace(/[{}()[\]\\;]/g, '') // Remove caracteres de código
        .trim()
        .slice(0, MAX_TAMANHO_CIDADE); // Limita tamanho
}

/**
 * Valida se a entrada do usuário é segura e válida
 * Implementa validação robusta contra injection attacks
 * 
 * @param {string} cidade - Nome da cidade digitado pelo usuário
 * @returns {boolean} True se válido, false caso contrário
 * 
 * @example
 * validarEntrada('São Paulo');  // true
 * validarEntrada('<script>');   // false
 * validarEntrada('A'.repeat(200)); // false
 */
function validarEntrada(cidade) {
    // Validação de tipo e existência
    if (!cidade || typeof cidade !== 'string') {
        return false;
    }
    
    const cidadeTrim = cidade.trim();
    
    // Validação de tamanho
    if (cidadeTrim.length === 0) {
        return false;
    }
    
    if (cidadeTrim.length > MAX_TAMANHO_CIDADE) {
        return false;
    }
    
    // Bloquear caracteres perigosos (XSS, SQL Injection, etc)
    const caracteresProibidos = /[<>"'`{}()[\]\\;]/;
    if (caracteresProibidos.test(cidadeTrim)) {
        return false;
    }
    
    // Aceitar apenas letras (incluindo acentuadas), números, espaços e alguns caracteres válidos
    // Suporta: São Paulo, Saint-Étienne, New York, etc.
    const padraoValido = /^[a-zA-ZÀ-ÿ0-9\s\-.,]+$/;
    if (!padraoValido.test(cidadeTrim)) {
        return false;
    }
    
    return true;
}

/**
 * Valida se as coordenadas estão dentro de ranges geográficos válidos
 * 
 * @param {number} latitude - Latitude (-90 a 90)
 * @param {number} longitude - Longitude (-180 a 180)
 * @returns {boolean} True se válido
 * 
 * @example
 * validarCoordenadas(-23.5505, -46.6333); // true
 * validarCoordenadas(91, 0); // false
 */
function validarCoordenadas(latitude, longitude) {
    return typeof latitude === 'number' &&
           typeof longitude === 'number' &&
           latitude >= -90 && latitude <= 90 &&
           longitude >= -180 && longitude <= 180 &&
           !isNaN(latitude) && !isNaN(longitude);
}

/**
 * Valida estrutura e tipos de dados da resposta da API de geocoding
 * 
 * @param {Object} resultado - Objeto de resultado da API
 * @returns {boolean} True se válido
 */
function validarDadosGeocodificacao(resultado) {
    if (!resultado || typeof resultado !== 'object') {
        return false;
    }
    
    // Validar existência e tipo de campos obrigatórios
    if (typeof resultado.latitude !== 'number' || 
        typeof resultado.longitude !== 'number' ||
        typeof resultado.name !== 'string') {
        return false;
    }
    
    // Validar coordenadas
    if (!validarCoordenadas(resultado.latitude, resultado.longitude)) {
        return false;
    }
    
    return true;
}

/**
 * Valida estrutura e tipos de dados da resposta da API de clima
 * 
 * @param {Object} dados - Objeto de dados climáticos
 * @returns {boolean} True se válido
 */
function validarDadosClima(dados) {
    if (!dados || typeof dados !== 'object') {
        return false;
    }
    
    // Validar estrutura current
    if (!dados.current || typeof dados.current !== 'object') {
        return false;
    }
    
    if (typeof dados.current.temperature_2m !== 'number' ||
        typeof dados.current.weather_code !== 'number') {
        return false;
    }
    
    // Validar estrutura daily
    if (!dados.daily || typeof dados.daily !== 'object') {
        return false;
    }
    
    if (!Array.isArray(dados.daily.time) ||
        !Array.isArray(dados.daily.temperature_2m_max) ||
        !Array.isArray(dados.daily.temperature_2m_min) ||
        !Array.isArray(dados.daily.weather_code)) {
        return false;
    }
    
    // Validar que todos os arrays têm o mesmo tamanho
    const tamanho = dados.daily.time.length;
    if (dados.daily.temperature_2m_max.length !== tamanho ||
        dados.daily.temperature_2m_min.length !== tamanho ||
        dados.daily.weather_code.length !== tamanho) {
        return false;
    }
    
    return true;
}

// ===== FUNÇÕES UTILITÁRIAS =====

/**
 * Obtém a data atual formatada em português
 * 
 * @returns {string} Data formatada (ex: "segunda-feira, 13 de outubro de 2025")
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
 * Formata uma data string para exibição do dia da semana
 * 
 * @param {string} dataString - Data no formato ISO (YYYY-MM-DD)
 * @returns {Object} Objeto com dia da semana e data formatada
 */
function formatarDiaSemana(dataString) {
    const data = new Date(dataString + 'T12:00:00');
    
    const opcoesDiaSemana = { weekday: 'long' };
    const diaSemana = data.toLocaleDateString('pt-BR', opcoesDiaSemana);
    
    const opcoesDiaEMes = { day: 'numeric', month: 'long' };
    const diaEMes = data.toLocaleDateString('pt-BR', opcoesDiaEMes);
    
    return {
        diaSemana: diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1),
        diaEMes: diaEMes.charAt(0).toUpperCase() + diaEMes.slice(1)
    };
}

/**
 * Realiza requisição HTTP com timeout configurável
 * Utiliza AbortController para cancelar requisições que excedem o tempo limite
 * 
 * @param {string} url - URL da requisição
 * @param {number} [timeout=TIMEOUT_MS] - Tempo máximo em milissegundos
 * @returns {Promise<Response>} Promise que resolve com a resposta HTTP
 * @throws {Error} Lança erro 'TIMEOUT' se exceder tempo limite
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

/**
 * Loga erro de forma apropriada baseado no ambiente
 * 
 * @param {string} contexto - Contexto do erro
 * @param {Error} erro - Objeto de erro
 */
function logarErro(contexto, erro) {
    if (!MODO_PRODUCAO) {
        // Modo desenvolvimento: log detalhado
        console.error(`[${contexto}] Erro detalhado:`, erro);
        console.trace();
    } else {
        // Modo produção: log simplificado
        console.error(`[${contexto}] Erro na aplicação`);
        // Aqui você poderia enviar para serviço de monitoramento
        // exemplo: Sentry.captureException(erro);
    }
}

// ===== FUNÇÕES DE API =====

/**
 * Busca coordenadas geográficas de uma cidade usando API de Geocoding
 * Implementa validação rigorosa de dados recebidos
 * 
 * @async
 * @param {string} cidade - Nome da cidade a ser pesquisada
 * @returns {Promise<Object|null>} Objeto com coordenadas ou null se não encontrado
 * @throws {Error} Lança erro se falhar na requisição HTTP ou dados inválidos
 */
async function buscarCoordenadas(cidade) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cidade)}&count=1&language=pt&format=json`;
    
    const resposta = await fetchComTimeout(url);
    
    // Validar status HTTP
    if (!resposta.ok) {
        throw new Error(`HTTP ${resposta.status}`);
    }
    
    const dados = await resposta.json();

    // Validação de segurança: verificar estrutura da resposta
    if (!dados || typeof dados !== 'object') {
        throw new Error('Resposta inválida da API de geocodificação');
    }

    // Cidade não encontrada
    if (!Array.isArray(dados.results) || dados.results.length === 0) {
        return null;
    }

    const resultado = dados.results[0];
    
    // Validar dados recebidos
    if (!validarDadosGeocodificacao(resultado)) {
        logarErro('buscarCoordenadas', new Error('Dados de geocodificação corrompidos'));
        throw new Error(MENSAGENS_ERRO.DADOS_INVALIDOS);
    }

    return {
        latitude: resultado.latitude,
        longitude: resultado.longitude,
        nome: sanitizarTexto(resultado.name),
        pais: sanitizarTexto(resultado.country || 'Desconhecido')
    };
}

/**
 * Busca dados meteorológicos atuais e previsão de 5 dias
 * Implementa validação rigorosa de dados recebidos
 * 
 * @async
 * @param {Object} coordenadas - Objeto contendo latitude e longitude
 * @returns {Promise<Object>} Dados climáticos atuais e previsão diária
 * @throws {Error} Lança erro se falhar na requisição HTTP ou dados inválidos
 */
async function buscarDadosClima(coordenadas) {
    // Validar coordenadas antes de fazer requisição
    if (!validarCoordenadas(coordenadas.latitude, coordenadas.longitude)) {
        throw new Error('Coordenadas inválidas fornecidas');
    }
    
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coordenadas.latitude}&longitude=${coordenadas.longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5`;
    
    const resposta = await fetchComTimeout(url);
    
    // Validar status HTTP
    if (!resposta.ok) {
        throw new Error(`HTTP ${resposta.status}`);
    }
    
    const dados = await resposta.json();
    
    // Validar estrutura dos dados recebidos
    if (!validarDadosClima(dados)) {
        logarErro('buscarDadosClima', new Error('Estrutura de dados climáticos inválida'));
        throw new Error(MENSAGENS_ERRO.DADOS_INVALIDOS);
    }
    
    return {
        current: dados.current,
        daily: dados.daily
    };
}

// ===== FUNÇÃO PRINCIPAL =====

/**
 * Função principal que orquestra o fluxo de busca de clima
 * Implementa throttling para prevenir spam de requisições
 * Valida entrada, busca coordenadas, obtém dados climáticos e atualiza interface
 * 
 * @async
 * @returns {Promise<void>}
 */
async function buscarClima() {
    // SEGURANÇA: Prevenir múltiplas requisições simultâneas
    if (buscaEmAndamento) {
        logarErro('buscarClima', new Error('Tentativa de busca múltipla bloqueada'));
        return;
    }
    
    // SEGURANÇA: Throttling - verificar intervalo mínimo entre buscas
    const agora = Date.now();
    if (agora - ultimaBusca < INTERVALO_MINIMO_MS) {
        mostrarErro(MENSAGENS_ERRO.AGUARDAR);
        return;
    }
    
    const cidade = cityInput.value.trim();

    // SEGURANÇA: Validação robusta de entrada
    if (!validarEntrada(cidade)) {
        if (cidade.length > 0) {
            mostrarErro(MENSAGENS_ERRO.CIDADE_INVALIDA);
        } else {
            mostrarErro(MENSAGENS_ERRO.CIDADE_VAZIA);
        }
        return;
    }

    // Atualizar controles de throttling
    buscaEmAndamento = true;
    ultimaBusca = agora;
    
    esconderMensagens();
    mostrarCarregamento();
    
    // Desabilitar botão e input durante busca
    searchBtn.disabled = true;
    searchBtn.textContent = 'Buscando...';
    cityInput.disabled = true;

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
        buscaEmAndamento = false;
        
        // Reabilitar botão e input
        searchBtn.disabled = false;
        searchBtn.textContent = 'Buscar';
        cityInput.disabled = false;
    }
}

/**
 * Trata diferentes tipos de erro e exibe mensagem apropriada
 * 
 * @param {Error} erro - Objeto de erro capturado
 */
function tratarErro(erro) {
    logarErro('tratarErro', erro);
    
    let mensagem = MENSAGENS_ERRO.GENERICO;

    if (erro.message === 'TIMEOUT') {
        mensagem = MENSAGENS_ERRO.TIMEOUT;
    } else if (erro.message.includes('Failed to fetch') || erro.message.includes('Network')) {
        mensagem = MENSAGENS_ERRO.REDE;
    } else if (erro.message.includes('500') || erro.message.includes('502') || erro.message.includes('503')) {
        mensagem = MENSAGENS_ERRO.SERVIDOR;
    } else if (erro.message === MENSAGENS_ERRO.DADOS_INVALIDOS) {
        mensagem = MENSAGENS_ERRO.DADOS_INVALIDOS;
    }

    mostrarErro(mensagem);
}

// ===== FUNÇÕES DE INTERFACE =====

/**
 * Atualiza a interface com os dados meteorológicos obtidos
 * 
 * @param {string} nome - Nome da cidade
 * @param {string} pais - Nome do país
 * @param {Object} dados - Dados climáticos da API
 */
function exibirClima(nome, pais, dados) {
    esconderMensagens();
    
    // Usar dados já sanitizados
    cityName.textContent = `${nome}, ${pais}`;
    
    // Exibir temperatura atual (máxima) e mínima do dia
    const tempAtual = Math.round(dados.current.temperature_2m);
    const tempMinHoje = Math.round(dados.daily.temperature_2m_min[0]);
    temperature.innerHTML = `${tempAtual}° <span class="temp-min-current">/ ${tempMinHoje}°</span>`;
    
    currentDate.textContent = obterDataAtual();

    const clima = obterDescricaoClima(dados.current.weather_code);
    weatherIcon.className = `weather-icon wi ${clima.icone}`;
    description.textContent = clima.descricao;

    // Exibir previsão dos próximos 4 dias
    exibirPrevisao5Dias(dados.daily);

    searchScreen.style.display = 'none';
    resultScreen.style.display = 'flex';
}

/**
 * Exibe a previsão dos próximos 4 dias na interface
 * 
 * @param {Object} dadosDiarios - Dados de previsão diária da API
 */
function exibirPrevisao5Dias(dadosDiarios) {
    forecastGrid.innerHTML = '';

    // Criar cards para os próximos 4 dias (índices 1 a 4, pois 0 é hoje)
    for (let i = 1; i < 5; i++) {
        const dia = dadosDiarios.time[i];
        const tempMax = Math.round(dadosDiarios.temperature_2m_max[i]);
        const tempMin = Math.round(dadosDiarios.temperature_2m_min[i]);
        const codigoClima = dadosDiarios.weather_code[i];
        
        const clima = obterDescricaoClima(codigoClima);
        const dataFormatada = formatarDiaSemana(dia);

        const card = document.createElement('div');
        card.className = 'forecast-card';
        card.innerHTML = `
            <div class="forecast-date">
                <div class="date-weekday">${dataFormatada.diaSemana}</div>
                <div class="date-day">${dataFormatada.diaEMes}</div>
            </div>
            <div class="forecast-weather">
                <i class="wi ${clima.icone} forecast-icon"></i>
                <div class="forecast-description">${clima.descricao}</div>
            </div>
            <div class="forecast-temps">
                <div class="temp-item">
                    <span class="temp-arrow temp-arrow-up">▲</span>
                    <span class="temp-max">${tempMax}°</span>
                </div>
                <div class="temp-item">
                    <span class="temp-arrow temp-arrow-down">▼</span>
                    <span class="temp-min">${tempMin}°</span>
                </div>
            </div>
        `;

        forecastGrid.appendChild(card);
    }
}

/**
 * Converte código numérico do clima em descrição e ícone visual
 * 
 * @param {number} codigo - Código do clima (0-99)
 * @returns {Object} Objeto com descrição e classe do ícone
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
 */
function voltarParaBusca() {
    cityInput.value = '';
    esconderMensagens();
    resultScreen.style.display = 'none';
    searchScreen.style.display = 'flex';
    
    // Resetar controles de throttling ao voltar
    buscaEmAndamento = false;
}

/**
 * Exibe mensagem de erro na interface
 * 
 * @param {string} mensagem - Texto da mensagem a ser exibida
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
 * Oculta indicador de carregamento
 */
function esconderCarregamento() {
    loading.style.display = 'none';
}

/**
 * Oculta todas as mensagens (erro e carregamento)
 */
function esconderMensagens() {
    loading.style.display = 'none';
    error.style.display = 'none';
}

// ===== TEMA DINÂMICO =====

/**
 * Aplica tema visual baseado no horário local
 * Modo noturno: 18h-6h | Modo diurno: 6h-18h
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
 */
searchBtn.addEventListener('click', buscarClima);

/**
 * Event Listener: Busca clima ao pressionar Enter no input
 */
cityInput.addEventListener('keypress', (evento) => {
    if (evento.key === 'Enter') {
        buscarClima();
    }
});

/**
 * Event Listener: Validação em tempo real durante digitação (debouncing)
 * Fornece feedback imediato sobre entrada inválida
 */
cityInput.addEventListener('input', () => {
    clearTimeout(timeoutInput);
    
    timeoutInput = setTimeout(() => {
        const cidade = cityInput.value.trim();
        
        // Validar apenas se houver conteúdo suficiente
        if (cidade.length > 2) {
            if (!validarEntrada(cidade)) {
                error.textContent = MENSAGENS_ERRO.CIDADE_INVALIDA;
                error.style.display = 'block';
            } else {
                error.style.display = 'none';
            }
        } else {
            error.style.display = 'none';
        }
    }, 500); // Aguarda 500ms após parar de digitar
});

/**
 * Event Listener: Retorna à tela de busca ao clicar no botão voltar
 */
backBtn.addEventListener('click', voltarParaBusca);