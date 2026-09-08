---

### Observação

A API estava respondendo a qualquer origem de browser porque o padrão de controle de acesso era um coringa; não havia limite de requisições nas rotas públicas de login e cadastro, onde força bruta sairia de graça; e os três apps não devolviam cabeçalhos de segurança apesar do pacote estar instalado e desligado. Cada fork nascia assim vulnerável.

Agora a API aceita apenas uma lista de origens configurada via variável de ambiente, as rotas públicas de autenticação limitam a 20 tentativas por minuto por endereço IP (retornando 429 com indicação de quando tentar de novo), e os três apps retornam cabeçalhos de segurança com Content Security Policy ativa — bloqueante em `app` e `api`, somente-relatório em `web`. Uma requisição de origem não autorizada cai com código de erro estável e sem expor a falha. O coringa desapareceu em todos os cenários.

⚠️ **Operação (antes do deploy em produção):** Configure a variável `CORS_ORIGIN` com a lista separada por vírgula das origens que devem chamar a API — por exemplo, `https://app.seu-dominio.com,https://web.seu-dominio.com`. Sem ela, o serviço não inicia em modo produção. O limite de requisições é opcional — sem a chave do serviço Arcjet o app funciona, mas sem proteção de limite (um aviso aparece uma única vez no boot). Limpeza pendente após o merge: apagar as contas de teste `qa-api-hardening@example.com` e `review-api-hardening@example.com` no Firebase (Console → Authentication e Firestore). ⚠️ **Humano (roteiro M3, ~2 min antes do merge):** Faça um login com Google com uma conta real até a sessão iniciar — o mecanismo foi validado (o popup abre e consegue devolver a credencial ao app), mas a entrega completa exige a conta real.
