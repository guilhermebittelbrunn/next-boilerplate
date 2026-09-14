#!/usr/bin/env bash
# Executa os jobs do /cycle definidos em .claude/cycle-schedule.jsonc.
#
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

resolve_workspace() { # imprime o caminho absoluto do workspace do job
  local ws; ws="$(job_field "$1" workspace)"
  [ -n "$ws" ] || die "job '$1' não define 'workspace'"
  case "$ws" in /*) ;; *) ws="$REPO_ROOT/$ws" ;; esac
  printf '%s' "$ws"
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

  {
    printf '=== %s | job=%s branch=%s ===\n' "$(date -Iseconds)" "$job" "$branch"
    printf 'workspace: %s\n' "$workspace"
    printf 'comando:   '; printf '%q ' "${CLAUDE_ARGV[@]}"; printf '\n\n'
  } | tee -a "$log_file"

  local status=0
  # caffeinate segura o sono enquanto roda; não acorda máquina já suspensa.
  ( cd "$workspace" && caffeinate -i timeout "${timeout}m" "${CLAUDE_ARGV[@]}" ) >>"$log_file" 2>&1 || status=$?

  {
    printf '\n=== fim %s | exit=%d ===\n' "$(date -Iseconds)" "$status"
    [ "$status" -eq 124 ] && printf 'ATENÇÃO: timeout de %s min atingido.\n' "$timeout"
    printf 'arquivos alterados: %s\n' "$(git -C "$workspace" status --short | wc -l | tr -d ' ')"
    printf 'commits criados:    %s (o /cycle não commita; esperado 0)\n' \
      "$(git -C "$workspace" log --oneline "origin/main..HEAD" 2>/dev/null | wc -l | tr -d ' ')"
  } | tee -a "$log_file"

  printf '\nlog: %s\n' "$log_file"
  return "$status"
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
  --install)     cmd_install ;;
  --uninstall)   cmd_uninstall ;;
  --dry-run)     [ $# -ge 2 ] || die "uso: $0 --dry-run <job>"; cmd_run "$2" --dry-run ;;
  -h|--help)     sed -n '2,12p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//' ;;
  *)             cmd_run "$1" ;;
esac
