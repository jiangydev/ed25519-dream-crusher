# Ed25519 Dream Crusher

[![Python](https://img.shields.io/badge/python-3.12+-blue.svg)](https://www.python.org/downloads/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

> **A humorous educational demonstration of Pollard's Rho algorithm for solving ECDLP on Ed25519 curve**

> **[中文文档](README.zh-CN.md)**

---

## ⚠️ Disclaimer

**This script is for ENTERTAINMENT and EDUCATIONAL PURPOSES ONLY.**

Breaking Ed25519 on a classical computer is computationally infeasible. The group order is approximately 2^252, meaning even with Pollard's Rho algorithm (which has O(sqrt(n)) complexity), you would need approximately 2^126 operations. At current computing speeds, this would take longer than the age of the universe.

**Ed25519 remains secure on classical computers.**

---

## Overview

This project implements Pollard's Rho algorithm to solve the Elliptic Curve Discrete Logarithm Problem (ECDLP) on the Ed25519 curve. It serves as:

- An educational demonstration of how Pollard's Rho algorithm works
- A visual representation of exponential complexity
- A humorous reminder of why elliptic curve cryptography is secure
- A fun way to appreciate the scale of cryptographic security

### The Reality

```
Theoretical complexity: ~2^126 elliptic curve operations
Estimated time on current hardware: ~10^30 years
Age of the universe: ~1.38 × 10^10 years
Probability of success: ≈ 0
```

---

## Installation

### Requirements

- Python 3.12 or higher
- ecdsa library (>= 0.19.1)

### Setup

```bash
# Clone the repository
git clone https://github.com/jiangydev/ed25519-dream-crusher.git
cd ed25519-dream-crusher

# Create a virtual environment (recommended)
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

---

## Usage

### Basic Usage

```bash
python pollard_rho_ed25519_fun.py --public-key <PUBLIC_KEY_HEX>
```

### Examples

```bash
# With 0x prefix
python pollard_rho_ed25519_fun.py --public-key 0x1234abcd...5678ef

# Without 0x prefix
python pollard_rho_ed25519_fun.py --public-key 1234abcd...5678ef

# With iteration limit
python pollard_rho_ed25519_fun.py --public-key 1234abcd...5678ef --max-iterations 1000000

# Custom log interval
python pollard_rho_ed25519_fun.py --public-key 1234abcd...5678ef --log-interval 50000
```

### Command Line Arguments

| Argument | Short | Required | Description |
|----------|-------|----------|-------------|
| `--public-key` | `-p` | Yes | Ed25519 public key in hex format (64 hex characters) |
| `--max-iterations` | | No | Maximum number of iterations to attempt (default: unlimited) |
| `--log-interval` | | No | Print progress every N iterations (default: 100000) |

---

## How It Works

### Pollard's Rho Algorithm

The algorithm uses a pseudo-random walk through the elliptic curve group, tracking points in the form:

```
P = alpha * G + beta * Q
```

Where:
- `G` is the base point (generator)
- `Q` is the target public key (Q = k * G)
- `alpha` and `beta` are tracked coefficients
- `k` is the private key we're trying to find

### Floyd's Cycle Detection

The script uses the "tortoise and hare" approach:
- Tortoise moves 1 step at a time
- Hare moves 2 steps at a time
- When they collide, we can solve for the private key

### Solving for k

When a collision is found:

```
alpha_t * G + beta_t * Q = alpha_h * G + beta_h * Q
(alpha_t - alpha_h) * G = (beta_h - beta_t) * k * G
k = (alpha_t - alpha_h) * inverse(beta_h - beta_t) mod n
```

---

## Project Structure

```
ed25519-dream-crusher/
├── pollard_rho_ed25519_fun.py   # Main implementation
├── requirements.txt              # Python dependencies
├── doc/
│   └── REQUIREMENTS.md           # Project requirements (Chinese)
├── README.md                     # This file
└── README.zh-CN.md              # Chinese documentation
```

---

## Sample Output

```
  █░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░█
  █                                                           █
  █         Pollard's Rho ECDLP Solver for Ed25519            █
  █            (Entertainment Edition / 仅供娱乐)              █
  █                                                           █
  █░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░█

  ╔══════════════════════════════════════════════════════════════════════╗
  ║  DISCLAIMER: This script is for ENTERTAINMENT purposes only.        ║
  ║  Ed25519 is currently secure on classical computers.                ║
  ╚══════════════════════════════════════════════════════════════════════╝

  ──────────────────────────────────────────────────────────────────────
  Iteration: 100,000
  Speed: ~50,000 ops/sec
  Progress: 1.234567890123456e-35%
  Estimated remaining time: 3.45 × 10^28 years (longer than the universe!)
  Status: 🐢 Tortoise and 🐇 Hare are still wandering... no collision yet!
  ──────────────────────────────────────────────────────────────────────
```

---

## Technical Details

### Ed25519 Curve Parameters

- **Curve equation**: -x^2 + y^2 = 1 - 121665/121666 * x^2 * y^2 (over GF(p))
- **Field modulus (p)**: 2^255 - 19
- **Group order (n)**: ~2^252
- **Base point (G)**: Standard Ed25519 generator

### Algorithm Complexity

- **Time complexity**: O(sqrt(n)) ≈ 2^126 operations
- **Space complexity**: O(1)
- **Expected iterations**: ~sqrt(π * n / 2)

---

## Dependencies

- **ecdsa** (>= 0.19.1): Python library for elliptic curve cryptography
  - Provides Ed25519 curve implementation
  - Point operations (addition, multiplication)
  - Modular inverse operations

---

## Educational Value

This script demonstrates:

1. **How Pollard's Rho algorithm works** - Understanding the random walk and collision detection
2. **Why elliptic curve cryptography is secure** - Seeing the impractical time requirements firsthand
3. **The importance of key sizes** - 256-bit curves provide enormous security margins
4. **Algorithm design principles** - Tortoise and hare cycle detection, partition functions

---

## License

MIT License - feel free to use for educational purposes.

---

## Contributing

This is an educational/demonstration project. Feel free to open issues or submit pull requests for:

- Bug fixes
- Documentation improvements
- Additional educational features

---

## Acknowledgments

- The **ecdsa** library maintainers for providing excellent elliptic curve implementations
- John Pollard for inventing the Rho algorithm
- The Ed25519 design team (Bernstein et al.)

---

*Remember: This is entertainment! Ed25519 is secure. Don't expect to find any private keys. 😄*
