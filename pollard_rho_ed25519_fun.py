#!/usr/bin/env python3
"""
Pollard's Rho Algorithm for ECDLP on Ed25519 - Entertainment Edition

This script is for ENTERTAINMENT and EDUCATIONAL PURPOSES ONLY.
It demonstrates the Pollard's Rho algorithm for solving the Elliptic Curve
Discrete Logarithm Problem (ECDLP) on the Ed25519 curve.

DISCLAIMER: Breaking Ed25519 on a classical computer is computationally infeasible.
The group order is approximately 2^252, meaning even with Pollard's Rho algorithm
(which has O(sqrt(n)) complexity), you would need approximately 2^126 operations.
At current computing speeds, this would take longer than the age of the universe.

Ed25519 remains secure on classical computers.
"""

import argparse
import hashlib
import math
import sys
import time
from typing import Tuple, Optional

try:
    from ecdsa import SigningKey, VerifyingKey
    from ecdsa.curves import Ed25519
    from ecdsa.ecdsa import generator_secp256k1
    from ecdsa.numbertheory import inverse_mod
except ImportError:
    print("Error: ecdsa library not found. Please install it using:")
    print("  pip install ecdsa")
    sys.exit(1)


# Ed25519 curve parameters (from ecdsa library)
CURVE = Ed25519
G = CURVE.generator
n = CURVE.order  # Group order, approximately 2^252
p = CURVE.curve.p()  # Field modulus


def print_separator(char="=", length=70):
    """Print a separator line."""
    print(char * length)


def parse_public_key(pubkey_hex: str):
    """
    Parse a public key hex string and convert to ecdsa point.

    Args:
        pubkey_hex: Public key as hex string (with or without '0x' prefix)

    Returns:
        The elliptic curve point representing the public key
    """
    # Remove '0x' prefix if present
    if pubkey_hex.startswith("0x") or pubkey_hex.startswith("0X"):
        pubkey_hex = pubkey_hex[2:]

    # Remove any whitespace
    pubkey_hex = pubkey_hex.strip().replace(" ", "")

    # Validate hex string
    if not all(c in "0123456789abcdefABCDEF" for c in pubkey_hex):
        raise ValueError("Invalid hex string in public key")

    # Ed25519 public keys are 32 bytes (64 hex characters)
    if len(pubkey_hex) != 64:
        raise ValueError(f"Ed25519 public key must be 64 hex characters (32 bytes), got {len(pubkey_hex)}")

    # Convert to bytes
    pubkey_bytes = bytes.fromhex(pubkey_hex)

    # Create VerifyingKey from bytes (ecdsa library handles decompression)
    try:
        # For Ed25519, we need to use the specific curve
        vk = VerifyingKey.from_string(pubkey_bytes, curve=CURVE)
        return vk.pubkey.point
    except Exception as e:
        raise ValueError(f"Failed to parse public key: {e}")


def format_time_remaining(seconds: float) -> str:
    """
    Format remaining time in a humorous scientific notation.

    Args:
        seconds: Time in seconds

    Returns:
        Formatted time string
    """
    if seconds < 60:
        return f"{seconds:.1f} seconds"
    elif seconds < 3600:
        minutes = seconds / 60
        return f"{minutes:.1f} minutes"
    elif seconds < 86400:
        hours = seconds / 3600
        return f"{hours:.1f} hours"
    elif seconds < 31557600:  # Seconds in a year
        days = seconds / 86400
        return f"{days:.1f} days"
    elif seconds < 3.15576e13:  # 1 million years
        years = seconds / 31557600
        return f"{years:.0f} years"
    elif seconds < 3.15576e20:  # 10^14 years
        years = seconds / 31557600
        exp = int(math.log10(years))
        mantissa = years / (10 ** exp)
        return f"{mantissa:.2f} × 10^{exp} years"
    else:
        years = seconds / 31557600
        exp = int(math.log10(years))
        mantissa = years / (10 ** exp)
        return f"{mantissa:.2f} × 10^{exp} years (longer than the universe! 🌌)"


def partition_function(point) -> int:
    """
    Partition function for the random walk.
    Divides points into 20 partitions based on x-coordinate hash.

    Args:
        point: Elliptic curve point

    Returns:
        Partition number (0-19)
    """
    # Hash the x-coordinate to determine partition
    x_bytes = point.x().to_bytes((point.x().bit_length() + 7) // 8, 'big')
    hash_val = int(hashlib.sha256(x_bytes).hexdigest(), 16)
    return hash_val % 20


def iteration_step(point_p, alpha: int, beta: int, Q) -> Tuple:
    """
    Perform one iteration step of the random walk.

    Uses the 20-partition method:
    - Each partition defines a different update rule
    - P = alpha * G + beta * Q

    Args:
        point_p: Current point P = alpha*G + beta*Q
        alpha: Current alpha coefficient
        beta: Current beta coefficient
        Q: Target public key point

    Returns:
        Tuple of (new_point, new_alpha, new_beta)
    """
    partition = partition_function(point_p)

    # Define different update rules for each partition
    # This creates a pseudo-random walk through the group
    c_list = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
              2, 2, 2, 2, 2, 2, 2, 2, 2, 2]
    d_list = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
              1, 1, 1, 1, 1, 1, 1, 1, 1, 1]

    c = c_list[partition]
    d = d_list[partition]

    # P_new = P + c*G + d*Q
    # This means: alpha_new = alpha + c, beta_new = beta + d
    new_point = point_p + c * G + d * Q
    new_alpha = (alpha + c) % n
    new_beta = (beta + d) % n

    return new_point, new_alpha, new_beta


