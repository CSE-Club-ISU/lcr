FROM gcc:13

# Bundle nlohmann/json single-header so the sandbox has no network access
ADD https://github.com/nlohmann/json/releases/download/v3.11.3/json.hpp \
    /usr/local/include/nlohmann/json.hpp
