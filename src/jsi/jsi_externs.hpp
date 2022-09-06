#pragma once

#include <functional>

namespace realm {
namespace js {

// Function passed in from the React Native initialisation code to flush the UI microtask queue
extern std::function<void()> flush_ui_queue;

} // namespace js
} // namespace realm