def solve_ecdlp_pollard_rho(Q, max_iterations: Optional[int] = None, log_interval: int = 10**6):
    """
    Solve ECDLP using Pollard's Rho algorithm with Floyd's cycle detection.

    Given Q = k*G, find k.

    Args:
        Q: Target public key point
        max_iterations: Maximum iterations to attempt (None for infinite)
        log_interval: Print progress every N iterations

    Returns:
        The private key k if found, None otherwise
    """
    print()
    print("Starting Pollard's Rho algorithm...")
    print(f"Target point Q: ({Q.x()}, {Q.y()})")
    print(f"Group order n: {n}")
    print(f"Bit length of n: {n.bit_length()}")
    print()

    # Initialize tortoise and hare at the same starting point
    # P = alpha * G + beta * Q
    start_alpha = 1
    start_beta = 1
    start_point = start_alpha * G + start_beta * Q

    # Tortoise moves 1 step at a time
    tortoise_point = start_point
    tortoise_alpha = start_alpha
    tortoise_beta = start_beta

    # Hare moves 2 steps at a time
    hare_point = start_point
    hare_alpha = start_alpha
    hare_beta = start_beta

    iteration = 0
    start_time = time.time()
    last_log_time = start_time

    try:
        while True:
            # Move tortoise 1 step
            tortoise_point, tortoise_alpha, tortoise_beta = iteration_step(
                tortoise_point, tortoise_alpha, tortoise_beta, Q
            )

            # Move hare 2 steps
            hare_point, hare_alpha, hare_beta = iteration_step(
                hare_point, hare_alpha, hare_beta, Q
            )
            hare_point, hare_alpha, hare_beta = iteration_step(
                hare_point, hare_alpha, hare_beta, Q
            )

            iteration += 1

            # Check for collision (tortoise == hare)
            # We compare the x and y coordinates
            if (tortoise_point.x() == hare_point.x() and
                tortoise_point.y() == hare_point.y()):

                # Collision found! Now solve for k
                # We have: P = alpha_t * G + beta_t * Q = alpha_h * G + beta_h * Q
                # This gives us: (alpha_t - alpha_h) * G = (beta_h - beta_t) * Q
                # Since Q = k * G: (alpha_t - alpha_h) * G = (beta_h - beta_t) * k * G
                # Therefore: k = (alpha_t - alpha_h) * inv(beta_h - beta_t) mod n

                beta_diff = (hare_beta - tortoise_beta) % n
                alpha_diff = (tortoise_alpha - hare_alpha) % n

                if beta_diff == 0:
                    # Trivial collision, restart with different parameters
                    print("  Trivial collision detected, restarting...")
                    start_alpha = (start_alpha + 1) % n
                    start_point = start_alpha * G + start_beta * Q
                    tortoise_point = hare_point = start_point
                    tortoise_alpha = hare_alpha = start_alpha
                    tortoise_beta = hare_beta = start_beta
                    continue

                try:
                    k = (alpha_diff * inverse_mod(beta_diff, n)) % n

                    # Verify the solution
                    if k * G == Q:
                        return k
                except ValueError:
                    # Inverse doesn't exist (beta_diff shares factor with n)
                    pass

                # Collision didn't yield valid solution, restart
                start_alpha = (start_alpha + 1) % n
                start_point = start_alpha * G + start_beta * Q
                tortoise_point = hare_point = start_point
                tortoise_alpha = hare_alpha = start_alpha
                tortoise_beta = hare_beta = start_beta

            # Print progress log
            if iteration % log_interval == 0:
                current_time = time.time()
                elapsed = current_time - last_log_time
                ops_per_sec = log_interval / elapsed if elapsed > 0 else 0
                last_log_time = current_time

                # Estimate remaining time
                # Expected complexity: sqrt(pi*n/2) ≈ 2^126 operations
                expected_ops = math.sqrt(math.pi * n / 2)
                remaining_ops = expected_ops - iteration
                remaining_seconds = remaining_ops / ops_per_sec if ops_per_sec > 0 else float('inf')

                # Calculate progress (this will be hilariously small)
                progress = (iteration / expected_ops) * 100

                print()
                print("  " + "─" * 60)
                print(f"  Iteration: {iteration:,}")
                print(f"  Speed: ~{ops_per_sec:,.0f} ops/sec")
                print(f"  Progress: {progress:.15e}%")
                print(f"  Estimated remaining time: {format_time_remaining(remaining_seconds)}")
                print(f"  Status: 🐢 Tortoise and 🐇 Hare are still wandering... no collision yet!")
                print("  " + "─" * 60)
                print()

            # Check max iterations
            if max_iterations and iteration >= max_iterations:
                print(f"\n  Reached maximum iteration limit of {max_iterations:,}")
                print("  Time to face reality: this won't work in your lifetime!")
                break

    except KeyboardInterrupt:
        print()
        print("\n  Interrupted by user. Wise choice!")
        print(f"  Completed {iteration:,} iterations before giving up.")
        return None

    return None


