// Problem seed data — imported by both `seed-problems.mjs` (deploy-time seeder)
// and `scripts/verify-problems.mjs` (local harness verifier).
//
// Algorithm problems use typed signatures:
//   param_types: JSON array of TypeName strings
//   return_type: TypeName string
//
// Data structure problems use method_signatures:
//   method_signatures: JSON object { methodName: { params: [...], return: "..." }, ... }
//
// TypeName vocabulary is defined in executor/src/generators/typebridge.ts.

// ---------------------------------------------------------------------------
// Stress-test helpers — generate large hidden test cases that TLE naive
// O(n²) solutions. All values seeded for reproducibility.
// ---------------------------------------------------------------------------

function seededRand(seed) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}

function randArray(n, lo, hi, seed = 42) {
  const r = seededRand(seed);
  return Array.from({ length: n }, () => Math.floor(r() * (hi - lo) + lo));
}

function shuffle(arr, r) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export const problems = [

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
      const big = randArray(5000, 2, 4999, 1);
      big[0] = 1; big[4999] = 9998;
      const target = big[0] + big[4999];
      return `[[2,7,11,15],9]|[[3,2,4],6]|[[3,3],6]|[[-1,-2,-3,-4,-5],-8]|[[1,2,3,4,5],9]|${JSON.stringify([big, target])}`;
    })(),
    hidden_test_results: '[0,1]|[1,2]|[0,1]|[2,4]|[3,4]|[0,4999]',
    boilerplate_python: 'def two_sum(nums: list[int], target: int) -> list[int]:\n    # Your code here\n    pass',
    boilerplate_java:
      'public int[] two_sum(int[] nums, int target) {\n' +
      '    // Your code here\n' +
      '    return new int[]{};\n' +
      '}',
    boilerplate_cpp:
      'vector<int> two_sum(vector<int> nums, int target) {\n' +
      '    // Your code here\n' +
      '    return {};\n' +
      '}',
    param_types: '["int[]","int"]',
    return_type: 'int[]',
    method_signatures: '',
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
      const big = 'abcdefghij'.repeat(2000);
      const rev = big.split('').reverse().join('');
      return {
        hidden_test_cases: `"hello"|"world"|"a"|""|"abcde"|"racecar"|${JSON.stringify(big)}`,
        hidden_test_results: `"olleh"|"dlrow"|"a"|""|"edcba"|"racecar"|${JSON.stringify(rev)}`,
      };
    })(),
    boilerplate_python: 'def reverse_string(s: str) -> str:\n    # Your code here\n    pass',
    boilerplate_java:
      'public String reverse_string(String s) {\n' +
      '    // Your code here\n' +
      '    return "";\n' +
      '}',
    boilerplate_cpp:
      'string reverse_string(string s) {\n' +
      '    // Your code here\n' +
      '    return "";\n' +
      '}',
    param_types: '["string"]',
    return_type: 'string',
    method_signatures: '',
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
    boilerplate_java:
      'public boolean is_palindrome(long x) {\n' +
      '    // Your code here\n' +
      '    return false;\n' +
      '}',
    boilerplate_cpp:
      'bool is_palindrome(long long x) {\n' +
      '    // Your code here\n' +
      '    return false;\n' +
      '}',
    param_types: '["long"]',
    return_type: 'bool',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Contains Duplicate',
    description:
      'Given a list of integers `nums`, return `True` if any value appears more than once, `False` otherwise.',
    difficulty: 'easy',
    method_name: 'contains_duplicate',
    sample_test_cases: '[[1,2,3,1]]|[[1,2,3,4]]|[[1,1,1,3,3,4,3,2,4,2]]',
    sample_test_results: 'true|false|true',
    hidden_test_cases: (() => {
      const uniq = Array.from({ length: 5000 }, (_, i) => i);
      const withDup = [...uniq]; withDup[4999] = 0;
      return `[[1,2,3,1]]|[[1,2,3,4]]|[[1,1,1,3,3,4,3,2,4,2]]|[[]]|[[1]]|[[1,2]]|[${JSON.stringify(uniq)}]|[${JSON.stringify(withDup)}]`;
    })(),
    hidden_test_results: 'true|false|true|false|false|false|false|true',
    boilerplate_python: 'def contains_duplicate(nums: list[int]) -> bool:\n    # Your code here\n    pass',
    boilerplate_java:
      'public boolean contains_duplicate(int[] nums) {\n' +
      '    // Your code here\n' +
      '    return false;\n' +
      '}',
    boilerplate_cpp:
      'bool contains_duplicate(vector<int> nums) {\n' +
      '    // Your code here\n' +
      '    return false;\n' +
      '}',
    param_types: '["int[]"]',
    return_type: 'bool',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Max in Array',
    description:
      'Given a non-empty list of integers `nums`, return the largest element.\n\n' +
      'Do not use the built-in `max()` function.',
    difficulty: 'easy',
    method_name: 'max_in_array',
    sample_test_cases: '[[3,1,4,1,5,9]]|[[-3,-1,-4]]|[[7]]',
    sample_test_results: '9|-1|7',
    ...(() => {
      const big = randArray(10000, -1000000, 1000000, 7);
      const max = Math.max(...big);
      return {
        hidden_test_cases: `[[3,1,4,1,5,9]]|[[-3,-1,-4]]|[[7]]|[[0,0,0]]|[[100,-100,50]]|[[1,2,3,4,5]]|[${JSON.stringify(big)}]`,
        hidden_test_results: `9|-1|7|0|100|5|${max}`,
      };
    })(),
    boilerplate_python: 'def max_in_array(nums: list[int]) -> int:\n    # Your code here (don\'t use max())\n    pass',
    boilerplate_java:
      'public long max_in_array(long[] nums) {\n' +
      '    // Your code here (don\'t use Arrays.stream().max())\n' +
      '    return 0L;\n' +
      '}',
    boilerplate_cpp:
      'long long max_in_array(vector<long long> nums) {\n' +
      '    // Your code here (don\'t use *max_element)\n' +
      '    return 0;\n' +
      '}',
    param_types: '["long[]"]',
    return_type: 'long',
    method_signatures: '',
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
    boilerplate_python: 'def fizz_buzz(n: int) -> list[str]:\n    # Your code here\n    pass',
    boilerplate_java:
      'public List<String> fizz_buzz(long n) {\n' +
      '    List<String> result = new ArrayList<>();\n' +
      '    // fill result with "Fizz", "Buzz", "FizzBuzz", or number string\n' +
      '    return result;\n' +
      '}',
    boilerplate_cpp:
      'vector<string> fizz_buzz(long long n) {\n' +
      '    vector<string> result;\n' +
      '    // fill result with "Fizz", "Buzz", "FizzBuzz", or number string\n' +
      '    return result;\n' +
      '}',
    param_types: '["long"]',
    return_type: 'string[]',
    method_signatures: '',
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
    boilerplate_java:
      'public long sum_of_digits(long n) {\n' +
      '    // Your code here\n' +
      '    return 0L;\n' +
      '}',
    boilerplate_cpp:
      'long long sum_of_digits(long long n) {\n' +
      '    // Your code here\n' +
      '    return 0;\n' +
      '}',
    param_types: '["long"]',
    return_type: 'long',
    method_signatures: '',
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
    boilerplate_java:
      'public long fib(long n) {\n' +
      '    // Your code here (iterative, no recursion)\n' +
      '    return 0L;\n' +
      '}',
    boilerplate_cpp:
      'long long fib(long long n) {\n' +
      '    // Your code here (iterative, no recursion)\n' +
      '    return 0;\n' +
      '}',
    param_types: '["long"]',
    return_type: 'long',
    method_signatures: '',
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
    boilerplate_java:
      'public boolean is_valid(String s) {\n' +
      '    // Your code here\n' +
      '    return false;\n' +
      '}',
    boilerplate_cpp:
      'bool is_valid(string s) {\n' +
      '    // Your code here\n' +
      '    return false;\n' +
      '}',
    param_types: '["string"]',
    return_type: 'bool',
    method_signatures: '',
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
      '    public void push(long val) { }\n\n' +
      '    public void pop() { }\n\n' +
      '    public long top() { return 0; }\n\n' +
      '    public long get_min() { return 0; }\n' +
      '}',
    boilerplate_cpp:
      'struct MinStack {\n' +
      '    // add fields here\n\n' +
      '    void push(long long val) { }\n\n' +
      '    void pop() { }\n\n' +
      '    long long top() { return 0; }\n\n' +
      '    long long get_min() { return 0; }\n' +
      '};',
    param_types: '',
    return_type: '',
    method_signatures: JSON.stringify({
      push:    { params: ['long'], return: 'void' },
      pop:     { params: [],       return: 'void' },
      top:     { params: [],       return: 'long' },
      get_min: { params: [],       return: 'long' },
    }),
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
    sample_test_cases: '["anagram","nagaram"]|["rat","car"]|["a","a"]',
    sample_test_results: 'true|false|true',
    hidden_test_cases: (() => {
      const chars = 'abcdefghijklmnopqrstuvwxyz';
      const r = seededRand(99);
      const arr = Array.from({ length: 5000 }, () => chars[Math.floor(r() * 26)]);
      const s = arr.join('');
      const shuffled = shuffle(arr, r).join('');
      return `["anagram","nagaram"]|["rat","car"]|["a","a"]|["",""]|["ab","ba"]|["abc","cba"]|["abc","abcd"]|[${JSON.stringify(s)},${JSON.stringify(shuffled)}]`;
    })(),
    hidden_test_results: 'true|false|true|true|true|true|false|true',
    boilerplate_python: 'def is_anagram(s: str, t: str) -> bool:\n    # Your code here\n    pass',
    boilerplate_java:
      'public boolean is_anagram(String s, String t) {\n' +
      '    // Your code here\n' +
      '    return false;\n' +
      '}',
    boilerplate_cpp:
      'bool is_anagram(string s, string t) {\n' +
      '    // Your code here\n' +
      '    return false;\n' +
      '}',
    param_types: '["string","string"]',
    return_type: 'bool',
    method_signatures: '',
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
      const big = Array.from({ length: 10000 }, (_, i) => i * 2);
      const target = big[4999];
      return `[[-1,0,3,5,9,12],9]|[[-1,0,3,5,9,12],2]|[[1],1]|[[1],0]|[[1,2,3,4,5],3]|[[1,2,3,4,5],5]|[${JSON.stringify(big)},${target}]`;
    })(),
    hidden_test_results: '4|-1|0|-1|2|4|4999',
    boilerplate_python: 'def binary_search(nums: list[int], target: int) -> int:\n    # Your code here (must be O(log n))\n    pass',
    boilerplate_java:
      'public int binary_search(int[] nums, int target) {\n' +
      '    // Your code here (must be O(log n))\n' +
      '    return -1;\n' +
      '}',
    boilerplate_cpp:
      'int binary_search(vector<int> nums, int target) {\n' +
      '    // Your code here (must be O(log n))\n' +
      '    return -1;\n' +
      '}',
    param_types: '["int[]","int"]',
    return_type: 'int',
    method_signatures: '',
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
      'def reverse_list(head: list[int]) -> list[int]:\n' +
      '    # Treat the list as a linked list and reverse it with pointers.\n' +
      '    # Return the result as a list.\n' +
      '    pass',
    boilerplate_java:
      'public int[] reverse_list(int[] head) {\n' +
      '    // Treat head as a linked list (use index-based pointers)\n' +
      '    // Your code here\n' +
      '    return new int[]{};\n' +
      '}',
    boilerplate_cpp:
      'vector<int> reverse_list(vector<int> head) {\n' +
      '    // Treat head as a linked list (use index-based pointers)\n' +
      '    // Your code here\n' +
      '    return {};\n' +
      '}',
    param_types: '["int[]"]',
    return_type: 'int[]',
    method_signatures: '',
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
    hidden_test_results: '1|2|3|5|8|89|165580141',
    boilerplate_python: 'def climb_stairs(n: int) -> int:\n    # Your code here\n    pass',
    boilerplate_java:
      'public long climb_stairs(long n) {\n' +
      '    // Your code here\n' +
      '    return 0L;\n' +
      '}',
    boilerplate_cpp:
      'long long climb_stairs(long long n) {\n' +
      '    // Your code here\n' +
      '    return 0;\n' +
      '}',
    param_types: '["long"]',
    return_type: 'long',
    method_signatures: '',
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
      '    public LRUCache(long capacity) {\n' +
      '        // initialize with capacity\n' +
      '    }\n\n' +
      '    public long get(long key) { return -1; }\n\n' +
      '    public void put(long key, long value) { }\n' +
      '}',
    boilerplate_cpp:
      'struct LRUCache {\n' +
      '    // add fields here\n\n' +
      '    LRUCache(long long capacity) {\n' +
      '        // initialize with capacity\n' +
      '    }\n\n' +
      '    long long get(long long key) { return -1; }\n\n' +
      '    void put(long long key, long long value) { }\n' +
      '};',
    param_types: '',
    return_type: '',
    method_signatures: JSON.stringify({
      LRUCache: { params: ['long'],         return: 'void' },
      get:      { params: ['long'],         return: 'long' },
      put:      { params: ['long', 'long'], return: 'void' },
    }),
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
      '    public void insert(String word) { }\n\n' +
      '    public boolean search(String word) { return false; }\n\n' +
      '    public boolean starts_with(String prefix) { return false; }\n' +
      '}',
    boilerplate_cpp:
      'struct Trie {\n' +
      '    // add fields here\n\n' +
      '    void insert(const string& word) { }\n\n' +
      '    bool search(const string& word) { return false; }\n\n' +
      '    bool starts_with(const string& prefix) { return false; }\n' +
      '};',
    param_types: '',
    return_type: '',
    method_signatures: JSON.stringify({
      insert:     { params: ['string'], return: 'void' },
      search:     { params: ['string'], return: 'bool' },
      starts_with:{ params: ['string'], return: 'bool' },
    }),
    problem_kind: 'data_structure',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NEW CONTENT — 100 additional problems (60 easy / 30 medium / 10 hard)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── EASY: (long) → long ──────────────────────────────────────────────────

  {
    title: 'Factorial',
    description:
      'Given a non-negative integer `n` (0 ≤ n ≤ 20), return `n!` = 1·2·3·…·n.\n\n' +
      'By convention `0! = 1`.',
    difficulty: 'easy',
    method_name: 'factorial',
    sample_test_cases: '0|1|5',
    sample_test_results: '1|1|120',
    hidden_test_cases: '0|1|2|3|5|10|12|20',
    hidden_test_results: '1|1|2|6|120|3628800|479001600|2432902008176640000',
    boilerplate_python: 'def factorial(n: int) -> int:\n    # Your code here\n    pass',
    boilerplate_java: 'public long factorial(long n) {\n    // Your code here\n    return 0L;\n}',
    boilerplate_cpp: 'long long factorial(long long n) {\n    // Your code here\n    return 0;\n}',
    param_types: '["long"]',
    return_type: 'long',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Count Digits',
    description:
      'Given an integer `n`, return the number of decimal digits in `|n|`.\n\n' +
      'Examples: `0 → 1`, `7 → 1`, `123 → 3`, `-4567 → 4`.',
    difficulty: 'easy',
    method_name: 'count_digits',
    sample_test_cases: '0|7|123',
    sample_test_results: '1|1|3',
    hidden_test_cases: '0|9|10|99|100|-4567|1000000000',
    hidden_test_results: '1|1|2|2|3|4|10',
    boilerplate_python: 'def count_digits(n: int) -> int:\n    # Your code here\n    pass',
    boilerplate_java: 'public long count_digits(long n) {\n    // Your code here\n    return 0L;\n}',
    boilerplate_cpp: 'long long count_digits(long long n) {\n    // Your code here\n    return 0;\n}',
    param_types: '["long"]',
    return_type: 'long',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Sum to N',
    description:
      'Given a non-negative integer `n`, return `1 + 2 + … + n`.\n\n' +
      '`n = 0 → 0`, `n = 5 → 15`.',
    difficulty: 'easy',
    method_name: 'sum_to_n',
    sample_test_cases: '0|1|5',
    sample_test_results: '0|1|15',
    hidden_test_cases: '0|1|5|10|100|1000|100000',
    hidden_test_results: '0|1|15|55|5050|500500|5000050000',
    boilerplate_python: 'def sum_to_n(n: int) -> int:\n    # Your code here\n    pass',
    boilerplate_java: 'public long sum_to_n(long n) {\n    // Your code here\n    return 0L;\n}',
    boilerplate_cpp: 'long long sum_to_n(long long n) {\n    // Your code here\n    return 0;\n}',
    param_types: '["long"]',
    return_type: 'long',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Last Digit',
    description:
      'Given an integer `n`, return the last decimal digit of `|n|` (0–9).',
    difficulty: 'easy',
    method_name: 'last_digit',
    sample_test_cases: '7|123|-49',
    sample_test_results: '7|3|9',
    hidden_test_cases: '0|7|10|123|-49|99|1000000',
    hidden_test_results: '0|7|0|3|9|9|0',
    boilerplate_python: 'def last_digit(n: int) -> int:\n    # Your code here\n    pass',
    boilerplate_java: 'public long last_digit(long n) {\n    // Your code here\n    return 0L;\n}',
    boilerplate_cpp: 'long long last_digit(long long n) {\n    // Your code here\n    return 0;\n}',
    param_types: '["long"]',
    return_type: 'long',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Absolute Value',
    description: 'Return `|n|` without using the language built-in (practise branching).',
    difficulty: 'easy',
    method_name: 'abs_val',
    sample_test_cases: '5|-7|0',
    sample_test_results: '5|7|0',
    hidden_test_cases: '0|5|-5|100|-123456|9999999999',
    hidden_test_results: '0|5|5|100|123456|9999999999',
    boilerplate_python: 'def abs_val(n: int) -> int:\n    # Your code here\n    pass',
    boilerplate_java: 'public long abs_val(long n) {\n    // Your code here\n    return 0L;\n}',
    boilerplate_cpp: 'long long abs_val(long long n) {\n    // Your code here\n    return 0;\n}',
    param_types: '["long"]',
    return_type: 'long',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Square',
    description: 'Return `n * n`.',
    difficulty: 'easy',
    method_name: 'square',
    sample_test_cases: '0|3|-4',
    sample_test_results: '0|9|16',
    hidden_test_cases: '0|1|3|-4|10|100|1000000',
    hidden_test_results: '0|1|9|16|100|10000|1000000000000',
    boilerplate_python: 'def square(n: int) -> int:\n    # Your code here\n    pass',
    boilerplate_java: 'public long square(long n) {\n    // Your code here\n    return 0L;\n}',
    boilerplate_cpp: 'long long square(long long n) {\n    // Your code here\n    return 0;\n}',
    param_types: '["long"]',
    return_type: 'long',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Integer Square Root',
    description:
      'Given a non-negative integer `n`, return `⌊√n⌋` (the greatest integer whose square is ≤ n).\n\n' +
      'Do not use float `sqrt`; use binary search or a simple loop.',
    difficulty: 'easy',
    method_name: 'int_sqrt',
    sample_test_cases: '0|4|8',
    sample_test_results: '0|2|2',
    hidden_test_cases: '0|1|4|8|16|99|100|10000|1000000',
    hidden_test_results: '0|1|2|2|4|9|10|100|1000',
    boilerplate_python: 'def int_sqrt(n: int) -> int:\n    # Your code here\n    pass',
    boilerplate_java: 'public long int_sqrt(long n) {\n    // Your code here\n    return 0L;\n}',
    boilerplate_cpp: 'long long int_sqrt(long long n) {\n    // Your code here\n    return 0;\n}',
    param_types: '["long"]',
    return_type: 'long',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Hours to Seconds',
    description: 'Given whole hours `h`, return the equivalent number of seconds.',
    difficulty: 'easy',
    method_name: 'hours_to_seconds',
    sample_test_cases: '0|1|2',
    sample_test_results: '0|3600|7200',
    hidden_test_cases: '0|1|2|10|24|100',
    hidden_test_results: '0|3600|7200|36000|86400|360000',
    boilerplate_python: 'def hours_to_seconds(h: int) -> int:\n    # Your code here\n    pass',
    boilerplate_java: 'public long hours_to_seconds(long h) {\n    // Your code here\n    return 0L;\n}',
    boilerplate_cpp: 'long long hours_to_seconds(long long h) {\n    // Your code here\n    return 0;\n}',
    param_types: '["long"]',
    return_type: 'long',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Count Set Bits',
    description:
      'Given a non-negative integer `n`, return the number of 1-bits in its binary representation (popcount).\n\n' +
      'Example: `n = 13` (binary `1101`) → `3`.',
    difficulty: 'easy',
    method_name: 'count_set_bits',
    sample_test_cases: '0|5|13',
    sample_test_results: '0|2|3',
    hidden_test_cases: '0|1|5|13|15|255|1024|1073741823',
    hidden_test_results: '0|1|2|3|4|8|1|30',
    boilerplate_python: 'def count_set_bits(n: int) -> int:\n    # Your code here\n    pass',
    boilerplate_java: 'public long count_set_bits(long n) {\n    // Your code here\n    return 0L;\n}',
    boilerplate_cpp: 'long long count_set_bits(long long n) {\n    // Your code here\n    return 0;\n}',
    param_types: '["long"]',
    return_type: 'long',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Digital Root',
    description:
      'Given a non-negative integer `n`, repeatedly sum its digits until a single digit remains, then return it.\n\n' +
      'Example: `n = 9875` → `9+8+7+5 = 29 → 2+9 = 11 → 1+1 = 2`.',
    difficulty: 'easy',
    method_name: 'digital_root',
    sample_test_cases: '0|16|9875',
    sample_test_results: '0|7|2',
    hidden_test_cases: '0|5|9|10|16|99|9875|123456789',
    hidden_test_results: '0|5|9|1|7|9|2|9',
    boilerplate_python: 'def digital_root(n: int) -> int:\n    # Your code here\n    pass',
    boilerplate_java: 'public long digital_root(long n) {\n    // Your code here\n    return 0L;\n}',
    boilerplate_cpp: 'long long digital_root(long long n) {\n    // Your code here\n    return 0;\n}',
    param_types: '["long"]',
    return_type: 'long',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  // ── EASY: (long) → bool, (long, long) → long ─────────────────────────────

  {
    title: 'Is Prime',
    description:
      'Given an integer `n`, return `true` if `n` is prime, otherwise `false`.\n\n' +
      'Integers less than 2 are not prime.',
    difficulty: 'easy',
    method_name: 'is_prime',
    sample_test_cases: '2|4|17',
    sample_test_results: 'true|false|true',
    hidden_test_cases: '0|1|2|3|4|5|15|17|25|97|100|7919',
    hidden_test_results: 'false|false|true|true|false|true|false|true|false|true|false|true',
    boilerplate_python: 'def is_prime(n: int) -> bool:\n    # Your code here\n    pass',
    boilerplate_java: 'public boolean is_prime(long n) {\n    // Your code here\n    return false;\n}',
    boilerplate_cpp: 'bool is_prime(long long n) {\n    // Your code here\n    return false;\n}',
    param_types: '["long"]',
    return_type: 'bool',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Power of Two',
    description:
      'Return `true` if the given integer is a positive power of two (1, 2, 4, 8, 16, …).',
    difficulty: 'easy',
    method_name: 'is_power_of_two',
    sample_test_cases: '1|3|16',
    sample_test_results: 'true|false|true',
    hidden_test_cases: '0|1|2|3|4|5|16|18|1024|1073741824|-4',
    hidden_test_results: 'false|true|true|false|true|false|true|false|true|true|false',
    boilerplate_python: 'def is_power_of_two(n: int) -> bool:\n    # Your code here\n    pass',
    boilerplate_java: 'public boolean is_power_of_two(long n) {\n    // Your code here\n    return false;\n}',
    boilerplate_cpp: 'bool is_power_of_two(long long n) {\n    // Your code here\n    return false;\n}',
    param_types: '["long"]',
    return_type: 'bool',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Leap Year',
    description:
      'Return `true` if the given year is a leap year.\n\n' +
      'A year is a leap year if it is divisible by 4, except century years, which must be divisible by 400.',
    difficulty: 'easy',
    method_name: 'is_leap_year',
    sample_test_cases: '2000|2019|2024',
    sample_test_results: 'true|false|true',
    hidden_test_cases: '1|4|100|400|1900|2000|2019|2024|2100',
    hidden_test_results: 'false|true|false|true|false|true|false|true|false',
    boilerplate_python: 'def is_leap_year(y: int) -> bool:\n    # Your code here\n    pass',
    boilerplate_java: 'public boolean is_leap_year(long y) {\n    // Your code here\n    return false;\n}',
    boilerplate_cpp: 'bool is_leap_year(long long y) {\n    // Your code here\n    return false;\n}',
    param_types: '["long"]',
    return_type: 'bool',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Is Perfect Square',
    description: 'Return `true` if `n` is a perfect square (n = k² for some non-negative integer k).',
    difficulty: 'easy',
    method_name: 'is_perfect_square',
    sample_test_cases: '1|14|16',
    sample_test_results: 'true|false|true',
    hidden_test_cases: '0|1|2|3|4|14|16|25|26|10000|-1',
    hidden_test_results: 'true|true|false|false|true|false|true|true|false|true|false',
    boilerplate_python: 'def is_perfect_square(n: int) -> bool:\n    # Your code here\n    pass',
    boilerplate_java: 'public boolean is_perfect_square(long n) {\n    // Your code here\n    return false;\n}',
    boilerplate_cpp: 'bool is_perfect_square(long long n) {\n    // Your code here\n    return false;\n}',
    param_types: '["long"]',
    return_type: 'bool',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Palindrome Number',
    description:
      'Return `true` if the given integer reads the same forward and backward (ignoring the sign).\n\n' +
      'Negative numbers are NOT palindromes because the minus sign breaks symmetry.',
    difficulty: 'easy',
    method_name: 'is_palindrome_number',
    sample_test_cases: '121|-121|10',
    sample_test_results: 'true|false|false',
    hidden_test_cases: '0|1|7|10|11|121|-121|12321|12345|1221',
    hidden_test_results: 'true|true|true|false|true|true|false|true|false|true',
    boilerplate_python: 'def is_palindrome_number(n: int) -> bool:\n    # Your code here\n    pass',
    boilerplate_java: 'public boolean is_palindrome_number(long n) {\n    // Your code here\n    return false;\n}',
    boilerplate_cpp: 'bool is_palindrome_number(long long n) {\n    // Your code here\n    return false;\n}',
    param_types: '["long"]',
    return_type: 'bool',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'GCD',
    description:
      'Given two non-negative integers `a` and `b` (not both zero), return `gcd(a, b)`.',
    difficulty: 'easy',
    method_name: 'gcd',
    sample_test_cases: '[12,8]|[7,13]|[0,5]',
    sample_test_results: '4|1|5',
    hidden_test_cases: '[1,1]|[12,8]|[7,13]|[0,5]|[100,75]|[48,36]|[1000000,250000]',
    hidden_test_results: '1|4|1|5|25|12|250000',
    boilerplate_python: 'def gcd(a: int, b: int) -> int:\n    # Your code here\n    pass',
    boilerplate_java: 'public long gcd(long a, long b) {\n    // Your code here\n    return 0L;\n}',
    boilerplate_cpp: 'long long gcd(long long a, long long b) {\n    // Your code here\n    return 0;\n}',
    param_types: '["long","long"]',
    return_type: 'long',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'LCM',
    description:
      'Given two positive integers `a` and `b`, return `lcm(a, b)` — the smallest positive integer divisible by both.',
    difficulty: 'easy',
    method_name: 'lcm',
    sample_test_cases: '[4,6]|[3,5]|[12,8]',
    sample_test_results: '12|15|24',
    hidden_test_cases: '[1,1]|[4,6]|[3,5]|[12,8]|[7,13]|[100,75]|[48,36]',
    hidden_test_results: '1|12|15|24|91|300|144',
    boilerplate_python: 'def lcm(a: int, b: int) -> int:\n    # Your code here\n    pass',
    boilerplate_java: 'public long lcm(long a, long b) {\n    // Your code here\n    return 0L;\n}',
    boilerplate_cpp: 'long long lcm(long long a, long long b) {\n    // Your code here\n    return 0;\n}',
    param_types: '["long","long"]',
    return_type: 'long',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Max of Two',
    description: 'Return the larger of two integers `a` and `b` (without using built-in max).',
    difficulty: 'easy',
    method_name: 'max_of_two',
    sample_test_cases: '[3,7]|[10,-4]|[5,5]',
    sample_test_results: '7|10|5',
    hidden_test_cases: '[0,0]|[3,7]|[10,-4]|[-7,-3]|[5,5]|[1000000,999999]',
    hidden_test_results: '0|7|10|-3|5|1000000',
    boilerplate_python: 'def max_of_two(a: int, b: int) -> int:\n    # Your code here\n    pass',
    boilerplate_java: 'public long max_of_two(long a, long b) {\n    // Your code here\n    return 0L;\n}',
    boilerplate_cpp: 'long long max_of_two(long long a, long long b) {\n    // Your code here\n    return 0;\n}',
    param_types: '["long","long"]',
    return_type: 'long',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Min of Two',
    description: 'Return the smaller of two integers `a` and `b` (without using built-in min).',
    difficulty: 'easy',
    method_name: 'min_of_two',
    sample_test_cases: '[3,7]|[10,-4]|[5,5]',
    sample_test_results: '3|-4|5',
    hidden_test_cases: '[0,0]|[3,7]|[10,-4]|[-7,-3]|[5,5]|[1000000,999999]',
    hidden_test_results: '0|3|-4|-7|5|999999',
    boilerplate_python: 'def min_of_two(a: int, b: int) -> int:\n    # Your code here\n    pass',
    boilerplate_java: 'public long min_of_two(long a, long b) {\n    // Your code here\n    return 0L;\n}',
    boilerplate_cpp: 'long long min_of_two(long long a, long long b) {\n    // Your code here\n    return 0;\n}',
    param_types: '["long","long"]',
    return_type: 'long',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Sum Range',
    description:
      'Given two integers `a` and `b` with `a ≤ b`, return `a + (a+1) + … + b`.',
    difficulty: 'easy',
    method_name: 'sum_range',
    sample_test_cases: '[1,5]|[3,3]|[-2,2]',
    sample_test_results: '15|3|0',
    hidden_test_cases: '[0,0]|[1,5]|[3,3]|[-2,2]|[1,100]|[10,20]|[-5,-1]',
    hidden_test_results: '0|15|3|0|5050|165|-15',
    boilerplate_python: 'def sum_range(a: int, b: int) -> int:\n    # Your code here\n    pass',
    boilerplate_java: 'public long sum_range(long a, long b) {\n    // Your code here\n    return 0L;\n}',
    boilerplate_cpp: 'long long sum_range(long long a, long long b) {\n    // Your code here\n    return 0;\n}',
    param_types: '["long","long"]',
    return_type: 'long',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  // ── EASY: (string) → long / string / bool ────────────────────────────────

  {
    title: 'Count Vowels',
    description:
      'Given a lowercase string `s`, return the number of vowels (`a`, `e`, `i`, `o`, `u`).',
    difficulty: 'easy',
    method_name: 'count_vowels',
    sample_test_cases: '"hello"|"sky"|"aeiou"',
    sample_test_results: '2|0|5',
    hidden_test_cases: '""|"hello"|"sky"|"aeiou"|"programming"|"rhythm"',
    hidden_test_results: '0|2|0|5|3|0',
    boilerplate_python: 'def count_vowels(s: str) -> int:\n    # Your code here\n    pass',
    boilerplate_java: 'public long count_vowels(String s) {\n    // Your code here\n    return 0L;\n}',
    boilerplate_cpp: 'long long count_vowels(string s) {\n    // Your code here\n    return 0;\n}',
    param_types: '["string"]',
    return_type: 'long',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Count Words',
    description:
      'Given a string `s`, return the number of space-separated non-empty words.\n\n' +
      'Leading/trailing and multiple consecutive spaces should be ignored.',
    difficulty: 'easy',
    method_name: 'count_words',
    sample_test_cases: '"hello world"|"one"|""',
    sample_test_results: '2|1|0',
    hidden_test_cases: '""|"  "|"one"|"hello world"|"  many   spaces   here "|"a b c d e f"',
    hidden_test_results: '0|0|1|2|3|6',
    boilerplate_python: 'def count_words(s: str) -> int:\n    # Your code here\n    pass',
    boilerplate_java: 'public long count_words(String s) {\n    // Your code here\n    return 0L;\n}',
    boilerplate_cpp: 'long long count_words(string s) {\n    // Your code here\n    return 0;\n}',
    param_types: '["string"]',
    return_type: 'long',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Longest Word Length',
    description:
      'Given a string `s`, return the length of its longest space-separated word (`0` if none).',
    difficulty: 'easy',
    method_name: 'longest_word_length',
    sample_test_cases: '"the quick brown fox"|"hi"|""',
    sample_test_results: '5|2|0',
    hidden_test_cases: '""|"hi"|"the quick brown fox"|"a bb ccc dddd"|"equal size word here"',
    hidden_test_results: '0|2|5|4|5',
    boilerplate_python: 'def longest_word_length(s: str) -> int:\n    # Your code here\n    pass',
    boilerplate_java: 'public long longest_word_length(String s) {\n    // Your code here\n    return 0L;\n}',
    boilerplate_cpp: 'long long longest_word_length(string s) {\n    // Your code here\n    return 0;\n}',
    param_types: '["string"]',
    return_type: 'long',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'To Upper Case',
    description: 'Convert every ASCII lowercase letter in `s` to upper case. Other characters unchanged.',
    difficulty: 'easy',
    method_name: 'to_upper',
    sample_test_cases: '"hello"|"Hello World"|"abc123"',
    sample_test_results: '"HELLO"|"HELLO WORLD"|"ABC123"',
    hidden_test_cases: '""|"hello"|"Hello World"|"abc123"|"ALREADY"|"m1x3d cAsE"',
    hidden_test_results: '""|"HELLO"|"HELLO WORLD"|"ABC123"|"ALREADY"|"M1X3D CASE"',
    boilerplate_python: 'def to_upper(s: str) -> str:\n    # Your code here\n    pass',
    boilerplate_java: 'public String to_upper(String s) {\n    // Your code here\n    return "";\n}',
    boilerplate_cpp: 'string to_upper(string s) {\n    // Your code here\n    return "";\n}',
    param_types: '["string"]',
    return_type: 'string',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'To Lower Case',
    description: 'Convert every ASCII uppercase letter in `s` to lower case. Other characters unchanged.',
    difficulty: 'easy',
    method_name: 'to_lower',
    sample_test_cases: '"HELLO"|"Hello World"|"ABC123"',
    sample_test_results: '"hello"|"hello world"|"abc123"',
    hidden_test_cases: '""|"HELLO"|"Hello World"|"ABC123"|"already"|"M1X3D cAsE"',
    hidden_test_results: '""|"hello"|"hello world"|"abc123"|"already"|"m1x3d case"',
    boilerplate_python: 'def to_lower(s: str) -> str:\n    # Your code here\n    pass',
    boilerplate_java: 'public String to_lower(String s) {\n    // Your code here\n    return "";\n}',
    boilerplate_cpp: 'string to_lower(string s) {\n    // Your code here\n    return "";\n}',
    param_types: '["string"]',
    return_type: 'string',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Swap Case',
    description: 'Swap the case of every ASCII letter in `s`. Non-letters unchanged.',
    difficulty: 'easy',
    method_name: 'swap_case',
    sample_test_cases: '"Hello"|"Python 3"|"abcXYZ"',
    sample_test_results: '"hELLO"|"pYTHON 3"|"ABCxyz"',
    hidden_test_cases: '""|"Hello"|"Python 3"|"abcXYZ"|"12345"|"aAaBbB"',
    hidden_test_results: '""|"hELLO"|"pYTHON 3"|"ABCxyz"|"12345"|"AaAbBb"',
    boilerplate_python: 'def swap_case(s: str) -> str:\n    # Your code here\n    pass',
    boilerplate_java: 'public String swap_case(String s) {\n    // Your code here\n    return "";\n}',
    boilerplate_cpp: 'string swap_case(string s) {\n    // Your code here\n    return "";\n}',
    param_types: '["string"]',
    return_type: 'string',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Remove Vowels',
    description: 'Remove all lowercase vowels (`a`, `e`, `i`, `o`, `u`) from `s` and return the result.',
    difficulty: 'easy',
    method_name: 'remove_vowels',
    sample_test_cases: '"hello"|"sky"|"aeiou"',
    sample_test_results: '"hll"|"sky"|""',
    hidden_test_cases: '""|"hello"|"sky"|"aeiou"|"programming"|"rhythm"',
    hidden_test_results: '""|"hll"|"sky"|""|"prgrmmng"|"rhythm"',
    boilerplate_python: 'def remove_vowels(s: str) -> str:\n    # Your code here\n    pass',
    boilerplate_java: 'public String remove_vowels(String s) {\n    // Your code here\n    return "";\n}',
    boilerplate_cpp: 'string remove_vowels(string s) {\n    // Your code here\n    return "";\n}',
    param_types: '["string"]',
    return_type: 'string',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Reverse Words',
    description:
      'Given a string `s` of space-separated words, return a string with the word order reversed.\n\n' +
      'Collapse extra whitespace: use exactly one space between words, and no leading/trailing spaces.\n\n' +
      'Example: `"the sky is blue" → "blue is sky the"`.',
    difficulty: 'easy',
    method_name: 'reverse_words',
    sample_test_cases: '"the sky is blue"|"  hello world  "|"one"',
    sample_test_results: '"blue is sky the"|"world hello"|"one"',
    hidden_test_cases: '""|"  "|"one"|"the sky is blue"|"  hello world  "|"a b c d"',
    hidden_test_results: '""|""|"one"|"blue is sky the"|"world hello"|"d c b a"',
    boilerplate_python: 'def reverse_words(s: str) -> str:\n    # Your code here\n    pass',
    boilerplate_java: 'public String reverse_words(String s) {\n    // Your code here\n    return "";\n}',
    boilerplate_cpp: 'string reverse_words(string s) {\n    // Your code here\n    return "";\n}',
    param_types: '["string"]',
    return_type: 'string',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Is Alpha Only',
    description:
      'Return `true` if `s` is non-empty and contains only ASCII letters (a–z / A–Z), otherwise `false`.',
    difficulty: 'easy',
    method_name: 'is_alpha_only',
    sample_test_cases: '"hello"|"hello world"|""',
    sample_test_results: 'true|false|false',
    hidden_test_cases: '""|"hello"|"Hello"|"hello world"|"abc123"|"ABC"',
    hidden_test_results: 'false|true|true|false|false|true',
    boilerplate_python: 'def is_alpha_only(s: str) -> bool:\n    # Your code here\n    pass',
    boilerplate_java: 'public boolean is_alpha_only(String s) {\n    // Your code here\n    return false;\n}',
    boilerplate_cpp: 'bool is_alpha_only(string s) {\n    // Your code here\n    return false;\n}',
    param_types: '["string"]',
    return_type: 'bool',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Has Vowel',
    description:
      'Return `true` if `s` contains at least one ASCII vowel (case-insensitive: `a`, `e`, `i`, `o`, `u`).',
    difficulty: 'easy',
    method_name: 'has_vowel',
    sample_test_cases: '"hello"|"sky"|"HELLO"',
    sample_test_results: 'true|false|true',
    hidden_test_cases: '""|"hello"|"sky"|"HELLO"|"rhythm"|"AEIOU"|"bcdfg"',
    hidden_test_results: 'false|true|false|true|false|true|false',
    boilerplate_python: 'def has_vowel(s: str) -> bool:\n    # Your code here\n    pass',
    boilerplate_java: 'public boolean has_vowel(String s) {\n    // Your code here\n    return false;\n}',
    boilerplate_cpp: 'bool has_vowel(string s) {\n    // Your code here\n    return false;\n}',
    param_types: '["string"]',
    return_type: 'bool',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  // ── EASY: (int[]) → long / bool ──────────────────────────────────────────

  {
    title: 'Array Sum',
    description: 'Given an integer array `nums`, return the sum of all its elements.',
    difficulty: 'easy',
    method_name: 'array_sum',
    sample_test_cases: '[[1,2,3]]|[[-1,-2,-3]]|[[10]]',
    sample_test_results: '6|-6|10',
    hidden_test_cases: '[[]]|[[1,2,3]]|[[-1,-2,-3]]|[[10]]|[[1,2,3,4,5,6,7,8,9,10]]|[[100,-50,25]]',
    hidden_test_results: '0|6|-6|10|55|75',
    boilerplate_python: 'def array_sum(nums: list[int]) -> int:\n    # Your code here\n    pass',
    boilerplate_java: 'public long array_sum(int[] nums) {\n    // Your code here\n    return 0L;\n}',
    boilerplate_cpp: 'long long array_sum(vector<int> nums) {\n    // Your code here\n    return 0;\n}',
    param_types: '["int[]"]',
    return_type: 'long',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Array Min',
    description: 'Given a non-empty integer array `nums`, return the minimum element.',
    difficulty: 'easy',
    method_name: 'array_min',
    sample_test_cases: '[[3,1,4,1,5]]|[[7]]|[[-3,-1,-7]]',
    sample_test_results: '1|7|-7',
    hidden_test_cases: '[[3,1,4,1,5]]|[[7]]|[[-3,-1,-7]]|[[9,2,8,4]]|[[1,2,3,4,5]]|[[0,0,0]]',
    hidden_test_results: '1|7|-7|2|1|0',
    boilerplate_python: 'def array_min(nums: list[int]) -> int:\n    # Your code here\n    pass',
    boilerplate_java: 'public long array_min(int[] nums) {\n    // Your code here\n    return 0L;\n}',
    boilerplate_cpp: 'long long array_min(vector<int> nums) {\n    // Your code here\n    return 0;\n}',
    param_types: '["int[]"]',
    return_type: 'long',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Count Positive',
    description: 'Return the number of strictly positive (> 0) elements in `nums`.',
    difficulty: 'easy',
    method_name: 'count_positive',
    sample_test_cases: '[[1,-2,3,-4]]|[[0,0,0]]|[[5,5,5]]',
    sample_test_results: '2|0|3',
    hidden_test_cases: '[[]]|[[1,-2,3,-4]]|[[0,0,0]]|[[5,5,5]]|[[-1,-2,-3]]|[[1,2,3,4,5]]',
    hidden_test_results: '0|2|0|3|0|5',
    boilerplate_python: 'def count_positive(nums: list[int]) -> int:\n    # Your code here\n    pass',
    boilerplate_java: 'public long count_positive(int[] nums) {\n    // Your code here\n    return 0L;\n}',
    boilerplate_cpp: 'long long count_positive(vector<int> nums) {\n    // Your code here\n    return 0;\n}',
    param_types: '["int[]"]',
    return_type: 'long',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Count Even',
    description: 'Return the number of even elements in `nums` (0 counts as even).',
    difficulty: 'easy',
    method_name: 'count_even',
    sample_test_cases: '[[1,2,3,4]]|[[1,3,5]]|[[0,2,4]]',
    sample_test_results: '2|0|3',
    hidden_test_cases: '[[]]|[[1,2,3,4]]|[[1,3,5]]|[[0,2,4]]|[[-2,-4,-6]]|[[1,2,3,4,5,6,7,8,9,10]]',
    hidden_test_results: '0|2|0|3|3|5',
    boilerplate_python: 'def count_even(nums: list[int]) -> int:\n    # Your code here\n    pass',
    boilerplate_java: 'public long count_even(int[] nums) {\n    // Your code here\n    return 0L;\n}',
    boilerplate_cpp: 'long long count_even(vector<int> nums) {\n    // Your code here\n    return 0;\n}',
    param_types: '["int[]"]',
    return_type: 'long',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Array Range',
    description: 'Given a non-empty integer array `nums`, return `max(nums) - min(nums)`.',
    difficulty: 'easy',
    method_name: 'array_range',
    sample_test_cases: '[[1,5,3]]|[[7]]|[[-3,-1,-7]]',
    sample_test_results: '4|0|6',
    hidden_test_cases: '[[7]]|[[1,5,3]]|[[-3,-1,-7]]|[[10,-10,0]]|[[100,200,300,400]]|[[5,5,5]]',
    hidden_test_results: '0|4|6|20|300|0',
    boilerplate_python: 'def array_range(nums: list[int]) -> int:\n    # Your code here\n    pass',
    boilerplate_java: 'public long array_range(int[] nums) {\n    // Your code here\n    return 0L;\n}',
    boilerplate_cpp: 'long long array_range(vector<int> nums) {\n    // Your code here\n    return 0;\n}',
    param_types: '["int[]"]',
    return_type: 'long',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Second Largest',
    description:
      'Given an integer array `nums` with at least two distinct values, return the second-largest distinct value.\n\n' +
      'Example: `[3,1,4,1,5,9,2,6] → 6`.',
    difficulty: 'easy',
    method_name: 'second_largest',
    sample_test_cases: '[[3,1,4,1,5,9,2,6]]|[[1,2]]|[[5,4,3,2,1]]',
    sample_test_results: '6|1|4',
    hidden_test_cases: '[[1,2]]|[[3,1,4,1,5,9,2,6]]|[[5,4,3,2,1]]|[[7,7,7,5]]|[[-1,-2,-3]]|[[10,10,20,20,30]]',
    hidden_test_results: '1|6|4|5|-2|20',
    boilerplate_python: 'def second_largest(nums: list[int]) -> int:\n    # Your code here\n    pass',
    boilerplate_java: 'public long second_largest(int[] nums) {\n    // Your code here\n    return 0L;\n}',
    boilerplate_cpp: 'long long second_largest(vector<int> nums) {\n    // Your code here\n    return 0;\n}',
    param_types: '["int[]"]',
    return_type: 'long',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Is Sorted Ascending',
    description:
      'Return `true` if `nums` is sorted in non-decreasing order (`nums[i] ≤ nums[i+1]`).\n\n' +
      'Empty and 1-element arrays are considered sorted.',
    difficulty: 'easy',
    method_name: 'is_sorted_asc',
    sample_test_cases: '[[1,2,3]]|[[1,3,2]]|[[5,5,5]]',
    sample_test_results: 'true|false|true',
    hidden_test_cases: '[[]]|[[7]]|[[1,2,3]]|[[1,3,2]]|[[5,5,5]]|[[1,2,2,3,4]]|[[3,2,1]]',
    hidden_test_results: 'true|true|true|false|true|true|false',
    boilerplate_python: 'def is_sorted_asc(nums: list[int]) -> bool:\n    # Your code here\n    pass',
    boilerplate_java: 'public boolean is_sorted_asc(int[] nums) {\n    // Your code here\n    return false;\n}',
    boilerplate_cpp: 'bool is_sorted_asc(vector<int> nums) {\n    // Your code here\n    return false;\n}',
    param_types: '["int[]"]',
    return_type: 'bool',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'All Even',
    description:
      'Return `true` if every element of `nums` is even.\n\n' +
      'An empty array trivially satisfies this (return `true`).',
    difficulty: 'easy',
    method_name: 'all_even',
    sample_test_cases: '[[2,4,6]]|[[2,3,4]]|[[]]',
    sample_test_results: 'true|false|true',
    hidden_test_cases: '[[]]|[[2,4,6]]|[[2,3,4]]|[[0,0,0]]|[[-2,-4,-6]]|[[1]]|[[2]]',
    hidden_test_results: 'true|true|false|true|true|false|true',
    boilerplate_python: 'def all_even(nums: list[int]) -> bool:\n    # Your code here\n    pass',
    boilerplate_java: 'public boolean all_even(int[] nums) {\n    // Your code here\n    return false;\n}',
    boilerplate_cpp: 'bool all_even(vector<int> nums) {\n    // Your code here\n    return false;\n}',
    param_types: '["int[]"]',
    return_type: 'bool',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'All Same',
    description:
      'Return `true` if every element of `nums` is equal.\n\n' +
      'Empty and 1-element arrays are considered all-same.',
    difficulty: 'easy',
    method_name: 'all_same',
    sample_test_cases: '[[5,5,5]]|[[1,2,3]]|[[]]',
    sample_test_results: 'true|false|true',
    hidden_test_cases: '[[]]|[[7]]|[[5,5,5]]|[[1,2,3]]|[[0,0,0,0]]|[[-3,-3,-3]]|[[1,1,2]]',
    hidden_test_results: 'true|true|true|false|true|true|false',
    boilerplate_python: 'def all_same(nums: list[int]) -> bool:\n    # Your code here\n    pass',
    boilerplate_java: 'public boolean all_same(int[] nums) {\n    // Your code here\n    return false;\n}',
    boilerplate_cpp: 'bool all_same(vector<int> nums) {\n    // Your code here\n    return false;\n}',
    param_types: '["int[]"]',
    return_type: 'bool',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Has Negative',
    description: 'Return `true` if `nums` contains at least one strictly negative element.',
    difficulty: 'easy',
    method_name: 'has_negative',
    sample_test_cases: '[[1,2,3]]|[[1,-2,3]]|[[]]',
    sample_test_results: 'false|true|false',
    hidden_test_cases: '[[]]|[[1,2,3]]|[[1,-2,3]]|[[0,0,0]]|[[-1]]|[[100,200,-1]]',
    hidden_test_results: 'false|false|true|false|true|true',
    boilerplate_python: 'def has_negative(nums: list[int]) -> bool:\n    # Your code here\n    pass',
    boilerplate_java: 'public boolean has_negative(int[] nums) {\n    // Your code here\n    return false;\n}',
    boilerplate_cpp: 'bool has_negative(vector<int> nums) {\n    // Your code here\n    return false;\n}',
    param_types: '["int[]"]',
    return_type: 'bool',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  // ── EASY: (int[]) → int[] ────────────────────────────────────────────────

  {
    title: 'Reverse Array',
    description: 'Return the elements of `nums` in reverse order.',
    difficulty: 'easy',
    method_name: 'reverse_array',
    sample_test_cases: '[[1,2,3]]|[[7]]|[[]]',
    sample_test_results: '[3,2,1]|[7]|[]',
    hidden_test_cases: '[[]]|[[7]]|[[1,2,3]]|[[1,2,3,4,5]]|[[-1,-2,-3]]|[[0,1,0]]',
    hidden_test_results: '[]|[7]|[3,2,1]|[5,4,3,2,1]|[-3,-2,-1]|[0,1,0]',
    boilerplate_python: 'def reverse_array(nums: list[int]) -> list[int]:\n    # Your code here\n    pass',
    boilerplate_java: 'public int[] reverse_array(int[] nums) {\n    // Your code here\n    return new int[]{};\n}',
    boilerplate_cpp: 'vector<int> reverse_array(vector<int> nums) {\n    // Your code here\n    return {};\n}',
    param_types: '["int[]"]',
    return_type: 'int[]',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Double Each',
    description: 'Return an array where every element of `nums` is multiplied by 2.',
    difficulty: 'easy',
    method_name: 'double_each',
    sample_test_cases: '[[1,2,3]]|[[]]|[[-1,0,1]]',
    sample_test_results: '[2,4,6]|[]|[-2,0,2]',
    hidden_test_cases: '[[]]|[[1,2,3]]|[[-1,0,1]]|[[100]]|[[5,10,15,20]]',
    hidden_test_results: '[]|[2,4,6]|[-2,0,2]|[200]|[10,20,30,40]',
    boilerplate_python: 'def double_each(nums: list[int]) -> list[int]:\n    # Your code here\n    pass',
    boilerplate_java: 'public int[] double_each(int[] nums) {\n    // Your code here\n    return new int[]{};\n}',
    boilerplate_cpp: 'vector<int> double_each(vector<int> nums) {\n    // Your code here\n    return {};\n}',
    param_types: '["int[]"]',
    return_type: 'int[]',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Square Each',
    description: 'Return an array where every element of `nums` is squared.',
    difficulty: 'easy',
    method_name: 'square_each',
    sample_test_cases: '[[1,2,3]]|[[]]|[[-2,0,2]]',
    sample_test_results: '[1,4,9]|[]|[4,0,4]',
    hidden_test_cases: '[[]]|[[1,2,3]]|[[-2,0,2]]|[[10]]|[[1,2,3,4,5]]',
    hidden_test_results: '[]|[1,4,9]|[4,0,4]|[100]|[1,4,9,16,25]',
    boilerplate_python: 'def square_each(nums: list[int]) -> list[int]:\n    # Your code here\n    pass',
    boilerplate_java: 'public int[] square_each(int[] nums) {\n    // Your code here\n    return new int[]{};\n}',
    boilerplate_cpp: 'vector<int> square_each(vector<int> nums) {\n    // Your code here\n    return {};\n}',
    param_types: '["int[]"]',
    return_type: 'int[]',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Filter Positives',
    description: 'Return a new array containing only the strictly positive elements of `nums`, preserving order.',
    difficulty: 'easy',
    method_name: 'filter_positives',
    sample_test_cases: '[[1,-2,3,-4,5]]|[[]]|[[-1,-2,-3]]',
    sample_test_results: '[1,3,5]|[]|[]',
    hidden_test_cases: '[[]]|[[1,-2,3,-4,5]]|[[-1,-2,-3]]|[[0,0,0]]|[[100,-100,50]]',
    hidden_test_results: '[]|[1,3,5]|[]|[]|[100,50]',
    boilerplate_python: 'def filter_positives(nums: list[int]) -> list[int]:\n    # Your code here\n    pass',
    boilerplate_java: 'public int[] filter_positives(int[] nums) {\n    // Your code here\n    return new int[]{};\n}',
    boilerplate_cpp: 'vector<int> filter_positives(vector<int> nums) {\n    // Your code here\n    return {};\n}',
    param_types: '["int[]"]',
    return_type: 'int[]',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Filter Evens',
    description: 'Return a new array containing only the even elements of `nums`, preserving order.',
    difficulty: 'easy',
    method_name: 'filter_evens',
    sample_test_cases: '[[1,2,3,4,5]]|[[1,3,5]]|[[]]',
    sample_test_results: '[2,4]|[]|[]',
    hidden_test_cases: '[[]]|[[1,2,3,4,5]]|[[1,3,5]]|[[0,0,0]]|[[-2,3,-4,5]]',
    hidden_test_results: '[]|[2,4]|[]|[0,0,0]|[-2,-4]',
    boilerplate_python: 'def filter_evens(nums: list[int]) -> list[int]:\n    # Your code here\n    pass',
    boilerplate_java: 'public int[] filter_evens(int[] nums) {\n    // Your code here\n    return new int[]{};\n}',
    boilerplate_cpp: 'vector<int> filter_evens(vector<int> nums) {\n    // Your code here\n    return {};\n}',
    param_types: '["int[]"]',
    return_type: 'int[]',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Running Sum',
    description:
      'Return `r` where `r[i] = nums[0] + nums[1] + … + nums[i]` (running / prefix sum).\n\n' +
      'Example: `[1,2,3,4] → [1,3,6,10]`.',
    difficulty: 'easy',
    method_name: 'running_sum',
    sample_test_cases: '[[1,2,3,4]]|[[]]|[[5]]',
    sample_test_results: '[1,3,6,10]|[]|[5]',
    hidden_test_cases: '[[]]|[[5]]|[[1,2,3,4]]|[[1,1,1,1]]|[[-1,1,-1,1]]',
    hidden_test_results: '[]|[5]|[1,3,6,10]|[1,2,3,4]|[-1,0,-1,0]',
    boilerplate_python: 'def running_sum(nums: list[int]) -> list[int]:\n    # Your code here\n    pass',
    boilerplate_java: 'public int[] running_sum(int[] nums) {\n    // Your code here\n    return new int[]{};\n}',
    boilerplate_cpp: 'vector<int> running_sum(vector<int> nums) {\n    // Your code here\n    return {};\n}',
    param_types: '["int[]"]',
    return_type: 'int[]',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Replace Negatives',
    description:
      'Return an array where every strictly negative element of `nums` is replaced with `0`; non-negative elements are kept unchanged.',
    difficulty: 'easy',
    method_name: 'replace_negatives',
    sample_test_cases: '[[-1,2,-3,4]]|[[]]|[[1,2,3]]',
    sample_test_results: '[0,2,0,4]|[]|[1,2,3]',
    hidden_test_cases: '[[]]|[[-1,2,-3,4]]|[[1,2,3]]|[[-1,-2,-3]]|[[0,0,0]]',
    hidden_test_results: '[]|[0,2,0,4]|[1,2,3]|[0,0,0]|[0,0,0]',
    boilerplate_python: 'def replace_negatives(nums: list[int]) -> list[int]:\n    # Your code here\n    pass',
    boilerplate_java: 'public int[] replace_negatives(int[] nums) {\n    // Your code here\n    return new int[]{};\n}',
    boilerplate_cpp: 'vector<int> replace_negatives(vector<int> nums) {\n    // Your code here\n    return {};\n}',
    param_types: '["int[]"]',
    return_type: 'int[]',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Cumulative Max',
    description:
      'Return `r` where `r[i]` is the maximum of `nums[0..i]` (inclusive).\n\n' +
      'Example: `[3,1,4,1,5] → [3,3,4,4,5]`.',
    difficulty: 'easy',
    method_name: 'cumulative_max',
    sample_test_cases: '[[3,1,4,1,5]]|[[5]]|[[]]',
    sample_test_results: '[3,3,4,4,5]|[5]|[]',
    hidden_test_cases: '[[]]|[[5]]|[[3,1,4,1,5]]|[[1,2,3,4]]|[[4,3,2,1]]|[[-1,-2,-3]]',
    hidden_test_results: '[]|[5]|[3,3,4,4,5]|[1,2,3,4]|[4,4,4,4]|[-1,-1,-1]',
    boilerplate_python: 'def cumulative_max(nums: list[int]) -> list[int]:\n    # Your code here\n    pass',
    boilerplate_java: 'public int[] cumulative_max(int[] nums) {\n    // Your code here\n    return new int[]{};\n}',
    boilerplate_cpp: 'vector<int> cumulative_max(vector<int> nums) {\n    // Your code here\n    return {};\n}',
    param_types: '["int[]"]',
    return_type: 'int[]',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Concat Self',
    description: 'Return `nums` concatenated with itself.\n\nExample: `[1,2,3] → [1,2,3,1,2,3]`.',
    difficulty: 'easy',
    method_name: 'concat_self',
    sample_test_cases: '[[1,2,3]]|[[]]|[[7]]',
    sample_test_results: '[1,2,3,1,2,3]|[]|[7,7]',
    hidden_test_cases: '[[]]|[[7]]|[[1,2,3]]|[[0,0]]|[[-1,1]]|[[5,10,15]]',
    hidden_test_results: '[]|[7,7]|[1,2,3,1,2,3]|[0,0,0,0]|[-1,1,-1,1]|[5,10,15,5,10,15]',
    boilerplate_python: 'def concat_self(nums: list[int]) -> list[int]:\n    # Your code here\n    pass',
    boilerplate_java: 'public int[] concat_self(int[] nums) {\n    // Your code here\n    return new int[]{};\n}',
    boilerplate_cpp: 'vector<int> concat_self(vector<int> nums) {\n    // Your code here\n    return {};\n}',
    param_types: '["int[]"]',
    return_type: 'int[]',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Count Occurrences',
    description:
      'Given `nums` and an integer `target`, return the number of times `target` appears in `nums`.',
    difficulty: 'easy',
    method_name: 'count_occurrences',
    sample_test_cases: '[[1,2,2,3,2],2]|[[1,2,3],4]|[[],5]',
    sample_test_results: '3|0|0',
    hidden_test_cases: '[[],5]|[[1,2,2,3,2],2]|[[1,2,3],4]|[[5,5,5,5],5]|[[-1,-2,-1],-1]|[[0,0,1,2,0],0]',
    hidden_test_results: '0|3|0|4|2|3',
    boilerplate_python: 'def count_occurrences(nums: list[int], target: int) -> int:\n    # Your code here\n    pass',
    boilerplate_java: 'public int count_occurrences(int[] nums, int target) {\n    // Your code here\n    return 0;\n}',
    boilerplate_cpp: 'int count_occurrences(vector<int> nums, int target) {\n    // Your code here\n    return 0;\n}',
    param_types: '["int[]","int"]',
    return_type: 'int',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  // ── EASY: mixed shapes (final wave) ──────────────────────────────────────

  {
    title: 'Multiply All By K',
    description: 'Return an array where every element of `nums` is multiplied by the integer `k`.',
    difficulty: 'easy',
    method_name: 'multiply_all',
    sample_test_cases: '[[1,2,3],2]|[[],5]|[[-1,0,1],3]',
    sample_test_results: '[2,4,6]|[]|[-3,0,3]',
    hidden_test_cases: '[[],5]|[[1,2,3],2]|[[-1,0,1],3]|[[5,10],0]|[[1,1,1],10]|[[7],-1]',
    hidden_test_results: '[]|[2,4,6]|[-3,0,3]|[0,0]|[10,10,10]|[-7]',
    boilerplate_python: 'def multiply_all(nums: list[int], k: int) -> list[int]:\n    # Your code here\n    pass',
    boilerplate_java: 'public int[] multiply_all(int[] nums, int k) {\n    // Your code here\n    return new int[]{};\n}',
    boilerplate_cpp: 'vector<int> multiply_all(vector<int> nums, int k) {\n    // Your code here\n    return {};\n}',
    param_types: '["int[]","int"]',
    return_type: 'int[]',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Index Of',
    description:
      'Return the index of the first occurrence of `target` in `nums`, or `-1` if not present.',
    difficulty: 'easy',
    method_name: 'index_of',
    sample_test_cases: '[[1,2,3,4],3]|[[1,2,3],9]|[[],5]',
    sample_test_results: '2|-1|-1',
    hidden_test_cases: '[[],5]|[[1,2,3,4],3]|[[1,2,3],9]|[[5],5]|[[5,5,5],5]|[[-1,-2,-3],-2]',
    hidden_test_results: '-1|2|-1|0|0|1',
    boilerplate_python: 'def index_of(nums: list[int], target: int) -> int:\n    # Your code here\n    pass',
    boilerplate_java: 'public int index_of(int[] nums, int target) {\n    // Your code here\n    return 0;\n}',
    boilerplate_cpp: 'int index_of(vector<int> nums, int target) {\n    // Your code here\n    return 0;\n}',
    param_types: '["int[]","int"]',
    return_type: 'int',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Equal Ignore Case',
    description:
      'Return `true` if strings `a` and `b` are equal ignoring ASCII letter case.',
    difficulty: 'easy',
    method_name: 'equal_ignore_case',
    sample_test_cases: '["Hello","hello"]|["abc","ABC"]|["foo","bar"]',
    sample_test_results: 'true|true|false',
    hidden_test_cases: '["",""]|["Hello","hello"]|["abc","ABC"]|["foo","bar"]|["Hi!","hi!"]|["abc","abcd"]',
    hidden_test_results: 'true|true|true|false|true|false',
    boilerplate_python: 'def equal_ignore_case(a: str, b: str) -> bool:\n    # Your code here\n    pass',
    boilerplate_java: 'public boolean equal_ignore_case(String a, String b) {\n    // Your code here\n    return false;\n}',
    boilerplate_cpp: 'bool equal_ignore_case(string a, string b) {\n    // Your code here\n    return false;\n}',
    param_types: '["string","string"]',
    return_type: 'bool',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Starts With',
    description:
      'Return `true` if string `s` starts with the prefix `p`.\n\nThe empty string is a prefix of every string.',
    difficulty: 'easy',
    method_name: 'starts_with',
    sample_test_cases: '["hello","he"]|["hello","lo"]|["abc",""]',
    sample_test_results: 'true|false|true',
    hidden_test_cases: '["",""]|["hello","he"]|["hello","lo"]|["abc",""]|["abc","abcd"]|["abcdef","abcdef"]',
    hidden_test_results: 'true|true|false|true|false|true',
    boilerplate_python: 'def starts_with(s: str, p: str) -> bool:\n    # Your code here\n    pass',
    boilerplate_java: 'public boolean starts_with(String s, String p) {\n    // Your code here\n    return false;\n}',
    boilerplate_cpp: 'bool starts_with(string s, string p) {\n    // Your code here\n    return false;\n}',
    param_types: '["string","string"]',
    return_type: 'bool',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Ends With',
    description:
      'Return `true` if string `s` ends with the suffix `p`.\n\nThe empty string is a suffix of every string.',
    difficulty: 'easy',
    method_name: 'ends_with',
    sample_test_cases: '["hello","lo"]|["hello","he"]|["abc",""]',
    sample_test_results: 'true|false|true',
    hidden_test_cases: '["",""]|["hello","lo"]|["hello","he"]|["abc",""]|["abc","abcd"]|["abcdef","abcdef"]',
    hidden_test_results: 'true|true|false|true|false|true',
    boilerplate_python: 'def ends_with(s: str, p: str) -> bool:\n    # Your code here\n    pass',
    boilerplate_java: 'public boolean ends_with(String s, String p) {\n    // Your code here\n    return false;\n}',
    boilerplate_cpp: 'bool ends_with(string s, string p) {\n    // Your code here\n    return false;\n}',
    param_types: '["string","string"]',
    return_type: 'bool',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Longest String',
    description:
      'Given a non-empty array `words`, return the first string with the maximum length.',
    difficulty: 'easy',
    method_name: 'longest_string',
    sample_test_cases: '[["apple","banana","kiwi"]]|[["hi"]]|[["one","two","three","four"]]',
    sample_test_results: '"banana"|"hi"|"three"',
    hidden_test_cases: '[["hi"]]|[["apple","banana","kiwi"]]|[["one","two","three","four"]]|[["a","ab","abc"]]|[["x","yz","abc","de"]]',
    hidden_test_results: '"hi"|"banana"|"three"|"abc"|"abc"',
    boilerplate_python: 'def longest_string(words: list[str]) -> str:\n    # Your code here\n    pass',
    boilerplate_java: 'public String longest_string(String[] words) {\n    // Your code here\n    return "";\n}',
    boilerplate_cpp: 'string longest_string(vector<string> words) {\n    // Your code here\n    return "";\n}',
    param_types: '["string[]"]',
    return_type: 'string',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Shortest String',
    description:
      'Given a non-empty array `words`, return the first string with the minimum length.',
    difficulty: 'easy',
    method_name: 'shortest_string',
    sample_test_cases: '[["apple","banana","kiwi"]]|[["hi"]]|[["one","two","three","four"]]',
    sample_test_results: '"kiwi"|"hi"|"one"',
    hidden_test_cases: '[["hi"]]|[["apple","banana","kiwi"]]|[["one","two","three","four"]]|[["abc","ab","a"]]|[["x","yz","abc","de"]]',
    hidden_test_results: '"hi"|"kiwi"|"one"|"a"|"x"',
    boilerplate_python: 'def shortest_string(words: list[str]) -> str:\n    # Your code here\n    pass',
    boilerplate_java: 'public String shortest_string(String[] words) {\n    // Your code here\n    return "";\n}',
    boilerplate_cpp: 'string shortest_string(vector<string> words) {\n    // Your code here\n    return "";\n}',
    param_types: '["string[]"]',
    return_type: 'string',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Matrix Sum',
    description:
      'Given a 2D integer matrix `m`, return the sum of all its elements.',
    difficulty: 'easy',
    method_name: 'matrix_sum',
    sample_test_cases: '[[[1,2],[3,4]]]|[[[5]]]|[[[]]]',
    sample_test_results: '10|5|0',
    hidden_test_cases: '[[[]]]|[[[5]]]|[[[1,2],[3,4]]]|[[[-1,-2],[-3,-4]]]|[[[1,2,3],[4,5,6],[7,8,9]]]|[[[0,0,0],[0,0,0]]]',
    hidden_test_results: '0|5|10|-10|45|0',
    boilerplate_python: 'def matrix_sum(m: list[list[int]]) -> int:\n    # Your code here\n    pass',
    boilerplate_java: 'public int matrix_sum(int[][] m) {\n    // Your code here\n    return 0;\n}',
    boilerplate_cpp: 'int matrix_sum(vector<vector<int>> m) {\n    // Your code here\n    return 0;\n}',
    param_types: '["int[][]"]',
    return_type: 'int',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Matrix Diagonal Sum',
    description:
      'Given a square integer matrix `m`, return the sum of its main-diagonal entries `m[i][i]`.\n\n' +
      'Example: `[[1,2],[3,4]] → 1+4 = 5`.',
    difficulty: 'easy',
    method_name: 'diagonal_sum',
    sample_test_cases: '[[[1,2],[3,4]]]|[[[5]]]|[[[1,2,3],[4,5,6],[7,8,9]]]',
    sample_test_results: '5|5|15',
    hidden_test_cases: '[[[5]]]|[[[1,2],[3,4]]]|[[[1,2,3],[4,5,6],[7,8,9]]]|[[[0,0],[0,0]]]|[[[1,0,0],[0,2,0],[0,0,3]]]',
    hidden_test_results: '5|5|15|0|6',
    boilerplate_python: 'def diagonal_sum(m: list[list[int]]) -> int:\n    # Your code here\n    pass',
    boilerplate_java: 'public int diagonal_sum(int[][] m) {\n    // Your code here\n    return 0;\n}',
    boilerplate_cpp: 'int diagonal_sum(vector<vector<int>> m) {\n    // Your code here\n    return 0;\n}',
    param_types: '["int[][]"]',
    return_type: 'int',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Power of Three',
    description: 'Return `true` if the given integer is a positive power of 3 (1, 3, 9, 27, …).',
    difficulty: 'easy',
    method_name: 'is_power_of_three',
    sample_test_cases: '1|3|10',
    sample_test_results: 'true|true|false',
    hidden_test_cases: '0|1|3|9|27|28|243|244|729|-3',
    hidden_test_results: 'false|true|true|true|true|false|true|false|true|false',
    boilerplate_python: 'def is_power_of_three(n: int) -> bool:\n    # Your code here\n    pass',
    boilerplate_java: 'public boolean is_power_of_three(long n) {\n    // Your code here\n    return false;\n}',
    boilerplate_cpp: 'bool is_power_of_three(long long n) {\n    // Your code here\n    return false;\n}',
    param_types: '["long"]',
    return_type: 'bool',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MEDIUM PROBLEMS (30)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── MEDIUM: number / bit ─────────────────────────────────────────────────

  {
    title: 'Happy Number',
    description:
      'A number is *happy* if, starting from `n`, repeatedly replacing it with the sum of the squares of its digits eventually reaches 1. Otherwise the sequence enters a cycle that never contains 1.\n\n' +
      'Return `true` if `n` is happy.',
    difficulty: 'medium',
    method_name: 'is_happy',
    sample_test_cases: '1|7|4',
    sample_test_results: 'true|true|false',
    hidden_test_cases: '1|2|4|7|19|20|100|900',
    hidden_test_results: 'true|false|false|true|true|false|true|false',
    boilerplate_python: 'def is_happy(n: int) -> bool:\n    # Your code here\n    pass',
    boilerplate_java: 'public boolean is_happy(long n) {\n    // Your code here\n    return false;\n}',
    boilerplate_cpp: 'bool is_happy(long long n) {\n    // Your code here\n    return false;\n}',
    param_types: '["long"]',
    return_type: 'bool',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Reverse Integer',
    description:
      'Given an integer `n`, return `n` with its decimal digits reversed (preserve the sign).\n\n' +
      'Example: `123 → 321`, `-123 → -321`, `120 → 21`.',
    difficulty: 'medium',
    method_name: 'reverse_integer',
    sample_test_cases: '123|-123|120',
    sample_test_results: '321|-321|21',
    hidden_test_cases: '0|1|7|123|-123|120|1534236469|-2147483648',
    hidden_test_results: '0|1|7|321|-321|21|9646324351|-8463847412',
    boilerplate_python: 'def reverse_integer(n: int) -> int:\n    # Your code here\n    pass',
    boilerplate_java: 'public long reverse_integer(long n) {\n    // Your code here\n    return 0L;\n}',
    boilerplate_cpp: 'long long reverse_integer(long long n) {\n    // Your code here\n    return 0;\n}',
    param_types: '["long"]',
    return_type: 'long',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Missing Number',
    description:
      'Given an array `nums` containing `n` distinct integers from `[0, n]` (exactly one is missing), return the missing number.\n\n' +
      'Example: `[3,0,1] → 2`, `[0,1] → 2`, `[9,6,4,2,3,5,7,0,1] → 8`.',
    difficulty: 'medium',
    method_name: 'missing_number',
    sample_test_cases: '[[3,0,1]]|[[0,1]]|[[9,6,4,2,3,5,7,0,1]]',
    sample_test_results: '2|2|8',
    hidden_test_cases: '[[0]]|[[1]]|[[3,0,1]]|[[0,1]]|[[9,6,4,2,3,5,7,0,1]]|[[0,1,2,3,4,5,6,7,8,9,10]]',
    hidden_test_results: '1|0|2|2|8|11',
    boilerplate_python: 'def missing_number(nums: list[int]) -> int:\n    # Your code here\n    pass',
    boilerplate_java: 'public long missing_number(int[] nums) {\n    // Your code here\n    return 0L;\n}',
    boilerplate_cpp: 'long long missing_number(vector<int> nums) {\n    // Your code here\n    return 0;\n}',
    param_types: '["int[]"]',
    return_type: 'long',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Single Number',
    description:
      'Given a non-empty integer array where every element appears twice *except one*, return the single element that appears exactly once.\n\n' +
      'Solve in O(n) time and O(1) extra space (hint: XOR).',
    difficulty: 'medium',
    method_name: 'single_number',
    sample_test_cases: '[[2,2,1]]|[[4,1,2,1,2]]|[[1]]',
    sample_test_results: '1|4|1',
    hidden_test_cases: '[[1]]|[[2,2,1]]|[[4,1,2,1,2]]|[[7,3,7]]|[[-1,-1,-2]]|[[100,200,100,300,200]]',
    hidden_test_results: '1|1|4|3|-2|300',
    boilerplate_python: 'def single_number(nums: list[int]) -> int:\n    # Your code here\n    pass',
    boilerplate_java: 'public long single_number(int[] nums) {\n    // Your code here\n    return 0L;\n}',
    boilerplate_cpp: 'long long single_number(vector<int> nums) {\n    // Your code here\n    return 0;\n}',
    param_types: '["int[]"]',
    return_type: 'long',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Majority Element',
    description:
      'Given an array `nums`, return the majority element — the value that appears more than `n/2` times. You may assume it always exists.\n\n' +
      'Aim for O(n) time and O(1) extra space (Boyer–Moore voting).',
    difficulty: 'medium',
    method_name: 'majority_element',
    sample_test_cases: '[[3,2,3]]|[[2,2,1,1,1,2,2]]|[[1]]',
    sample_test_results: '3|2|1',
    hidden_test_cases: '[[1]]|[[3,2,3]]|[[2,2,1,1,1,2,2]]|[[5,5,5,1,2]]|[[-1,-1,-1,2,2]]|[[0,0,0,0,1]]',
    hidden_test_results: '1|3|2|5|-1|0',
    boilerplate_python: 'def majority_element(nums: list[int]) -> int:\n    # Your code here\n    pass',
    boilerplate_java: 'public long majority_element(int[] nums) {\n    // Your code here\n    return 0L;\n}',
    boilerplate_cpp: 'long long majority_element(vector<int> nums) {\n    // Your code here\n    return 0;\n}',
    param_types: '["int[]"]',
    return_type: 'long',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Count Primes',
    description:
      'Given a non-negative integer `n`, return the number of primes strictly less than `n`.\n\n' +
      'Example: `n = 10 → 4` (the primes are 2, 3, 5, 7).',
    difficulty: 'medium',
    method_name: 'count_primes',
    sample_test_cases: '0|10|20',
    sample_test_results: '0|4|8',
    hidden_test_cases: '0|1|2|3|10|20|100|1000|10000',
    hidden_test_results: '0|0|0|1|4|8|25|168|1229',
    boilerplate_python: 'def count_primes(n: int) -> int:\n    # Your code here\n    pass',
    boilerplate_java: 'public long count_primes(long n) {\n    // Your code here\n    return 0L;\n}',
    boilerplate_cpp: 'long long count_primes(long long n) {\n    // Your code here\n    return 0;\n}',
    param_types: '["long"]',
    return_type: 'long',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Power',
    description:
      'Given integers `base` and `exp` with `0 ≤ exp ≤ 30`, return `base^exp`.\n\n' +
      'Handle large answers with fast exponentiation (squared-multiply).',
    difficulty: 'medium',
    method_name: 'power',
    sample_test_cases: '[2,10]|[3,4]|[5,0]',
    sample_test_results: '1024|81|1',
    hidden_test_cases: '[0,0]|[1,100]|[2,10]|[3,4]|[5,0]|[2,30]|[-2,5]|[10,9]',
    hidden_test_results: '1|1|1024|81|1|1073741824|-32|1000000000',
    boilerplate_python: 'def power(base: int, exp: int) -> int:\n    # Your code here\n    pass',
    boilerplate_java: 'public long power(long base, long exp) {\n    // Your code here\n    return 0L;\n}',
    boilerplate_cpp: 'long long power(long long base, long long exp) {\n    // Your code here\n    return 0;\n}',
    param_types: '["long","long"]',
    return_type: 'long',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Add Digits',
    description:
      'Given a non-negative integer `n`, repeatedly add all its digits until the result has one digit, then return it.\n\n' +
      'Solve in O(1) time (mathematical digital root formula).',
    difficulty: 'medium',
    method_name: 'add_digits',
    sample_test_cases: '38|0|123',
    sample_test_results: '2|0|6',
    hidden_test_cases: '0|5|9|10|38|123|999999|999999999',
    hidden_test_results: '0|5|9|1|2|6|9|9',
    boilerplate_python: 'def add_digits(n: int) -> int:\n    # Your code here\n    pass',
    boilerplate_java: 'public long add_digits(long n) {\n    // Your code here\n    return 0L;\n}',
    boilerplate_cpp: 'long long add_digits(long long n) {\n    // Your code here\n    return 0;\n}',
    param_types: '["long"]',
    return_type: 'long',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Max Product of Three',
    description:
      'Given an integer array `nums` with at least 3 elements, return the maximum product of any 3 of them.\n\n' +
      'Watch out for negatives: two large-magnitude negatives can beat three positives.',
    difficulty: 'medium',
    method_name: 'max_product_three',
    sample_test_cases: '[[1,2,3]]|[[1,2,3,4]]|[[-10,-10,5,2]]',
    sample_test_results: '6|24|500',
    hidden_test_cases: '[[1,2,3]]|[[1,2,3,4]]|[[-10,-10,5,2]]|[[-1,-2,-3]]|[[0,0,0,1]]|[[-100,-98,1,2,3,4]]',
    hidden_test_results: '6|24|500|-6|0|39200',
    boilerplate_python: 'def max_product_three(nums: list[int]) -> int:\n    # Your code here\n    pass',
    boilerplate_java: 'public long max_product_three(int[] nums) {\n    // Your code here\n    return 0L;\n}',
    boilerplate_cpp: 'long long max_product_three(vector<int> nums) {\n    // Your code here\n    return 0;\n}',
    param_types: '["int[]"]',
    return_type: 'long',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Hamming Distance',
    description:
      'Given two non-negative integers `x` and `y`, return the number of bit positions where they differ.\n\n' +
      'Hint: count the 1-bits of `x XOR y`.',
    difficulty: 'medium',
    method_name: 'hamming_distance',
    sample_test_cases: '[1,4]|[3,1]|[0,0]',
    sample_test_results: '2|1|0',
    hidden_test_cases: '[0,0]|[1,4]|[3,1]|[7,0]|[255,0]|[1023,512]|[1000000,999999]',
    hidden_test_results: '0|2|1|3|8|9|7',
    boilerplate_python: 'def hamming_distance(x: int, y: int) -> int:\n    # Your code here\n    pass',
    boilerplate_java: 'public long hamming_distance(long x, long y) {\n    // Your code here\n    return 0L;\n}',
    boilerplate_cpp: 'long long hamming_distance(long long x, long long y) {\n    // Your code here\n    return 0;\n}',
    param_types: '["long","long"]',
    return_type: 'long',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Max Subarray Sum',
    description:
      'Given an integer array `nums`, return the greatest possible sum of any contiguous, non-empty subarray.\n\n' +
      'Classic Kadane: track the best sum ending here, and the best sum seen so far, as you scan left→right.',
    difficulty: 'medium',
    method_name: 'max_subarray',
    sample_test_cases: '[[-2,1,-3,4,-1,2,1,-5,4]]|[[1]]|[[5,4,-1,7,8]]',
    sample_test_results: '6|1|23',
    hidden_test_cases: '[[-2,1,-3,4,-1,2,1,-5,4]]|[[1]]|[[5,4,-1,7,8]]|[[-1]]|[[-3,-2,-5,-1]]|[[0]]|[[1,2,3,4,5]]|[[-1,2,-1,2,-1]]|[[10,-5,7]]',
    hidden_test_results: '6|1|23|-1|-1|0|15|3|12',
    boilerplate_python: 'def max_subarray(nums: list[int]) -> int:\n    # Your code here\n    pass',
    boilerplate_java: 'public long max_subarray(int[] nums) {\n    // Your code here\n    return 0L;\n}',
    boilerplate_cpp: 'long long max_subarray(vector<int> nums) {\n    // Your code here\n    return 0;\n}',
    param_types: '["int[]"]',
    return_type: 'long',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Product Except Self',
    description:
      'Given an array `nums`, return an array `out` such that `out[i]` is the product of every element of `nums` **except** `nums[i]`.\n\n' +
      'Targets: O(n) time, no division.  Two sweeps (prefix, then suffix) do it.',
    difficulty: 'medium',
    method_name: 'product_except_self',
    sample_test_cases: '[[1,2,3,4]]|[[2,3]]|[[-1,1,0,-3,3]]',
    sample_test_results: '[24,12,8,6]|[3,2]|[0,0,9,0,0]',
    hidden_test_cases: '[[1,2,3,4]]|[[2,3]]|[[-1,1,0,-3,3]]|[[1,1]]|[[5,1]]|[[0,0,2]]|[[2,2,2,2]]|[[1,2]]',
    hidden_test_results: '[24,12,8,6]|[3,2]|[0,0,9,0,0]|[1,1]|[1,5]|[0,0,0]|[8,8,8,8]|[2,1]',
    boilerplate_python: 'def product_except_self(nums: list[int]) -> list[int]:\n    # Your code here\n    pass',
    boilerplate_java: 'public int[] product_except_self(int[] nums) {\n    // Your code here\n    return new int[]{};\n}',
    boilerplate_cpp: 'vector<int> product_except_self(vector<int> nums) {\n    // Your code here\n    return {};\n}',
    param_types: '["int[]"]',
    return_type: 'int[]',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Move Zeros',
    description:
      'Return a new array containing every non-zero element of `nums` in the same order, followed by the zeros at the end.\n\n' +
      'Length of the returned array equals the length of the input.',
    difficulty: 'medium',
    method_name: 'move_zeros',
    sample_test_cases: '[[0,1,0,3,12]]|[[1,2,3]]|[[0,0,0]]',
    sample_test_results: '[1,3,12,0,0]|[1,2,3]|[0,0,0]',
    hidden_test_cases: '[[0,1,0,3,12]]|[[1,2,3]]|[[0,0,0]]|[[0]]|[[1]]|[[]]|[[1,0,2,0,3,0]]|[[0,0,1,2]]',
    hidden_test_results: '[1,3,12,0,0]|[1,2,3]|[0,0,0]|[0]|[1]|[]|[1,2,3,0,0,0]|[1,2,0,0]',
    boilerplate_python: 'def move_zeros(nums: list[int]) -> list[int]:\n    # Your code here\n    pass',
    boilerplate_java: 'public int[] move_zeros(int[] nums) {\n    // Your code here\n    return new int[]{};\n}',
    boilerplate_cpp: 'vector<int> move_zeros(vector<int> nums) {\n    // Your code here\n    return {};\n}',
    param_types: '["int[]"]',
    return_type: 'int[]',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Plus One',
    description:
      'Given a non-empty array `digits` representing a non-negative integer (most-significant digit first), return the digit-array representing that integer plus one.\n\n' +
      'Example: `[1,2,3] → [1,2,4]`.  Handle carry-out: `[9,9] → [1,0,0]`.',
    difficulty: 'medium',
    method_name: 'plus_one',
    sample_test_cases: '[[1,2,3]]|[[4,3,2,1]]|[[9]]',
    sample_test_results: '[1,2,4]|[4,3,2,2]|[1,0]',
    hidden_test_cases: '[[1,2,3]]|[[4,3,2,1]]|[[9]]|[[0]]|[[9,9]]|[[1,9]]|[[9,9,9]]|[[1,0,0]]',
    hidden_test_results: '[1,2,4]|[4,3,2,2]|[1,0]|[1]|[1,0,0]|[2,0]|[1,0,0,0]|[1,0,1]',
    boilerplate_python: 'def plus_one(digits: list[int]) -> list[int]:\n    # Your code here\n    pass',
    boilerplate_java: 'public int[] plus_one(int[] digits) {\n    // Your code here\n    return new int[]{};\n}',
    boilerplate_cpp: 'vector<int> plus_one(vector<int> digits) {\n    // Your code here\n    return {};\n}',
    param_types: '["int[]"]',
    return_type: 'int[]',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Rotate Array',
    description:
      'Rotate the integer array `nums` to the right by `k` positions and return the rotated array.\n\n' +
      'Example: `nums=[1,2,3,4,5,6,7], k=3 → [5,6,7,1,2,3,4]`.  `k` can be larger than `nums.length` — use `k % n`.',
    difficulty: 'medium',
    method_name: 'rotate_array',
    sample_test_cases: '[[1,2,3,4,5,6,7],3]|[[-1,-100,3,99],2]|[[1,2],1]',
    sample_test_results: '[5,6,7,1,2,3,4]|[3,99,-1,-100]|[2,1]',
    hidden_test_cases: '[[1,2,3,4,5,6,7],3]|[[-1,-100,3,99],2]|[[1,2],1]|[[1],0]|[[1,2,3],0]|[[1,2,3],3]|[[1,2,3],5]|[[1,2,3,4,5],12]',
    hidden_test_results: '[5,6,7,1,2,3,4]|[3,99,-1,-100]|[2,1]|[1]|[1,2,3]|[1,2,3]|[2,3,1]|[4,5,1,2,3]',
    boilerplate_python: 'def rotate_array(nums: list[int], k: int) -> list[int]:\n    # Your code here\n    pass',
    boilerplate_java: 'public int[] rotate_array(int[] nums, int k) {\n    // Your code here\n    return new int[]{};\n}',
    boilerplate_cpp: 'vector<int> rotate_array(vector<int> nums, int k) {\n    // Your code here\n    return {};\n}',
    param_types: '["int[]","int"]',
    return_type: 'int[]',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Sliding Window Max Sum',
    description:
      'Given an integer array `nums` and a window size `k` (with `1 ≤ k ≤ nums.length`), return the maximum sum of any contiguous subarray of length exactly `k`.\n\n' +
      'Aim for O(n) with a running window sum.',
    difficulty: 'medium',
    method_name: 'window_max_sum',
    sample_test_cases: '[[1,2,3,4,5],2]|[[2,1,5,1,3,2],3]|[[1,1,1,1,1],3]',
    sample_test_results: '9|9|3',
    hidden_test_cases: '[[1,2,3,4,5],2]|[[2,1,5,1,3,2],3]|[[1,1,1,1,1],3]|[[5],1]|[[-1,-2,-3],2]|[[4,2,1,7,8,1,2,8,1,0],3]|[[10,20],1]|[[1,1],2]',
    hidden_test_results: '9|9|3|5|-3|16|20|2',
    boilerplate_python: 'def window_max_sum(nums: list[int], k: int) -> int:\n    # Your code here\n    pass',
    boilerplate_java: 'public int window_max_sum(int[] nums, int k) {\n    // Your code here\n    return 0;\n}',
    boilerplate_cpp: 'int window_max_sum(vector<int> nums, int k) {\n    // Your code here\n    return 0;\n}',
    param_types: '["int[]","int"]',
    return_type: 'int',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Jump Game',
    description:
      'You start at index 0 of `nums`.  Each value `nums[i]` is the maximum number of steps you can jump forward from position `i`.  Return `true` if you can reach the last index.\n\n' +
      'Greedy one-pass: track the farthest index reachable so far.',
    difficulty: 'medium',
    method_name: 'jump_game',
    sample_test_cases: '[[2,3,1,1,4]]|[[3,2,1,0,4]]|[[0]]',
    sample_test_results: 'true|false|true',
    hidden_test_cases: '[[2,3,1,1,4]]|[[3,2,1,0,4]]|[[0]]|[[1,0,1]]|[[1,1,1,1]]|[[5,0,0,0,0]]|[[1]]|[[2,0,0]]|[[1,0]]',
    hidden_test_results: 'true|false|true|false|true|true|true|true|true',
    boilerplate_python: 'def jump_game(nums: list[int]) -> bool:\n    # Your code here\n    pass',
    boilerplate_java: 'public boolean jump_game(int[] nums) {\n    // Your code here\n    return false;\n}',
    boilerplate_cpp: 'bool jump_game(vector<int> nums) {\n    // Your code here\n    return false;\n}',
    param_types: '["int[]"]',
    return_type: 'bool',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Valid Mountain Array',
    description:
      'An array is a valid mountain if (a) it has at least 3 elements, (b) there is some index `i` with `0 < i < n-1` such that `nums[0] < nums[1] < ... < nums[i] > nums[i+1] > ... > nums[n-1]`.  Return `true` / `false`.',
    difficulty: 'medium',
    method_name: 'valid_mountain',
    sample_test_cases: '[[0,3,2,1]]|[[3,5,5]]|[[0,2,3,4,5,2,1,0]]',
    sample_test_results: 'true|false|true',
    hidden_test_cases: '[[0,3,2,1]]|[[3,5,5]]|[[0,2,3,4,5,2,1,0]]|[[2,1]]|[[0,1,2,3,4,5]]|[[5,4,3,2,1]]|[[1,2,3,2,1]]|[[1,1,1]]|[[1,2,2,1]]',
    hidden_test_results: 'true|false|true|false|false|false|true|false|false',
    boilerplate_python: 'def valid_mountain(nums: list[int]) -> bool:\n    # Your code here\n    pass',
    boilerplate_java: 'public boolean valid_mountain(int[] nums) {\n    // Your code here\n    return false;\n}',
    boilerplate_cpp: 'bool valid_mountain(vector<int> nums) {\n    // Your code here\n    return false;\n}',
    param_types: '["int[]"]',
    return_type: 'bool',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Kth Largest Element',
    description:
      'Given an integer array `nums` and an integer `k` (with `1 ≤ k ≤ nums.length`), return the `k`-th largest element — i.e. the element at position `k` when the array is sorted in descending order (duplicates count).\n\n' +
      'Example: `[3,2,1,5,6,4], k=2 → 5`.',
    difficulty: 'medium',
    method_name: 'kth_largest',
    sample_test_cases: '[[3,2,1,5,6,4],2]|[[3,2,3,1,2,4,5,5,6],4]|[[1],1]',
    sample_test_results: '5|4|1',
    hidden_test_cases: '[[3,2,1,5,6,4],2]|[[3,2,3,1,2,4,5,5,6],4]|[[1],1]|[[1,2,3,4,5],1]|[[1,2,3,4,5],5]|[[7,7,7,7],2]|[[-1,-2,-3,-4],2]|[[10],1]',
    hidden_test_results: '5|4|1|5|1|7|-2|10',
    boilerplate_python: 'def kth_largest(nums: list[int], k: int) -> int:\n    # Your code here\n    pass',
    boilerplate_java: 'public int kth_largest(int[] nums, int k) {\n    // Your code here\n    return 0;\n}',
    boilerplate_cpp: 'int kth_largest(vector<int> nums, int k) {\n    // Your code here\n    return 0;\n}',
    param_types: '["int[]","int"]',
    return_type: 'int',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

  {
    title: 'Two Sum Sorted',
    description:
      'Given a sorted integer array `nums` and a `target`, find two **1-indexed** positions `i < j` such that `nums[i-1] + nums[j-1] == target`.  Return `[i, j]`.  Exactly one solution is guaranteed to exist.\n\n' +
      'Use two pointers from both ends (O(n), O(1)).',
    difficulty: 'medium',
    method_name: 'two_sum_sorted',
    sample_test_cases: '[[2,7,11,15],9]|[[2,3,4],6]|[[-1,0],-1]',
    sample_test_results: '[1,2]|[1,3]|[1,2]',
    hidden_test_cases: '[[2,7,11,15],9]|[[2,3,4],6]|[[-1,0],-1]|[[1,2,3,4,5],8]|[[1,5,10,20],21]|[[1,2,3],5]|[[5,25,75],100]|[[0,0,3,4],0]',
    hidden_test_results: '[1,2]|[1,3]|[1,2]|[3,5]|[1,4]|[2,3]|[2,3]|[1,2]',
    boilerplate_python: 'def two_sum_sorted(nums: list[int], target: int) -> list[int]:\n    # Your code here\n    pass',
    boilerplate_java: 'public int[] two_sum_sorted(int[] nums, int target) {\n    // Your code here\n    return new int[]{};\n}',
    boilerplate_cpp: 'vector<int> two_sum_sorted(vector<int> nums, int target) {\n    // Your code here\n    return {};\n}',
    param_types: '["int[]","int"]',
    return_type: 'int[]',
    method_signatures: '',
    problem_kind: 'algorithm',
  },

];
