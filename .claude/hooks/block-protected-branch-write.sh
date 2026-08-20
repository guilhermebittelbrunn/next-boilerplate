#!/usr/bin/env bash
# Rede de segurança para a regra central de `.claude/rules/git-commits.md`:
# nada de commit em branch protegida, nada de push para branch protegida e nada de --force.
#
# PreToolUse hook (matcher: Bash). Nega a chamada com permissionDecision=deny quando
# detecta uma dessas situações; qualquer outro comando é no-op barato.
set -uo pipefail

PROTECTED_RE='^(main|master|production|production-backup)$'

input="$(cat)"

command_line="$(printf '%s' "$input" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(String(JSON.parse(s).tool_input?.command||""))}catch(e){process.stdout.write("")}})' 2>/dev/null)"
[ -z "$command_line" ] && exit 0

case "$command_line" in
  *"git commit"*|*"git push"*) ;;
  *) exit 0 ;;
esac

deny() {
  DENY_REASON="$1" node -e 'const r=process.env.DENY_REASON;process.stdout.write(JSON.stringify({hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:r}}))' 2>/dev/null
  exit 0
}

branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '')"

case "$command_line" in
  *"git commit"*)
    if [[ "$branch" =~ $PROTECTED_RE ]]; then
      deny "Bloqueado por .claude/rules/git-commits.md: a branch atual é \`$branch\` (protegida). Nenhum commit pode ser feito em main/master/production/production-backup. Crie uma branch de feature a partir dela (\`git switch -c <project>/<type>/<title>\`) e commite lá — o merge acontece via Pull Request."
    fi
    ;;
esac

case "$command_line" in
  *--force*|*" -f "*|*"--force-with-lease"*)
    case "$command_line" in
      *"git push"*)
        deny "Bloqueado por .claude/rules/git-commits.md: push com --force não é permitido neste repositório."
        ;;
    esac
    ;;
esac

case "$command_line" in
  *"git push"*)
    target="$(printf '%s' "$command_line" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const m=s.match(/git\s+push[^\n;&|]*/);if(!m){process.stdout.write("");return;}const parts=m[0].trim().split(/\s+/).slice(2).filter(a=>!a.startsWith("-"));process.stdout.write(parts.length>1?parts[1].replace(/^.*:/,""):"")})' 2>/dev/null)"
    if [[ -n "$target" && "$target" =~ $PROTECTED_RE ]]; then
      deny "Bloqueado por .claude/rules/git-commits.md: push direto para \`$target\` (branch protegida) não é permitido. Suba a branch de feature e abra um Pull Request."
    fi
    ;;
esac

exit 0
