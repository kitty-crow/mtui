#!/usr/bin/env bash
set -Eeuo pipefail

repo='https://github.com/kitty-crow/mtui.git'
source_path="$HOME/mtui-src"
destination="$HOME/mTUI"
temporary_source=''
launch=1

if (( $# > 1 )); then printf 'Only --no-launch is supported.\n' >&2; exit 2; fi
if (( $# == 1 )); then
  if [[ "$1" != '--no-launch' ]]; then printf 'Unknown option: %s\n' "$1" >&2; exit 2; fi
  launch=0
fi

cleanup() {
  if [[ -n "$temporary_source" ]]; then rm -rf -- "$temporary_source"; fi
}
trap cleanup EXIT

download() {
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$1"
  elif command -v wget >/dev/null 2>&1; then
    wget -qO- "$1"
  else
    printf 'curl or wget is required to download mTUI.\n' >&2
    return 1
  fi
}

is_mtui_source() {
  [[ -f "$1/package.json" ]] &&
    grep -Eq '"name"[[:space:]]*:[[:space:]]*"@kitty-crow/mtui"' "$1/package.json"
}

supported_version() {
  local version
  version=$("$1" --version 2>/dev/null) || return 1
  [[ "$version" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+) ]] || return 1
  (( BASH_REMATCH[1] > 1 || (BASH_REMATCH[1] == 1 &&
     (BASH_REMATCH[2] > 4 || (BASH_REMATCH[2] == 4 && BASH_REMATCH[3] >= 4))) ))
}

find_supported_bun() {
  local candidate npm_prefix=''
  if command -v npm >/dev/null 2>&1; then
    npm_prefix=$(npm prefix -g 2>/dev/null || true)
  fi
  for candidate in "$HOME/.bun/bin/bun" "$npm_prefix/bin/bun" "$(command -v bun || true)"; do
    if [[ -n "$candidate" && -x "$candidate" ]] && supported_version "$candidate"; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done
  return 1
}

install_dependencies() {
  printf 'Installing dependencies with Bun...\n'
  if "$bun" install --frozen-lockfile &&
     [[ -f node_modules/typescript/lib/tsc.js ]]; then
    return 0
  fi

  printf 'Bun installation incomplete; retrying with refreshed packages and copied files...\n' >&2
  rm -rf node_modules
  if "$bun" install --frozen-lockfile --backend copy --force &&
     [[ -f node_modules/typescript/lib/tsc.js ]]; then
    return 0
  fi

  if command -v npm >/dev/null 2>&1; then
    printf 'Falling back to npm for dependencies...\n' >&2
    rm -rf node_modules
    if npm install --no-save --package-lock=false --include=dev &&
       [[ -f node_modules/typescript/lib/tsc.js ]]; then
      return 0
    fi
  fi

  printf 'Unable to install complete dependencies, including TypeScript.\n' >&2
  return 1
}

source=''
if [[ -f "$0" ]]; then
  script_dir=$(cd -- "$(dirname -- "$0")" && pwd)
  if is_mtui_source "$script_dir"; then source="$script_dir"; fi
fi
if [[ -z "$source" ]] && is_mtui_source "$source_path"; then
  source="$source_path"
fi

if [[ -n "$source" && -d "$source/.git" ]] && command -v git >/dev/null 2>&1; then
  printf 'Updating %s...\n' "$source"
  git -C "$source" pull --ff-only
elif [[ -z "$source" && ! -e "$source_path" ]] && command -v git >/dev/null 2>&1; then
  printf 'Cloning mTUI into %s...\n' "$source_path"
  git clone "$repo" "$source_path"
  source="$source_path"
fi

# Download a source archive on machines without Git.
if [[ -z "$source" ]] || {
  [[ "$source" == "$source_path" && -d "$source/.git" ]] &&
    ! command -v git >/dev/null 2>&1
}; then
  printf 'Downloading mTUI source archive...\n'
  temporary_source=$(mktemp -d)
  download 'https://github.com/kitty-crow/mtui/archive/refs/heads/main.tar.gz' |
    tar -xz -C "$temporary_source"
  source="$temporary_source/mtui-main"
fi

if ! is_mtui_source "$source"; then
  printf 'mTUI source was not found.\n' >&2
  exit 1
fi
cd "$source"

if ! bun=$(find_supported_bun); then
  if command -v npm >/dev/null 2>&1; then
    printf 'Installing Bun with npm...\n'
    npm install -g bun || printf 'npm Bun installation failed, trying the official installer.\n' >&2
    hash -r
  fi
  if ! bun=$(find_supported_bun); then
    printf 'Installing Bun using the official installer...\n'
    download 'https://bun.sh/install' | bash
    export PATH="$HOME/.bun/bin:$PATH"
    bun=$(find_supported_bun) || {
      printf 'Could not install Bun 1.4.4 or newer.\n' >&2
      exit 1
    }
  fi
fi

printf 'Using Bun %s\n' "$("$bun" --version)"
install_dependencies
printf 'Building mTUI and preparing hardware sensors...\n'
"$bun" run build

binary="$source/dist/mtui"
if [[ ! -f "$binary" ]]; then
  printf 'Built mTUI executable was not found.\n' >&2
  exit 1
fi
mkdir -p "$destination"
cp -f -- "$binary" "$destination/mtui"
chmod 755 "$destination/mtui"
printf 'Installed mTUI: %s\n' "$destination/mtui"

if (( launch )); then
  cd "$destination"
  ./mtui
fi
