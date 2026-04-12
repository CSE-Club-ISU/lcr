// Seed script — run by init.sh after publishing the module.
// Usage: bun seed-problems.mjs <server> <db> <token>

const [,, SERVER, DB_NAME, TOKEN] = process.argv;

if (!SERVER || !DB_NAME || !TOKEN) {
  console.error('Usage: bun seed-problems.mjs <server> <db> <token>');
  process.exit(1);
}

async function callReducer(name, args) {
  const res = await fetch(`${SERVER}/v1/database/${DB_NAME}/call/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`,
    },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${name} failed (${res.status}): ${text}`);
  }
  console.log(`  ✓ ${args.title ?? name}`);
}

// ---------------------------------------------------------------------------
// Stress-test helpers
// These generate large hidden test cases that TLE naive O(n²) solutions.
// All values are seeded for reproducibility.
// ---------------------------------------------------------------------------

function seededRand(seed) {
  // Simple LCG
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}

/** n integers in range [lo, hi) with a given seed */
function randArray(n, lo, hi, seed = 42) {
  const r = seededRand(seed);
  return Array.from({ length: n }, () => Math.floor(r() * (hi - lo) + lo));
}

/** Fisher-Yates shuffle using a seeded RNG. Returns a new array. */
function shuffle(arr, r) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ---------------------------------------------------------------------------
// Per-language boilerplate helpers
// ---------------------------------------------------------------------------

// Algorithm contract:
//   Java: public static Object <method>(Object... args)
//   C++:  json <method>(const json& args)
//
// Data structure contract:
//   Java: class with public Object call(String m, Object... a) dispatch
//   C++:  struct with json call(const std::string& m, const json& a) dispatch

function algoBoilerplates(javaMethod, javaBody, cppSignature, cppBody) {
  return {
    boilerplate_java:
      `public static Object ${javaMethod}(Object... args) {\n${javaBody}\n}`,
    boilerplate_cpp:
      `json ${cppSignature}(const json& args) {\n${cppBody}\n}`,
  };
}

function dsBoilerplates(className, javaFields, javaMethods, cppFields, cppMethods) {
  const javaCall =
    `    public Object call(String m, Object... a) throws Exception {\n` +
    `        return (Object) getClass().getMethod(m, Object[].class).invoke(this, (Object) a);\n` +
    `    }`;
  const java =
    `class ${className} {\n${javaFields}${javaMethods}\n${javaCall}\n}`;

  const cpp =
    `struct ${className} {\n${cppFields}${cppMethods}\n` +
    `    json call(const std::string& m, const json& a) {\n` +
    `        throw std::runtime_error("unknown op: " + m);\n` +
    `    }\n` +
    `};`;

  return { boilerplate_java: java, boilerplate_cpp: cpp };
}

// ---------------------------------------------------------------------------
// Problems
// Target distribution: ~8 easy, ~5 medium, ~2 hard
// Style: single method / isolated step — deliberately easier than average LeetCode
// ---------------------------------------------------------------------------

const problems = [

  // ── EASY ──────────────────────────────────────────────────────────────────

  {
    title: 'Two Sum',
    description:
      'Given a list of integers `nums` and an integer `target`, return the indices of the two numbers that add up to `target`.\n\n' +
      'You may assume exactly one solution exists. Return the indices in any order.',
    difficulty: 'easy',
    method_name: 'two_sum',
    sample_test_cases: '[[2,7,11,15],9]|[[3,2,4],6]|[[3,3],6]',
    sample_test_results: '[0,1]|[1,2]|[0,1]',
    hidden_test_cases: (() => {
      // Stress: 5k element array, answer at the ends (O(n²) brute force is ~25M ops)
      const big = randArray(5000, 2, 4999, 1);
      big[0] = 1; big[4999] = 9998; // ensure unique solution at indices 0 and 4999
      const target = big[0] + big[4999];
      return `[[2,7,11,15],9]|[[3,2,4],6]|[[3,3],6]|[[-1,-2,-3,-4,-5],-8]|[[1,2,3,4,5],9]|${JSON.stringify([big, target])}`;
    })(),
    hidden_test_results: '[0,1]|[1,2]|[0,1]|[2,4]|[3,4]|[0,4999]',
    boilerplate_python: 'def two_sum(nums: list, target: int) -> list:\n    # Your code here\n    pass',
    ...algoBoilerplates(
      'two_sum',
      '    // args[0] = nums (List), args[1] = target (Long)\n    // return a List of two indices\n    return null;',
      'two_sum',
      '    // args[0] = nums array, args[1] = target\n    // return a json array of two indices\n    return nullptr;',
    ),
    problem_kind: 'algorithm',
  },

  {
    title: 'Reverse a String',
    description:
      'Given a string `s`, return it reversed.\n\n' +
      'Example: `"hello"` → `"olleh"`',
    difficulty: 'easy',
    method_name: 'reverse_string',
    sample_test_cases: '"hello"|"world"|"a"',
    sample_test_results: '"olleh"|"dlrow"|"a"',
    ...(() => {
      const big = 'abcdefghij'.repeat(2000); // 20k chars
      const rev = big.split('').reverse().join('');
      return {
        hidden_test_cases: `"hello"|"world"|"a"|""|"abcde"|"racecar"|${JSON.stringify(big)}`,
        hidden_test_results: `"olleh"|"dlrow"|"a"|""|"edcba"|"racecar"|${JSON.stringify(rev)}`,
      };
    })(),
    boilerplate_python: 'def reverse_string(s: str) -> str:\n    # Your code here\n    pass',
    ...algoBoilerplates(
      'reverse_string',
      '    // args[0] = s (String)\n    String s = (String) args[0];\n    return null; // return the reversed string',
      'reverse_string',
      '    // args[0] = s (string)\n    std::string s = args[0].get<std::string>();\n    return nullptr; // return the reversed string',
    ),
    problem_kind: 'algorithm',
  },

  {
    title: 'Is Palindrome',
    description:
      'Given an integer `x`, return `True` if it is a palindrome, `False` otherwise.\n\n' +
      'A palindrome reads the same forwards and backwards.\n\n' +
      'Example: `121` → `True`, `-121` → `False`, `10` → `False`',
    difficulty: 'easy',
    method_name: 'is_palindrome',
    sample_test_cases: '121|-121|10',
    sample_test_results: 'true|false|false',
    hidden_test_cases: '121|-121|10|0|1221|12321|123',
    hidden_test_results: 'true|false|false|true|true|true|false',
    boilerplate_python: 'def is_palindrome(x: int) -> bool:\n    # Your code here\n    pass',
    ...algoBoilerplates(
      'is_palindrome',
      '    // args[0] = x (Long)\n    long x = (Long) args[0];\n    return null; // return true or false',
      'is_palindrome',
      '    // args[0] = x (number)\n    long x = args[0].get<long>();\n    return nullptr; // return true or false',
    ),
    problem_kind: 'algorithm',
  },

  {
    title: 'Contains Duplicate',
    description:
      'Given a list of integers `nums`, return `True` if any value appears more than once, `False` otherwise.',
    difficulty: 'easy',
    method_name: 'contains_duplicate',
    sample_test_cases: '[1,2,3,1]|[1,2,3,4]|[1,1,1,3,3,4,3,2,4,2]',
    sample_test_results: 'true|false|true',
    hidden_test_cases: (() => {
      // Stress: 5k unique elements then same with a duplicate at end
      const uniq = Array.from({ length: 5000 }, (_, i) => i);
      const withDup = [...uniq]; withDup[4999] = 0;
      return `[1,2,3,1]|[1,2,3,4]|[1,1,1,3,3,4,3,2,4,2]|[]|[1]|[1,2]|${JSON.stringify(uniq)}|${JSON.stringify(withDup)}`;
    })(),
    hidden_test_results: 'true|false|true|false|false|false|false|true',
    boilerplate_python: 'def contains_duplicate(nums: list) -> bool:\n    # Your code here\n    pass',
    ...algoBoilerplates(
      'contains_duplicate',
      '    // args[0] = nums (List)\n    @SuppressWarnings("unchecked")\n    java.util.List<Object> nums = (java.util.List<Object>) args[0];\n    return null; // return true or false',
      'contains_duplicate',
      '    // args[0] = nums array\n    auto nums = args[0];\n    return nullptr; // return true or false',
    ),
    problem_kind: 'algorithm',
  },

  {
    title: 'Max in Array',
    description:
      'Given a non-empty list of integers `nums`, return the largest element.\n\n' +
      'Do not use the built-in `max()` function.',
    difficulty: 'easy',
    method_name: 'max_in_array',
    sample_test_cases: '[3,1,4,1,5,9]|[-3,-1,-4]|[7]',
    sample_test_results: '9|-1|7',
    ...(() => {
      const big = randArray(10000, -1000000, 1000000, 7);
      const max = Math.max(...big);
      return {
        hidden_test_cases: `[3,1,4,1,5,9]|[-3,-1,-4]|[7]|[0,0,0]|[100,-100,50]|[1,2,3,4,5]|${JSON.stringify(big)}`,
        hidden_test_results: `9|-1|7|0|100|5|${max}`,
      };
    })(),
    boilerplate_python: 'def max_in_array(nums: list) -> int:\n    # Your code here (don\'t use max())\n    pass',
    ...algoBoilerplates(
      'max_in_array',
      '    // args[0] = nums (List)\n    @SuppressWarnings("unchecked")\n    java.util.List<Object> nums = (java.util.List<Object>) args[0];\n    return null; // return the max as a Long',
      'max_in_array',
      '    // args[0] = nums array\n    auto nums = args[0];\n    return nullptr; // return the max as an integer',
    ),
    problem_kind: 'algorithm',
  },

  {
    title: 'FizzBuzz',
    description:
      'Given an integer `n`, return a list of strings for numbers from `1` to `n`:\n\n' +
      '- `"FizzBuzz"` for multiples of both 3 and 5\n' +
      '- `"Fizz"` for multiples of 3\n' +
      '- `"Buzz"` for multiples of 5\n' +
      '- The number as a string otherwise',
    difficulty: 'easy',
    method_name: 'fizz_buzz',
    sample_test_cases: '3|5|15',
    sample_test_results: '["1","2","Fizz"]|["1","2","Fizz","4","Buzz"]|["1","2","Fizz","4","Buzz","Fizz","7","8","Fizz","Buzz","11","Fizz","13","14","FizzBuzz"]',
    hidden_test_cases: '3|5|15|1|10',
    hidden_test_results: '["1","2","Fizz"]|["1","2","Fizz","4","Buzz"]|["1","2","Fizz","4","Buzz","Fizz","7","8","Fizz","Buzz","11","Fizz","13","14","FizzBuzz"]|["1"]|["1","2","Fizz","4","Buzz","Fizz","7","8","Fizz","Buzz"]',
    boilerplate_python: 'def fizz_buzz(n: int) -> list:\n    # Your code here\n    pass',
    ...algoBoilerplates(
      'fizz_buzz',
      '    // args[0] = n (Long)\n    long n = (Long) args[0];\n    java.util.List<Object> result = new java.util.ArrayList<>();\n    // fill result with "Fizz", "Buzz", "FizzBuzz", or number string\n    return result;',
      'fizz_buzz',
      '    // args[0] = n (integer)\n    long n = args[0].get<long>();\n    json result = json::array();\n    // fill result with "Fizz", "Buzz", "FizzBuzz", or number string\n    return result;',
    ),
    problem_kind: 'algorithm',
  },

  {
    title: 'Sum of Digits',
    description:
      'Given a non-negative integer `n`, return the sum of its digits.\n\n' +
      'Example: `123` → `6`, `9999` → `36`',
    difficulty: 'easy',
    method_name: 'sum_of_digits',
    sample_test_cases: '123|9999|0',
    sample_test_results: '6|36|0',
    hidden_test_cases: '123|9999|0|1|100|12345|999999999',
    hidden_test_results: '6|36|0|1|1|15|81',
    boilerplate_python: 'def sum_of_digits(n: int) -> int:\n    # Your code here\n    pass',
    ...algoBoilerplates(
      'sum_of_digits',
      '    // args[0] = n (Long)\n    long n = (Long) args[0];\n    return null; // return the digit sum as a Long',
      'sum_of_digits',
      '    // args[0] = n (integer)\n    long n = args[0].get<long>();\n    return nullptr; // return the digit sum',
    ),
    problem_kind: 'algorithm',
  },

  {
    title: 'Fibonacci (Iterative)',
    description:
      'Given a non-negative integer `n`, return the `n`th Fibonacci number.\n\n' +
      '`fib(0) = 0`, `fib(1) = 1`, `fib(n) = fib(n-1) + fib(n-2)`\n\n' +
      'Implement this iteratively (no recursion).',
    difficulty: 'easy',
    method_name: 'fib',
    sample_test_cases: '0|1|6|10',
    sample_test_results: '0|1|8|55',
    hidden_test_cases: '0|1|2|3|6|10|15|50',
    hidden_test_results: '0|1|1|2|8|55|610|12586269025',
    boilerplate_python: 'def fib(n: int) -> int:\n    # Your code here (iterative, no recursion)\n    pass',
    ...algoBoilerplates(
      'fib',
      '    // args[0] = n (Long)\n    long n = (Long) args[0];\n    return null; // return the nth Fibonacci number as a Long',
      'fib',
      '    // args[0] = n (integer)\n    long n = args[0].get<long>();\n    return nullptr; // return the nth Fibonacci number',
    ),
    problem_kind: 'algorithm',
  },

  {
    title: 'Valid Parentheses',
    description:
      'Given a string `s` containing only the characters `(`, `)`, `{`, `}`, `[`, `]`, return `True` if the string is valid.\n\n' +
      'A string is valid if:\n' +
      '- Every open bracket is closed by the same type of bracket\n' +
      '- Open brackets are closed in the correct order',
    difficulty: 'easy',
    method_name: 'is_valid',
    sample_test_cases: '"()"|"()[]{}"|"(]"',
    sample_test_results: 'true|true|false',
    hidden_test_cases: '"()"|"()[]{}"|"(]"|"([)]"|"{[]}"|""|"((("',
    hidden_test_results: 'true|true|false|false|true|true|false',
    boilerplate_python: 'def is_valid(s: str) -> bool:\n    # Your code here\n    pass',
    ...algoBoilerplates(
      'is_valid',
      '    // args[0] = s (String)\n    String s = (String) args[0];\n    return null; // return true or false',
      'is_valid',
      '    // args[0] = s (string)\n    std::string s = args[0].get<std::string>();\n    return nullptr; // return true or false',
    ),
    problem_kind: 'algorithm',
  },

  // ── MEDIUM ────────────────────────────────────────────────────────────────

  {
    title: 'Min Stack',
    description:
      'Design a stack that supports push, pop, top, and retrieving the minimum element in constant time.\n\n' +
      'Implement the MinStack class:\n' +
      '- `push(val)` — pushes val onto the stack\n' +
      '- `pop()` — removes the element on top of the stack\n' +
      '- `top()` — returns the element on top of the stack\n' +
      '- `get_min()` — retrieves the minimum element in the stack in O(1)',
    difficulty: 'medium',
    method_name: 'MinStack',
    sample_test_cases:
      JSON.stringify([['push', -2], ['push', 0], ['push', -3], ['get_min']]) + '|' +
      JSON.stringify([['push', -2], ['push', 0], ['push', -3], ['get_min'], ['pop'], ['top'], ['get_min']]),
    sample_test_results: '-3|-2',
    hidden_test_cases:
      JSON.stringify([['push', -2], ['push', 0], ['push', -3], ['get_min']]) + '|' +
      JSON.stringify([['push', -2], ['push', 0], ['push', -3], ['get_min'], ['pop'], ['top'], ['get_min']]) + '|' +
      JSON.stringify([['push', 5], ['push', 3], ['push', 7], ['get_min'], ['pop'], ['get_min']]),
    hidden_test_results: '-3|-2|3',
    boilerplate_python:
      'class MinStack:\n' +
      '    def __init__(self):\n' +
      '        pass\n\n' +
      '    def push(self, val: int) -> None:\n' +
      '        pass\n\n' +
      '    def pop(self) -> None:\n' +
      '        pass\n\n' +
      '    def top(self) -> int:\n' +
      '        pass\n\n' +
      '    def get_min(self) -> int:\n' +
      '        pass',
    boilerplate_java:
      'class MinStack {\n' +
      '    // add fields here\n\n' +
      '    public Object push(Object... args) {\n' +
      '        long val = (Long) args[0];\n' +
      '        return null;\n' +
      '    }\n\n' +
      '    public Object pop(Object... args) {\n' +
      '        return null;\n' +
      '    }\n\n' +
      '    public Object top(Object... args) {\n' +
      '        return null;\n' +
      '    }\n\n' +
      '    public Object get_min(Object... args) {\n' +
      '        return null;\n' +
      '    }\n\n' +
      '    public Object call(String m, Object... a) throws Exception {\n' +
      '        return (Object) getClass().getMethod(m, Object[].class).invoke(this, (Object) a);\n' +
      '    }\n' +
      '}',
    boilerplate_cpp:
      'struct MinStack {\n' +
      '    // add fields here\n\n' +
      '    json call(const std::string& m, const json& a) {\n' +
      '        if (m == "push") {\n' +
      '            long val = a[0].get<long>();\n' +
      '            return nullptr;\n' +
      '        }\n' +
      '        if (m == "pop")     { return nullptr; }\n' +
      '        if (m == "top")     { return nullptr; }\n' +
      '        if (m == "get_min") { return nullptr; }\n' +
      '        throw std::runtime_error("unknown op: " + m);\n' +
      '    }\n' +
      '};',
    problem_kind: 'data_structure',
  },

  {
    title: 'Valid Anagram',
    description:
      'Given two strings `s` and `t`, return `True` if `t` is an anagram of `s`, `False` otherwise.\n\n' +
      'An anagram uses the same characters the same number of times in a different order.\n\n' +
      'Example: `"anagram"`, `"nagaram"` → `True`; `"rat"`, `"car"` → `False`',
    difficulty: 'medium',
    method_name: 'is_anagram',
    sample_test_cases: '"anagram","nagaram"|"rat","car"|"a","a"',
    sample_test_results: 'true|false|true',
    hidden_test_cases: (() => {
      // Stress: two 5k-char anagram strings (Fisher-Yates for a real shuffle)
      const chars = 'abcdefghijklmnopqrstuvwxyz';
      const r = seededRand(99);
      const arr = Array.from({ length: 5000 }, () => chars[Math.floor(r() * 26)]);
      const s = arr.join('');
      const shuffled = shuffle(arr, r).join('');
      return `"anagram","nagaram"|"rat","car"|"a","a"|"",""|"ab","ba"|"abc","cba"|"abc","abcd"|${JSON.stringify(s)},${JSON.stringify(shuffled)}`;
    })(),
    hidden_test_results: 'true|false|true|true|true|true|false|true',
    boilerplate_python: 'def is_anagram(s: str, t: str) -> bool:\n    # Your code here\n    pass',
    ...algoBoilerplates(
      'is_anagram',
      '    // args[0] = s (String), args[1] = t (String)\n    String s = (String) args[0];\n    String t = (String) args[1];\n    return null; // return true or false',
      'is_anagram',
      '    // args[0] = s (string), args[1] = t (string)\n    std::string s = args[0].get<std::string>();\n    std::string t = args[1].get<std::string>();\n    return nullptr; // return true or false',
    ),
    problem_kind: 'algorithm',
  },

  {
    title: 'Binary Search',
    description:
      'Given a sorted list of integers `nums` and a target value `target`, return the index of `target` if found, or `-1` if not.\n\n' +
      'Your solution must run in O(log n) time.',
    difficulty: 'medium',
    method_name: 'binary_search',
    sample_test_cases: '[[-1,0,3,5,9,12],9]|[[-1,0,3,5,9,12],2]',
    sample_test_results: '4|-1',
    hidden_test_cases: (() => {
      // Stress: sorted array of 10k elements, search near middle
      const big = Array.from({ length: 10000 }, (_, i) => i * 2); // [0,2,4,...,19998]
      const target = big[4999]; // element at index 4999
      return `[[-1,0,3,5,9,12],9]|[[-1,0,3,5,9,12],2]|[[1],1]|[[1],0]|[[1,2,3,4,5],3]|[[1,2,3,4,5],5]|[${JSON.stringify(big)},${target}]`;
    })(),
    hidden_test_results: '4|-1|0|-1|2|4|4999',
    boilerplate_python: 'def binary_search(nums: list, target: int) -> int:\n    # Your code here (must be O(log n))\n    pass',
    ...algoBoilerplates(
      'binary_search',
      '    // args[0] = nums (List<Object>), args[1] = target (Long)\n    @SuppressWarnings("unchecked")\n    java.util.List<Object> nums = (java.util.List<Object>) args[0];\n    long target = (Long) args[1];\n    return null; // return the index as a Long, or -1',
      'binary_search',
      '    // args[0] = nums array, args[1] = target\n    auto nums = args[0];\n    long target = args[1].get<long>();\n    return nullptr; // return the index, or -1',
    ),
    problem_kind: 'algorithm',
  },

  {
    title: 'Linked List: Reverse',
    description:
      'You are given a linked list as a Python list (e.g. `[1, 2, 3]` represents `1 → 2 → 3`).\n\n' +
      'Return the reversed list.\n\n' +
      'Implement this as if you were reversing a real linked list — use a pointer-based approach, not list slicing.',
    difficulty: 'medium',
    method_name: 'reverse_list',
    sample_test_cases: '[[1,2,3,4,5]]|[[1,2]]|[[1]]',
    sample_test_results: '[5,4,3,2,1]|[2,1]|[1]',
    ...(() => {
      const big = Array.from({ length: 5000 }, (_, i) => i);
      const rev = [...big].reverse();
      return {
        hidden_test_cases: `[[1,2,3,4,5]]|[[1,2]]|[[1]]|[[]]|[[1,2,3]]|[${JSON.stringify(big)}]`,
        hidden_test_results: `[5,4,3,2,1]|[2,1]|[1]|[]|[3,2,1]|${JSON.stringify(rev)}`,
      };
    })(),
    boilerplate_python:
      'def reverse_list(head: list) -> list:\n' +
      '    # Treat the list as a linked list and reverse it with pointers.\n' +
      '    # Return the result as a list.\n' +
      '    pass',
    ...algoBoilerplates(
      'reverse_list',
      '    // args[0] = head (List<Object>) representing the linked list\n    @SuppressWarnings("unchecked")\n    java.util.List<Object> head = (java.util.List<Object>) args[0];\n    return null; // return the reversed list',
      'reverse_list',
      '    // args[0] = head (array) representing the linked list\n    auto head = args[0];\n    return nullptr; // return the reversed list',
    ),
    problem_kind: 'algorithm',
  },

  {
    title: 'Climbing Stairs',
    description:
      'You are climbing a staircase with `n` steps. Each time you can climb 1 or 2 steps.\n\n' +
      'Return the number of distinct ways to reach the top.\n\n' +
      'Example: `n = 3` → `3` (1+1+1, 1+2, 2+1)',
    difficulty: 'medium',
    method_name: 'climb_stairs',
    sample_test_cases: '1|2|3',
    sample_test_results: '1|2|3',
    hidden_test_cases: '1|2|3|4|5|10|40',
    hidden_test_results: '1|2|3|5|8|89|102334155',
    boilerplate_python: 'def climb_stairs(n: int) -> int:\n    # Your code here\n    pass',
    ...algoBoilerplates(
      'climb_stairs',
      '    // args[0] = n (Long)\n    long n = (Long) args[0];\n    return null; // return the number of distinct ways as a Long',
      'climb_stairs',
      '    // args[0] = n (integer)\n    long n = args[0].get<long>();\n    return nullptr; // return the number of distinct ways',
    ),
    problem_kind: 'algorithm',
  },

  // ── HARD ──────────────────────────────────────────────────────────────────

  {
    title: 'LRU Cache: get & put',
    description:
      'Implement an LRU (Least Recently Used) cache.\n\n' +
      'Your `LRUCache` class must support:\n' +
      '- `__init__(capacity)` — initialize with a positive capacity\n' +
      '- `get(key)` — return the value if key exists, else -1. Marks key as recently used.\n' +
      '- `put(key, value)` — insert or update the key. If capacity is exceeded, evict the least recently used key.\n\n' +
      'Both operations must run in O(1) average time.',
    difficulty: 'hard',
    method_name: 'LRUCache',
    sample_test_cases:
      JSON.stringify([['LRUCache', 2], ['put', 1, 1], ['put', 2, 2], ['get', 1], ['put', 3, 3], ['get', 2], ['put', 4, 4], ['get', 1], ['get', 3], ['get', 4]]),
    sample_test_results: '[null,null,null,1,null,-1,null,-1,3,4]',
    hidden_test_cases:
      JSON.stringify([['LRUCache', 2], ['put', 1, 1], ['put', 2, 2], ['get', 1], ['put', 3, 3], ['get', 2], ['put', 4, 4], ['get', 1], ['get', 3], ['get', 4]]) + '|' +
      JSON.stringify([['LRUCache', 1], ['put', 1, 1], ['put', 2, 2], ['get', 1], ['get', 2]]),
    hidden_test_results:
      '[null,null,null,1,null,-1,null,-1,3,4]|[null,null,null,-1,2]',
    boilerplate_python:
      'class LRUCache:\n' +
      '    def __init__(self, capacity: int):\n' +
      '        pass\n\n' +
      '    def get(self, key: int) -> int:\n' +
      '        pass\n\n' +
      '    def put(self, key: int, value: int) -> None:\n' +
      '        pass',
    boilerplate_java:
      'class LRUCache {\n' +
      '    // add fields here\n\n' +
      '    public Object LRUCache(Object... args) {\n' +
      '        long capacity = (Long) args[0];\n' +
      '        // initialize with capacity\n' +
      '        return null;\n' +
      '    }\n\n' +
      '    public Object get(Object... args) {\n' +
      '        long key = (Long) args[0];\n' +
      '        return null; // return value or -1\n' +
      '    }\n\n' +
      '    public Object put(Object... args) {\n' +
      '        long key = (Long) args[0];\n' +
      '        long value = (Long) args[1];\n' +
      '        return null;\n' +
      '    }\n\n' +
      '    public Object call(String m, Object... a) throws Exception {\n' +
      '        return (Object) getClass().getMethod(m, Object[].class).invoke(this, (Object) a);\n' +
      '    }\n' +
      '}',
    boilerplate_cpp:
      'struct LRUCache {\n' +
      '    // add fields here\n\n' +
      '    json call(const std::string& m, const json& a) {\n' +
      '        if (m == "LRUCache") {\n' +
      '            long capacity = a[0].get<long>();\n' +
      '            // initialize with capacity\n' +
      '            return nullptr;\n' +
      '        }\n' +
      '        if (m == "get") {\n' +
      '            long key = a[0].get<long>();\n' +
      '            return nullptr; // return value or -1\n' +
      '        }\n' +
      '        if (m == "put") {\n' +
      '            long key = a[0].get<long>();\n' +
      '            long value = a[1].get<long>();\n' +
      '            return nullptr;\n' +
      '        }\n' +
      '        throw std::runtime_error("unknown op: " + m);\n' +
      '    }\n' +
      '};',
    problem_kind: 'data_structure',
  },

  {
    title: 'Trie: insert & search',
    description:
      'Implement a Trie (prefix tree) with the following methods:\n\n' +
      '- `__init__()` — initialize the trie\n' +
      '- `insert(word)` — insert a word into the trie\n' +
      '- `search(word)` — return `True` if the exact word exists in the trie\n' +
      '- `starts_with(prefix)` — return `True` if any word in the trie starts with the given prefix',
    difficulty: 'hard',
    method_name: 'Trie',
    sample_test_cases:
      JSON.stringify([['insert', 'apple'], ['search', 'apple'], ['search', 'app'], ['starts_with', 'app'], ['insert', 'app'], ['search', 'app']]),
    sample_test_results: '[null,true,false,true,null,true]',
    hidden_test_cases:
      JSON.stringify([['insert', 'apple'], ['search', 'apple'], ['search', 'app'], ['starts_with', 'app'], ['insert', 'app'], ['search', 'app']]) + '|' +
      JSON.stringify([['insert', 'cat'], ['insert', 'car'], ['search', 'car'], ['search', 'card'], ['starts_with', 'ca'], ['starts_with', 'dog']]),
    hidden_test_results:
      '[null,true,false,true,null,true]|[null,null,true,false,true,false]',
    boilerplate_python:
      'class Trie:\n' +
      '    def __init__(self):\n' +
      '        pass\n\n' +
      '    def insert(self, word: str) -> None:\n' +
      '        pass\n\n' +
      '    def search(self, word: str) -> bool:\n' +
      '        pass\n\n' +
      '    def starts_with(self, prefix: str) -> bool:\n' +
      '        pass',
    boilerplate_java:
      'class Trie {\n' +
      '    // add fields here\n\n' +
      '    public Object insert(Object... args) {\n' +
      '        String word = (String) args[0];\n' +
      '        return null;\n' +
      '    }\n\n' +
      '    public Object search(Object... args) {\n' +
      '        String word = (String) args[0];\n' +
      '        return null; // return true or false\n' +
      '    }\n\n' +
      '    public Object starts_with(Object... args) {\n' +
      '        String prefix = (String) args[0];\n' +
      '        return null; // return true or false\n' +
      '    }\n\n' +
      '    public Object call(String m, Object... a) throws Exception {\n' +
      '        return (Object) getClass().getMethod(m, Object[].class).invoke(this, (Object) a);\n' +
      '    }\n' +
      '}',
    boilerplate_cpp:
      'struct Trie {\n' +
      '    // add fields here\n\n' +
      '    json call(const std::string& m, const json& a) {\n' +
      '        if (m == "insert") {\n' +
      '            std::string word = a[0].get<std::string>();\n' +
      '            return nullptr;\n' +
      '        }\n' +
      '        if (m == "search") {\n' +
      '            std::string word = a[0].get<std::string>();\n' +
      '            return nullptr; // return true or false\n' +
      '        }\n' +
      '        if (m == "starts_with") {\n' +
      '            std::string prefix = a[0].get<std::string>();\n' +
      '            return nullptr; // return true or false\n' +
      '        }\n' +
      '        throw std::runtime_error("unknown op: " + m);\n' +
      '    }\n' +
      '};',
    problem_kind: 'data_structure',
  },

];

console.log(`Seeding ${problems.length} problems to ${SERVER}/${DB_NAME}...`);
for (const p of problems) {
  await callReducer('seed_problem', p);
}
console.log('Done!');
