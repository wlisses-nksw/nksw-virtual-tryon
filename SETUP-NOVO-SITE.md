# Guia de Instalação — Provador Virtual em Novo Site
### Stack: Google Vertex AI · Vercel · GitHub + jsDelivr · Shopify

> **Como usar este guia:**  
> Tudo que você precisa trocar para um novo site está marcado com `🔧 ALTERAR`.  
> O restante é reutilizado exatamente como está.

---

## Visão Geral da Arquitetura

```
Cliente (browser da loja)
   │
   ├─ 1. Clica "EXPERIMENTAR VIRTUALMENTE" → abre modal
   ├─ 2. Faz upload da foto (redimensionada no browser)
   ├─ 3. POST /api/submit → Vertex AI processa (~13s) → retorna imagem
   ├─ 4. Modal exibe resultado + formulário de lead
   └─ 5. Lead enviado para /api/lead → salvo nos Clientes do Shopify
         │
         ▼
   Vercel (funções serverless)
   ├── /api/submit  → autentica no Google, chama Vertex AI Virtual Try-On
   ├── /api/lead    → cria/atualiza cliente no Shopify Admin API
   └── /api/result  → compatibilidade (retorna 404 — modo síncrono não usa)

   Widget JS hospedado via GitHub + jsDelivr CDN
   (URL versioned: https://cdn.jsdelivr.net/gh/USER/REPO@vX.X/widget/tryon-widget.js)
```

---

## Estrutura de Arquivos do Projeto

```
nksw-virtual-tryon/
├── api/
│   ├── submit.js          ← Vercel Function: chama Google Vertex AI
│   ├── lead.js            ← Vercel Function: salva lead no Shopify
│   └── result.js          ← Vercel Function: compatibilidade polling
├── widget/
│   └── tryon-widget.js    ← Widget frontend (modal completo, CSS inline)
├── shopify/
│   └── snippets/
│       └── virtual-tryon.liquid  ← Snippet para páginas de produto
├── vercel.json            ← Timeouts das funções (submit=60s, lead=10s)
├── package.json
└── SETUP-NOVO-SITE.md    ← Este guia
```

---

## O Que Mudar por Site

Há **três grupos de credenciais** a configurar. Nada mais precisa ser editado no código.

| # | Serviço | Onde fica | O que é |
|---|---------|-----------|---------|
| 1 | **Google Cloud** | Vercel env var `GOOGLE_SERVICE_ACCOUNT` | JSON da Service Account com acesso ao Vertex AI |
| 2 | **Shopify** | Vercel env vars `SHOPIFY_STORE` + `SHOPIFY_ADMIN_TOKEN` | Domínio interno + token de acesso Admin |
| 3 | **Vercel** | Configurações do tema Shopify + `theme.liquid` | URL do deploy + URL do widget no jsDelivr |

---

## PARTE 1 — Google Cloud (Vertex AI)

### 1.1 Criar projeto no Google Cloud

1. Acesse **https://console.cloud.google.com**
2. Clique em **"Selecionar projeto"** → **"Novo projeto"**
3. 🔧 **ALTERAR:** dê um nome ao projeto (ex: `minha-loja-tryon`)
4. Clique em **"Criar"**
5. Anote o **Project ID** (ex: `minha-loja-tryon`) — você vai precisar

### 1.2 Ativar a API de Vertex AI

1. No menu lateral: **APIs e Serviços → Biblioteca**
2. Pesquise por `Vertex AI API`
3. Clique nela → **"Ativar"**
4. Aguarde alguns segundos

### 1.3 Criar Service Account

1. Menu lateral: **IAM e Administrador → Contas de serviço**
2. Clique em **"+ Criar conta de serviço"**
3. Nome: `tryon-api` (pode ser qualquer nome)
4. Clique em **"Criar e continuar"**
5. Em **"Papel"**, adicione: `Vertex AI User`
6. Clique em **"Continuar"** → **"Concluído"**

### 1.4 Gerar a chave JSON

1. Clique na conta de serviço recém-criada
2. Aba **"Chaves"** → **"Adicionar chave"** → **"Criar nova chave"**
3. Tipo: **JSON** → **"Criar"**
4. Um arquivo `.json` é baixado automaticamente — **guarde com segurança**

### 1.5 Atualizar o Project ID no código

No arquivo `api/submit.js`, linha 6:

```js
// 🔧 ALTERAR: troque pelo Project ID do novo Google Cloud
const PROJECT_ID = 'minha-loja-tryon';
```

> O `LOCATION` (`us-central1`) e o `MODEL` (`virtual-try-on-001`) **não precisam mudar**.

