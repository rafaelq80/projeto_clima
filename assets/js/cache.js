/**
 * @fileoverview Sistema de cache simples usando localStorage
 * Armazena dados do clima no navegador com expiração de 1 hora
 * Ideal para iniciantes e aplicações web
 * 
 * @author Sistema de Cache
 * @version 1.0.0
 */

// ===== CONFIGURAÇÕES DO CACHE =====

/**
 * Tempo de expiração padrão: 1 hora em milissegundos
 * @constant {number}
 */
const UMA_HORA = 60 * 60 * 1000; // 60 minutos * 60 segundos * 1000 milissegundos

/**
 * Prefixo para as chaves no localStorage
 * Evita conflito com outros dados salvos no navegador
 * @constant {string}
 */
const PREFIXO_CACHE = 'clima_cache_';


// ===== FUNÇÃO: SALVAR NO CACHE =====

/**
 * Salva dados no localStorage com expiração de 1 hora
 * 
 * @param {string} chave - Identificador único para os dados (ex: "coordenadas_saopaulo")
 * @param {*} dados - Qualquer tipo de dado (objeto, string, número, array, etc)
 * @returns {boolean} True se salvou com sucesso, false se houve erro
 * 
 * @example
 * salvarNoCache('clima_saopaulo', { temperatura: 25, clima: 'ensolarado' });
 * 
 * @example
 * const coords = { lat: -22.9068, lon: -43.1729 };
 * salvarNoCache('coordenadas_rio', coords);
 */
function salvarNoCache(chave, dados) {
    try {
        // Calcula quando o cache vai expirar (agora + 1 hora)
        const agora = Date.now();
        const horarioExpiracao = agora + UMA_HORA;
        
        // Cria um objeto com os dados e o horário de expiração
        const item = {
            dados: dados,
            horarioExpiracao: horarioExpiracao,
            horarioSalvo: agora
        };
        
        // Converte para string JSON e salva no localStorage
        const chaveCompleta = PREFIXO_CACHE + chave;
        localStorage.setItem(chaveCompleta, JSON.stringify(item));
        
        const horarioFormatado = new Date(horarioExpiracao).toLocaleTimeString('pt-BR');
        console.log(`✅ Cache salvo: ${chave} (válido até ${horarioFormatado})`);
        
        return true;
    } catch (erro) {
        console.error('❌ Erro ao salvar cache:', erro);
        return false;
    }
}


// ===== FUNÇÃO: BUSCAR DO CACHE =====

/**
 * Busca dados do localStorage se ainda forem válidos
 * 
 * @param {string} chave - Identificador dos dados
 * @returns {*|null} Retorna os dados se válidos, ou null se não existir/expirado
 * 
 * @example
 * const dados = buscarDoCache('clima_saopaulo');
 * if (dados) {
 *   console.log('Achei no cache!', dados);
 * } else {
 *   console.log('Não tem cache válido, preciso buscar da API');
 * }
 */
function buscarDoCache(chave) {
    try {
        // Busca do localStorage
        const chaveCompleta = PREFIXO_CACHE + chave;
        const itemString = localStorage.getItem(chaveCompleta);
        
        // Se não existe, retorna null
        if (!itemString) {
            console.log(`❌ Cache não encontrado: ${chave}`);
            return null;
        }
        
        // Converte de volta para objeto JavaScript
        const item = JSON.parse(itemString);
        
        // Verifica se o cache já expirou
        const agora = Date.now();
        if (agora > item.horarioExpiracao) {
            // Cache expirado! Remove e retorna null
            localStorage.removeItem(chaveCompleta);
            console.log(`⏰ Cache expirado: ${chave}`);
            return null;
        }
        
        // Calcula há quanto tempo foi salvo
        const minutosSalvo = Math.floor((agora - item.horarioSalvo) / 1000 / 60);
        console.log(`✨ Cache válido encontrado: ${chave} (salvo há ${minutosSalvo} minuto(s))`);
        
        return item.dados;
    } catch (erro) {
        console.error('❌ Erro ao buscar cache:', erro);
        return null;
    }
}


