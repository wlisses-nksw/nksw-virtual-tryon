# Guia de Implantação — NKSW Provador Virtual
### Stack: GitHub + Vercel + GitHub Pages (100% gratuito) + FASHN API

**Tempo estimado:** 1,5 a 2 horas na primeira vez  
**Custo mensal:** $0 de infraestrutura + FASHN (~$10 por 500 try-ons)

---

## Visão Geral da Arquitetura

```
Cliente (browser Shopify)
   │
   │ 1. Clica "Experimentar" → abre modal
   │ 2. Faz upload da foto (redimensionada no browser)
   │ 3. POST /api/submit → recebe jobId (< 1s)
   │ 4. Polling GET /api/result?jobId=xxx a cada 2s
   │ 5. Quando pronto → exibe imagem gerada
   ▼
Vercel (serverless functions — grátis)
   │
   ├── /api/submit  → envia foto para FASHN, retorna jobId
   └── /api/result  → verifica status FASHN, retorna imagem base64

Imagem NUNCA é armazenada em banco de dados ou disco.
```

---

## Estrutura de arquivos do projeto

```
virtual-tryon/
├── api/
│   ├── submit.js          ← Vercel Function: envia para FASHN
│   └── result.js          ← Vercel Function: verifica resultado
├── widget/
│   └── tryon-widget.js    ← Widget frontend (hospedado no GitHub Pages)
├── shopify/
│   └── snippets/
│       └── virtual-tryon.liquid  ← Snippet para páginas de produto
├── vercel.json            ← Configuração Vercel
├── package.json
└── DEPLOY.md              ← Este guia
```

---

## PARTE 1 — Pré-requisitos (contas gratuitas)

### 1.1 Criar conta GitHub

1. Acesse **https://github.com/signup**
2. Preencha: nome de usuário, e-mail, senha → **"Create account"**
3. Confirme o e-mail
4. Pronto — conta criada

### 1.2 Criar conta Vercel (conectada ao GitHub)

1. Acesse **https://vercel.com/signup**
2. Clique em **"Continue with GitHub"**
3. Autorize o Vercel a acessar o GitHub
4. Escolha **Hobby (Free)** → **"Continue"**
5. Pronto — conta criada e vinculada ao GitHub

### 1.3 Criar conta FASHN (API de try-on)

1. Acesse **https://fashn.ai**
2. Clique em **"Get API Access"** ou **"Sign Up"**
3. Preencha e-mail e senha → confirme o e-mail
4. No painel, vá em **API Keys → Create New Key**
5. **Copie a chave** — ela começa com `fa-...` e só aparece uma vez
6. Cole em algum lugar seguro (ex: bloco de notas por enquanto)

> Custo: ~$0.02 por try-on (pay-as-you-go, sem mensalidade)

---

## PARTE 2 — Criar e publicar o repositório no GitHub

### 2.1 Instalar o GitHub Desktop (mais fácil que linha de comando)

1. Acesse **https://desktop.github.com**
2. Clique em **"Download for Windows"**
3. Instale normalmente (Next → Next → Finish)
4. Abra o GitHub Desktop → **"Sign in to GitHub.com"**
5. Faça login com sua conta GitHub

### 2.2 Criar um novo repositório

1. No GitHub Desktop: **File → New Repository**
2. Preencha:
   - **Name:** `nksw-virtual-tryon`
   - **Description:** Provador virtual NKSW
   - **Local path:** Escolha onde salvar (ex: Documentos)
   - **☑ Initialize this repository with a README** → marque
3. Clique em **"Create Repository"**

### 2.3 Copiar os arquivos do projeto para o repositório

1. Abra o **Explorador de Arquivos** do Windows
2. Navegue até onde o GitHub Desktop salvou o repositório  
   (ex: `Documentos\nksw-virtual-tryon`)
3. Copie **todos** os arquivos e pastas da pasta `virtual-tryon` deste projeto para dentro de `nksw-virtual-tryon`:
   - Pasta `api/`
   - Pasta `widget/`
   - Pasta `shopify/`
   - `vercel.json`
   - `package.json`

