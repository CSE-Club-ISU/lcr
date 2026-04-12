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
//   Java: public static Object <method>(Object... _args)  ← harness entry
//         Use toInt/toLong/toStr/toIntArray/etc. helpers to extract typed args.
//   C++:  json <method>(const json& args)                 ← harness entry
//         Use args[i].get<T>() to extract typed values.
//
// Data structure contract:
//   Java: class with public Object call(String m, Object... a) dispatch
//         Use explicit if/else — no reflection.
//   C++:  struct with json call(const std::string& m, const json& a) dispatch
//         Use explicit if/else.

function algoBoilerplates(method, javaBody, cppBody) {
  return {
    boilerplate_java: `public static Object ${method}(Object... _args) {\n${javaBody}\n}`,
    boilerplate_cpp:  `json ${method}(const json& args) {\n${cppBody}\n}`,
  };
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
      '    int[] nums  = toIntArray(_args[0]);\n    int target  = toInt(_args[1]);\n    // Your code here\n    return new int[]{};',
      '    vector<int> nums = args[0].get<vector<int>>();\n    int target       = args[1].get<int>();\n    // Your code here\n    return vector<int>{};',
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
      '    String s = toStr(_args[0]);\n    // Your code here\n    return "";',
      '    std::string s = args[0].get<std::string>();\n    // Your code here\n    return "";',
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
      '    long x = toLong(_args[0]);\n    // Your code here\n    return false;',
      '    long x = args[0].get<long>();\n    // Your code here\n    return false;',
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
      '    int[] nums = toIntArray(_args[0]);\n    // Your code here\n    return false;',
      '    vector<int> nums = args[0].get<vector<int>>();\n    // Your code here\n    return false;',
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
      '    long[] nums = toLongArray(_args[0]);\n    // Your code here (don\'t use Arrays.stream().max())\n    return 0L;',
      '    vector<long> nums = args[0].get<vector<long>>();\n    // Your code here (don\'t use *max_element)\n    return 0;',
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
      '    long n = toLong(_args[0]);\n    List<String> result = new ArrayList<>();\n    // fill result with "Fizz", "Buzz", "FizzBuzz", or number string\n    return result;',
      '    long n = args[0].get<long>();\n    vector<string> result;\n    // fill result with "Fizz", "Buzz", "FizzBuzz", or number string\n    return result;',
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
      '    long n = toLong(_args[0]);\n    // Your code here\n    return 0L;',
      '    long n = args[0].get<long>();\n    // Your code here\n    return 0;',
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
      '    long n = toLong(_args[0]);\n    // Your code here (iterative, no recursion)\n    return 0L;',
      '    long n = args[0].get<long>();\n    // Your code here (iterative, no recursion)\n    return 0;',
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
      '    String s = toStr(_args[0]);\n    // Your code here\n    return false;',
      '    std::string s = args[0].get<std::string>();\n    // Your code here\n    return false;',
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
      '    private void push(long val) { }\n\n' +
      '    private void pop() { }\n\n' +
      '    private long top() { return 0; }\n\n' +
      '    private long getMin() { return 0; }\n\n' +
      '    // harness dispatch — do not modify\n' +
      '    public Object call(String m, Object... a) {\n' +
      '        if (m.equals("MinStack")) return null;\n' +
      '        if (m.equals("push"))    { push(toLong(a[0])); return null; }\n' +
      '        if (m.equals("pop"))     { pop(); return null; }\n' +
      '        if (m.equals("top"))     { return top(); }\n' +
      '        if (m.equals("get_min")) { return getMin(); }\n' +
      '        throw new RuntimeException("unknown op: " + m);\n' +
      '    }\n' +
      '}',
    boilerplate_cpp:
      'struct MinStack {\n' +
      '    // add fields here\n\n' +
      '    void push(long val) { }\n\n' +
      '    void pop() { }\n\n' +
      '    long top() { return 0; }\n\n' +
      '    long getMin() { return 0; }\n\n' +
      '    // harness dispatch — do not modify\n' +
      '    json call(const std::string& m, const json& a) {\n' +
      '        if (m == "MinStack") return nullptr;\n' +
      '        if (m == "push")    { push(a[0].get<long>()); return nullptr; }\n' +
      '        if (m == "pop")     { pop(); return nullptr; }\n' +
      '        if (m == "top")     { return top(); }\n' +
      '        if (m == "get_min") { return getMin(); }\n' +
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
      '    String s = toStr(_args[0]);\n    String t = toStr(_args[1]);\n    // Your code here\n    return false;',
      '    std::string s = args[0].get<std::string>();\n    std::string t = args[1].get<std::string>();\n    // Your code here\n    return false;',
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
      '    int[] nums  = toIntArray(_args[0]);\n    int target  = toInt(_args[1]);\n    // Your code here (must be O(log n))\n    return -1L;',
      '    vector<int> nums = args[0].get<vector<int>>();\n    int target       = args[1].get<int>();\n    // Your code here (must be O(log n))\n    return -1;',
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
      '    int[] head = toIntArray(_args[0]);\n    // Treat head as a linked list (use index-based pointers)\n    // Your code here\n    return new int[]{};',
      '    vector<int> head = args[0].get<vector<int>>();\n    // Treat head as a linked list (use index-based pointers)\n    // Your code here\n    return vector<int>{};',
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
      '    long n = toLong(_args[0]);\n    // Your code here\n    return 0L;',
      '    long n = args[0].get<long>();\n    // Your code here\n    return 0;',
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
      '    private void init(long capacity) {\n' +
      '        // initialize with capacity\n' +
      '    }\n\n' +
      '    private long get(long key) { return -1; }\n\n' +
      '    private void put(long key, long value) { }\n\n' +
      '    // harness dispatch — do not modify\n' +
      '    public Object call(String m, Object... a) {\n' +
      '        if (m.equals("LRUCache")) { init(toLong(a[0])); return null; }\n' +
      '        if (m.equals("get"))      { return get(toLong(a[0])); }\n' +
      '        if (m.equals("put"))      { put(toLong(a[0]), toLong(a[1])); return null; }\n' +
      '        throw new RuntimeException("unknown op: " + m);\n' +
      '    }\n' +
      '}',
    boilerplate_cpp:
      'struct LRUCache {\n' +
      '    // add fields here\n\n' +
      '    void init(long capacity) {\n' +
      '        // initialize with capacity\n' +
      '    }\n\n' +
      '    long get(long key) { return -1; }\n\n' +
      '    void put(long key, long value) { }\n\n' +
      '    // harness dispatch — do not modify\n' +
      '    json call(const std::string& m, const json& a) {\n' +
      '        if (m == "LRUCache") { init(a[0].get<long>()); return nullptr; }\n' +
      '        if (m == "get")      { return get(a[0].get<long>()); }\n' +
      '        if (m == "put")      { put(a[0].get<long>(), a[1].get<long>()); return nullptr; }\n' +
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
      '    private void insert(String word) { }\n\n' +
      '    private boolean search(String word) { return false; }\n\n' +
      '    private boolean startsWith(String prefix) { return false; }\n\n' +
      '    // harness dispatch — do not modify\n' +
      '    public Object call(String m, Object... a) {\n' +
      '        if (m.equals("Trie"))        return null;\n' +
      '        if (m.equals("insert"))      { insert(toStr(a[0])); return null; }\n' +
      '        if (m.equals("search"))      { return search(toStr(a[0])); }\n' +
      '        if (m.equals("starts_with")) { return startsWith(toStr(a[0])); }\n' +
      '        throw new RuntimeException("unknown op: " + m);\n' +
      '    }\n' +
      '}',
    boilerplate_cpp:
      'struct Trie {\n' +
      '    // add fields here\n\n' +
      '    void insert(const std::string& word) { }\n\n' +
      '    bool search(const std::string& word) { return false; }\n\n' +
      '    bool startsWith(const std::string& prefix) { return false; }\n\n' +
      '    // harness dispatch — do not modify\n' +
      '    json call(const std::string& m, const json& a) {\n' +
      '        if (m == "Trie")        return nullptr;\n' +
      '        if (m == "insert")      { insert(a[0].get<std::string>()); return nullptr; }\n' +
      '        if (m == "search")      { return search(a[0].get<std::string>()); }\n' +
      '        if (m == "starts_with") { return startsWith(a[0].get<std::string>()); }\n' +
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
