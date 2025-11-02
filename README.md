# Aplicativo de Previsão do Tempo

<br />

<div align="center">
	<img src="https://imgur.com/q6ZRYV4.png" title="source: imgur.com" />
</div>
<br />

---

<div align="center">
  <img src="https://img.shields.io/github/repo-size/rafaelq80/projeto_clima?style=flat-square" />
  <img src="https://img.shields.io/badge/HTML-5-orange.svg" />
  <img src="https://img.shields.io/badge/CSS-3-purple.svg" />
  <img src="https://img.shields.io/badge/JavaScript-ES6+-yellow.svg" />
  <img src="https://img.shields.io/github/last-commit/rafaelq80/projeto_clima?style=flat-square" />
  <img src="https://img.shields.io/github/issues/rafaelq80/projeto_clima?style=flat-square" />
  <img src="https://img.shields.io/github/issues-pr/rafaelq80/projeto_clima?style=flat-square" />
  <img src="https://img.shields.io/badge/License-MIT-blue.svg">
</div>

---

<br />

## 1. Descrição

<br />

Aplicação web moderna e totalmente responsiva para consulta de **previsão do tempo em tempo real**, desenvolvida com **HTML5, CSS e JavaScript**. Integra as APIs **Open-Meteo** (Geocoding e Weather Forecast) para fornecer informações meteorológicas precisas e atualizadas de qualquer cidade do mundo, exibindo dados detalhados para o **dia atual** e para os **próximos quatro dias**.

<br />

## 2. Funcionalidades

- **Busca inteligente de cidades** com validação de entrada
- Dados meteorológicos em tempo real:
  - Condição do tempo (Ensolarado, Nublado, Chuvoso, entre outros)
  - Temperatura atual (Máxima e Mínima do dia)
- **Previsão estendida** para os próximos 4 dias
- **Tema dinâmico** que alterna automaticamente entre modo diurno (6h-18h) e noturno (18h-6h)
- **Design responsivo** otimizado para desktop, tablet e mobile
- **Performance otimizada** com timeout de requisições e tratamento robusto de erros
- **Interface intuitiva** com ícones visuais representativos do clima

<br />

## 3.  Tecnologias Utilizadas



### 3.1. Frontend

- **HTML5** - Estrutura semântica da aplicação

- CSS3

   \- Estilização avançada com:

  - Variáveis CSS customizadas
  - Flexbox e Grid Layout
  - Animações e transições suaves
  - Media queries para responsividade

- JavaScript (ES6+)

   \- Lógica da aplicação com:

  - Async/await para requisições assíncronas
  - Fetch API para consumo de dados
  - AbortController para timeout de requisições
  - Template literals e arrow functions

### 3.2. APIs Externas

