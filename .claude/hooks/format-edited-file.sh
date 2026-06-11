#!/usr/bin/env bash
# PostToolUse hook: formata com Biome o arquivo que o Claude acabou de editar.
#
# Lê o JSON do evento no stdin, extrai tool_input.file_path e, se for um arquivo
# de código suportado, roda `biome check --write` apenas nesse arquivo. Mantém o
# estilo consistente automaticamente, sem o custo de rodar lint no repo inteiro.
#
# Nunca bloqueia o fluxo: sai com 0 mesmo se o Biome falhar ou o arquivo sumir.

set -u

input="$(cat)"

# Extrai o file_path do JSON sem depender de jq (node é garantido neste repo).
file="$(printf '%s' "$input" | node -e "
let raw = '';
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', () => {
  try {
    const json = JSON.parse(raw);
    process.stdout.write(json.tool_input?.file_path ?? '');
  } catch {
    process.stdout.write('');
  }
});
" 2>/dev/null)"

[ -z "$file" ] && exit 0
[ -f "$file" ] || exit 0

case "$file" in
  *.ts | *.tsx | *.js | *.jsx | *.mjs | *.cjs | *.json | *.jsonc)
    cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
    pnpm exec biome check --write --no-errors-on-unmatched "$file" >/dev/null 2>&1
    ;;
  *) ;;
esac

exit 0
