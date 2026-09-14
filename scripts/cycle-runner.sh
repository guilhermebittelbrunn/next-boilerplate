#!/usr/bin/env bash
# Executa os jobs do /cycle definidos em .claude/cycle-schedule.jsonc.
#
#   cycle-runner.sh --selftest          confere o ambiente e o headless (comece por aqui)
#   cycle-runner.sh --list              lista os jobs
#   cycle-runner.sh --dry-run <job>     imprime o comando sem executar
#   cycle-runner.sh <job>               roda o job agora
#   cycle-runner.sh --install           instala os jobs habilitados no launchd (macOS)
#   cycle-runner.sh --uninstall         remove os jobs do launchd
#
# O /cycle não commita: o job termina com working tree sujo e um plano de commits.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG="$REPO_ROOT/.claude/cycle-schedule.jsonc"
LAUNCHD_PREFIX="com.next-boilerplate.cycle"
LAUNCH_AGENTS="$HOME/Library/LaunchAgents"

die() { printf '%s\n' "error: $*" >&2; exit 1; }

command -v jq >/dev/null 2>&1 || die "jq não encontrado. Instale com: brew install jq"
[ -f "$CONFIG" ] || die "config não encontrada: $CONFIG"

# jq não lê comentários; remove // fora de string antes de parsear.
read_config() {
  perl -0pe 's{("(?:[^"\\]|\\.)*")|//[^\n]*}{defined $1 ? $1 : ""}ge' "$CONFIG"
}

CONFIG_JSON="$(read_config)"
jq -e . >/dev/null 2>&1 <<<"$CONFIG_JSON" || die "JSON inválido em $CONFIG (rode: $0 --list para ver o erro)"