---

## PARTE 2 — Shopify (Admin API + OAuth)

### 2.1 Criar um App Privado no Shopify

Você precisa de um token de acesso Admin para salvar leads nos Clientes.

1. No painel Shopify: **Configurações → Apps e canais de vendas**
2. No rodapé da página, clique em **"Desenvolver apps"**
3. Clique em **"Criar um app"**
4. 🔧 **ALTERAR:** Nome: `Provador Virtual` (ou o nome que quiser)
5. Clique em **"Criar app"**

### 2.2 Configurar permissões do App

1. Clique em **"Configurar escopos da API Admin"**
2. Ative as permissões:
   - ✅ `write_customers` — para salvar leads
   - ✅ `read_customers` — para verificar se e-mail já existe
3. Clique em **"Salvar"**

### 2.3 Instalar o App e obter o token

1. Clique na aba **"Credenciais da API"**
2. Clique em **"Instalar app"** → confirme
3. Em **"Token de acesso da API Admin"**, clique em **"Revelar token uma vez"**
4. **Copie o token** imediatamente (começa com `shpat_...`)
5. 🔧 **ALTERAR:** Este é o `SHOPIFY_ADMIN_TOKEN`

### 2.4 Identificar o domínio interno da loja

O domínio que vai na variável `SHOPIFY_STORE` **não é o domínio público** — é o domínio `.myshopify.com`:

- Exemplo: `minha-loja.myshopify.com`
- Encontre em: **Configurações → Loja** → campo "Domínio da loja"

---

## PARTE 3 — Vercel (Deploy das Funções)

### 3.1 Criar conta e importar repositório

1. Acesse **https://vercel.com/signup** → entre com GitHub
2. Clique em **"New Project"**
3. Importe o repositório `nksw-virtual-tryon` (ou o nome que você der)
4. **Framework Preset:** Other
5. Deixe Build Command e Output Directory em branco
6. Clique em **"Deploy"**
7. Anote a URL gerada (ex: `https://minha-loja-tryon.vercel.app`)

### 3.2 Configurar Variáveis de Ambiente

No painel Vercel: **Settings → Environment Variables**

Adicione as três variáveis abaixo (marque **Production + Preview + Development**):

---

#### Variável 1 — Google Service Account

- **Key:** `GOOGLE_SERVICE_ACCOUNT`
- **Value:** Cole o conteúdo **completo** do arquivo JSON baixado no Passo 1.4

O JSON tem este formato (todos os campos são necessários):
```json
{
  "type": "service_account",
  "project_id": "minha-loja-tryon",
  "private_key_id": "...",
  "private_key": "-----BEGIN RSA PRIVATE KEY-----\n...",
  "client_email": "tryon-api@minha-loja-tryon.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  ...
}
```

> ⚠️ Cole o JSON inteiro em **uma única linha** ou como texto normal — o Vercel aceita os dois.

---

#### Variável 2 — Shopify Store

- **Key:** `SHOPIFY_STORE`
- 🔧 **Value:** `minha-loja.myshopify.com`

> ⚠️ Sem `https://`, sem `/`, sem espaços. Somente o domínio.

---

#### Variável 3 — Shopify Admin Token

- **Key:** `SHOPIFY_ADMIN_TOKEN`
- 🔧 **Value:** `shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

---

### 3.3 Fazer Redeploy após salvar as variáveis

1. **Deployments** → passe o mouse no deploy mais recente → **···** → **Redeploy**
2. Aguarde ~30s

### 3.4 Testar

Acesse no navegador:
```
https://SEU-DEPLOY.vercel.app/api/result?jobId=teste
```
Deve retornar `{"error": "..."}` (qualquer JSON, desde que não seja erro de credenciais).

---

## PARTE 4 — Widget (GitHub + jsDelivr CDN)

O widget é o arquivo `widget/tryon-widget.js`. Ele é hospedado no GitHub e servido via jsDelivr com versionamento por tag.

### 4.1 Subir o código para o GitHub

1. Crie um repositório no GitHub com todos os arquivos do projeto
2. Faça o push inicial

### 4.2 Criar tag de versão

Após cada atualização no widget, crie uma tag para forçar a atualização no CDN:

```bash
git tag v1.0
git push origin v1.0
```

### 4.3 URL do widget no jsDelivr

A URL segue este padrão:
```
https://cdn.jsdelivr.net/gh/SEU-USUARIO/SEU-REPO@v1.0/widget/tryon-widget.js
```

🔧 **ALTERAR:** troque `SEU-USUARIO`, `SEU-REPO` e `v1.0` pelos seus valores.

### 4.4 Purgar cache após nova tag (quando atualizar)

Acesse no navegador para forçar atualização imediata:
```
https://purge.jsdelivr.net/gh/SEU-USUARIO/SEU-REPO@v1.0/widget/tryon-widget.js
```

---

## PARTE 5 — Shopify (Tema)

### 5.1 Adicionar campo de configuração para a URL do Vercel

1. **Loja Online → Temas → Editar código**
2. Abra `config/settings_schema.json`
3. Antes do último `]`, adicione:

```json
,{
  "name": "Provador Virtual",
  "settings": [
    {
      "type": "text",
      "id": "vton_api_url",
      "label": "URL do Vercel (API)",
      "info": "Ex: https://minha-loja-tryon.vercel.app",
      "placeholder": "https://..."
    }
  ]
}
```

4. Clique em **"Salvar"**

### 5.2 Inserir a URL do Vercel nas configurações do tema

1. **Loja Online → Temas → Personalizar**
2. Canto inferior esquerdo → **"Configurações do tema"** (ícone de engrenagem)
3. Role até **"Provador Virtual"**
4. 🔧 **ALTERAR:** Cole a URL do seu Vercel: `https://SEU-DEPLOY.vercel.app`
5. Clique em **"Salvar"**

