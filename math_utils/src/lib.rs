// math_utils/src/lib.rs

use anchor_lang::prelude::SolanaSysvar;

pub fn is_prime(n: u64, k: u32) -> bool {
    if n <= 1 {
        return false;
    }
    if n <= 3 {
        return true;
    }
    if n % 2 == 0 || n % 3 == 0 {
        return false;
    }

    let mut d = n - 1;
    while d % 2 == 0 {
        d /= 2;
    }

    for _ in 0..k {
        if !miller_rabin_test(d, n) {
            return false;
        }
    }
    true
}

pub fn miller_rabin_test(d: u64, n: u64) -> bool {
    let clock = anchor_lang::solana_program::clock::Clock::get().unwrap();
    let unix_time = clock.unix_timestamp;
    let a: u64 = 2 + (unix_time as u64 % (n - 3)); // Ensuring a is in range 2..n-2
    let mut x = mod_exp(a, d, n);

    if x == 1 || x == n - 1 {
        return true;
    }

    let mut d = d;
    while d != n - 1 {
        x = mod_exp(x, 2, n);
        d *= 2;

        if x == 1 {
            return false;
        }
        if x == n - 1 {
            return true;
        }
    }
    false
}

pub fn mod_exp(mut base: u64, mut exp: u64, modulus: u64) -> u64 {
    let mut result = 1;
    base = base % modulus;
    while exp > 0 {
        if exp % 2 == 1 {
            result = (result * base) % modulus;
        }
        exp = exp >> 1;
        base = (base * base) % modulus;
    }
    result
}

