<!--
MODELO DO RELATÓRIO DE ENTREGA

Copie para docs/delivery/reports/<AAAA-MM-DD>/report.md e preencha durante a etapa. O /deliver faz isso
sozinho. Regras:

- Cada item termina com um status (✅ ❌ ➖ 🔒) e, quando reprovado, uma gravidade (🔴 🟡 🟢). As regras estão
  em docs/delivery/README.md.
- "Evidência" é o que foi medido, escrito: o número, o código HTTP, a contagem, o comando. Print não conta,
  porque não vai para o Git.
- Nunca cole segredo, token, senha ou e-mail de pessoa real. Resuma a saída do comando.
- Apague este comentário.
-->

# Relatório de entrega: {{NOME_DO_PRODUTO}}, {{AAAA-MM-DD}}

| | |
|---|---|
| Produto | {{nome}} |
| Commit medido | `{{sha curto}}` na branch `{{branch}}` |
| Base do core | `next-boilerplate` em `{{sha ou versão de onde o fork saiu}}` |
| Ambiente medido | {{preview da Vercel / produção / local com emuladores}}: {{URLs}} |
| Executado por | {{pessoa}}, com {{Claude Code /deliver / manual}} |
| Assinado por | {{pessoa do time que aprova a entrega}} |

## Resumo

| Parte | ✅ | ❌ | ➖ | 🔒 | 🔴 abertos | Situação |
|-------|----|----|----|----|-----------|----------|
| 1. 🔒 Segurança | | | | | | {{aprovada / reprovada}} |
| 2. 🛡️ Infra e hardening | | | | | | |
| 3. 📈 Qualidade do produto | | | | | | |
| 4. 📚 Documentação | | | | | | |
| 5. ⚖️ Políticas e conformidade legal | | | | | | |

**Decisão:** {{entrega aprovada / entrega bloqueada até ...}}

## 1. Segurança

Especificação: [`01-security-review.md`](../../01-security-review.md).

| # | Item | Status | Gravidade | Evidência |
|---|------|--------|-----------|-----------|
| 1.1 | Env exposta | | | |
| 1.2 | Validação no front-end | | | |
| 1.3 | Validação no back-end | | | |
| 1.4 | Injeção (SQL/NoSQL) | | | |
| 1.5 | Autenticação fraca | | | |
| 1.6 | IDOR | | | |
| 1.7 | Senha guardada no banco | | | |
| 1.8 | Força bruta | | | |
| 1.9 | Bloqueio durante o envio | | | |
| 1.10 | CSRF | | | |
| 1.11 | Upload sem validação | | | |
| 1.12 | Informação sensível revelada | | | |
| 1.13 | Dependências vulneráveis | | | |
| 1.14 | Tokens mal configurados | | | |
| 1.15 | Rate limit | | | |
| 1.16 | Dados sensíveis expostos | | | |
| 1.17 | SSRF | | | |
| 1.18 | Cookies inseguros | | | |
| 1.19 | CORS | | | |

Revisão do código do produto (diff desde a base do core): {{resumo do code-reviewer / security-review, com
os achados e o que foi corrigido}}

## 2. Infra e hardening

Especificação: [`02-infra-hardening.md`](../../02-infra-hardening.md).

| # | Item | Status | Gravidade | Evidência |
|---|------|--------|-----------|-----------|
| 2.1 | Chaves de API escondidas | | | |
| 2.2 | Segredos fora do Git | | | |
| 2.3 | Chave pública do banco restrita | | | |
| 2.4 | Regras de acesso ao banco ("RLS") | | | |
| 2.5 | Criptografia de dados | | | |
| 2.6 | Autenticação no servidor | | | |
| 2.7 | Acessos restritos | | | |
| 2.8 | Mass assignment bloqueado | | | |
| 2.9 | Cookies protegidos | | | |
| 2.10 | Senhas com hash | | | |
| 2.11 | Rate limit ligado | | | |
| 2.12 | Proteção contra bots | | | |
| 2.13 | Consultas parametrizadas | | | |
| 2.14 | Validação de entrada | | | |
| 2.15 | Vazamento de conteúdo | | | |
| 2.16 | Upload restrito | | | |
| 2.17 | Respostas da API enxutas | | | |
| 2.18 | Cabeçalhos de segurança | | | |
| 2.19 | HTTPS forçado | | | |
| 2.20 | Varredura de dependências | | | |

Configuração de console feita por: {{pessoa / Claude Cowork com docs/delivery/cowork-infra-prompt.md}}.
Relatório do Cowork: {{resumo, sem valores de segredo}}

## 3. Qualidade do produto

Especificação: [`03-product-quality.md`](../../03-product-quality.md).

| # | Item | Status | Gravidade | Evidência |
|---|------|--------|-----------|-----------|
| 3.1 | Uso no celular | | | |
| 3.2 | Formulários | | | |
| 3.3 | Página 404 | | | |
| 3.4 | PageSpeed | | | {{Perf/A11y/BP/SEO mobile, LCP, CLS, por URL}} |
| 3.5 | Imagens comprimidas | | | |
| 3.6 | `og:image` | | | |
| 3.7 | `sitemap.xml` | | | |
| 3.8 | Google Analytics | | | |
| 3.9 | `robots.txt` | | | |
| 3.10 | Meta descriptions | | | |
| 3.11 | Títulos por página | | | |
| 3.12 | Idiomas e formatos | | | {{idiomas atendidos e o que foi percorrido em cada um}} |

## 4. Documentação

Especificação: [`04-documentation.md`](../../04-documentation.md).

| # | Item | Status | Gravidade | Evidência |
|---|------|--------|-----------|-----------|
| 4.1 | README no modelo | | | |
| 4.2 | Vídeo e GIF | | | {{duração, tamanho do MP4 e do GIF, quem assistiu}} |
| 4.3 | Documentos em dia | | | |
| 4.4 | Relatório publicado | | | |

## 5. Políticas e conformidade legal

Especificação: [`05-legal-policies.md`](../../05-legal-policies.md).

| # | Item | Status | Gravidade | Evidência |
|---|------|--------|-----------|-----------|
| 5.1 | Política de privacidade | | | |
| 5.2 | Termos de serviço | | | |
| 5.3 | Aviso de cookies | | | |
| 5.4 | Scripts de terceiros | | | {{domínios chamados sem aceite e com aceite}} |
| 5.5 | Política de reembolso | | | |
| 5.6 | Formulários e dados mínimos | | | {{campo → finalidade}} |
| 5.7 | Conformidade LGPD | | | |
| 5.8 | Acessibilidade | | | |
| 5.9 | Publicidade honesta | | | |
| 5.10 | Direitos autorais | | | {{arquivo → origem e licença}} |
| 5.11 | Dados da empresa | | | |
| 5.12 | Riscos jurídicos | | | {{respostas}} |
| 5.13 | Mercados atendidos | | | {{país → privacidade, termos, reembolso, imposto, moeda, idioma}} |

## Pendências aceitas

Toda 🟡 que fica aberta na entrega. Cada uma também entra no `docs/PRE-PRODUCTION.md`.

| Item | O que falta | Dono | Prazo |
|------|-------------|------|-------|
| | | | |

## Assinatura

{{Pessoa}}, {{AAAA-MM-DD}}: {{aprovo a entrega / não aprovo, porque ...}}