### 5.3 Criar o snippet do botão

1. **Loja Online → Temas → Editar código**
2. Em **Snippets**, clique em **"Add a new snippet"**
3. Nome: `virtual-tryon` → **"Create snippet"**
4. Apague o conteúdo padrão
5. Cole o conteúdo do arquivo `shopify/snippets/virtual-tryon.liquid`
6. 🔧 **ALTERAR (opcional):** texto do botão e emoji na linha:
   ```html
   <span aria-hidden="true">👙</span>
   EXPERIMENTAR VIRTUALMENTE
   ```
7. Clique em **"Salvar"**

### 5.4 Chamar o snippet na página de produto

1. Abra o arquivo de template de produto:
   - Temas modernos (Dawn, etc.): `sections/main-product.liquid`
   - Debut: `sections/product-template.liquid`
   - Temas antigos: `templates/product.liquid`
   
   > Dica: pesquise por `add_to_cart` para encontrar o lugar certo
   
2. Logo após o bloco do botão de compra, adicione:

```liquid
{% render 'virtual-tryon' %}
```

3. Clique em **"Salvar"**

### 5.5 Adicionar o script do widget ao tema

1. Abra `layout/theme.liquid`
2. Localize `</body>` (final do arquivo)
3. 🔧 **ALTERAR:** Logo antes de `</body>`, adicione a linha com a sua URL do jsDelivr:

```html
<script src="https://cdn.jsdelivr.net/gh/SEU-USUARIO/SEU-REPO@v1.0/widget/tryon-widget.js" defer></script>
```

4. Clique em **"Salvar"**

---

## PARTE 6 — Textos e Marca (Opcional)

Estes textos estão no arquivo `widget/tryon-widget.js` e podem ser ajustados conforme a identidade da marca:

| Local no código | Texto atual | Onde mudar |
|-----------------|-------------|------------|
| Linha ~192 | `👙 Provador Virtual` (título do modal) | `buildModal()` → `nksw-title` |
| Linha ~237 | `🌊 Gostou do resultado?` (título do lead) | `nksw-lead-title` |
| Linha ~238 | `Cadastre-se e receba as novidades da Naked SW...` | `nksw-lead-sub` |
| Linha ~242 | `Quero receber novidades` (botão do lead) | `nksw-lead-submit` |
| Linha ~424 | `meu-look-nksw.jpg` (nome do arquivo ao salvar) | `saveBtn click` |

Após qualquer edição no widget, **crie uma nova tag** e **faça o purge** no jsDelivr (Parte 4.2 e 4.4).

---

## PARTE 7 — Categorias por Produto (Metafields)

Para resultados mais precisos, classifique cada produto com um metafield.

### 7.1 Criar o metafield

1. **Configurações → Metafields personalizados → Produtos**
2. **"Adicionar definição"**
3. Preencha:
   - **Nome:** Categoria VTON
   - **Namespace e chave:** `custom.vton_category`
   - **Tipo:** Texto de linha única
4. **"Salvar"**

### 7.2 Preencher nos produtos

Abra cada produto → role até **Metafields** → preencha:

| Valor | Quando usar |
|-------|-------------|
| `tops` | Top de biquíni, cropped, camiseta |
| `bottoms` | Calcinha, sunga, shorts |
| `one-pieces` | Maiô, body, macaquinho |
| `auto` | Deixa a IA decidir (padrão se não preencher) |

