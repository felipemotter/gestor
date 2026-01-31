---
name: commit
description: Use when the user asks to commit changes, save work, or says "commita", "faz commit", "salva as alteracoes", "commit". Applies best practices for atomic, well-separated commits.
allowed-tools: Bash(git:*), Read, Glob, Grep
user-invocable: true
---

# Commit com boas praticas

Ao fazer commits, siga rigorosamente estas regras:

## 1. Separar por assunto — NUNCA misturar

Cada commit deve conter **um unico assunto/proposito**. Exemplos de separacao:

- Correcao de bug em um arquivo **!=** ajuste de estilo em outro
- Nova feature **!=** refactor de codigo existente
- Alteracao de schema SQL **!=** ajuste de componente React
- Fix de lint/tipos **!=** mudanca de logica de negocio
- Atualizacao de dependencias **!=** mudanca de codigo

## 2. Dividir no maximo que fizer sentido

Sempre prefira **mais commits menores** do que poucos commits grandes. Se uma tarefa tocou 5 arquivos por 3 razoes diferentes, faca 3 commits (ou mais). Pergunte-se: "esse commit faz UMA coisa?" — se a resposta for "faz duas coisas", divida.

## 3. Formato da mensagem (OBRIGATORIO)

Padrao rigido — sem excecoes:

```
<tipo>(<escopo>): <descricao curta em portugues>
```

**NUNCA adicionar Co-Authored-By ou qualquer rodape/trailer.**

### Tipos permitidos

| Tipo | Quando usar |
|------|------------|
| `feat` | Nova funcionalidade ou recurso |
| `fix` | Correcao de bug ou comportamento errado |
| `refactor` | Reestruturacao de codigo sem mudar comportamento |
| `style` | Ajustes visuais, CSS, layout, espacamento |
| `chore` | Configs, dependencias, scripts, CI, limpeza |
| `docs` | Documentacao, README, CLAUDE.md, comentarios |
| `test` | Adicionar ou corrigir testes |
| `perf` | Melhoria de performance |

### Escopos comuns

| Escopo | Quando usar |
|--------|------------|
| `ui` | Componentes visuais, layout, CSS, responsividade |
| `db` | Schema, migrations, SQL, seed |
| `api` | API routes, endpoints |
| `auth` | Autenticacao, sessao, permissoes |
| `imports` | Importacao OFX, parsing |
| `web` | Mudancas gerais no frontend |
| `infra` | Docker, configs, deploy |

Omitir escopo so quando a mudanca for realmente generica.

### Primeira linha (assunto)

- Sempre em **portugues**
- Sempre em **letra minuscula** (sem maiuscula inicial)
- Verbo no **infinitivo**: `adicionar`, `corrigir`, `remover`, `ajustar`, `migrar`
- Maximo **~60 caracteres**
- Focar no **o que muda**

### Corpo (SEMPRE incluir)

Depois da primeira linha, pular uma linha em branco e escrever um corpo com:

- **O que foi feito**: listar as alteracoes concretas (arquivos, componentes, funcoes)
- **Por que**: explicar a motivacao, o problema que existia, ou o contexto da mudanca
- Usar bullet points (`-`) para organizar
- Em portugues, sem formalidade excessiva
- Quebrar linhas em ~72 caracteres

### Exemplos CORRETOS

```
fix(ui): corrigir overflow horizontal no dashboard mobile

- adicionar overflow-x-hidden no html e body (globals.css)
- aumentar padding lateral do layout de px-2 para px-3 em mobile
- adicionar min-w-0 e overflow-hidden nos cards de resumo
- o conteudo estava ultrapassando a largura da tela no celular,
  cortando valores monetarios e badges na borda direita
```

```
feat(api): adicionar rota de exportacao de relatorios

- criar POST /api/reports/export com filtros de periodo e conta
- suportar formato CSV e PDF via query param
- usar service_role para acessar dados de toda a familia
- necessario para a feature de relatorios do roadmap fase 4
```

```
refactor(web): extrair logica de filtros para hook separado

- mover estado e handlers de filtro de lancamentos/page.tsx
  para novo hook useTransactionFilters
- reduzir page.tsx de 400 para 250 linhas
- facilitar reuso dos filtros na pagina de extrato
```

### Exemplos ERRADOS (nunca fazer)

```
fix: bug                          # vago, sem corpo, sem escopo
feat: melhorias gerais            # mistura assuntos
Update files                      # ingles, sem tipo, sem corpo
fix(ui): Fix overflow             # ingles na descricao
chore: ajustes menores            # vago, sem corpo
```

## 4. Processo

1. Rode `git status` e `git diff` (staged + unstaged) para ver TODAS as alteracoes pendentes
2. Analise e agrupe as alteracoes por assunto/proposito
3. Para cada grupo, faca `git add` dos arquivos especificos (NUNCA `git add .` ou `git add -A`)
4. Crie o commit com mensagem adequada seguindo o padrao acima
5. Repita ate nao restar alteracoes
6. Rode `git status` final para confirmar que tudo foi commitado