A estrutura dentro de `nksw-virtual-tryon` deve ficar assim:
```
nksw-virtual-tryon/
├── api/
│   ├── submit.js
│   └── result.js
├── widget/
│   └── tryon-widget.js
├── shopify/
│   └── snippets/
│       └── virtual-tryon.liquid
├── vercel.json
├── package.json
└── README.md
```

### 2.4 Fazer o primeiro commit e push

1. No GitHub Desktop, você verá todos os arquivos listados em **"Changes"**
2. Na caixa **"Summary"** (canto inferior esquerdo), digite:  
   `Provador virtual inicial`
3. Clique em **"Commit to main"**
4. Clique em **"Publish repository"** (botão azul no topo)
5. Na janela que aparecer:
   - **☐ Keep this code private** → pode deixar marcado ou desmarcar (não importa)
   - Clique em **"Publish Repository"**
6. Pronto — o código está no GitHub

---

## PARTE 3 — Deploy no Vercel

### 3.1 Importar o repositório no Vercel

1. Acesse **https://vercel.com/new**
2. Em **"Import Git Repository"**, você verá `nksw-virtual-tryon`
3. Clique em **"Import"** ao lado dele
4. Na tela de configuração:
   - **Framework Preset:** Other (deixe como está)
   - **Root Directory:** deixe em branco (raiz do projeto)
   - **Build Command:** deixe em branco
   - **Output Directory:** deixe em branco
5. Clique em **"Deploy"**
6. Aguarde ~30 segundos. Quando aparecer **"Congratulations!"** → anote a URL gerada:  
   `https://nksw-virtual-tryon.vercel.app` (ou similar)

### 3.2 Configurar as variáveis de ambiente (API keys)

1. No painel Vercel, clique no projeto `nksw-virtual-tryon`
2. Clique em **"Settings"** (menu superior)
3. Clique em **"Environment Variables"** (menu lateral)
4. Adicione as variáveis uma a uma, clicando em **"Add"** para cada:

**Variável 1:**
- Key: `FASHN_API_KEY`
- Value: Cole sua chave FASHN (ex: `fa-abc123...`)
- Environments: marque **Production**, **Preview** e **Development**
- Clique **"Save"**

**Variável 2:**
- Key: `ALLOWED_SHOP_DOMAIN`
- Value: O domínio da sua loja (ex: `nakedsw.myshopify.com`)
- Environments: marque os três
- Clique **"Save"**

### 3.3 Fazer redeploy para aplicar as variáveis

1. Clique em **"Deployments"** (menu superior)
2. Passe o mouse sobre o deployment mais recente → clique nos **três pontinhos** (···)
3. Clique em **"Redeploy"** → confirme com **"Redeploy"**
4. Aguarde ~20s
5. O deploy está completo ✅

### 3.4 Testar as funções

Abra seu navegador e acesse (substitua pela sua URL Vercel):

```
https://nksw-virtual-tryon.vercel.app/api/result?jobId=teste
```

Deve aparecer algo como:
```json
{"error":"FASHN status error 404"}
```

Se apareceu esse erro (e não "API key não configurada") → as variáveis foram aplicadas corretamente ✅

---

## PARTE 4 — Hospedar o widget no GitHub Pages

O arquivo `widget/tryon-widget.js` precisa de uma URL pública. O GitHub Pages serve isso gratuitamente.

### 4.1 Ativar o GitHub Pages

1. Acesse **https://github.com/SEU-USUARIO/nksw-virtual-tryon**  
   (substitua SEU-USUARIO pelo seu usuário do GitHub)
2. Clique em **"Settings"** (aba superior, não a engrenagem)
3. No menu lateral, clique em **"Pages"**
4. Em **"Branch"**, selecione `main` na primeira caixa e `/` (root) na segunda
5. Clique em **"Save"**
6. Aguarde ~2 minutos
7. Atualize a página — aparecerá o aviso:  
   **"Your site is live at https://SEU-USUARIO.github.io/nksw-virtual-tryon/"**

