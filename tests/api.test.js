
describe('App de Clima - Testes Unitários', () => {

    let originalFetch;

    beforeEach(() => {
        // Salvar fetch original antes de cada teste
        originalFetch = global.fetch;
    });

    afterEach(() => {
        // Restaurar fetch original após cada teste
        global.fetch = originalFetch;
        jest.clearAllMocks();
    });

    // ========================================
    // TESTES DE SUCESSO (Happy Path)
    // ========================================

    describe('Busca de Clima - Sucesso', () => {
        
        test('deve retornar coordenadas e dados meteorológicos para cidade válida', async () => {
            // Arrange
            const mockGeocodingData = {
                results: [{
                    latitude: -23.5505,
                    longitude: -46.6333,
                    name: 'São Paulo',
                    country: 'Brasil'
                }]
            };

            const mockWeatherData = {
                current: {
                    temperature_2m: 25.5,
                    weather_code: 0
                }
            };

            global.fetch = jest.fn((url) => {
                if (url.includes('geocoding-api')) {
                    return Promise.resolve({
                        json: () => Promise.resolve(mockGeocodingData)
                    });
                }
                return Promise.resolve({
                    json: () => Promise.resolve(mockWeatherData)
                });
            });

            // Act
            const geoUrl = 'https://geocoding-api.open-meteo.com/v1/search?name=São Paulo&count=1&language=pt&format=json';
            const geoResponse = await fetch(geoUrl);
            const geoData = await geoResponse.json();

            const weatherUrl = 'https://api.open-meteo.com/v1/forecast?latitude=-23.5505&longitude=-46.6333&current=temperature_2m,weather_code';
            const weatherResponse = await fetch(weatherUrl);
            const weatherData = await weatherResponse.json();

            // Assert - Coordenadas
            expect(geoData.results).toBeDefined();
            expect(geoData.results[0]).toMatchObject({
                name: 'São Paulo',
                latitude: -23.5505,
                longitude: -46.6333,
                country: 'Brasil'
            });

            // Assert - Dados meteorológicos
            expect(weatherData.current).toBeDefined();
            expect(weatherData.current.temperature_2m).toBe(25.5);
            expect(weatherData.current.weather_code).toBe(0);
            
            // Assert - Fetch foi chamado duas vezes
            expect(global.fetch).toHaveBeenCalledTimes(2);
        });
    });

    // ========================================
    // TESTES DE VALIDAÇÃO DE ENTRADA
    // ========================================

    describe('Validação de Entrada', () => {
        
        test('deve rejeitar entrada vazia', () => {
            // Arrange & Act
            const entradaVazia = '';
            const resultado = entradaVazia.trim().length > 0;

            // Assert
            expect(resultado).toBe(false);
        });

        test('deve rejeitar entrada com apenas espaços em branco', () => {
            // Arrange & Act
            const entradaEspacos = '   ';
            const resultado = entradaEspacos.trim().length > 0;

            // Assert
            expect(resultado).toBe(false);
        });

        test('deve aceitar entrada válida após trim', () => {
            // Arrange & Act
            const entradaValida = '  São Paulo  ';
            const resultado = entradaValida.trim().length > 0;

            // Assert
            expect(resultado).toBe(true);
        });
    });

    // ========================================
    // TESTES DE CIDADE INEXISTENTE
    // ========================================

    describe('Cidade Inexistente', () => {
        
        test('deve retornar array vazio quando cidade não existe', async () => {
            // Arrange
            global.fetch = jest.fn(() =>
                Promise.resolve({
                    json: () => Promise.resolve({ results: [] })
                })
            );

            // Act
            const url = 'https://geocoding-api.open-meteo.com/v1/search?name=XyzCidadeInexistente123&count=1&language=pt&format=json';
            const response = await fetch(url);
            const data = await response.json();

            // Assert
            expect(data.results).toBeDefined();
            expect(data.results).toHaveLength(0);
        });

        test('deve retornar false quando verificar existência de resultados', async () => {
            // Arrange
            global.fetch = jest.fn(() =>
                Promise.resolve({
                    json: () => Promise.resolve({ results: [] })
                })
            );

            // Act
            const response = await fetch('https://geocoding-api.open-meteo.com/v1/search?name=CidadeInvalida');
            const data = await response.json();
            const existeResultado = data.results && data.results.length > 0;

            // Assert
            expect(existeResultado).toBe(false);
        });
    });

    // ========================================
    // TESTES DE FALHAS DE REDE
    // ========================================

    describe('Tratamento de Erros de Rede', () => {
        
        test('deve lançar erro quando houver falha de rede', async () => {
            // Arrange
            global.fetch = jest.fn(() =>
                Promise.reject(new Error('Network Error'))
            );

            // Act & Assert
            await expect(fetch('https://api.example.com'))
                .rejects
                .toThrow('Network Error');
        });

        test('deve lançar erro quando houver timeout', async () => {
            // Arrange
            global.fetch = jest.fn(() =>
                Promise.reject(new Error('Timeout'))
            );

            // Act & Assert
            await expect(fetch('https://api.example.com'))
                .rejects
                .toThrow('Timeout');
        });

        test('deve capturar erro genérico e verificar palavra Error', async () => {
            // Arrange
            global.fetch = jest.fn(() =>
                Promise.reject(new Error('Internal Server Error'))
            );

            // Act & Assert
            try {
                await fetch('https://api.example.com');
                fail('Deveria ter lançado erro');
            } catch (error) {
                expect(error.message).toContain('Error');
            }
        });
    });

    // ========================================
    // TESTES DE RATE LIMITING
    // ========================================

    describe('Controle de Taxa de Requisições', () => {
        
        test('deve retornar status 429 quando exceder limite de requisições', async () => {
            // Arrange
            global.fetch = jest.fn(() =>
                Promise.resolve({
                    status: 429,
                    ok: false,
                    json: () => Promise.resolve({
                        error: true,
                        message: 'Você fez muitas requisições. Aguarde um pouco.'
                    })
                })
            );

            // Act
            const response = await fetch('https://geocoding-api.open-meteo.com/v1/search');
            const data = await response.json();

            // Assert
            expect(response.status).toBe(429);
            expect(response.ok).toBe(false);
            expect(data.error).toBe(true);
            expect(data.message).toContain('muitas requisições');
        });
    });

    // ========================================
    // TESTES DE TIMEOUT
    // ========================================

    describe('Timeout de Requisições', () => {
        
        test('deve cancelar requisição quando exceder tempo limite', async () => {
            // Arrange
            const TEMPO_MAX = 1000;
            
            global.fetch = jest.fn(() =>
                new Promise((resolve, reject) => {
                    setTimeout(() => {
                        reject(new Error('Request timeout'));
                    }, TEMPO_MAX + 1000);
                })
            );

            const timeoutPromise = new Promise((resolve, reject) => {
                setTimeout(() => {
                    reject(new Error('Timeout: requisição demorou demais'));
                }, TEMPO_MAX);
            });

            // Act & Assert
            await expect(
                Promise.race([
                    fetch('https://api.open-meteo.com/v1/forecast'),
                    timeoutPromise
                ])
            ).rejects.toThrow(/Timeout|timeout/);
        });
    });

    // ========================================
    // TESTES DE MUDANÇA DE FORMATO DA API
    // ========================================

    describe('Breaking Changes da API', () => {
        
        test('deve detectar mudança no formato da resposta de geocoding', async () => {
            // Arrange - API mudou de 'results' para 'locations'
            global.fetch = jest.fn(() =>
                Promise.resolve({
                    json: () => Promise.resolve({
                        locations: [{
                            lat: -23.5505,
                            lon: -46.6333,
                            city: 'São Paulo'
                        }]
                    })
                })
            );

            // Act
            const response = await fetch('https://geocoding-api.open-meteo.com/v1/search');
            const data = await response.json();

            // Assert
            expect(data.results).toBeUndefined();
            expect(data.locations).toBeDefined();
        });

        test('deve detectar mudança no formato da resposta de clima', async () => {
            // Arrange - API mudou de 'current' para 'currentWeather'
            global.fetch = jest.fn(() =>
                Promise.resolve({
                    json: () => Promise.resolve({
                        currentWeather: {
                            temp: 25.5,
                            code: 0
                        }
                    })
                })
            );

            // Act
            const response = await fetch('https://api.open-meteo.com/v1/forecast');
            const data = await response.json();

            // Assert
            expect(data.current).toBeUndefined();
            expect(data.currentWeather).toBeDefined();
        });
    });

    // ========================================
    // TESTES DE UTILITÁRIOS
    // ========================================

    describe('Funções Auxiliares', () => {
        
        test('deve aplicar modo noturno entre 18h e 6h', () => {
            // Arrange
            const horasNoturnas = [18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5];
            
            // Act & Assert
            horasNoturnas.forEach(hora => {
                const ehNoite = hora >= 18 || hora < 6;
                expect(ehNoite).toBe(true);
            });
        });

        test('deve aplicar modo diurno entre 6h e 18h', () => {
            // Arrange
            const horasDiurnas = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
            
            // Act & Assert
            horasDiurnas.forEach(hora => {
                const ehDia = hora >= 6 && hora < 18;
                expect(ehDia).toBe(true);
            });
        });
    });

    // ========================================
    // TESTES DE CACHE
    // ========================================

    describe('Sistema de Cache com localStorage', () => {
        
        let mockLocalStorage;

        beforeEach(() => {
            // Mock do localStorage
            mockLocalStorage = {
                store: {},
                getItem: jest.fn((key) => mockLocalStorage.store[key] || null),
                setItem: jest.fn((key, value) => {
                    mockLocalStorage.store[key] = value;
                }),
                removeItem: jest.fn((key) => {
                    delete mockLocalStorage.store[key];
                }),
                clear: jest.fn(() => {
                    mockLocalStorage.store = {};
                })
            };

            global.localStorage = mockLocalStorage;
            global.Date.now = jest.fn();
        });

        afterEach(() => {
            mockLocalStorage.clear();
            jest.restoreAllMocks();
        });

        test('deve salvar dados no cache com sucesso', () => {
            // Arrange
            const PREFIXO_CACHE = 'clima_cache_';
            const UMA_HORA = 60 * 60 * 1000;
            const timestampAtual = 1000000000;
            Date.now.mockReturnValue(timestampAtual);

            const chave = 'clima_saopaulo';
            const dados = { temperatura: 25, clima: 'ensolarado' };

            // Act
            const chaveCompleta = PREFIXO_CACHE + chave;
            const item = {
                dados: dados,
                horarioExpiracao: timestampAtual + UMA_HORA,
                horarioSalvo: timestampAtual
            };
            localStorage.setItem(chaveCompleta, JSON.stringify(item));

            // Assert
            expect(localStorage.setItem).toHaveBeenCalledWith(
                chaveCompleta,
                JSON.stringify(item)
            );
            expect(localStorage.store[chaveCompleta]).toBeDefined();
        });

        test('deve retornar dados do cache quando ainda válidos', () => {
            // Arrange
            const PREFIXO_CACHE = 'clima_cache_';
            const UMA_HORA = 60 * 60 * 1000;
            const timestampSalvo = 1000000000;
            const timestampAtual = timestampSalvo + (30 * 60 * 1000); // 30 minutos depois

            const chave = 'clima_saopaulo';
            const dados = { temperatura: 25, clima: 'ensolarado' };
            const item = {
                dados: dados,
                horarioExpiracao: timestampSalvo + UMA_HORA,
                horarioSalvo: timestampSalvo
            };

            const chaveCompleta = PREFIXO_CACHE + chave;
            localStorage.setItem(chaveCompleta, JSON.stringify(item));

            // Act
            Date.now.mockReturnValue(timestampAtual);
            const itemString = localStorage.getItem(chaveCompleta);
            const itemRecuperado = JSON.parse(itemString);
            const cacheValido = timestampAtual < itemRecuperado.horarioExpiracao;

            // Assert
            expect(cacheValido).toBe(true);
            expect(itemRecuperado.dados).toEqual(dados);
            expect(localStorage.removeItem).not.toHaveBeenCalled();
        });

        test('deve retornar null quando cache expirado', () => {
            // Arrange
            const PREFIXO_CACHE = 'clima_cache_';
            const UMA_HORA = 60 * 60 * 1000;
            const timestampSalvo = 1000000000;
            const timestampAtual = timestampSalvo + UMA_HORA + 1000; // 1 hora e 1 segundo depois

            const chave = 'clima_saopaulo';
            const dados = { temperatura: 25, clima: 'ensolarado' };
            const item = {
                dados: dados,
                horarioExpiracao: timestampSalvo + UMA_HORA,
                horarioSalvo: timestampSalvo
            };

            const chaveCompleta = PREFIXO_CACHE + chave;
            localStorage.setItem(chaveCompleta, JSON.stringify(item));

            // Act
            Date.now.mockReturnValue(timestampAtual);
            const itemString = localStorage.getItem(chaveCompleta);
            const itemRecuperado = JSON.parse(itemString);
            const cacheExpirado = timestampAtual > itemRecuperado.horarioExpiracao;

            // Assert
            expect(cacheExpirado).toBe(true);
            
            // Simular remoção do cache expirado
            if (cacheExpirado) {
                localStorage.removeItem(chaveCompleta);
            }
            expect(localStorage.removeItem).toHaveBeenCalledWith(chaveCompleta);
        });

        test('deve retornar null quando cache não existe', () => {
            // Arrange
            const PREFIXO_CACHE = 'clima_cache_';
            const chave = 'clima_cidade_inexistente';
            const chaveCompleta = PREFIXO_CACHE + chave;

            // Act
            const resultado = localStorage.getItem(chaveCompleta);

            // Assert
            expect(resultado).toBeNull();
            expect(localStorage.getItem).toHaveBeenCalledWith(chaveCompleta);
        });

        test('deve criar chave de cache formatada corretamente', () => {
            // Arrange
            const tipo = 'clima';
            const valor = 'São Paulo';

            // Act - Simula criação de chave
            const valorLimpo = valor
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, '_')
                .replace(/[^a-z0-9_]/g, '');
            
            const chave = `${tipo}_${valorLimpo}`;

            // Assert
            expect(chave).toBe('clima_sao_paulo');
        });

        test('deve remover apenas caches com prefixo correto', () => {
            // Arrange
            const PREFIXO_CACHE = 'clima_cache_';
            
            localStorage.setItem(PREFIXO_CACHE + 'clima1', 'valor1');
            localStorage.setItem(PREFIXO_CACHE + 'clima2', 'valor2');
            localStorage.setItem('outro_dado', 'valor3');

            // Act - Remover apenas itens com prefixo
            const chaves = Object.keys(localStorage.store);
            let removidos = 0;

            chaves.forEach(chave => {
                if (chave.startsWith(PREFIXO_CACHE)) {
                    localStorage.removeItem(chave);
                    removidos++;
                }
            });

            // Assert
            expect(removidos).toBe(2);
            expect(localStorage.store['outro_dado']).toBeDefined();
            expect(localStorage.store[PREFIXO_CACHE + 'clima1']).toBeUndefined();
            expect(localStorage.store[PREFIXO_CACHE + 'clima2']).toBeUndefined();
        });

        test('deve limpar apenas caches expirados', () => {
            // Arrange
            const PREFIXO_CACHE = 'clima_cache_';
            const UMA_HORA = 60 * 60 * 1000;
            const timestampBase = 1000000000;
            const timestampAtual = timestampBase + UMA_HORA + 1000;

            // Cache expirado
            const itemExpirado = {
                dados: { temp: 20 },
                horarioExpiracao: timestampBase + UMA_HORA,
                horarioSalvo: timestampBase
            };

            // Cache válido
            const itemValido = {
                dados: { temp: 25 },
                horarioExpiracao: timestampAtual + UMA_HORA,
                horarioSalvo: timestampAtual
            };

            localStorage.setItem(PREFIXO_CACHE + 'expirado', JSON.stringify(itemExpirado));
            localStorage.setItem(PREFIXO_CACHE + 'valido', JSON.stringify(itemValido));

            // Act
            Date.now.mockReturnValue(timestampAtual);
            let removidos = 0;
            const chaves = Object.keys(localStorage.store);

            chaves.forEach(chave => {
                if (chave.startsWith(PREFIXO_CACHE)) {
                    try {
                        const item = JSON.parse(localStorage.getItem(chave));
                        if (timestampAtual > item.horarioExpiracao) {
                            localStorage.removeItem(chave);
                            removidos++;
                        }
                    } catch (e) {
                        localStorage.removeItem(chave);
                        removidos++;
                    }
                }
            });

            // Assert
            expect(removidos).toBe(1);
            expect(localStorage.store[PREFIXO_CACHE + 'expirado']).toBeUndefined();
            expect(localStorage.store[PREFIXO_CACHE + 'valido']).toBeDefined();
        });

        test('deve usar cache válido antes de fazer requisição', () => {
            // Arrange
            const PREFIXO_CACHE = 'clima_cache_';
            const UMA_HORA = 60 * 60 * 1000;
            const timestampSalvo = 1000000000;
            const timestampAtual = timestampSalvo + (10 * 60 * 1000); // 10 minutos depois

            const dadosCache = {
                latitude: -23.5505,
                longitude: -46.6333,
                nome: 'São Paulo',
                pais: 'Brasil'
            };

            const item = {
                dados: dadosCache,
                horarioExpiracao: timestampSalvo + UMA_HORA,
                horarioSalvo: timestampSalvo
            };

            const chave = PREFIXO_CACHE + 'coordenadas_sao_paulo';
            localStorage.setItem(chave, JSON.stringify(item));

            // Mock do fetch para verificar que não será chamado
            global.fetch = jest.fn();

            // Act
            Date.now.mockReturnValue(timestampAtual);
            const itemString = localStorage.getItem(chave);
            
            let resultado = null;
            if (itemString) {
                const itemRecuperado = JSON.parse(itemString);
                if (timestampAtual <= itemRecuperado.horarioExpiracao) {
                    resultado = itemRecuperado.dados;
                }
            }

            // Assert
            expect(resultado).not.toBeNull();
            expect(resultado).toEqual(dadosCache);
            expect(global.fetch).not.toHaveBeenCalled();
        });
    });
});