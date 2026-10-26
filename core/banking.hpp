#pragma once
#include <cstdint>
#include <stdexcept>
#include <string>
namespace bank {
constexpr std::int64_t maximum = 9000000000000LL;
inline std::int64_t evaluate(const std::string& op, std::int64_t balance,
                             std::int64_t amount, std::int64_t minimum) {
  if (balance < 0 || balance > maximum || minimum < 0 || minimum > maximum ||
      amount <= 0 || amount > maximum) throw std::runtime_error("Invalid amount or balance");
  if (op == "DEPOSIT" || op == "OPENING") {
    if (amount > maximum - balance) throw std::runtime_error("Maximum balance exceeded");
    if (op == "OPENING" && amount < minimum) throw std::runtime_error("Initial deposit below minimum");
    return balance + amount;
  }
  if (op == "WITHDRAW" || op == "SETTLEMENT") {
    if (amount > balance || balance - amount < minimum) throw std::runtime_error("Insufficient available funds");
    return balance - amount;
  }
  throw std::runtime_error("Invalid operation");
}
}
