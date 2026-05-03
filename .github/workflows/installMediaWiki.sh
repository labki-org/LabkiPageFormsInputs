#!/bin/bash
#
# Download MediaWiki core and install SMW + PageForms via Composer.
#
# Usage:  bash installMediaWiki.sh REL1_44 6.0 6.0
#   $1 = MW branch (e.g. REL1_43, REL1_44)
#   $2 = SMW version constraint (e.g. 6.0)
#   $3 = PageForms version constraint (e.g. 6.0)
set -euo pipefail

MW_BRANCH="${1:?Usage: installMediaWiki.sh <MW_BRANCH> <SMW_VERSION> <PF_VERSION>}"
SMW_VERSION="${2:?Missing SMW version}"
PF_VERSION="${3:?Missing PageForms version}"

MW_DIR="$HOME/mediawiki"

echo "==> Downloading MediaWiki core ($MW_BRANCH)..."
# -f: fail on HTTP errors (otherwise GitHub HTML 5xx pages silently feed `tar`
# garbage). Retry transient failures so a single GitHub hiccup doesn't tank CI.
TARBALL="$(mktemp --suffix=.tar.gz)"
trap 'rm -f "$TARBALL"' EXIT
curl -fSL --retry 5 --retry-all-errors --retry-delay 2 \
	-o "$TARBALL" \
	"https://github.com/wikimedia/mediawiki/archive/refs/heads/${MW_BRANCH}.tar.gz"
tar xzf "$TARBALL"
mv "mediawiki-${MW_BRANCH}" "$MW_DIR"

cd "$MW_DIR"

echo "==> Creating composer.local.json (SMW ~${SMW_VERSION}, PageForms ~${PF_VERSION})..."
cat > composer.local.json <<EOF
{
	"require": {
		"mediawiki/semantic-media-wiki": "~${SMW_VERSION}",
		"mediawiki/page-forms": "~${PF_VERSION}"
	}
}
EOF

echo "==> Installing all Composer dependencies (core + SMW + PageForms)..."
composer update --no-progress --prefer-dist

echo "==> Cloning ParserFunctions..."
git clone --depth 1 -b "$MW_BRANCH" \
	https://github.com/wikimedia/mediawiki-extensions-ParserFunctions.git \
	extensions/ParserFunctions

echo "==> MediaWiki installation complete at $MW_DIR"
