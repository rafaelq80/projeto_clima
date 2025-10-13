// ===== SELEÇÃO DE ELEMENTOS DO DOM =====
// Captura dos elementos HTML que serão manipulados pelo JavaScript
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const loading = document.getElementById('loading');
const error = document.getElementById('error');

// Telas principais da aplicação (busca e resultado)
const searchScreen = document.getElementById('searchScreen');
const resultScreen = document.getElementById('resultScreen');

// Elementos exibidos na tela de resultado
const weatherIcon = document.getElementById('weatherIcon');
const temperature = document.getElementById('temperature');
const cityName = document.getElementById('cityName');
const currentDate = document.getElementById('currentDate');
const description = document.getElementById('description');
const backBtn = document.getElementById('backBtn');

// ===== CONSTANTES =====
// Tempo máximo de espera por uma resposta da API (em milissegundos)
const TIMEOUT_MS = 10000; // 10 segundos

// Mensagens de erro padronizadas para diferentes situações
const MENSAGENS_ERRO = {
    CIDADE_VAZIA: 'Por favor, digite o nome de uma cidade.',
    CIDADE_NAO_ENCONTRADA: 'Cidade não encontrada. Tente novamente.',
    TIMEOUT: 'A requisição demorou muito. Verifique sua conexão.',
    REDE: 'Erro de conexão. Verifique sua internet.',
    SERVIDOR: 'Erro no servidor. Tente novamente mais tarde.',
    GENERICO: 'Erro ao buscar dados. Tente novamente.'
};

// ===== FUNÇÃO: OBTER DATA ATUAL FORMATADA =====
// Retorna a data atual em formato extenso (ex: “segunda-feira, 13 de outubro de 2025”)
function obterDataAtual() {
    const hoje = new Date();
    const opcoes = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return hoje.toLocaleDateString('pt-BR', opcoes);
}

// ===== FUNÇÃO: VALIDAR ENTRADA =====
// Verifica se o nome da cidade foi preenchido corretamente
function validarEntrada(cidade) {
    return cidade && cidade.trim().length > 0;
}

// ===== FUNÇÃO: FETCH COM TIMEOUT =====
// Realiza uma requisição HTTP com um tempo limite configurável
async function fetchComTimeout(url, timeout = TIMEOUT_MS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        return response;
    } catch (erro) {
        clearTimeout(timeoutId);
        // Se o tempo limite for atingido, lança um erro específico
        if (erro.name === 'AbortError') throw new Error('TIMEOUT');
        throw erro;
    }
}

// ===== FUNÇÃO: BUSCAR COORDENADAS =====
// Consulta a API de geocodificação para obter latitude e longitude da cidade informada
async function buscarCoordenadas(cidade) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cidade)}&count=1&language=pt&format=json`;
    const resposta = await fetchComTimeout(url);
    const dados = await resposta.json();

    // Caso não haja resultados, retorna null
    if (!dados.results || dados.results.length === 0) return null;

    const resultado = dados.results[0];
    return {
        latitude: resultado.latitude,
        longitude: resultado.longitude,
        nome: resultado.name,
        pais: resultado.country
    };
}

// ===== FUNÇÃO: BUSCAR DADOS DO CLIMA =====
// Utiliza as coordenadas obtidas para consultar a previsão atual na API Open-Meteo
async function buscarDadosClima(coordenadas) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coordenadas.latitude}&longitude=${coordenadas.longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`;
    const resposta = await fetchComTimeout(url);
    const dados = await resposta.json();
    return dados.current;
}

