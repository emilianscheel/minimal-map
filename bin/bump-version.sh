#!/usr/bin/env bash

set -euo pipefail

usage() {
	echo "Usage: bun run version:bump --major|--minor|--patch" >&2
	exit 1
}

[ "$#" -eq 1 ] || usage

case "$1" in
	--major) bump_type="major" ;;
	--minor) bump_type="minor" ;;
	--patch) bump_type="patch" ;;
	*) usage ;;
esac

for file in package.json block.json emilian-scheel-minimal-map.php readme.txt; do
	[ -f "$file" ] || {
		echo "Missing file: $file" >&2
		exit 1
	}
done

current_version=$(sed -nE 's/^  "version": "([0-9]+\.[0-9]+\.[0-9]+)",$/\1/p' package.json)
[ -n "$current_version" ] || {
	echo "Could not read version from package.json" >&2
	exit 1
}

IFS=. read -r major minor patch <<< "$current_version"

case "$bump_type" in
	major)
		major=$((major + 1))
		minor=0
		patch=0
		;;
	minor)
		minor=$((minor + 1))
		patch=0
		;;
	patch)
		patch=$((patch + 1))
		;;
esac

next_version="$major.$minor.$patch"

NEXT_VERSION="$next_version" perl -0pi -e 's{^  "version": ".*",$}{  "version": "$ENV{NEXT_VERSION}",}m or die "Could not update package.json\n"' package.json
NEXT_VERSION="$next_version" perl -0pi -e 's{^  "version": ".*",$}{  "version": "$ENV{NEXT_VERSION}",}m or die "Could not update block.json\n"' block.json
NEXT_VERSION="$next_version" perl -0pi -e 's{^\s*\* Version:.*$}{ * Version:           $ENV{NEXT_VERSION}}m or die "Could not update plugin header\n"' emilian-scheel-minimal-map.php
NEXT_VERSION="$next_version" perl -0pi -e 's{^define\( '\''MINIMAL_MAP_VERSION'\'', '\''.*'\'' \);$}{define( '\''MINIMAL_MAP_VERSION'\'', '\''$ENV{NEXT_VERSION}'\'' );}m or die "Could not update MINIMAL_MAP_VERSION\n"' emilian-scheel-minimal-map.php
NEXT_VERSION="$next_version" perl -0pi -e 's{^Stable tag: .*$}{Stable tag: $ENV{NEXT_VERSION}}m or die "Could not update readme.txt\n"' readme.txt

shopt -s nullglob

for file in languages/*.po languages/*.pot; do
	NEXT_VERSION="$next_version" perl -0pi -e 's{^"Project-Id-Version: .*\\n"$}{"Project-Id-Version: Emilian Scheel'\''s Minimal Map & Store Locator $ENV{NEXT_VERSION}\\n"}m or die "Could not update $ARGV\n"' "$file"
done

echo "$current_version -> $next_version"