### 4.2 Confirmar URL do widget

A URL do seu widget será:
```
https://SEU-USUARIO.github.io/nksw-virtual-tryon/widget/tryon-widget.js
```

**Anote essa URL** — você vai precisar na Parte 5.

---

## PARTE 5 — Configurar o Shopify

### 5.1 Adicionar campo de configuração para a URL do Vercel

1. No painel Shopify: **Loja Online → Temas → Editar código**
2. Abra o arquivo `config/settings_schema.json`
3. No **final do arquivo**, localize o último `]` e adicione **antes** dele:

```json
,{
  "name": "Provador Virtual",
  "settings": [
    {
      "type": "text",
      "id": "vton_api_url",
      "label": "URL do Vercel (API)",
      "info": "Ex: https://nksw-virtual-tryon.vercel.app",
      "placeholder": "https://..."
    }
  ]
}
```

4. Clique em **"Salvar"**

> Se o arquivo já tiver algo similar de uma configuração anterior, atualize o `id` de `vton_worker_url` para `vton_api_url`.

### 5.2 Inserir a URL do Vercel nas configurações do tema

1. **Loja Online → Temas → Personalizar**
2. No canto inferior esquerdo, clique em **"Configurações do tema"** (ícone de engrenagem)
3. Role até **"Provador Virtual"**
4. Cole a URL do Vercel:  
   `https://nksw-virtual-tryon.vercel.app`
5. Clique em **"Salvar"**

### 5.3 Adicionar o snippet ao código do tema

1. **Loja Online → Temas → Editar código**
2. Em **Snippets**, clique em **"Add a new snippet"**
3. Nome: `virtual-tryon` → clique em **"Create snippet"**
4. **Apague** todo o conteúdo que aparecer
5. Abra o arquivo `shopify/snippets/virtual-tryon.liquid` deste projeto
6. Copie todo o conteúdo e cole no editor Shopify
7. Clique em **"Salvar"**

### 5.4 Adicionar o snippet ao template de produto

1. Ainda em **Editar código**, abra a seção do produto.  
   Dependendo do tema, o arquivo é:
   - **Dawn / temas modernos:** `sections/main-product.liquid`
   - **Debut:** `sections/product-template.liquid`
   - **Temas antigos:** `templates/product.liquid`

   > Dica: Se não souber qual é, pesquise no editor por "add_to_cart"

2. Localize a linha que contém `form` ou `add_to_cart` (o botão de compra)
3. Depois do fechamento do botão de compra, adicione em nova linha:

```liquid
{% render 'virtual-tryon' %}
```

4. Clique em **"Salvar"**

### 5.5 Adicionar o script do widget ao tema

1. Abra o arquivo `layout/theme.liquid`
2. Localize a tag `</body>` (bem no final do arquivo)
3. **Imediatamente antes** de `</body>`, adicione:

```html
<script src="https://SEU-USUARIO.github.io/nksw-virtual-tryon/widget/tryon-widget.js" defer></script>
```

Substitua `SEU-USUARIO` pelo seu usuário do GitHub.

4. Clique em **"Salvar"**

---

## PARTE 6 — Configurar categorias por produto

Para que a IA gere resultados melhores, classifique cada produto:

### 6.1 Criar o metafield de categoria

1. **Configurações → Metafields personalizados → Produtos**
2. Clique em **"Adicionar definição"**
3. Preencha:
   - **Nome:** Categoria VTON
   - **Namespace e chave:** `custom.vton_category`
   - **Tipo de conteúdo:** Texto de linha única
4. Clique em **"Salvar"**

### 6.2 Preencher em cada produto

1. Abra um produto no Shopify
2. Role até **"Metafields"** (parte inferior da página)
3. Em **"Categoria VTON"**, preencha:
   - `tops` → top de biquini
   - `bottoms` → calcinha, sunga
   - `one-pieces` → maiô, body inteiro
   - `auto` → deixa a IA decidir (padrão se não preencher)
4. Clique em **"Salvar"**