// ===== FUNÇÃO: LIMPAR CACHE =====

/**
 * Remove uma entrada específica do cache
 * 
 * @param {string} chave - Chave a ser removida
 * @returns {boolean} True se removeu, false se não existia
 * 
 * @example
 * limparCache('clima_saopaulo');
 */
function limparCache(chave) {
    try {
        const chaveCompleta = PREFIXO_CACHE + chave;
        localStorage.removeItem(chaveCompleta);
        console.log(`🗑️ Cache removido: ${chave}`);
        return true;
    } catch (erro) {
        console.error('❌ Erro ao remover cache:', erro);
        return false;
    }
}


/**
 * Remove TODOS os dados do cache da aplicação
 * Não afeta outros dados do localStorage
 * 
 * @returns {number} Quantidade de itens removidos
 * 
 * @example
 * const removidos = limparTodoCache();
 * console.log(`Removidos ${removidos} itens do cache`);
 */
function limparTodoCache() {
    try {
        let removidos = 0;
        
        // Percorre todas as chaves do localStorage
        const chaves = Object.keys(localStorage);
        
        for (const chave of chaves) {
            // Remove apenas as que começam com nosso prefixo
            if (chave.startsWith(PREFIXO_CACHE)) {
                localStorage.removeItem(chave);
                removidos++;
            }
        }
        
        console.log(`🗑️ Cache limpo: ${removidos} item(ns) removido(s)`);
        return removidos;
    } catch (erro) {
        console.error('❌ Erro ao limpar cache:', erro);
        return 0;
    }
}


/**
 * Remove automaticamente todos os caches expirados
 * Útil para liberar espaço do localStorage
 * 
 * @returns {number} Quantidade de itens expirados removidos
 * 
 * @example
 * const removidos = limparCachesExpirados();
 * console.log(`${removidos} caches expirados removidos`);
 */
function limparCachesExpirados() {
    try {
        let removidos = 0;
        const agora = Date.now();
        const chaves = Object.keys(localStorage);
        
        for (const chave of chaves) {
            if (chave.startsWith(PREFIXO_CACHE)) {
                try {
                    const item = JSON.parse(localStorage.getItem(chave));
                    
                    if (agora > item.horarioExpiracao) {
                        localStorage.removeItem(chave);
                        removidos++;
                    }
                } catch (e) {
                    // Se houver erro ao parsear, remove o item corrompido
                    localStorage.removeItem(chave);
                    removidos++;
                }
            }
        }
        
        if (removidos > 0) {
            console.log(`🧹 Limpeza automática: ${removidos} cache(s) expirado(s) removido(s)`);
        }
        
        return removidos;
    } catch (erro) {
        console.error('❌ Erro ao limpar caches expirados:', erro);
        return 0;
    }
}


// ===== FUNÇÃO: CRIAR CHAVE DE CACHE =====

/**
 * Cria uma chave única para o cache baseada nos parâmetros
 * Isso evita confusão entre diferentes buscas
 * 
 * @param {string} tipo - Tipo de dados (ex: 'clima', 'coordenadas')
 * @param {string} valor - Valor específico (ex: nome da cidade)
 * @returns {string} Chave formatada e padronizada
 * 
 * @example
 * const chave = criarChaveCache('clima', 'São Paulo');
 * // Retorna: 'clima_sao_paulo'
 * 
 * @example
 * const chave = criarChaveCache('coordenadas', 'Rio de Janeiro');
 * // Retorna: 'coordenadas_rio_de_janeiro'
 */
function criarChaveCache(tipo, valor) {
    // Deixa tudo minúsculo e remove acentos
    const valorLimpo = valor
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/\s+/g, '_') // Substitui espaços por underscore
        .replace(/[^a-z0-9_]/g, ''); // Remove caracteres especiais
    
    return `${tipo}_${valorLimpo}`;
}


// ===== INTEGRAÇÃO COM AS FUNÇÕES DA API =====

