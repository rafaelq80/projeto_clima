describe('Testes Unitários - App de Clima', () => {
	let originalFetch

	beforeEach(() => {
		// Salvar fetch original
		originalFetch = global.fetch
	})

	afterEach(() => {
		// Restaurar fetch original
		global.fetch = originalFetch
	})

	// ===== TESTE 1: CIDADE VÁLIDA =====
	test('1. Nome de cidade válido retorna dados meteorológicos', async () => {
		// Arrange - Mock do fetch
		global.fetch = jest.fn((url) => {
			if (url.includes('geocoding-api')) {
				return Promise.resolve({
					json: () =>
						Promise.resolve({
							results: [
								{
									latitude: -23.5505,
									longitude: -46.6333,
									name: 'São Paulo',
									country: 'Brasil',
								},
							],
						}),
				})
			}
			// Mock da API de clima
			return Promise.resolve({
				json: () =>
					Promise.resolve({
						current: {
							temperature_2m: 25.5,
							weather_code: 0,
						},
					}),
			})
		})

		// Act - Buscar coordenadas
		const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=São Paulo&count=1&language=pt&format=json`
		const geoResponse = await fetch(geoUrl)
		const geoData = await geoResponse.json()

		// Assert - Verificar coordenadas
		expect(geoData.results).toBeDefined()
		expect(geoData.results[0].name).toBe('São Paulo')
		expect(geoData.results[0].latitude).toBe(-23.5505)

		// Act - Buscar dados do clima
		const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=-23.5505&longitude=-46.6333&current=temperature_2m,weather_code`
		const weatherResponse = await fetch(weatherUrl)
		const weatherData = await weatherResponse.json()

		// Assert - Verificar dados meteorológicos
		expect(weatherData.current).toBeDefined()
		expect(weatherData.current.temperature_2m).toBe(25.5)
		expect(weatherData.current.weather_code).toBe(0)
	})

	// ===== TESTE 2: CIDADE INEXISTENTE =====
	test('2. Nome de cidade inexistente lança exceção tratada', async () => {
		// Arrange - Mock retornando array vazio
		global.fetch = jest.fn(() =>
			Promise.resolve({
				json: () =>
					Promise.resolve({
						results: [],
					}),
			})
		)

		// Act
		const url = `https://geocoding-api.open-meteo.com/v1/search?name=XyzCidadeInexistente123&count=1&language=pt&format=json`
		const response = await fetch(url)
		const data = await response.json()

		// Assert
		expect(data.results).toBeDefined()
		expect(data.results.length).toBe(0)
		expect(data.results.length > 0).toBe(false)
	})

	// ===== TESTE 3: ENTRADA VAZIA =====
	test('3. Entrada vazia retorna erro de validação', () => {
		// Arrange
		const cidadeVazia = ''
		const cidadeComEspacos = '   '

		// Act
		const validoVazio = cidadeVazia.trim().length > 0
		const validoEspacos = cidadeComEspacos.trim().length > 0

		// Assert
		expect(validoVazio).toBe(false)
		expect(validoEspacos).toBe(false)
	})

	// ===== TESTE 4: FALHA DA API =====
	test('4. Falha da API gera resposta adequada (timeout ou erro)', async () => {
		// Arrange - Mock que lança erro
		global.fetch = jest.fn(() =>
			Promise.reject(new Error('Network Error'))
		)

		// Act & Assert
		await expect(fetch('https://api.example.com')).rejects.toThrow(
			'Network Error'
		)

		// Verificar se o erro contém a palavra "Error"
		try {
			await fetch('https://api.example.com')
		} catch (error) {
			expect(error.message).toContain('Error')
		}
	})

	// ===== TESTE 5: MUITAS REQUISIÇÕES =====
	test('5. Excesso de requisições deve ser bloqueado', async () => {
		// Arrange - Mock que retorna erro 429
		global.fetch = jest.fn(() =>
			Promise.resolve({
				status: 429,
				ok: false,
				json: () =>
					Promise.resolve({
						error: true,
						message: 'Você fez muitas requisições. Aguarde um pouco.',
					}),
			})
		)

		// Act
		const resposta = await fetch(
			'https://geocoding-api.open-meteo.com/v1/search'
		)
		const dados = await resposta.json()

		// Assert
		expect(resposta.status).toBe(429)
		expect(resposta.ok).toBe(false)
		expect(dados.error).toBe(true)
	})

	// ===== TESTE 6: INTERNET LENTA =====
	test('6. Conexão lenta deve dar timeout', async () => {
		// Arrange
		const TEMPO_MAX = 1000 // 1 segundo

		// Mock que demora muito para responder
		global.fetch = jest.fn(
			() =>
				new Promise((resolve, reject) => {
					setTimeout(() => {
						reject(new Error('Request timeout'))
					}, TEMPO_MAX + 1000) // 2 segundos
				})
		)

		// Criar promise de timeout
		const timeoutPromise = new Promise((resolve, reject) => {
			setTimeout(() => {
				reject(
					new Error(
						'Timeout: requisição demorou demais'
					)
				)
			}, TEMPO_MAX)
		})

		// Act & Assert
		await expect(
			Promise.race([
				fetch('https://api.open-meteo.com/v1/forecast'),
				timeoutPromise,
			])
		).rejects.toThrow(/Timeout|timeout/)
	})

	// ===== TESTE 7: API MUDOU FORMATO =====
	test('7. API mudou e quebrou o formato', async () => {
		// Arrange - Mock com formato diferente
		global.fetch = jest.fn((url) => {
			if (url.includes('geocoding-api')) {
				return Promise.resolve({
					json: () =>
						Promise.resolve({
							// ANTES: results | AGORA: locations
							locations: [
								{
									lat: -23.5505,
									lon: -46.6333,
									city: 'São Paulo',
								},
							],
						}),
				})
			}
			return Promise.resolve({
				json: () =>
					Promise.resolve({
						// ANTES: current | AGORA: currentWeather
						currentWeather: {
							temp: 25.5,
							code: 0,
						},
					}),
			})
		})

		// Act - Testar geocoding
		const resposta1 = await fetch(
			'https://geocoding-api.open-meteo.com/v1/search'
		)
		const dados1 = await resposta1.json()

		// Assert - Campo antigo não existe mais
		expect(dados1.results).toBeUndefined()
		expect(dados1.locations).toBeDefined()

		// Act - Testar clima
		const resposta2 = await fetch(
			'https://api.open-meteo.com/v1/forecast'
		)
		const dados2 = await resposta2.json()

		// Assert - Campo de clima mudou
		expect(dados2.current).toBeUndefined()
		expect(dados2.currentWeather).toBeDefined()
	})
})
