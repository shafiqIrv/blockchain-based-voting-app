#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NETWORK_DIR="$(dirname "$SCRIPT_DIR")"

function one_line_pem {
    echo "`awk 'NF {sub(/\\n/, ""); printf "%s\\\\\\n",$0;}' $1`"
}

function json_ccp {
    local PP=$(one_line_pem $1)
    sed -e "s#\${PEERPEM}#$PP#" \
        "$SCRIPT_DIR/ccp-template.json"
}

PEERPEM="$NETWORK_DIR/organizations/peerOrganizations/itb.ac.id/tlsca/tlsca.itb.ac.id-cert.pem"

echo "$(json_ccp $PEERPEM)" > "$NETWORK_DIR/connection.json"
