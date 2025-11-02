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

 // Elementos DOM
        const cityInput = document.getElementById('cityInput');
        const addBtn = document.getElementById('addBtn');
        const loading = document.getElementById('loading');
        const error = document.getElementById('error');
        const success = document.getElementById('success');
        const citiesList = document.getElementById('citiesList');
        const actions = document.getElementById('actions');
        const compareBtn = document.getElementById('compareBtn');
        const clearBtn = document.getElementById('clearBtn');
        const searchScreen = document.getElementById('searchScreen');
        const tableScreen = document.getElementById('tableScreen');
        const tableBody = document.getElementById('tableBody');
        const backBtn = document.getElementById('backBtn');

        // Array para armazenar cidades
        let cidadesAdicionadas = [];
        const MAX_CIDADES = 5;
        const TIMEOUT_MS = 10000;

        // Mensagens
        const MENSAGENS = {
            CIDADE_VAZIA: 'Por favor, digite o nome de uma cidade.',
            CIDADE_DUPLICADA: 'Esta cidade já foi adicionada.',
            LIMITE_ATINGIDO: 'Você já adicionou 5 cidades. Remova uma para adicionar outra.',
            CIDADE_NAO_ENCONTRADA: 'Cidade não encontrada. Tente novamente.',
            TIMEOUT: 'A requisição demorou muito. Verifique sua conexão.',
            REDE: 'Erro de conexão. Verifique sua internet.',
            CIDADE_ADICIONADA: 'Cidade adicionada com sucesso!',
            MINIMO_CIDADES: 'Adicione pelo menos 2 cidades para comparar.'
        };

        // Funções utilitárias
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

        async function buscarDadosClima(coordenadas) {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${coordenadas.latitude}&longitude=${coordenadas.longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`;
            const resposta = await fetchComTimeout(url);
            const dados = await resposta.json();
            return dados.current;
        }

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

        // Funções principais
        async function adicionarCidade() {
            const cidade = cityInput.value.trim();

            if (!cidade) {
                mostrarErro(MENSAGENS.CIDADE_VAZIA);
                return;
            }

            if (cidadesAdicionadas.length >= MAX_CIDADES) {
                mostrarErro(MENSAGENS.LIMITE_ATINGIDO);
                return;
            }

            const cidadeJaExiste = cidadesAdicionadas.some(c => 
                c.nome.toLowerCase() === cidade.toLowerCase()
            );

            if (cidadeJaExiste) {
                mostrarErro(MENSAGENS.CIDADE_DUPLICADA);
                return;
            }

            esconderMensagens();
            mostrarCarregamento();

            try {
                const coordenadas = await buscarCoordenadas(cidade);
                
                if (!coordenadas) {
                    mostrarErro(MENSAGENS.CIDADE_NAO_ENCONTRADA);
                    return;
                }

                cidadesAdicionadas.push({
                    nome: coordenadas.nome,
                    pais: coordenadas.pais,
                    latitude: coordenadas.latitude,
                    longitude: coordenadas.longitude
                });

                cityInput.value = '';
                atualizarListaCidades();
                mostrarSucesso(MENSAGENS.CIDADE_ADICIONADA);
                
            } catch (erro) {
                tratarErro(erro);
            } finally {
                esconderCarregamento();
            }
        }

        function atualizarListaCidades() {
            citiesList.innerHTML = '';

            cidadesAdicionadas.forEach((cidade, index) => {
                const item = document.createElement('div');
                item.className = 'city-item';
                item.innerHTML = `
                    <div class="city-info">
                        <div class="city-number">${index + 1}</div>
                        <div class="city-name">${cidade.nome}, ${cidade.pais}</div>
                    </div>
                    <button class="remove-btn" onclick="removerCidade(${index})" title="Remover cidade">✕</button>
                `;
                citiesList.appendChild(item);
            });

            if (cidadesAdicionadas.length > 0) {
                actions.style.display = 'flex';
                compareBtn.disabled = cidadesAdicionadas.length < 2;
            } else {
                actions.style.display = 'none';
            }
        }

        function removerCidade(index) {
            cidadesAdicionadas.splice(index, 1);
            atualizarListaCidades();
            esconderMensagens();
        }

        function limparTudo() {
            cidadesAdicionadas = [];
            atualizarListaCidades();
            esconderMensagens();
        }

        async function compararClimas() {
            if (cidadesAdicionadas.length < 2) {
                mostrarErro(MENSAGENS.MINIMO_CIDADES);
                return;
            }

            esconderMensagens();
            mostrarCarregamento();

            try {
                // Buscar dados de todas as cidades
                const promessas = cidadesAdicionadas.map(cidade => 
                    buscarDadosClima(cidade)
                );

                const resultados = await Promise.all(promessas);

                // Criar array com dados completos
                const dadosCompletos = cidadesAdicionadas.map((cidade, index) => ({
                    nome: cidade.nome,
                    pais: cidade.pais,
                    temperatura: resultados[index].temperature_2m,
                    umidade: resultados[index].relative_humidity_2m,
                    vento: resultados[index].wind_speed_10m,
                    codigoClima: resultados[index].weather_code
                }));

                exibirTabela(dadosCompletos);
                
            } catch (erro) {
                tratarErro(erro);
            } finally {
                esconderCarregamento();
            }
        }

        function exibirTabela(dados) {
            tableBody.innerHTML = '';

            dados.forEach(cidade => {
                const clima = obterDescricaoClima(cidade.codigoClima);
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><strong>${cidade.nome}</strong><br><small>${cidade.pais}</small></td>
                    <td>
                        <i class="weather-icon-table wi ${clima.icone}"></i>
                        <br><small>${clima.descricao}</small>
                    </td>
                    <td class="temp-cell">${Math.round(cidade.temperatura)}°</td>
                    <td>${cidade.umidade}%</td>
                    <td>${Math.round(cidade.vento)} km/h</td>
                `;
                tableBody.appendChild(row);
            });

            searchScreen.style.display = 'none';
            tableScreen.style.display = 'block';
        }

        function voltarParaBusca() {
            tableScreen.style.display = 'none';
            searchScreen.style.display = 'block';
        }

        function tratarErro(erro) {
            console.error('Erro:', erro);
            let mensagem = 'Erro ao buscar dados. Tente novamente.';

            if (erro.message === 'TIMEOUT') {
                mensagem = MENSAGENS.TIMEOUT;
            } else if (erro.message.includes('Failed to fetch') || erro.message.includes('Network')) {
                mensagem = MENSAGENS.REDE;
            }

            mostrarErro(mensagem);
        }

        function mostrarErro(mensagem) {
            esconderMensagens();
            error.textContent = mensagem;
            error.style.display = 'block';
        }

        function mostrarSucesso(mensagem) {
            esconderMensagens();
            success.textContent = mensagem;
            success.style.display = 'block';
            setTimeout(() => {
                success.style.display = 'none';
            }, 3000);
        }

        function mostrarCarregamento() {
            loading.style.display = 'block';
        }

        function esconderCarregamento() {
            loading.style.display = 'none';
        }

        function esconderMensagens() {
            loading.style.display = 'none';
            error.style.display = 'none';
            success.style.display = 'none';
        }

        function aplicarTemaHorario() {
            const horaAtual = new Date().getHours();
            const body = document.body;
            
            if (horaAtual >= 18 || horaAtual < 6) {
                body.classList.add('night-mode');
            } else {
                body.classList.remove('night-mode');
            }
        }

        // Event Listeners
        addBtn.addEventListener('click', adicionarCidade);
        cityInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') adicionarCidade();
        });
        compareBtn.addEventListener('click', compararClimas);
        clearBtn.addEventListener('click', limparTudo);
        backBtn.addEventListener('click', voltarParaBusca);

        // Tornar função global para onclick
        window.removerCidade = removerCidade;

        // Inicialização
        aplicarTemaHorario();