job_field() { # <job> <campo> — valor do job, com fallback para defaults
  jq -r --arg n "$1" --arg f "$2" '
    (.jobs[] | select(.name == $n)) as $j
    | ($j[$f] // .defaults[$f] // empty) | tostring
  ' <<<"$CONFIG_JSON"
}

job_exists() { jq -e --arg n "$1" 'any(.jobs[]; .name == $n)' >/dev/null <<<"$CONFIG_JSON"; }

cmd_list() {
  printf '%-22s %-6s %-14s %-7s %s\n' JOB ATIVO CRON MODELO COMANDO
  jq -r '.jobs[] | [
      .name,
      (if .enabled then "sim" else "nao" end),
      .cron,
      (.model // "-"),
      .command
    ] | @tsv' <<<"$CONFIG_JSON" |
    while IFS=$'\t' read -r name enabled cron model command; do
      printf '%-22s %-6s %-14s %-7s %s\n' "$name" "$enabled" "$cron" "$model" "$command"
    done
  printf '\nconfig: %s\n' "$CONFIG"
}

resolve_workspace() { # imprime o caminho absoluto e normalizado do workspace do job
  local ws; ws="$(job_field "$1" workspace)"
  [ -n "$ws" ] || die "job '$1' não define 'workspace'"
  case "$ws" in /*) ;; *) ws="$REPO_ROOT/$ws" ;; esac
  [ -d "$ws" ] || { printf '%s' "$ws"; return 0; }
  ( cd "$ws" && pwd -P )
}

build_argv() { # preenche a global CLAUDE_ARGV com o comando do claude para o job
  local job="$1"
  CLAUDE_ARGV=(claude -p "$(job_field "$job" command)")
  local model effort mode
  model="$(job_field "$job" model)";          [ -n "$model" ]  && CLAUDE_ARGV+=(--model "$model")
  effort="$(job_field "$job" effort)";        [ -n "$effort" ] && CLAUDE_ARGV+=(--effort "$effort")
  mode="$(job_field "$job" permissionMode)";  [ -n "$mode" ]   && CLAUDE_ARGV+=(--permission-mode "$mode")
  CLAUDE_ARGV+=(--output-format text)
}

cmd_run() {
  local job="$1" dry="${2:-}"
  job_exists "$job" || die "job desconhecido: '$job' (veja: $0 --list)"

  local workspace; workspace="$(resolve_workspace "$job")"
  [ -d "$workspace" ] || die "workspace não existe: $workspace"
  [ -d "$workspace/.git" ] || [ -f "$workspace/.git" ] || die "não é um repositório git: $workspace"

  build_argv "$job"

  local timeout; timeout="$(job_field "$job" timeoutMinutes)"; : "${timeout:=240}"
  local log_dir; log_dir="$(job_field "$job" logDir)"; : "${log_dir:=.claude/cycle-logs}"
  case "$log_dir" in /*) ;; *) log_dir="$workspace/$log_dir" ;; esac
  local log_file="$log_dir/${job}-$(date +%Y%m%d-%H%M%S).log"

  if [ "$dry" = "--dry-run" ]; then
    printf 'job:       %s\n' "$job"
    printf 'workspace: %s\n' "$workspace"
    printf 'branch:    %s\n' "$(git -C "$workspace" rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"
    printf 'timeout:   %s min\n' "$timeout"
    printf 'log:       %s\n' "$log_file"
    printf 'comando:   '; printf '%q ' "${CLAUDE_ARGV[@]}"; printf '\n'
    return 0
  fi

  mkdir -p "$log_dir"

  local branch; branch="$(git -C "$workspace" rev-parse --abbrev-ref HEAD)"
  case "$branch" in
    main|master|production|production-backup)
      die "branch protegida ($branch) em $workspace. Crie uma branch de feature antes." ;;
  esac

  # Baseline para medir o que ESTE job produziu, não o que a branch já tinha.
  local head_before; head_before="$(git -C "$workspace" rev-parse HEAD)"

  {
    printf '=== %s | job=%s branch=%s ===\n' "$(date -Iseconds)" "$job" "$branch"
    printf 'workspace: %s\n' "$workspace"
    printf 'comando:   '; printf '%q ' "${CLAUDE_ARGV[@]}"; printf '\n\n'
  } | tee -a "$log_file"

  local status=0
  # caffeinate segura o sono enquanto roda; não acorda máquina já suspensa.
  ( cd "$workspace" && caffeinate -i "${CLAUDE_ARGV[@]}" ) >>"$log_file" 2>&1 &
  local child=$!

  # macOS não traz `timeout` (é do coreutils do GNU), então o cão de guarda é
  # um subshell que espera e mata. O arquivo sentinela distingue "morreu por
  # tempo" de "saiu com erro", que do lado de fora dariam o mesmo código.
  local timed_out_flag; timed_out_flag="$(mktemp -t cycle-runner)"
  rm -f "$timed_out_flag"
  (
    sleep "$((timeout * 60))"
    kill -0 "$child" 2>/dev/null || exit 0
    : >"$timed_out_flag"
    kill -TERM "$child" 2>/dev/null || true
    sleep 15
    kill -KILL "$child" 2>/dev/null || true
  ) &
  local watchdog=$!

  wait "$child" || status=$?
  kill -TERM "$watchdog" 2>/dev/null || true
  wait "$watchdog" 2>/dev/null || true

  local timed_out=0
  [ -e "$timed_out_flag" ] && { timed_out=1; rm -f "$timed_out_flag"; }

  {
    printf '\n=== fim %s | exit=%d ===\n' "$(date -Iseconds)" "$status"
    [ "$timed_out" -eq 1 ] && printf 'ATENÇÃO: timeout de %s min atingido; processo encerrado.\n' "$timeout"
    printf 'arquivos alterados: %s\n' "$(git -C "$workspace" status --short | wc -l | tr -d ' ')"
    local made; made="$(git -C "$workspace" rev-list --count "${head_before}..HEAD" 2>/dev/null || echo '?')"
    printf 'commits criados:    %s' "$made"
    if [ "$made" = "0" ]; then
      printf ' (esperado — o /cycle não commita)\n'
    else
      printf ' ⚠️  o /cycle não deveria commitar; confira antes de seguir\n'
    fi
  } | tee -a "$log_file"

  printf '\nlog: %s\n' "$log_file"
  return "$status"
}

cmd_selftest() {
  local ws="${1:-$REPO_ROOT}" fail=0
  printf 'Verificando o ambiente para o agendamento.\n\n'

  for c in claude jq perl caffeinate git; do
    if command -v "$c" >/dev/null 2>&1; then
      printf '  ✅ %-11s %s\n' "$c" "$(command -v "$c")"
    else
      printf '  ❌ %-11s AUSENTE\n' "$c"; fail=1
    fi
  done

  printf '\n  config      %s\n' "$CONFIG"
  if jq -e . >/dev/null 2>&1 <<<"$CONFIG_JSON"; then
    printf '  ✅ jsonc     parseia (%s jobs)\n' "$(jq '.jobs | length' <<<"$CONFIG_JSON")"
  else
    printf '  ❌ jsonc     não parseia\n'; fail=1
  fi

  # Workspace existe e não está em branch protegida? Job desabilitado é template:
  # problema nele avisa, não reprova — senão a config de exemplo nunca passa.
  printf '\n'
  local problem
  while IFS=$'\t' read -r name enabled; do
    [ -n "$name" ] || continue
    local mark='⚠️ '; [ "$enabled" = "true" ] && mark='❌'
    local w; w="$(resolve_workspace "$name")"
    problem=""

    if [ ! -d "$w" ]; then
      problem="workspace inexistente: $w"
    else
      local b; b="$(git -C "$w" rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"
      case "$b" in
        main|master|production|production-backup) problem="branch protegida ($b)" ;;
        '?') problem="não é repositório git" ;;
      esac
    fi

    if [ -z "$problem" ]; then
      printf '  ✅ %-22s %s @ %s\n' "$name" "$b" "$w"
    else
      printf '  %s %-22s %s\n' "$mark" "$name" "$problem"
      [ "$enabled" = "true" ] && fail=1
    fi
  done < <(jq -r '.jobs[] | [.name, (.enabled | tostring)] | @tsv' <<<"$CONFIG_JSON")

  printf '  (⚠️  em job desabilitado é template por preencher, não erro)\n'

  # O headless resolve slash command de projeto? É a suposição que sustenta tudo.
  printf '\n  Testando `claude -p` com um slash command do projeto (~10 s, modelo barato)…\n'
  local out
  out="$( cd "$ws" && claude -p "Responda apenas com a palavra: RUNNER-OK" \
      --model haiku --effort low --output-format text 2>&1 )" || true
  if grep -q 'RUNNER-OK' <<<"$out"; then
    printf '  ✅ headless   responde e o comando resolve\n'
  else
    printf '  ❌ headless   não respondeu como esperado:\n%s\n' "$(sed 's/^/      /' <<<"$out" | head -5)"
    fail=1
  fi

  printf '\n'
  if [ "$fail" -eq 0 ]; then
    cat <<-'EOF'
	Tudo certo. Próximos passos:
	  1. ponha "enabled": true no job desejado, em .claude/cycle-schedule.jsonc
	  2. scripts/cycle-runner.sh --dry-run <job>     confira workspace, branch e comando
	  3. scripts/cycle-runner.sh <job>               rode uma vez à mão, acompanhando
	  4. scripts/cycle-runner.sh --install           só depois que o passo 3 tiver dado certo
	EOF
  else
    printf 'Há falhas acima. Corrija antes de instalar no launchd.\n'
  fi
  return "$fail"
}

plist_path() { printf '%s/%s.%s.plist' "$LAUNCH_AGENTS" "$LAUNCHD_PREFIX" "$1"; }

cmd_install() {
  [ "$(uname)" = "Darwin" ] || die "--install só funciona no macOS (launchd)"
  mkdir -p "$LAUNCH_AGENTS"

  local installed=0
  while IFS=$'\t' read -r name cron; do
    [ -n "$name" ] || continue
    local min hour dom mon dow; read -r min hour dom mon dow <<<"$cron"
    local plist; plist="$(plist_path "$name")"

    {
      cat <<-PLIST
	<?xml version="1.0" encoding="UTF-8"?>
	<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
	<plist version="1.0">
	<dict>
	  <key>Label</key><string>${LAUNCHD_PREFIX}.${name}</string>
	  <key>ProgramArguments</key>
	  <array>
	    <string>/bin/bash</string>
	    <string>-lc</string>
	    <string>exec "${BASH_SOURCE[0]}" "${name}"</string>
	  </array>
	  <key>StartCalendarInterval</key>
	  <dict>
	PLIST
      [ "$min"  != "*" ] && printf '    <key>Minute</key><integer>%d</integer>\n' "$min"
      [ "$hour" != "*" ] && printf '    <key>Hour</key><integer>%d</integer>\n' "$hour"
      [ "$dom"  != "*" ] && printf '    <key>Day</key><integer>%d</integer>\n' "$dom"
      [ "$mon"  != "*" ] && printf '    <key>Month</key><integer>%d</integer>\n' "$mon"
      case "$dow" in
        *-*|*,*) printf '    <!-- dow=%s: launchd não aceita intervalo; ajuste à mão se precisar -->\n' "$dow" ;;
        \*) ;;
        *) printf '    <key>Weekday</key><integer>%d</integer>\n' "$dow" ;;
      esac
      cat <<-PLIST
	  </dict>
	  <key>RunAtLoad</key><false/>
	</dict>
	</plist>
	PLIST
    } >"$plist"

    launchctl unload "$plist" 2>/dev/null || true
    launchctl load "$plist"
    printf 'instalado: %s → %s\n' "$name" "$plist"
    installed=$((installed + 1))
  done < <(jq -r '.jobs[] | select(.enabled) | [.name, .cron] | @tsv' <<<"$CONFIG_JSON")

  if [ "$installed" -eq 0 ]; then
    printf 'nenhum job habilitado. Ponha "enabled": true em %s\n' "$CONFIG"
    return 0
  fi

  cat <<'EOF'

⚠️  dow com intervalo (ex.: "1-5") não foi traduzido — o launchd não aceita.
    Para dias úteis, crie 5 entradas de Weekday no plist, ou use um job por dia.
⚠️  O Mac precisa estar ligado e acordado no horário. launchd não acorda a máquina.
EOF
}

cmd_uninstall() {
  [ "$(uname)" = "Darwin" ] || die "--uninstall só funciona no macOS"
  local removed=0
  for plist in "$LAUNCH_AGENTS/$LAUNCHD_PREFIX".*.plist; do
    [ -e "$plist" ] || continue
    launchctl unload "$plist" 2>/dev/null || true
    rm -f "$plist"
    printf 'removido: %s\n' "$plist"
    removed=$((removed + 1))
  done
  [ "$removed" -eq 0 ] && printf 'nada instalado.\n'
  return 0
}

case "${1:-}" in
  --list|-l|"")  cmd_list ;;
  --selftest)    cmd_selftest "${2:-}" ;;
  --install)     cmd_install ;;
  --uninstall)   cmd_uninstall ;;
  --dry-run)     [ $# -ge 2 ] || die "uso: $0 --dry-run <job>"; cmd_run "$2" --dry-run ;;
  -h|--help)     sed -n '2,11p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//' ;;
  *)             cmd_run "$1" ;;
esac