- **[Open-Meteo Geocoding API](https://open-meteo.com/en/docs/geocoding-api)** - Geolocalização de cidades
- **[Open-Meteo Weather Forecast API](https://open-meteo.com/en/docs)** - Dados meteorológicos

### 3.3. Bibliotecas de Ícones

- **[Weather Icons 2.0.12](https://erikflowers.github.io/weather-icons/)** - Ícones meteorológicos temáticos

### 3.4. Ferramentas de Desenvolvimento

- **[Jest](https://jestjs.io/)** - Framework de testes unitários
- **[Google Fonts (Poppins)](https://fonts.google.com/specimen/Poppins)** - Tipografia moderna

<br />

## 4. Pré-requisitos

- **Navegador moderno** (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- **Conexão com a internet** (para consumo das APIs)
- **Node.js 14+** e **npm 6+** (somente para executar testes)

<br />

## 5. Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/rafaelq80/projeto_clima.git
cd projeto_clima
```

### 2. Estrutura de diretórios

Certifique-se de que a estrutura de pastas esteja semelhante a estrutura abaixo:

```
previsao-do-tempo/
│
├── assets/
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   └── api.js
│   └── images/
│       ├── favicon.svg
│       └── home.svg
│
├── tests/
│   └── api.test.js
│
├── index.html
├── LICENSE
├── README.md
└── package.json
```

### 3. Instalação de dependências (para testes)

Se você deseja executar os testes automatizados:

```bash
npm install --save-dev jest
```

<br />

## 6. Como Executar

### Método 1: Abertura Direta no Navegador

1. Navegue até a pasta do projeto
2. Abra o arquivo `index.html` diretamente no navegador
3. A aplicação estará pronta para uso!

### Método 2: Usando Live Server (Recomendado)

Se você usa **Visual Studio Code**:

1. Instale a extensão [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)
2. Clique com o botão direito em `index.html`
3. Selecione **"Open with Live Server"**
4. A aplicação será aberta automaticamente em `http://localhost:5500`

<br />

## 7. Como Usar

### 1. Buscar Previsão do Tempo

1. Digite o nome da cidade no campo de busca (ex: "São Paulo")
2. Clique no botão **"Buscar"** ou pressione **Enter**
3. Aguarde o carregamento dos dados

### 2. Visualizar Informações

Após a busca bem-sucedida, você verá:

- **Temperatura atual** com máxima e mínima do dia

- **Condições climáticas** com ícone representativo

- **Data atual** formatada em português

- Previsão dos próximos 4 dias

   com:

  - Dia da semana e data
  - Condições esperadas
  - Temperaturas máxima e mínima

### 3. Nova Busca

Clique no botão 🏠 (home) para retornar à tela de busca.

### Exemplos de Cidades

```
São Paulo
Rio de Janeiro
New York
London
Tokyo
Paris
```

<br />

## 8. Executando os Testes

O projeto inclui **15 testes unitários** que cobrem:

- ✅ Busca bem-sucedida de dados meteorológicos
- ✅ Validação de entrada do usuário
- ✅ Tratamento de cidades inexistentes
- ✅ Tratamento de erros de rede
- ✅ Rate limiting da API
- ✅ Timeout de requisições
- ✅ Breaking changes de API
- ✅ Funções de tema dinâmico

### Executar todos os testes

```bash
npm test
```

### Executar testes em modo watch

```bash
npm test -- --watch
```

### Cobertura de testes

```bash
npm test -- --coverage
```

### Exemplo de saída esperada

```
PASS  tests/api.test.js
  App de Clima - Testes Unitários
    Busca do Clima - Sucesso
      ✓ deve retornar coordenadas e dados meteorológicos para cidade válida (25ms)
    Validação de Entrada
      ✓ deve rejeitar entrada vazia (2ms)
      ✓ deve rejeitar entrada com apenas espaços em branco (1ms)
      ✓ deve aceitar entrada válida após trim (1ms)
    ...

Test Suites: 1 passed, 1 total
Tests:       15 passed, 15 total
```

<br />

## 9. Personalização

### Alterar cores do tema

Edite as variáveis CSS em `assets/css/styles.css`:

```css
:root {
    --sky-light: #E0F6FF;
    --sky-medium: #87CEEB;
    --sky-dark: #4A90E2;
    --night-dark: #1a1a2e;
    /* ... */
}
```

### Ajustar horário do tema noturno

Modifique a função `aplicarTemaHorario()` em `assets/js/api.js`:

```javascript
function aplicarTemaHorario() {
    const horaAtual = new Date().getHours();
    // Altere os valores 18 e 6 conforme necessário
    if (horaAtual >= 18 || horaAtual < 6) {
        document.body.classList.add('night-mode');
    }
}
```

### Modificar timeout das requisições

Altere a constante em `assets/js/api.js`:

```javascript
const TIMEOUT_MS = 10000; // 10 segundos (valor em ms)
```

<br />

## 10. Segurança e Boas Práticas

### Implementadas no Projeto

- ✅ **Validação de entrada** - Sanitização de dados do usuário
- ✅ **Timeout de requisições** - Previne requisições indefinidas
- ✅ **Tratamento de erros robusto** - Mensagens amigáveis ao usuário
- ✅ **Uso de HTTPS** - Todas as APIs são acessadas via protocolo seguro
- ✅ **Sem armazenamento local** - Dados não são persistidos no navegador
- ✅ **Rate limiting awareness** - Tratamento de erro 429 (Too Many Requests)

### Recomendações para Produção

Se você planeja hospedar esta aplicação:

1. **Use HTTPS** - Configure certificado SSL
2. **Configure CSP** - Content Security Policy headers
3. **Implemente cache** - Para reduzir chamadas à API
4. **Monitore uso da API** - Evite exceder limites de requisições
5. **Adicione analytics** - Para monitorar uso e erros

<br />

## 11. APIs Utilizadas

### Open-Meteo Geocoding API

**Endpoint:** `https://geocoding-api.open-meteo.com/v1/search`

**Parâmetros:**

- `name` - Nome da cidade
- `count` - Número de resultados (1)
- `language` - Idioma (pt)
- `format` - Formato da resposta (json)

### Open-Meteo Weather Forecast API

**Endpoint:** `https://api.open-meteo.com/v1/forecast`

**Parâmetros:**

- `latitude` e `longitude` - Coordenadas geográficas
- `current` - Variáveis meteorológicas atuais
- `daily` - Variáveis de previsão diária
- `timezone` - Fuso horário automático
- `forecast_days` - Número de dias de previsão (5)

**Nota:** As APIs Open-Meteo são gratuitas e não requerem chave de API. Para uso comercial ou alto volume de requisições, consulte [open-meteo.com/en/pricing](https://open-meteo.com/en/pricing).

<br />

## 12. Responsividade

O layout se adapta automaticamente para:

- **Desktop** (>768px) - Layout completo com todos os elementos
- **Tablet** (480px-768px) - Ajustes de espaçamento e tamanho de fonte
- **Mobile** (<480px) - Layout otimizado para telas pequenas

<br />

## 13.  Tratamento de Erros

A aplicação trata diversos cenários de erro:

| Cenário               | Mensagem Exibida                                     |
| --------------------- | ---------------------------------------------------- |
| Campo vazio           | "Por favor, digite o nome de uma cidade."            |
| Cidade não encontrada | "Cidade não encontrada. Tente novamente."            |
| Timeout de requisição | "A requisição demorou muito. Verifique sua conexão." |
| Erro de rede          | "Erro de conexão. Verifique sua internet."           |
| Erro no servidor      | "Erro no servidor. Tente novamente mais tarde."      |
| Erro desconhecido     | "Erro ao buscar dados. Tente novamente."             |

<br />

## 14. Contribuindo

Contribuições são bem-vindas! Para contribuir:

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/NovaFuncionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/NovaFuncionalidade`)
5. Abra um Pull Request

### Diretrizes de Contribuição

- Mantenha o código limpo e documentado
- Adicione testes para novas funcionalidades
- Siga os padrões de código existentes
- Atualize a documentação quando necessário

<br />

## 15. Licença

Este projeto está licenciado sob a **Licença MIT** - veja o arquivo [LICENSE](https://claude.ai/chat/LICENSE) para detalhes.

A Licença MIT permite:

- ✅ Uso comercial
- ✅ Modificação
- ✅ Distribuição
- ✅ Uso privado

### 15.1. Limitações de Uso

#### API Open-Meteo
- **Gratuito:** 10.000 requisições/dia
- **Throttling:** Máximo 2 segundos entre requisições (já implementado)
- **Comercial:** Para uso em produção com alto tráfego, considere 
  [planos pagos](https://open-meteo.com/en/pricing)

#### Conformidade Legal
- Projeto licenciado sob MIT License
- Dados meteorológicos: CC BY 4.0 (atribuição obrigatória)
- Uso comercial permitido respeitando as licenças das dependências

<br />

## 16. Autor

**Rafael Queiroz**

- 📧 Email: [rafaelproinfo@gmail.com](mailto:rafaelproinfo@gmail.com)
- 💼 LinkedIn: [linkedin.com/in/rafaelproinfo](https://linkedin.com/in/rafaelproinfo)
- 🐙 GitHub: [@rafaelq80

<br />

**⭐ Se este projeto foi útil, considere dar uma estrela no GitHub!**

