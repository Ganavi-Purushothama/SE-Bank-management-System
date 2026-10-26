#include "banking.hpp"
#include <iostream>
#include <regex>
int main() {
  std::string input;
  char ch;
  while (std::cin.get(ch) && ch != '\n') {
    if (input.size() >= 512) { std::cout << "{\"status\":\"REJECTED\",\"reason\":\"Input too large\"}\n"; return 0; }
    input += ch;
  }
  // Version 1: exact canonical JSON from the trusted Express adapter; money is integer paise.
  const std::regex contract(R"json(^\{"operation":"([A-Z]+)","currentBalance":([0-9]+),"amount":([0-9]+),"minBalance":([0-9]+)\}$)json");
  std::smatch fields;
  try {
    if (!std::regex_match(input, fields, contract)) throw std::runtime_error("Invalid IPC input");
    auto result = bank::evaluate(fields[1], std::stoll(fields[2]), std::stoll(fields[3]), std::stoll(fields[4]));
    std::cout << "{\"status\":\"APPROVED\",\"newBalance\":" << result << "}\n";
  } catch (const std::out_of_range&) {
    std::cout << "{\"status\":\"REJECTED\",\"reason\":\"Integer out of range\"}\n";
  } catch (const std::exception& error) {
    std::cout << "{\"status\":\"REJECTED\",\"reason\":\"" << error.what() << "\"}\n";
  }
}
