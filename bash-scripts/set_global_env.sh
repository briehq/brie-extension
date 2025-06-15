#!/bin/bash

# Default values
CLI_DEV=false
CLI_FIREFOX=false
CLI_ENV="development"

validate_is_boolean() {
  if [[ "$1" != "true" && "$1" != "false" ]]; then
    echo "Invalid value for <$2>. Use 'true' or 'false'."
    exit 1
  fi
}

validate_key() {
  local key="$1"
  local is_editable="${2:-false}" 
  if [[ -n "$key" && ! "$key" =~ ^# ]]; then
    if [[ "$is_editable" == false && ! "$key" =~ ^CLI_ ]]; then
      echo "Invalid key: <$key>. Must start with 'CLI_'."
      exit 1
    fi
  fi
}

parse_arguments() {
  for arg in "$@"; do
    key="${arg%%=*}"
    value="${arg#*=}"

    validate_key "$key"

    case $key in
      CLI_DEV)
        CLI_DEV="$value"
        validate_is_boolean "$CLI_DEV" "CLI_DEV"
        ;;
      CLI_FIREFOX)
        CLI_FIREFOX="$value"
        validate_is_boolean "$CLI_FIREFOX" "CLI_FIREFOX"
        ;;
      CLI_ENV)
        CLI_ENV="$value"
        ;;
      *)
        cli_values+=("$key=$value")
        ;;
    esac
  done
}

load_env_base() {
  ENV_FILE=".env.$CLI_ENV"

  if [[ -f "$ENV_FILE" ]]; then
    echo "Using environment: $ENV_FILE"
    cp "$ENV_FILE" .env
  else
    echo "Missing env file: $ENV_FILE"
    exit 1
  fi
}

validate_env_keys() {
  editable_section_starts=false

  while IFS= read -r line; do
    key="${line%%=*}"
    if [[ "$key" =~ ^CLI_ ]]; then
      editable_section_starts=true
    elif $editable_section_starts; then
      validate_key "$key" true
    fi
  done < .env
}

create_new_file() {
  temp_file=$(mktemp)

  {
    echo "# DO NOT EDIT CLI VALUES BELOW MANUALLY"
    echo "CLI_DEV=$CLI_DEV"
    echo "CLI_FIREFOX=$CLI_FIREFOX"
    for value in "${cli_values[@]}"; do
      echo "$value"
    done
    echo ""
    echo "# Editable values (copied from .env.$CLI_ENV)"
    grep -Ev '^\s*#|^\s*$' .env
  } > "$temp_file"

  mv "$temp_file" .env
}

# Main flow
parse_arguments "$@"
load_env_base
validate_env_keys
create_new_file