def main():
    """Main entry point for the script."""
    print()
    print()
    print("  █░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░█")
    print("  █                                                           █")
    print("  █         Pollard's Rho ECDLP Solver for Ed25519            █")
    print("  █            (Entertainment Edition / 仅供娱乐)              █")
    print("  █                                                           █")
    print("  █░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░█")
    print()

    # Safety and ethical disclaimer
    print("  ╔═════════════════════════════════════════════════════════════════════════════════════════════════════════╗")
    print("  ║  DISCLAIMER: This script is for ENTERTAINMENT purposes only.                                            ║")
    print("  ║  Ed25519 is currently secure on classical computers. The probability of success is essentially zero.😌  ║")
    print("  ║  免责声明：本脚本仅供娱乐用途。                                                                              ║")
    print("  ║  Ed25519 目前在传统计算机上运行安全，成功的概率几乎为零。😌                                                     ║")
    print("  ╚═════════════════════════════════════════════════════════════════════════════════════════════════════════╝")
    print()

    # Parse command line arguments
    parser = argparse.ArgumentParser(
        description="Pollard's Rho algorithm for ECDLP on Ed25519 (Entertainment Edition)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python pollard_rho_ed25519_fun.py --public-key 0x1234...abcd
  python pollard_rho_ed25519_fun.py --public-key 1234abcd...5678ef
        """
    )
    parser.add_argument(
        '--public-key', '-p',
        type=str,
        required=True,
        help='Ed25519 public key in hex format (64 hex characters, with or without 0x prefix)'
    )
    parser.add_argument(
        '--max-iterations',
        type=int,
        default=None,
        help='Maximum number of iterations to attempt (default: unlimited)'
    )
    parser.add_argument(
        '--log-interval',
        type=int,
        default=10**5,
        help='Print progress every N iterations (default: 100000)'
    )

    args = parser.parse_args()

    # Parse the public key
    try:
        print(f"  Parsing public key (解析公钥中): {args.public_key}")
        Q = parse_public_key(args.public_key)
        print(f"  ✓ Public key parsed successfully! (公钥解析成功! 开始玩耍...)")
        print()
    except ValueError as e:
        print(f"  ✗ Error: {e}")
        sys.exit(1)

    # Run Pollard's Rho algorithm
    result = solve_ecdlp_pollard_rho(
        Q,
        max_iterations=args.max_iterations,
        log_interval=args.log_interval
    )

    # Print result
    print()
    print_separator()
    print()

    if result is not None:
        print("  🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉")
        print()
        print("  THE IMPOSSIBLE HAS HAPPENED!")
        print("  You have broken Ed25519!")
        print("  Quick, buy a lottery ticket! 🎫")
        print()
        print(f"  Private key found: {result}")
        print(f"  Private key (hex): {hex(result)}")
        print()
        print("  🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉")
    else:
        print("  As expected, no collision was found.")
        print()
        print("  This is not a bug - it's mathematics!")
        print("  Ed25519's security is based on the computational infeasibility of solving ECDLP for 252-bit curves.")
        print("  Fun fact: Even with all the computing power in the world, this would take billions of years!")
        print()
        print("  这不是漏洞——这是数学原理！")
        print("  Ed25519 的安全性基于计算上的不可行性，即求解 252 位曲线的 ECDLP 问题。")
        print("  有趣的是：即使拥有世界上所有的计算能力，这也需要数十亿年！")
        print()
        print("  Thanks for playing! 😄")

    print()
    print_separator()
    print()
    print("  ╔═════════════════════════════════════════════════════════════════════════════════════════════════════════╗")
    print("  ║  This script is for ENTERTAINMENT purposes only.                                                        ║")
    print("  ║  Ed25519 is currently secure on classical computers. The probability of success is essentially zero.😌  ║")
    print("  ║  本脚本仅供娱乐用途。                                                                                       ║")
    print("  ║  Ed25519 目前在传统计算机上运行安全，成功的概率几乎为零。😌                                                     ║")
    print("  ╚═════════════════════════════════════════════════════════════════════════════════════════════════════════╝")
    print()
    print()


if __name__ == "__main__":
    main()