### 7.3 Imagem personalizada para o try-on (opcional)

Por padrão, o widget usa a imagem principal do produto. Para usar uma imagem específica:

1. Crie um metafield nos produtos:
   - **Namespace e chave:** `custom.vton_image_url`
   - **Tipo:** Texto de linha única (URL)
2. Cole a URL da imagem que quer usar (de frente, sem modelo, fundo limpo)

---

## Checklist Completo

### Google Cloud
- [ ] Projeto criado e Project ID anotado
- [ ] API Vertex AI ativada no projeto
- [ ] Service Account criada com papel `Vertex AI User`
- [ ] Chave JSON baixada
- [ ] `PROJECT_ID` em `api/submit.js` atualizado

### Vercel
- [ ] Repositório importado e deploy funcionando
- [ ] URL do Vercel anotada
- [ ] `GOOGLE_SERVICE_ACCOUNT` salvo (JSON completo)
- [ ] `SHOPIFY_STORE` salvo (ex: `loja.myshopify.com`, sem https)
- [ ] `SHOPIFY_ADMIN_TOKEN` salvo (ex: `shpat_...`)
- [ ] Redeploy feito após salvar variáveis

### Shopify — App
- [ ] App criado com escopos `write_customers` + `read_customers`
- [ ] App instalado na loja
- [ ] Token `shpat_...` copiado e salvo no Vercel

### GitHub + jsDelivr
- [ ] Repositório criado com todos os arquivos
- [ ] Tag de versão criada (ex: `v1.0`)
- [ ] URL do jsDelivr testada no navegador
- [ ] Cache purgado se necessário

### Shopify — Tema
- [ ] `settings_schema.json` atualizado com campo `vton_api_url`
- [ ] URL do Vercel salva nas Configurações do tema
- [ ] Snippet `virtual-tryon` criado em Snippets
- [ ] `{% render 'virtual-tryon' %}` adicionado no template de produto
- [ ] Script do widget adicionado ao `theme.liquid` (antes de `</body>`)

### Testes
- [ ] Botão aparece na página de produto
- [ ] Modal abre ao clicar
- [ ] Upload e processamento funcionam (~13s)
- [ ] Resultado exibido corretamente
- [ ] Formulário de lead aparece durante o processamento
- [ ] Lead salvo na aba Clientes do Shopify (com tag `newsletter,provador-virtual`)
- [ ] Botão "Salvar foto" faz download
- [ ] Teste no celular (mobile)

---

## Variáveis de Ambiente — Resumo

| Variável | Onde obter | Exemplo |
|----------|-----------|---------|
| `GOOGLE_SERVICE_ACCOUNT` | Arquivo JSON da Service Account | `{"type":"service_account","project_id":...}` |
| `SHOPIFY_STORE` | Configurações da loja Shopify | `minha-loja.myshopify.com` |
| `SHOPIFY_ADMIN_TOKEN` | App privado → Credenciais da API | `shpat_abc123...` |

---

## Solução de Problemas

### Botão não aparece na página do produto
- Verifique se o snippet foi adicionado ao template (Passo 5.4)
- Verifique se a URL do Vercel está nas configurações do tema (Passo 5.2)
- O snippet só renderiza o botão se `settings.vton_api_url` não estiver em branco

### Erro "Credenciais Google não configuradas"
- A variável `GOOGLE_SERVICE_ACCOUNT` está vazia ou mal formatada no Vercel
- Cole o JSON completo (incluindo chaves `{` e `}`)
- Faça redeploy após salvar

### Erro no Vertex AI (400 safety filter)
- Já configurado no código: `safetySetting: 'block_few'` e `personGeneration: 'allow_all'`
- Se ainda ocorrer, verifique se o projeto Google tem a API ativada

### Lead não aparece nos Clientes do Shopify
1. Verifique `SHOPIFY_STORE` — deve ser `loja.myshopify.com` (sem `https://`, sem `/`)
2. Verifique `SHOPIFY_ADMIN_TOKEN` — deve começar com `shpat_`
3. O App precisa ter o escopo `write_customers` ativado E o app deve estar instalado na loja
4. Faça redeploy após corrigir

### Widget não atualiza após mudanças
- Crie uma nova tag no git (`git tag v1.1 && git push origin v1.1`)
- Atualize a URL no `theme.liquid` para a nova versão (`@v1.1`)
- Acesse a URL de purge do jsDelivr

### Timeout — processamento não completa
- Normal em picos de uso do Vertex AI — oriente o cliente a tentar novamente
- O limite de timeout da função no Vercel é 60s (`vercel.json`)