/**
 * NOVA VERSÃO: Busca coordenadas com cache automático usando localStorage
 * Substitui a função buscarCoordenadas() original
 * 
 * @async
 * @param {string} cidade - Nome da cidade
 * @returns {Promise<Object|null>} Coordenadas ou null se não encontrado
 * 
 * @example
 * const coords = await buscarCoordenadasComCache('São Paulo');
 * if (coords) {
 *   console.log('Latitude:', coords.latitude);
 * }
 */
async function buscarCoordenadasComCache(cidade) {
    // 1. Criar chave única para esta busca
    const chave = criarChaveCache('coordenadas', cidade);
    
    // 2. Tentar buscar do cache primeiro
    const dadosCache = buscarDoCache(chave);
    if (dadosCache !== null) {
        console.log('🎯 Usando coordenadas do cache (localStorage)!');
        return dadosCache;
    }
    
    // 3. Se não tem cache, buscar da API
    console.log('🌐 Buscando coordenadas da API Open-Meteo...');
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cidade)}&count=1&language=pt&format=json`;
    
    const resposta = await fetch(url);
    const dados = await resposta.json();

    // Verificar se encontrou resultados
    if (!dados.results || dados.results.length === 0) {
        return null;
    }

    // Preparar os dados
    const resultado = dados.results[0];
    const coordenadas = {
        latitude: resultado.latitude,
        longitude: resultado.longitude,
        nome: resultado.name,
        pais: resultado.country
    };
    
    // 4. Salvar no localStorage para próxima vez
    salvarNoCache(chave, coordenadas);
    
    return coordenadas;
}


/**
 * NOVA VERSÃO: Busca clima com cache automático usando localStorage
 * Substitui a função buscarDadosClima() original
 * 
 * @async
 * @param {Object} coordenadas - Objeto com latitude e longitude
 * @param {number} coordenadas.latitude - Latitude
 * @param {number} coordenadas.longitude - Longitude
 * @returns {Promise<Object>} Dados do clima atual
 * 
 * @example
 * const coords = { latitude: -23.5505, longitude: -46.6333 };
 * const clima = await buscarDadosClimaComCache(coords);
 * console.log('Temperatura:', clima.temperature_2m);
 */
async function buscarDadosClimaComCache(coordenadas) {
    // 1. Criar chave única baseada nas coordenadas
    // Arredondamos para 2 casas decimais para agrupar locais próximos
    const lat = coordenadas.latitude.toFixed(2);
    const lon = coordenadas.longitude.toFixed(2);
    const chave = criarChaveCache('clima', `${lat}_${lon}`);
    
    // 2. Tentar buscar do cache
    const dadosCache = buscarDoCache(chave);
    if (dadosCache !== null) {
        console.log('🎯 Usando dados do clima do cache (localStorage)!');
        return dadosCache;
    }
    
    // 3. Se não tem cache, buscar da API
    console.log('🌐 Buscando clima da API Open-Meteo...');
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coordenadas.latitude}&longitude=${coordenadas.longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`;
    
    const resposta = await fetch(url);
    const dados = await resposta.json();
    const dadosClima = dados.current;
    
    // 4. Salvar no localStorage
    salvarNoCache(chave, dadosClima);
    
    return dadosClima;
}


// ===== INICIALIZAÇÃO E LIMPEZA AUTOMÁTICA =====

/**
 * Inicializa o sistema de cache
 * Limpa automaticamente caches expirados ao carregar a página
 */
function inicializarCache() {
    console.log('📦 Sistema de Cache com localStorage inicializado!');
    console.log('⏰ Dados salvos por: 1 hora');
    console.log('💾 Armazenamento: localStorage do navegador');
    
    // Limpa caches expirados automaticamente
    const removidos = limparCachesExpirados();
    
    if (removidos > 0) {
        console.log(`🧹 ${removidos} cache(s) expirado(s) removido(s) na inicialização`);
    }
    
    // Configura limpeza automática a cada 10 minutos
    setInterval(() => {
        limparCachesExpirados();
    }, 10 * 60 * 1000);
}

// Executa a inicialização quando o script for carregado
if (typeof window !== 'undefined') {
    inicializarCache();
}
