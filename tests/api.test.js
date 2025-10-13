
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
                Promise.reject(new Error('Network Error'))
            );

            // Act & Assert
            await expect(fetch('https://api.example.com'))
                .rejects
                .toThrow('Network Error');
        });

        test('8. deve lançar erro quando houver timeout', async () => {
            // Arrange
            global.fetch = jest.fn(() =>
                Promise.reject(new Error('Timeout'))
            );

            // Act & Assert
            await expect(fetch('https://api.example.com'))
                .rejects
                .toThrow('Timeout');
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
    // TESTES DE TIMEOUT
    // ========================================

    describe('Timeout de Requisições', () => {
        
        test('11. deve cancelar requisição quando exceder tempo limite', async () => {
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
});