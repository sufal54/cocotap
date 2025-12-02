# 🔥 CocoTap Console

Modern Interactive Linux Firewall Manager — React + Rust

CocoTap Console is a developer-friendly, high-performance firewall GUI for Linux.

# 🚀 Features

✔ Firewall Rule Management

- View rules from filter, nat

- Supports chains: INPUT, OUTPUT, FORWARD, PREROUTING, POSTROUTING

- Add, delete, inspect rules

* Full NAT support:

* DNAT (--to-destination)

* SNAT (--to-source)

* MASQUERADE

# ✔ Beautiful UI

- Dark theme

- Animated transitions

Clean rule inspector drawer

- Real-time reload

- Safe delete confirmation popup

# 📦 Installation

## System Requirements

- Linux (Ubuntu, Debian, Arch, Fedora)

- sudo required for modifying firewall rules

- Node.js 18+

- Rust stable toolchain

# 🔧 Development Setup

1. Clone the repo

```bash
cd cocotap
```

2. Install dependencies

```bash
chmod +x build.sh
./build.sh
```

# 🧠 How Rule Builder Works

User fills the form.

Field
Protocol = tcp  
Source IP = 10.0.0.5  
Port = 443  
Action = DROP  
Comment = "Block HTTPS"

# 📜 License

MIT — free for personal and commercial use.