// ===== FUNÇÃO: BUSCAR CLIMA =====
// Fluxo principal: valida a entrada, busca coordenadas e clima, e atualiza a interface
async function buscarClima() {
    const cidade = cityInput.value.trim();

    // Validação: campo vazio
    if (!validarEntrada(cidade)) {
        mostrarErro(MENSAGENS_ERRO.CIDADE_VAZIA);
        return;
    }

    // Limpa mensagens e mostra indicador de carregamento
    esconderMensagens();
    mostrarCarregamento();

    try {
        // Obtém coordenadas da cidade
        const coordenadas = await buscarCoordenadas(cidade);
        if (!coordenadas) {
            mostrarErro(MENSAGENS_ERRO.CIDADE_NAO_ENCONTRADA);
            return;
        }

        // Busca dados climáticos com base nas coordenadas
        const dadosClima = await buscarDadosClima(coordenadas);

        // Exibe resultado na tela
        exibirClima(coordenadas.nome, coordenadas.pais, dadosClima);
    } catch (erro) {
        tratarErro(erro);
    } finally {
        esconderCarregamento();
    }
}

// ===== FUNÇÃO: TRATAR ERROS =====
// Define mensagens adequadas conforme o tipo de erro ocorrido
function tratarErro(erro) {
    console.error('Erro:', erro);
    let mensagem = MENSAGENS_ERRO.GENERICO;

    if (erro.message === 'TIMEOUT') mensagem = MENSAGENS_ERRO.TIMEOUT;
    else if (erro.message.includes('Failed to fetch') || erro.message.includes('Network')) mensagem = MENSAGENS_ERRO.REDE;
    else if (erro.message.includes('500') || erro.message.includes('502') || erro.message.includes('503')) mensagem = MENSAGENS_ERRO.SERVIDOR;

    mostrarErro(mensagem);
}

// ===== FUNÇÃO: EXIBIR CLIMA =====
// Atualiza a interface com os dados retornados da API
function exibirClima(nome, pais, dados) {
    esconderMensagens();
    cityName.textContent = `${nome}, ${pais}`;
    temperature.textContent = `${Math.round(dados.temperature_2m)}°`;
    currentDate.textContent = obterDataAtual();

    // Define ícone e descrição de acordo com o código de clima recebido
    const clima = obterDescricaoClima(dados.weather_code);
    weatherIcon.className = `weather-icon wi ${clima.icone}`;
    description.textContent = clima.descricao;

    // Troca de tela: esconde busca e mostra resultados
    searchScreen.style.display = 'none';
    resultScreen.style.display = 'flex';
}

// ===== FUNÇÃO: OBTER DESCRIÇÃO DO CLIMA =====
// Traduz os códigos de clima em descrições e ícones visuais
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

    // Retorna o clima correspondente ou um valor padrão caso não reconhecido
    return codigos[codigo] || { descricao: 'Clima desconhecido', icone: 'wi-na' };
}

// ===== FUNÇÃO: VOLTAR PARA TELA DE BUSCA =====
// Restaura o estado inicial da interface
function voltarParaBusca() {
    cityInput.value = '';
    esconderMensagens();
    resultScreen.style.display = 'none';
    searchScreen.style.display = 'flex';
}

// ===== FUNÇÕES DE INTERFACE =====
// Exibe mensagem de erro na tela
function mostrarErro(mensagem) {
    esconderMensagens();
    error.textContent = mensagem;
    error.style.display = 'block';
}

// Mostra o indicador de carregamento
function mostrarCarregamento() {
    loading.style.display = 'block';
}

// Oculta o indicador de carregamento
function esconderCarregamento() {
    loading.style.display = 'none';
}

// Oculta mensagens de erro e carregamento
function esconderMensagens() {
    loading.style.display = 'none';
    error.style.display = 'none';
}

// ===== EVENTOS =====
// Aplica tema noturno ou diurno de acordo com o horário local
function aplicarTemaHorario() {
    const horaAtual = new Date().getHours();
    const body = document.body;
    if (horaAtual >= 18 || horaAtual < 6) {
        body.classList.add('night-mode');
    } else {
        body.classList.remove('night-mode');
    }
}
aplicarTemaHorario();

// Eventos de interação do usuário
searchBtn.addEventListener('click', buscarClima); // Ao clicar no botão, busca o clima
cityInput.addEventListener('keypress', (evento) => {
    if (evento.key === 'Enter') buscarClima(); // Permite buscar ao pressionar Enter
});
backBtn.addEventListener('click', voltarParaBusca); // Retorna à tela inicial