---

## PARTE 7 — Testar na loja

### 7.1 Verificar se o botão aparece

1. Abra qualquer página de produto da sua loja
2. O botão **"👙 Experimentar Virtualmente"** deve aparecer abaixo do botão de compra

> Se não aparecer, verifique se salvou a URL do Vercel nas configurações do tema (Passo 5.2)

### 7.2 Teste completo

1. Clique em **"👙 Experimentar Virtualmente"**
2. O modal deve abrir
3. Faça upload de uma foto de corpo inteiro (boa iluminação, fundo limpo)
4. Clique em **"✨ Experimentar agora"**
5. Aguarde ~10-15 segundos (barra de progresso avança)
6. A imagem gerada aparece ✅
7. Botão **"💾 Salvar foto"** faz download da imagem gerada
8. Botão **"🔄 Tentar novamente"** volta para o início

### 7.3 Testar no celular

80% dos clientes usam mobile. Abra o link do produto no celular e repita o teste.

---

## PARTE 8 — Atualizações futuras

Sempre que precisar alterar o código (ex: trocar API, ajustar cores do modal):

1. Edite os arquivos localmente
2. No GitHub Desktop → os arquivos modificados aparecem automaticamente em **"Changes"**
3. Digite um resumo (ex: `Ajuste de cor do botão`)
4. Clique em **"Commit to main"**
5. Clique em **"Push origin"**
6. Vercel detecta o push e faz redeploy automaticamente em ~30s ✅

---

## Solução de Problemas

### Botão não aparece na página do produto
- Verifique se o snippet foi adicionado ao template de produto (Passo 5.4)
- Verifique se a URL do Vercel está salva nas configurações do tema (Passo 5.2)

### Erro "Unauthorized origin" no console do navegador
- A URL da sua loja não bate com `ALLOWED_SHOP_DOMAIN` no Vercel
- Vá em Vercel → Settings → Environment Variables → edite `ALLOWED_SHOP_DOMAIN`
- Faça redeploy (Passo 3.3)

### Erro "API key não configurada"
- A variável `FASHN_API_KEY` não foi salva ou está errada
- Verifique em Vercel → Settings → Environment Variables
- Certifique-se de que fez redeploy após salvar

### Imagem gerada com cor errada
- Configure o metafield `custom.vton_category` correto no produto (Passo 6.2)
- A categoria errada (ex: `tops` num produto de calcinha) causa distorção

### Timeout — barra trava e aparece erro
- Sobrecarga pontual na API FASHN — oriente o cliente a tentar novamente
- Se for frequente, entre em contato com o suporte FASHN

### Modal abre mas imagem não carrega no resultado
- Abra o console do navegador (F12 → Console) e veja o erro
- Compartilhe o erro para análise

---

## Custos mensais estimados

| Serviço | Uso | Custo |
|---------|-----|-------|
| GitHub | Repositório + Pages | **Grátis** |
| Vercel | Funções serverless | **Grátis** |
| FASHN API | 500 try-ons | ~**$10** |
| FASHN API | 2.000 try-ons | ~**$40** |
| **Total (500/mês)** | | **~$10/mês** |
| **Total (2.000/mês)** | | **~$40/mês** |

---

## Checklist final antes de ir ao ar

- [ ] Conta FASHN criada e API key copiada
- [ ] Repositório GitHub criado com todos os arquivos
- [ ] Deploy Vercel funcionando (`/api/result?jobId=teste` retorna JSON)
- [ ] Variáveis de ambiente salvas no Vercel (`FASHN_API_KEY` + `ALLOWED_SHOP_DOMAIN`)
- [ ] GitHub Pages ativo e widget acessível via URL pública
- [ ] Snippet `virtual-tryon` adicionado ao Shopify
- [ ] Snippet chamado no template de produto
- [ ] Script do widget adicionado ao `theme.liquid`
- [ ] URL do Vercel salva nas configurações do tema
- [ ] Metafield de categoria preenchido nos produtos principais
- [ ] Teste completo feito em desktop e mobile
