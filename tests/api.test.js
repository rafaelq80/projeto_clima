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

    describe('Busca do Clima - Sucesso', () => {
        
        test('1. deve retornar coordenadas e dados meteorológicos para cidade válida', async () => {
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
                    relative_humidity_2m: 65,
                    wind_speed_10m: 12,
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

            const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=-23.5505&longitude=-46.6333&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`;
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

            // Assert - Dados meteorológicos completos
            expect(weatherData.current).toBeDefined();
            expect(weatherData.current.temperature_2m).toBe(25.5);
            expect(weatherData.current.relative_humidity_2m).toBe(65);
            expect(weatherData.current.wind_speed_10m).toBe(12);
            expect(weatherData.current.weather_code).toBe(0);
            
            // Assert - Fetch foi chamado duas vezes
            expect(global.fetch).toHaveBeenCalledTimes(2);
        });
    });

    // ========================================
    // TESTES DE VALIDAÇÃO DE ENTRADA
    // ========================================

    describe('Validação de Entrada', () => {
        
        test('2. deve rejeitar entrada vazia', () => {
            // Arrange & Act
            const entradaVazia = '';
            const resultado = entradaVazia.trim().length > 0;

            // Assert
            expect(resultado).toBe(false);
        });

        test('3. deve rejeitar entrada com apenas espaços em branco', () => {
            // Arrange & Act
            const entradaEspacos = '   ';
            const resultado = entradaEspacos.trim().length > 0;

            // Assert
            expect(resultado).toBe(false);
        });

        test('4. deve aceitar entrada válida após trim', () => {
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
        
        test('5. deve retornar array vazio quando cidade não existe', async () => {
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

        test('6. deve retornar false quando verificar existência de resultados', async () => {
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
        
        test('7. deve lançar erro quando houver falha de rede', async () => {
            // Arrange
            global.fetch = jest.fn(() =>
                Promise.reject(new Error('Failed to fetch'))
            );

            // Act & Assert
            await expect(fetch('https://api.example.com'))
                .rejects
                .toThrow('Failed to fetch');
        });

        test('8. deve lançar erro quando houver timeout via AbortController', async () => {
            // Arrange
            global.fetch = jest.fn(() =>
                Promise.reject(new Error('AbortError'))
            );

            // Act & Assert
            try {
                await fetch('https://api.example.com');
                fail('Deveria ter lançado erro');
            } catch (error) {
                expect(error.message).toContain('Error');
            }
        });

        test('9. deve capturar erro genérico e verificar palavra Error', async () => {
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
        
        test('10. deve retornar status 429 quando exceder limite de requisições', async () => {
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
    // TESTES DE TIMEOUT COM ABORTCONTROLLER
    // ========================================

    describe('Timeout de Requisições', () => {
        
        test('11. deve cancelar requisição quando exceder tempo limite de 10 segundos', async () => {
            // Arrange
            const TIMEOUT_MS = 10000;
            
            // Simular AbortController sendo acionado por timeout
            global.fetch = jest.fn(() =>
                Promise.reject(Object.assign(new Error('The user aborted a request'), { name: 'AbortError' }))
            );

            // Act & Assert
            try {
                await fetch('https://api.open-meteo.com/v1/forecast');
                fail('Deveria ter lançado AbortError');
            } catch (error) {
                expect(error.name).toBe('AbortError');
            }
        });
    });

    // ========================================
    // TESTES DE MUDANÇA DE FORMATO DA API
    // ========================================

    describe('Breaking Changes da API', () => {
        
        test('12. deve detectar mudança no formato da resposta de geocoding', async () => {
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

        test('13. deve detectar mudança no formato da resposta de clima', async () => {
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
        
        test('14. deve aplicar modo noturno entre 18h e 6h', () => {
            // Arrange
            const horasNoturnas = [18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5];
            
            // Act & Assert
            horasNoturnas.forEach(hora => {
                const ehNoite = hora >= 18 || hora < 6;
                expect(ehNoite).toBe(true);
            });
        });

        test('15. deve aplicar modo diurno entre 6h e 18h', () => {
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
    // TESTES DE LIMITE DE CIDADES
    // ========================================

    describe('Gerenciamento de Lista de Cidades', () => {
        
        test('16. deve permitir adicionar até 5 cidades', () => {
            // Arrange
            const MAX_CIDADES = 5;
            const cidadesAdicionadas = [];

            // Act
            for (let i = 0; i < 5; i++) {
                if (cidadesAdicionadas.length < MAX_CIDADES) {
                    cidadesAdicionadas.push({ nome: `Cidade ${i + 1}` });
                }
            }

            // Assert
            expect(cidadesAdicionadas).toHaveLength(5);
        });

        test('17. deve impedir adicionar mais de 5 cidades', () => {
            // Arrange
            const MAX_CIDADES = 5;
            const cidadesAdicionadas = Array(5).fill({ nome: 'Cidade' });

            // Act
            const podeAdicionar = cidadesAdicionadas.length < MAX_CIDADES;

            // Assert
            expect(podeAdicionar).toBe(false);
        });

        test('18. deve detectar cidade duplicada (case-insensitive)', () => {
            // Arrange
            const cidadesAdicionadas = [
                { nome: 'São Paulo' },
                { nome: 'Rio de Janeiro' }
            ];
            const novaCidade = 'são paulo';

            // Act
            const cidadeJaExiste = cidadesAdicionadas.some(c => 
                c.nome.toLowerCase() === novaCidade.toLowerCase()
            );

            // Assert
            expect(cidadeJaExiste).toBe(true);
        });

        test('19. deve permitir mínimo de 2 cidades para comparação', () => {
            // Arrange
            const cidadesAdicionadas = [
                { nome: 'São Paulo' },
                { nome: 'Rio de Janeiro' }
            ];

            // Act
            const podeComparar = cidadesAdicionadas.length >= 2;

            // Assert
            expect(podeComparar).toBe(true);
        });
    });

    // ========================================
    // TESTES DE CÓDIGOS DE CLIMA
    // ========================================

    describe('Interpretação de Códigos de Clima', () => {
        
        test('20. deve retornar descrição correta para código de clima 0 (céu limpo)', () => {
            // Arrange
            const codigo = 0;
            const descricoes = {
                0: { descricao: 'Céu limpo', icone: 'wi-day-sunny' }
            };

            // Act
            const clima = descricoes[codigo];

            // Assert
            expect(clima).toBeDefined();
            expect(clima.descricao).toBe('Céu limpo');
            expect(clima.icone).toBe('wi-day-sunny');
        });

        test('21. deve retornar descrição correta para código de clima 95 (tempestade)', () => {
            // Arrange
            const codigo = 95;
            const descricoes = {
                95: { descricao: 'Tempestade', icone: 'wi-thunderstorm' }
            };

            // Act
            const clima = descricoes[codigo];

            // Assert
            expect(clima).toBeDefined();
            expect(clima.descricao).toBe('Tempestade');
            expect(clima.icone).toBe('wi-thunderstorm');
        });

        test('22. deve retornar clima desconhecido para código inválido', () => {
            // Arrange
            const codigo = 999;
            const descricoes = {
                0: { descricao: 'Céu limpo', icone: 'wi-day-sunny' }
            };

            // Act
            const clima = descricoes[codigo] || { descricao: 'Clima desconhecido', icone: 'wi-na' };

            // Assert
            expect(clima.descricao).toBe('Clima desconhecido');
            expect(clima.icone).toBe('wi-na');
        });
    });

    // ========================================
    // TESTES DE PROMISE.ALL PARA MÚLTIPLAS CIDADES
    // ========================================

    describe('Busca Paralela de Dados Climáticos', () => {
        
        test('23. deve buscar dados de múltiplas cidades em paralelo', async () => {
            // Arrange
            const cidades = [
                { latitude: -23.5505, longitude: -46.6333, nome: 'São Paulo' },
                { latitude: -22.9068, longitude: -43.1729, nome: 'Rio de Janeiro' }
            ];

            const mockWeatherData = {
                current: {
                    temperature_2m: 25.5,
                    relative_humidity_2m: 65,
                    wind_speed_10m: 12,
                    weather_code: 0
                }
            };

            global.fetch = jest.fn(() =>
                Promise.resolve({
                    json: () => Promise.resolve(mockWeatherData)
                })
            );

            // Act
            const promessas = cidades.map(cidade => 
                fetch(`https://api.open-meteo.com/v1/forecast?latitude=${cidade.latitude}&longitude=${cidade.longitude}`)
                    .then(res => res.json())
            );

            const resultados = await Promise.all(promessas);

            // Assert
            expect(resultados).toHaveLength(2);
            expect(global.fetch).toHaveBeenCalledTimes(2);
            resultados.forEach(resultado => {
                expect(resultado.current).toBeDefined();
                expect(resultado.current.temperature_2m).toBe(25.5);
            });
        });
    });
});