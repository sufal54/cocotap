#!/bin/bash

set -e

echo "Checking Rust installation"
if ! command -v rustc &> /dev/null
then
    echo "Rust is not installed. Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source $HOME/.cargo/env
else
    echo "Rust is already installed."
fi

echo "Checking Node.js & npm"
if ! command -v node &> /dev/null
then
    echo "Node.js is not installed. Installing Node.js & npm..."
    sudo apt update
    sudo apt install -y nodejs npm
else
    echo "Node.js is already installed."
fi


if ! command -v pkexec >/dev/null 2>&1; then
    echo "pkexec not found. Installing policykit-1..."
    sudo apt install -y policykit-1
else
    echo "pkexec already installed."
fi

if ! command -v iptables >/dev/null 2>&1; then
    echo "iptables not found. Installing iptables..."
    sudo apt install -y iptables
else
    echo "iptables already installed."
fi

echo "Installing npm dependencies"
npm install

echo "Building app"
npm run app build

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

DEB_FILE="$SCRIPT_DIR/src-tauri/target/release/bundle/deb/cocotap_0.1.0_amd64.deb"

if [ -f "$DEB_FILE" ]; then
    echo "Installing .deb package"
    sudo dpkg -i "$DEB_FILE" || sudo apt --fix-broken install -y
    echo "Installation completed!"
else
    echo "ERROR: .deb package not found at $DEB_FILE"
    exit 1
fi
