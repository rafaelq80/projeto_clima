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
const cityInput = document.getElementById('cityInput')
const searchBtn = document.getElementById('searchBtn')
const loading = document.getElementById('loading')
const error = document.getElementById('error')
const searchScreen = document.getElementById('searchScreen')
const resultScreen = document.getElementById('resultScreen')
const weatherIcon = document.getElementById('weatherIcon')
const temperature = document.getElementById('temperature')
const cityName = document.getElementById('cityName')
const currentDate = document.getElementById('currentDate')
const description = document.getElementById('description')
const backBtn = document.getElementById('backBtn')
const humidity = document.getElementById('humidity')
const windSpeed = document.getElementById('windSpeed')
const precipitation = document.getElementById('precipitation')
const tempMax = document.getElementById('tempMax')
const tempMin = document.getElementById('tempMin')

const TIMEOUT_MS = 10000

const MENSAGENS_ERRO = {
	CIDADE_VAZIA: 'Por favor, digite o nome de uma cidade.',
	CIDADE_NAO_ENCONTRADA: 'Cidade não encontrada. Tente novamente.',
	TIMEOUT: 'A requisição demorou muito. Verifique sua conexão.',
	REDE: 'Erro de conexão. Verifique sua internet.',
	SERVIDOR: 'Erro no servidor. Tente novamente mais tarde.',
	GENERICO: 'Erro ao buscar dados. Tente novamente.',
}

function obterDataAtual() {
	const hoje = new Date()
	const opcoes = {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	}
	return hoje.toLocaleDateString('pt-BR', opcoes)
}

function validarEntrada(cidade) {
	return cidade && cidade.trim().length > 0
}

async function fetchComTimeout(url, timeout = TIMEOUT_MS) {
	const controller = new AbortController()
	const timeoutId = setTimeout(() => controller.abort(), timeout)

	try {
		const response = await fetch(url, { signal: controller.signal })
		clearTimeout(timeoutId)
		return response
	} catch (erro) {
		clearTimeout(timeoutId)
		if (erro.name === 'AbortError') {
			throw new Error('TIMEOUT')
		}
		throw erro
	}
}

async function buscarCoordenadas(cidade) {
	const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
		cidade
	)}&count=1&language=pt&format=json`
	const resposta = await fetchComTimeout(url)
	const dados = await resposta.json()

	if (!dados.results || dados.results.length === 0) {
		return null
	}

	const resultado = dados.results[0]
	return {
		latitude: resultado.latitude,
		longitude: resultado.longitude,
		nome: resultado.name,
		pais: resultado.country,
	}
}

async function buscarDadosClima(coordenadas) {
	const url = `https://api.open-meteo.com/v1/forecast?latitude=${coordenadas.latitude}&longitude=${coordenadas.longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,precipitation&daily=temperature_2m_max,temperature_2m_min&timezone=auto`
	const resposta = await fetchComTimeout(url)
	const dados = await resposta.json()

	return {
		current: dados.current,
		daily: dados.daily,
	}
}

async function buscarClima() {
	const cidade = cityInput.value.trim()

	if (!validarEntrada(cidade)) {
		mostrarErro(MENSAGENS_ERRO.CIDADE_VAZIA)
		return
	}

	esconderMensagens()
	mostrarCarregamento()

	try {
		const coordenadas = await buscarCoordenadas(cidade)

		if (!coordenadas) {
			mostrarErro(MENSAGENS_ERRO.CIDADE_NAO_ENCONTRADA)
			return
		}

		const dadosClima = await buscarDadosClima(coordenadas)
		exibirClima(coordenadas.nome, coordenadas.pais, dadosClima)
	} catch (erro) {
		tratarErro(erro)
	} finally {
		esconderCarregamento()
	}
}

function tratarErro(erro) {
	console.error('Erro:', erro)
	let mensagem = MENSAGENS_ERRO.GENERICO

	if (erro.message === 'TIMEOUT') {
		mensagem = MENSAGENS_ERRO.TIMEOUT
	} else if (
		erro.message.includes('Failed to fetch') ||
		erro.message.includes('Network')
	) {
		mensagem = MENSAGENS_ERRO.REDE
	} else if (
		erro.message.includes('500') ||
		erro.message.includes('502') ||
		erro.message.includes('503')
	) {
		mensagem = MENSAGENS_ERRO.SERVIDOR
	}

	mostrarErro(mensagem)
}

function exibirClima(nome, pais, dados) {
	esconderMensagens()

	cityName.textContent = `${nome}, ${pais}`
	temperature.textContent = `${Math.round(dados.current.temperature_2m)}°`
	currentDate.textContent = obterDataAtual()

	const clima = obterDescricaoClima(dados.current.weather_code)
	weatherIcon.className = `weather-icon wi ${clima.icone}`
	description.textContent = clima.descricao

	humidity.textContent = `${Math.round(
		dados.current.relative_humidity_2m
	)}%`
	windSpeed.textContent = `${Math.round(
		dados.current.wind_speed_10m
	)} km/h`
	precipitation.textContent = `${dados.current.precipitation || 0} mm`

	tempMax.textContent = `${Math.round(dados.daily.temperature_2m_max[0])}°`
	tempMin.textContent = `${Math.round(dados.daily.temperature_2m_min[0])}°`

	searchScreen.style.display = 'none'
	resultScreen.style.display = 'flex'
}

function obterDescricaoClima(codigo) {
	const codigos = {
		0: { descricao: 'Céu limpo', icone: 'wi-day-sunny' },
		1: {
			descricao: 'Principalmente limpo',
			icone: 'wi-day-sunny-overcast',
		},
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
		96: {
			descricao: 'Tempestade com granizo',
			icone: 'wi-storm-showers',
		},
		99: { descricao: 'Tempestade severa', icone: 'wi-hail' },
	}

	return (
		codigos[codigo] || {
			descricao: 'Clima desconhecido',
			icone: 'wi-na',
		}
	)
}

function voltarParaBusca() {
	cityInput.value = ''
	esconderMensagens()
	resultScreen.style.display = 'none'
	searchScreen.style.display = 'flex'
}

function mostrarErro(mensagem) {
	esconderMensagens()
	error.textContent = mensagem
	error.style.display = 'block'
}

function mostrarCarregamento() {
	loading.style.display = 'block'
}

function esconderCarregamento() {
	loading.style.display = 'none'
}

function esconderMensagens() {
	loading.style.display = 'none'
	error.style.display = 'none'
}

function aplicarTemaHorario() {
	const horaAtual = new Date().getHours()
	const body = document.body

	if (horaAtual >= 18 || horaAtual < 6) {
		body.classList.add('night-mode')
	} else {
		body.classList.remove('night-mode')
	}
}

aplicarTemaHorario()

searchBtn.addEventListener('click', buscarClima)

cityInput.addEventListener('keypress', (evento) => {
	if (evento.key === 'Enter') {
		buscarClima()
	}
})

backBtn.addEventListener('click', voltarParaBusca)
