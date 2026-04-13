// Reference solutions for every problem in seed-problems-data.mjs,
// keyed by problem title. Each title maps to { python, java, cpp } solution strings.
//
// These are consumed ONLY by scripts/verify-problems.mjs to verify that every
// problem runs cleanly through the executor harness for all three languages.

export const solutions = {
  'Two Sum': {
    python:
`def two_sum(nums, target):
    seen = {}
    for i, x in enumerate(nums):
        if target - x in seen:
            return [seen[target - x], i]
        seen[x] = i
    return []`,
    java:
`public int[] two_sum(int[] nums, int target) {
    java.util.HashMap<Integer,Integer> seen = new java.util.HashMap<>();
    for (int i = 0; i < nums.length; i++) {
        Integer j = seen.get(target - nums[i]);
        if (j != null) return new int[]{j, i};
        seen.put(nums[i], i);
    }
    return new int[]{};
}`,
    cpp:
`vector<int> two_sum(vector<int> nums, int target) {
    unordered_map<int,int> seen;
    for (int i = 0; i < (int)nums.size(); i++) {
        auto it = seen.find(target - nums[i]);
        if (it != seen.end()) return {it->second, i};
        seen[nums[i]] = i;
    }
    return {};
}`,
  },

  'Reverse a String': {
    python:
`def reverse_string(s):
    return s[::-1]`,
    java:
`public String reverse_string(String s) {
    return new StringBuilder(s).reverse().toString();
}`,
    cpp:
`string reverse_string(string s) {
    reverse(s.begin(), s.end());
    return s;
}`,
  },

  'Is Palindrome': {
    python:
`def is_palindrome(x):
    if x < 0: return False
    s = str(x)
    return s == s[::-1]`,
    java:
`public boolean is_palindrome(long x) {
    if (x < 0) return false;
    String s = Long.toString(x);
    return new StringBuilder(s).reverse().toString().equals(s);
}`,
    cpp:
`bool is_palindrome(long long x) {
    if (x < 0) return false;
    string s = to_string(x);
    string r = s; reverse(r.begin(), r.end());
    return r == s;
}`,
  },

  'Contains Duplicate': {
    python:
`def contains_duplicate(nums):
    return len(nums) != len(set(nums))`,
    java:
`public boolean contains_duplicate(int[] nums) {
    java.util.HashSet<Integer> s = new java.util.HashSet<>();
    for (int x : nums) { if (!s.add(x)) return true; }
    return false;
}`,
    cpp:
`bool contains_duplicate(vector<int> nums) {
    unordered_set<int> s;
    for (int x : nums) { if (!s.insert(x).second) return true; }
    return false;
}`,
  },

  'Max in Array': {
    python:
`def max_in_array(nums):
    m = nums[0]
    for x in nums:
        if x > m: m = x
    return m`,
    java:
`public long max_in_array(long[] nums) {
    long m = nums[0];
    for (long x : nums) if (x > m) m = x;
    return m;
}`,
    cpp:
`long long max_in_array(vector<long long> nums) {
    long long m = nums[0];
    for (long long x : nums) if (x > m) m = x;
    return m;
}`,
  },

  'FizzBuzz': {
    python:
`def fizz_buzz(n):
    out = []
    for i in range(1, n + 1):
        if i % 15 == 0: out.append("FizzBuzz")
        elif i % 3 == 0: out.append("Fizz")
        elif i % 5 == 0: out.append("Buzz")
        else: out.append(str(i))
    return out`,
    java:
`public String[] fizz_buzz(long n) {
    String[] out = new String[(int) n];
    for (int i = 1; i <= n; i++) {
        if (i % 15 == 0) out[i-1] = "FizzBuzz";
        else if (i % 3 == 0) out[i-1] = "Fizz";
        else if (i % 5 == 0) out[i-1] = "Buzz";
        else out[i-1] = Integer.toString(i);
    }
    return out;
}`,
    cpp:
`vector<string> fizz_buzz(long long n) {
    vector<string> out;
    for (long long i = 1; i <= n; i++) {
        if (i % 15 == 0) out.push_back("FizzBuzz");
        else if (i % 3 == 0) out.push_back("Fizz");
        else if (i % 5 == 0) out.push_back("Buzz");
        else out.push_back(to_string(i));
    }
    return out;
}`,
  },

  'Sum of Digits': {
    python:
`def sum_of_digits(n):
    s = 0
    while n > 0:
        s += n % 10
        n //= 10
    return s`,
    java:
`public long sum_of_digits(long n) {
    long s = 0;
    while (n > 0) { s += n % 10; n /= 10; }
    return s;
}`,
    cpp:
`long long sum_of_digits(long long n) {
    long long s = 0;
    while (n > 0) { s += n % 10; n /= 10; }
    return s;
}`,
  },

  'Fibonacci (Iterative)': {
    python:
`def fib(n):
    if n < 2: return n
    a, b = 0, 1
    for _ in range(n - 1):
        a, b = b, a + b
    return b`,
    java:
`public long fib(long n) {
    if (n < 2) return n;
    long a = 0, b = 1;
    for (long i = 0; i < n - 1; i++) { long c = a + b; a = b; b = c; }
    return b;
}`,
    cpp:
`long long fib(long long n) {
    if (n < 2) return n;
    long long a = 0, b = 1;
    for (long long i = 0; i < n - 1; i++) { long long c = a + b; a = b; b = c; }
    return b;
}`,
  },

  'Valid Parentheses': {
    python:
`def is_valid(s):
    pairs = {')': '(', ']': '[', '}': '{'}
    stack = []
    for c in s:
        if c in '([{': stack.append(c)
        else:
            if not stack or stack.pop() != pairs[c]: return False
    return not stack`,
    java:
`public boolean is_valid(String s) {
    java.util.ArrayDeque<Character> st = new java.util.ArrayDeque<>();
    for (char c : s.toCharArray()) {
        if (c == '(' || c == '[' || c == '{') st.push(c);
        else {
            if (st.isEmpty()) return false;
            char t = st.pop();
            if ((c == ')' && t != '(') || (c == ']' && t != '[') || (c == '}' && t != '{')) return false;
        }
    }
    return st.isEmpty();
}`,
    cpp:
`bool is_valid(string s) {
    vector<char> st;
    for (char c : s) {
        if (c == '(' || c == '[' || c == '{') st.push_back(c);
        else {
            if (st.empty()) return false;
            char t = st.back(); st.pop_back();
            if ((c == ')' && t != '(') || (c == ']' && t != '[') || (c == '}' && t != '{')) return false;
        }
    }
    return st.empty();
}`,
  },

  'Min Stack': {
    python:
`class MinStack:
    def __init__(self):
        self.s = []
        self.m = []
    def push(self, val):
        self.s.append(val)
        if not self.m or val <= self.m[-1]:
            self.m.append(val)
    def pop(self):
        v = self.s.pop()
        if v == self.m[-1]:
            self.m.pop()
    def top(self):
        return self.s[-1]
    def get_min(self):
        return self.m[-1]`,
    java:
`class MinStack {
    java.util.ArrayDeque<Long> s = new java.util.ArrayDeque<>();
    java.util.ArrayDeque<Long> m = new java.util.ArrayDeque<>();
    public void push(long val) {
        s.push(val);
        if (m.isEmpty() || val <= m.peek()) m.push(val);
    }
    public void pop() {
        long v = s.pop();
        if (v == m.peek()) m.pop();
    }
    public long top() { return s.peek(); }
    public long get_min() { return m.peek(); }
}`,
    cpp:
`struct MinStack {
    vector<long long> s, m;
    void push(long long val) {
        s.push_back(val);
        if (m.empty() || val <= m.back()) m.push_back(val);
    }
    void pop() {
        long long v = s.back(); s.pop_back();
        if (v == m.back()) m.pop_back();
    }
    long long top() { return s.back(); }
    long long get_min() { return m.back(); }
};`,
  },

  'Valid Anagram': {
    python:
`def is_anagram(s, t):
    if len(s) != len(t): return False
    counts = [0] * 26
    for c in s: counts[ord(c) - ord('a')] += 1
    for c in t: counts[ord(c) - ord('a')] -= 1
    return all(c == 0 for c in counts)`,
    java:
`public boolean is_anagram(String s, String t) {
    if (s.length() != t.length()) return false;
    int[] c = new int[26];
    for (char ch : s.toCharArray()) c[ch - 'a']++;
    for (char ch : t.toCharArray()) c[ch - 'a']--;
    for (int x : c) if (x != 0) return false;
    return true;
}`,
    cpp:
`bool is_anagram(string s, string t) {
    if (s.size() != t.size()) return false;
    int c[26] = {0};
    for (char ch : s) c[ch - 'a']++;
    for (char ch : t) c[ch - 'a']--;
    for (int x : c) if (x != 0) return false;
    return true;
}`,
  },

  'Binary Search': {
    python:
`def binary_search(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target: return mid
        if nums[mid] < target: lo = mid + 1
        else: hi = mid - 1
    return -1`,
    java:
`public int binary_search(int[] nums, int target) {
    int lo = 0, hi = nums.length - 1;
    while (lo <= hi) {
        int mid = (lo + hi) >>> 1;
        if (nums[mid] == target) return mid;
        if (nums[mid] < target) lo = mid + 1; else hi = mid - 1;
    }
    return -1;
}`,
    cpp:
`int binary_search(vector<int> nums, int target) {
    int lo = 0, hi = (int)nums.size() - 1;
    while (lo <= hi) {
        int mid = (lo + hi) / 2;
        if (nums[mid] == target) return mid;
        if (nums[mid] < target) lo = mid + 1; else hi = mid - 1;
    }
    return -1;
}`,
  },

  'Linked List: Reverse': {
    python:
`def reverse_list(head):
    result = []
    for x in head:
        result.append(x)
    result.reverse()
    return result`,
    java:
`public int[] reverse_list(int[] head) {
    int n = head.length;
    int[] out = new int[n];
    for (int i = 0; i < n; i++) out[i] = head[n - 1 - i];
    return out;
}`,
    cpp:
`vector<int> reverse_list(vector<int> head) {
    vector<int> out(head.rbegin(), head.rend());
    return out;
}`,
  },

  'Climbing Stairs': {
    python:
`def climb_stairs(n):
    if n < 2: return n
    a, b = 1, 2
    for _ in range(n - 2):
        a, b = b, a + b
    return b`,
    java:
`public long climb_stairs(long n) {
    if (n <= 2) return n;
    long a = 1, b = 2;
    for (long i = 0; i < n - 2; i++) { long c = a + b; a = b; b = c; }
    return b;
}`,
    cpp:
`long long climb_stairs(long long n) {
    if (n <= 2) return n;
    long long a = 1, b = 2;
    for (long long i = 0; i < n - 2; i++) { long long c = a + b; a = b; b = c; }
    return b;
}`,
  },

  'LRU Cache: get & put': {
    python:
`class LRUCache:
    def __init__(self, capacity):
        from collections import OrderedDict
        self.c = capacity
        self.d = OrderedDict()
    def get(self, key):
        if key not in self.d: return -1
        self.d.move_to_end(key)
        return self.d[key]
    def put(self, key, value):
        if key in self.d: self.d.move_to_end(key)
        self.d[key] = value
        if len(self.d) > self.c:
            self.d.popitem(last=False)`,
    java:
`class LRUCache {
    final int cap;
    java.util.LinkedHashMap<Long,Long> map;
    public LRUCache(long capacity) {
        this.cap = (int) capacity;
        this.map = new java.util.LinkedHashMap<>(16, 0.75f, true);
    }
    public long get(long key) {
        Long v = map.get(key);
        return v == null ? -1L : v;
    }
    public void put(long key, long value) {
        map.put(key, value);
        if (map.size() > cap) {
            java.util.Iterator<java.util.Map.Entry<Long,Long>> it = map.entrySet().iterator();
            it.next(); it.remove();
        }
    }
}`,
    cpp:
`struct LRUCache {
    int cap;
    list<pair<long long,long long>> lst;
    unordered_map<long long, list<pair<long long,long long>>::iterator> mp;
    LRUCache(long long capacity) : cap((int)capacity) {}
    long long get(long long key) {
        auto it = mp.find(key);
        if (it == mp.end()) return -1;
        lst.splice(lst.begin(), lst, it->second);
        return it->second->second;
    }
    void put(long long key, long long value) {
        auto it = mp.find(key);
        if (it != mp.end()) {
            it->second->second = value;
            lst.splice(lst.begin(), lst, it->second);
            return;
        }
        lst.push_front({key, value});
        mp[key] = lst.begin();
        if ((int)lst.size() > cap) {
            mp.erase(lst.back().first);
            lst.pop_back();
        }
    }
};`,
  },

  'Trie: insert & search': {
    python:
`class Trie:
    def __init__(self):
        self.root = {}
    def insert(self, word):
        n = self.root
        for c in word:
            if c not in n: n[c] = {}
            n = n[c]
        n['$'] = True
    def search(self, word):
        n = self.root
        for c in word:
            if c not in n: return False
            n = n[c]
        return '$' in n
    def starts_with(self, prefix):
        n = self.root
        for c in prefix:
            if c not in n: return False
            n = n[c]
        return True`,
    java:
`class Trie {
    static class Node { java.util.HashMap<Character,Node> ch = new java.util.HashMap<>(); boolean end; }
    Node root = new Node();
    public void insert(String word) {
        Node n = root;
        for (char c : word.toCharArray()) n = n.ch.computeIfAbsent(c, k -> new Node());
        n.end = true;
    }
    public boolean search(String word) {
        Node n = root;
        for (char c : word.toCharArray()) {
            n = n.ch.get(c);
            if (n == null) return false;
        }
        return n.end;
    }
    public boolean starts_with(String prefix) {
        Node n = root;
        for (char c : prefix.toCharArray()) {
            n = n.ch.get(c);
            if (n == null) return false;
        }
        return true;
    }
}`,
    cpp:
`struct Trie {
    struct Node { unordered_map<char, Node*> ch; bool end = false; };
    Node* root;
    Trie() { root = new Node(); }
    void insert(const string& word) {
        Node* n = root;
        for (char c : word) {
            if (!n->ch.count(c)) n->ch[c] = new Node();
            n = n->ch[c];
        }
        n->end = true;
    }
    bool search(const string& word) {
        Node* n = root;
        for (char c : word) {
            if (!n->ch.count(c)) return false;
            n = n->ch[c];
        }
        return n->end;
    }
    bool starts_with(const string& prefix) {
        Node* n = root;
        for (char c : prefix) {
            if (!n->ch.count(c)) return false;
            n = n->ch[c];
        }
        return true;
    }
};`,
  },

  // ─── Wave 1: easy (long) → long ──────────────────────────────────────────

  'Factorial': {
    python: `def factorial(n):
    r = 1
    for i in range(2, n + 1): r *= i
    return r`,
    java: `public long factorial(long n) {
    long r = 1;
    for (long i = 2; i <= n; i++) r *= i;
    return r;
}`,
    cpp: `long long factorial(long long n) {
    long long r = 1;
    for (long long i = 2; i <= n; i++) r *= i;
    return r;
}`,
  },

  'Count Digits': {
    python: `def count_digits(n):
    n = abs(n)
    if n == 0: return 1
    c = 0
    while n > 0:
        c += 1
        n //= 10
    return c`,
    java: `public long count_digits(long n) {
    if (n < 0) n = -n;
    if (n == 0) return 1;
    long c = 0;
    while (n > 0) { c++; n /= 10; }
    return c;
}`,
    cpp: `long long count_digits(long long n) {
    if (n < 0) n = -n;
    if (n == 0) return 1;
    long long c = 0;
    while (n > 0) { c++; n /= 10; }
    return c;
}`,
  },

  'Sum to N': {
    python: `def sum_to_n(n):
    return n * (n + 1) // 2`,
    java: `public long sum_to_n(long n) {
    return n * (n + 1) / 2;
}`,
    cpp: `long long sum_to_n(long long n) {
    return n * (n + 1) / 2;
}`,
  },

  'Last Digit': {
    python: `def last_digit(n):
    return abs(n) % 10`,
    java: `public long last_digit(long n) {
    return Math.abs(n) % 10;
}`,
    cpp: `long long last_digit(long long n) {
    return (n < 0 ? -n : n) % 10;
}`,
  },

  'Absolute Value': {
    python: `def abs_val(n):
    return -n if n < 0 else n`,
    java: `public long abs_val(long n) {
    return n < 0 ? -n : n;
}`,
    cpp: `long long abs_val(long long n) {
    return n < 0 ? -n : n;
}`,
  },

  'Square': {
    python: `def square(n):
    return n * n`,
    java: `public long square(long n) {
    return n * n;
}`,
    cpp: `long long square(long long n) {
    return n * n;
}`,
  },

  'Integer Square Root': {
    python: `def int_sqrt(n):
    if n < 2: return n
    lo, hi = 1, n
    while lo <= hi:
        mid = (lo + hi) // 2
        if mid * mid <= n: lo = mid + 1
        else: hi = mid - 1
    return hi`,
    java: `public long int_sqrt(long n) {
    if (n < 2) return n;
    long lo = 1, hi = n, ans = 0;
    while (lo <= hi) {
        long mid = lo + (hi - lo) / 2;
        if (mid <= n / mid) { ans = mid; lo = mid + 1; }
        else hi = mid - 1;
    }
    return ans;
}`,
    cpp: `long long int_sqrt(long long n) {
    if (n < 2) return n;
    long long lo = 1, hi = n, ans = 0;
    while (lo <= hi) {
        long long mid = lo + (hi - lo) / 2;
        if (mid <= n / mid) { ans = mid; lo = mid + 1; }
        else hi = mid - 1;
    }
    return ans;
}`,
  },

  'Hours to Seconds': {
    python: `def hours_to_seconds(h):
    return h * 3600`,
    java: `public long hours_to_seconds(long h) {
    return h * 3600;
}`,
    cpp: `long long hours_to_seconds(long long h) {
    return h * 3600;
}`,
  },

  'Count Set Bits': {
    python: `def count_set_bits(n):
    c = 0
    while n > 0:
        c += n & 1
        n >>= 1
    return c`,
    java: `public long count_set_bits(long n) {
    long c = 0;
    while (n > 0) { c += n & 1; n >>= 1; }
    return c;
}`,
    cpp: `long long count_set_bits(long long n) {
    long long c = 0;
    while (n > 0) { c += n & 1; n >>= 1; }
    return c;
}`,
  },

  'Digital Root': {
    python: `def digital_root(n):
    while n >= 10:
        s = 0
        while n > 0:
            s += n % 10
            n //= 10
        n = s
    return n`,
    java: `public long digital_root(long n) {
    while (n >= 10) {
        long s = 0;
        while (n > 0) { s += n % 10; n /= 10; }
        n = s;
    }
    return n;
}`,
    cpp: `long long digital_root(long long n) {
    while (n >= 10) {
        long long s = 0;
        while (n > 0) { s += n % 10; n /= 10; }
        n = s;
    }
    return n;
}`,
  },

  // ─── Wave 2: easy (long) → bool, (long,long) → long ──────────────────────

  'Is Prime': {
    python: `def is_prime(n):
    if n < 2: return False
    if n < 4: return True
    if n % 2 == 0: return False
    i = 3
    while i * i <= n:
        if n % i == 0: return False
        i += 2
    return True`,
    java: `public boolean is_prime(long n) {
    if (n < 2) return false;
    if (n < 4) return true;
    if (n % 2 == 0) return false;
    for (long i = 3; i * i <= n; i += 2)
        if (n % i == 0) return false;
    return true;
}`,
    cpp: `bool is_prime(long long n) {
    if (n < 2) return false;
    if (n < 4) return true;
    if (n % 2 == 0) return false;
    for (long long i = 3; i * i <= n; i += 2)
        if (n % i == 0) return false;
    return true;
}`,
  },

  'Power of Two': {
    python: `def is_power_of_two(n):
    return n > 0 and (n & (n - 1)) == 0`,
    java: `public boolean is_power_of_two(long n) {
    return n > 0 && (n & (n - 1)) == 0;
}`,
    cpp: `bool is_power_of_two(long long n) {
    return n > 0 && (n & (n - 1)) == 0;
}`,
  },

  'Leap Year': {
    python: `def is_leap_year(y):
    return y % 400 == 0 or (y % 4 == 0 and y % 100 != 0)`,
    java: `public boolean is_leap_year(long y) {
    return y % 400 == 0 || (y % 4 == 0 && y % 100 != 0);
}`,
    cpp: `bool is_leap_year(long long y) {
    return y % 400 == 0 || (y % 4 == 0 && y % 100 != 0);
}`,
  },

  'Is Perfect Square': {
    python: `def is_perfect_square(n):
    if n < 0: return False
    k = int(n ** 0.5)
    for c in (k - 1, k, k + 1):
        if c >= 0 and c * c == n: return True
    return False`,
    java: `public boolean is_perfect_square(long n) {
    if (n < 0) return false;
    long lo = 0, hi = n;
    while (lo <= hi) {
        long mid = lo + (hi - lo) / 2;
        long sq = mid * mid;
        if (sq == n) return true;
        if (sq < n) lo = mid + 1; else hi = mid - 1;
    }
    return false;
}`,
    cpp: `bool is_perfect_square(long long n) {
    if (n < 0) return false;
    long long lo = 0, hi = n;
    while (lo <= hi) {
        long long mid = lo + (hi - lo) / 2;
        long long sq = mid * mid;
        if (sq == n) return true;
        if (sq < n) lo = mid + 1; else hi = mid - 1;
    }
    return false;
}`,
  },

  'Palindrome Number': {
    python: `def is_palindrome_number(n):
    if n < 0: return False
    s = str(n)
    return s == s[::-1]`,
    java: `public boolean is_palindrome_number(long n) {
    if (n < 0) return false;
    String s = Long.toString(n);
    return s.equals(new StringBuilder(s).reverse().toString());
}`,
    cpp: `bool is_palindrome_number(long long n) {
    if (n < 0) return false;
    string s = to_string(n);
    string r = s; reverse(r.begin(), r.end());
    return s == r;
}`,
  },

  'GCD': {
    python: `def gcd(a, b):
    while b:
        a, b = b, a % b
    return a`,
    java: `public long gcd(long a, long b) {
    while (b != 0) { long t = b; b = a % b; a = t; }
    return a;
}`,
    cpp: `long long gcd(long long a, long long b) {
    while (b) { long long t = b; b = a % b; a = t; }
    return a;
}`,
  },

  'LCM': {
    python: `def lcm(a, b):
    x, y = a, b
    while y:
        x, y = y, x % y
    return a // x * b`,
    java: `public long lcm(long a, long b) {
    long x = a, y = b;
    while (y != 0) { long t = y; y = x % y; x = t; }
    return a / x * b;
}`,
    cpp: `long long lcm(long long a, long long b) {
    long long x = a, y = b;
    while (y) { long long t = y; y = x % y; x = t; }
    return a / x * b;
}`,
  },

  'Max of Two': {
    python: `def max_of_two(a, b):
    return a if a > b else b`,
    java: `public long max_of_two(long a, long b) {
    return a > b ? a : b;
}`,
    cpp: `long long max_of_two(long long a, long long b) {
    return a > b ? a : b;
}`,
  },

  'Min of Two': {
    python: `def min_of_two(a, b):
    return a if a < b else b`,
    java: `public long min_of_two(long a, long b) {
    return a < b ? a : b;
}`,
    cpp: `long long min_of_two(long long a, long long b) {
    return a < b ? a : b;
}`,
  },

  'Sum Range': {
    python: `def sum_range(a, b):
    return (b - a + 1) * (a + b) // 2`,
    java: `public long sum_range(long a, long b) {
    return (b - a + 1) * (a + b) / 2;
}`,
    cpp: `long long sum_range(long long a, long long b) {
    return (b - a + 1) * (a + b) / 2;
}`,
  },

  // ─── Wave 3: easy (string) → long / string / bool ────────────────────────

  'Count Vowels': {
    python: `def count_vowels(s):
    return sum(1 for c in s if c in 'aeiou')`,
    java: `public long count_vowels(String s) {
    long c = 0;
    for (int i = 0; i < s.length(); i++)
        if ("aeiou".indexOf(s.charAt(i)) >= 0) c++;
    return c;
}`,
    cpp: `long long count_vowels(string s) {
    long long c = 0;
    for (char ch : s)
        if (ch == 'a' || ch == 'e' || ch == 'i' || ch == 'o' || ch == 'u') c++;
    return c;
}`,
  },

  'Count Words': {
    python: `def count_words(s):
    return len(s.split())`,
    java: `public long count_words(String s) {
    String t = s.trim();
    if (t.isEmpty()) return 0;
    return t.split("\\\\s+").length;
}`,
    cpp: `long long count_words(string s) {
    long long c = 0;
    bool in = false;
    for (char ch : s) {
        if (ch == ' ' || ch == '\\t' || ch == '\\n') in = false;
        else if (!in) { in = true; c++; }
    }
    return c;
}`,
  },

  'Longest Word Length': {
    python: `def longest_word_length(s):
    return max((len(w) for w in s.split()), default=0)`,
    java: `public long longest_word_length(String s) {
    long best = 0, cur = 0;
    for (int i = 0; i < s.length(); i++) {
        if (s.charAt(i) == ' ') { if (cur > best) best = cur; cur = 0; }
        else cur++;
    }
    if (cur > best) best = cur;
    return best;
}`,
    cpp: `long long longest_word_length(string s) {
    long long best = 0, cur = 0;
    for (char ch : s) {
        if (ch == ' ') { if (cur > best) best = cur; cur = 0; }
        else cur++;
    }
    if (cur > best) best = cur;
    return best;
}`,
  },

  'To Upper Case': {
    python: `def to_upper(s):
    return s.upper()`,
    java: `public String to_upper(String s) {
    StringBuilder sb = new StringBuilder();
    for (int i = 0; i < s.length(); i++) {
        char c = s.charAt(i);
        if (c >= 'a' && c <= 'z') c = (char)(c - 32);
        sb.append(c);
    }
    return sb.toString();
}`,
    cpp: `string to_upper(string s) {
    for (auto& c : s) if (c >= 'a' && c <= 'z') c -= 32;
    return s;
}`,
  },

  'To Lower Case': {
    python: `def to_lower(s):
    return s.lower()`,
    java: `public String to_lower(String s) {
    StringBuilder sb = new StringBuilder();
    for (int i = 0; i < s.length(); i++) {
        char c = s.charAt(i);
        if (c >= 'A' && c <= 'Z') c = (char)(c + 32);
        sb.append(c);
    }
    return sb.toString();
}`,
    cpp: `string to_lower(string s) {
    for (auto& c : s) if (c >= 'A' && c <= 'Z') c += 32;
    return s;
}`,
  },

  'Swap Case': {
    python: `def swap_case(s):
    return s.swapcase()`,
    java: `public String swap_case(String s) {
    StringBuilder sb = new StringBuilder();
    for (int i = 0; i < s.length(); i++) {
        char c = s.charAt(i);
        if (c >= 'a' && c <= 'z') c = (char)(c - 32);
        else if (c >= 'A' && c <= 'Z') c = (char)(c + 32);
        sb.append(c);
    }
    return sb.toString();
}`,
    cpp: `string swap_case(string s) {
    for (auto& c : s) {
        if (c >= 'a' && c <= 'z') c -= 32;
        else if (c >= 'A' && c <= 'Z') c += 32;
    }
    return s;
}`,
  },

  'Remove Vowels': {
    python: `def remove_vowels(s):
    return ''.join(c for c in s if c not in 'aeiou')`,
    java: `public String remove_vowels(String s) {
    StringBuilder sb = new StringBuilder();
    for (int i = 0; i < s.length(); i++) {
        char c = s.charAt(i);
        if ("aeiou".indexOf(c) < 0) sb.append(c);
    }
    return sb.toString();
}`,
    cpp: `string remove_vowels(string s) {
    string r;
    for (char c : s)
        if (c != 'a' && c != 'e' && c != 'i' && c != 'o' && c != 'u') r += c;
    return r;
}`,
  },

  'Reverse Words': {
    python: `def reverse_words(s):
    return ' '.join(reversed(s.split()))`,
    java: `public String reverse_words(String s) {
    String t = s.trim();
    if (t.isEmpty()) return "";
    String[] parts = t.split("\\\\s+");
    StringBuilder sb = new StringBuilder();
    for (int i = parts.length - 1; i >= 0; i--) {
        if (sb.length() > 0) sb.append(' ');
        sb.append(parts[i]);
    }
    return sb.toString();
}`,
    cpp: `string reverse_words(string s) {
    vector<string> words;
    string cur;
    for (char c : s) {
        if (c == ' ') { if (!cur.empty()) { words.push_back(cur); cur.clear(); } }
        else cur += c;
    }
    if (!cur.empty()) words.push_back(cur);
    string out;
    for (int i = words.size() - 1; i >= 0; i--) {
        if (!out.empty()) out += ' ';
        out += words[i];
    }
    return out;
}`,
  },

  'Is Alpha Only': {
    python: `def is_alpha_only(s):
    return len(s) > 0 and all('a' <= c <= 'z' or 'A' <= c <= 'Z' for c in s)`,
    java: `public boolean is_alpha_only(String s) {
    if (s.isEmpty()) return false;
    for (int i = 0; i < s.length(); i++) {
        char c = s.charAt(i);
        if (!((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z'))) return false;
    }
    return true;
}`,
    cpp: `bool is_alpha_only(string s) {
    if (s.empty()) return false;
    for (char c : s)
        if (!((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z'))) return false;
    return true;
}`,
  },

  'Has Vowel': {
    python: `def has_vowel(s):
    return any(c.lower() in 'aeiou' for c in s)`,
    java: `public boolean has_vowel(String s) {
    for (int i = 0; i < s.length(); i++) {
        char c = Character.toLowerCase(s.charAt(i));
        if ("aeiou".indexOf(c) >= 0) return true;
    }
    return false;
}`,
    cpp: `bool has_vowel(string s) {
    for (char c : s) {
        char lc = (c >= 'A' && c <= 'Z') ? (char)(c + 32) : c;
        if (lc == 'a' || lc == 'e' || lc == 'i' || lc == 'o' || lc == 'u') return true;
    }
    return false;
}`,
  },

  // ─── Wave 4: easy (int[]) → long / bool ──────────────────────────────────

  'Array Sum': {
    python: `def array_sum(nums):
    return sum(nums)`,
    java: `public long array_sum(int[] nums) {
    long s = 0;
    for (int x : nums) s += x;
    return s;
}`,
    cpp: `long long array_sum(vector<int> nums) {
    long long s = 0;
    for (int x : nums) s += x;
    return s;
}`,
  },

  'Array Min': {
    python: `def array_min(nums):
    return min(nums)`,
    java: `public long array_min(int[] nums) {
    long m = nums[0];
    for (int x : nums) if (x < m) m = x;
    return m;
}`,
    cpp: `long long array_min(vector<int> nums) {
    long long m = nums[0];
    for (int x : nums) if (x < m) m = x;
    return m;
}`,
  },

  'Count Positive': {
    python: `def count_positive(nums):
    return sum(1 for x in nums if x > 0)`,
    java: `public long count_positive(int[] nums) {
    long c = 0;
    for (int x : nums) if (x > 0) c++;
    return c;
}`,
    cpp: `long long count_positive(vector<int> nums) {
    long long c = 0;
    for (int x : nums) if (x > 0) c++;
    return c;
}`,
  },

  'Count Even': {
    python: `def count_even(nums):
    return sum(1 for x in nums if x % 2 == 0)`,
    java: `public long count_even(int[] nums) {
    long c = 0;
    for (int x : nums) if (x % 2 == 0) c++;
    return c;
}`,
    cpp: `long long count_even(vector<int> nums) {
    long long c = 0;
    for (int x : nums) if (x % 2 == 0) c++;
    return c;
}`,
  },

  'Array Range': {
    python: `def array_range(nums):
    return max(nums) - min(nums)`,
    java: `public long array_range(int[] nums) {
    int lo = nums[0], hi = nums[0];
    for (int x : nums) { if (x < lo) lo = x; if (x > hi) hi = x; }
    return (long)hi - (long)lo;
}`,
    cpp: `long long array_range(vector<int> nums) {
    int lo = nums[0], hi = nums[0];
    for (int x : nums) { if (x < lo) lo = x; if (x > hi) hi = x; }
    return (long long)hi - (long long)lo;
}`,
  },

  'Second Largest': {
    python: `def second_largest(nums):
    a = b = None
    for x in nums:
        if a is None or x > a:
            if a is not None and a != x: b = a
            a = x
        elif x != a and (b is None or x > b):
            b = x
    return b`,
    java: `public long second_largest(int[] nums) {
    Long a = null, b = null;
    for (int x : nums) {
        long lx = x;
        if (a == null || lx > a) {
            if (a != null && a != lx) b = a;
            a = lx;
        } else if (lx != a && (b == null || lx > b)) {
            b = lx;
        }
    }
    return b;
}`,
    cpp: `long long second_largest(vector<int> nums) {
    bool hasA = false, hasB = false;
    long long a = 0, b = 0;
    for (int x : nums) {
        if (!hasA || x > a) {
            if (hasA && a != x) { b = a; hasB = true; }
            a = x; hasA = true;
        } else if (x != a && (!hasB || x > b)) {
            b = x; hasB = true;
        }
    }
    return b;
}`,
  },

  'Is Sorted Ascending': {
    python: `def is_sorted_asc(nums):
    for i in range(1, len(nums)):
        if nums[i] < nums[i-1]: return False
    return True`,
    java: `public boolean is_sorted_asc(int[] nums) {
    for (int i = 1; i < nums.length; i++)
        if (nums[i] < nums[i-1]) return false;
    return true;
}`,
    cpp: `bool is_sorted_asc(vector<int> nums) {
    for (int i = 1; i < (int)nums.size(); i++)
        if (nums[i] < nums[i-1]) return false;
    return true;
}`,
  },

  'All Even': {
    python: `def all_even(nums):
    return all(x % 2 == 0 for x in nums)`,
    java: `public boolean all_even(int[] nums) {
    for (int x : nums) if (x % 2 != 0) return false;
    return true;
}`,
    cpp: `bool all_even(vector<int> nums) {
    for (int x : nums) if (x % 2 != 0) return false;
    return true;
}`,
  },

  'All Same': {
    python: `def all_same(nums):
    return all(x == nums[0] for x in nums) if nums else True`,
    java: `public boolean all_same(int[] nums) {
    if (nums.length == 0) return true;
    for (int x : nums) if (x != nums[0]) return false;
    return true;
}`,
    cpp: `bool all_same(vector<int> nums) {
    if (nums.empty()) return true;
    for (int x : nums) if (x != nums[0]) return false;
    return true;
}`,
  },

  'Has Negative': {
    python: `def has_negative(nums):
    return any(x < 0 for x in nums)`,
    java: `public boolean has_negative(int[] nums) {
    for (int x : nums) if (x < 0) return true;
    return false;
}`,
    cpp: `bool has_negative(vector<int> nums) {
    for (int x : nums) if (x < 0) return true;
    return false;
}`,
  },

  // ─── Wave 5: easy (int[]) → int[] and (int[],int) → int ──────────────────

  'Reverse Array': {
    python: `def reverse_array(nums):
    return nums[::-1]`,
    java: `public int[] reverse_array(int[] nums) {
    int n = nums.length;
    int[] r = new int[n];
    for (int i = 0; i < n; i++) r[i] = nums[n - 1 - i];
    return r;
}`,
    cpp: `vector<int> reverse_array(vector<int> nums) {
    reverse(nums.begin(), nums.end());
    return nums;
}`,
  },

  'Double Each': {
    python: `def double_each(nums):
    return [x * 2 for x in nums]`,
    java: `public int[] double_each(int[] nums) {
    int[] r = new int[nums.length];
    for (int i = 0; i < nums.length; i++) r[i] = nums[i] * 2;
    return r;
}`,
    cpp: `vector<int> double_each(vector<int> nums) {
    for (auto& x : nums) x *= 2;
    return nums;
}`,
  },

  'Square Each': {
    python: `def square_each(nums):
    return [x * x for x in nums]`,
    java: `public int[] square_each(int[] nums) {
    int[] r = new int[nums.length];
    for (int i = 0; i < nums.length; i++) r[i] = nums[i] * nums[i];
    return r;
}`,
    cpp: `vector<int> square_each(vector<int> nums) {
    for (auto& x : nums) x = x * x;
    return nums;
}`,
  },

  'Filter Positives': {
    python: `def filter_positives(nums):
    return [x for x in nums if x > 0]`,
    java: `public int[] filter_positives(int[] nums) {
    int c = 0;
    for (int x : nums) if (x > 0) c++;
    int[] r = new int[c];
    int j = 0;
    for (int x : nums) if (x > 0) r[j++] = x;
    return r;
}`,
    cpp: `vector<int> filter_positives(vector<int> nums) {
    vector<int> r;
    for (int x : nums) if (x > 0) r.push_back(x);
    return r;
}`,
  },

  'Filter Evens': {
    python: `def filter_evens(nums):
    return [x for x in nums if x % 2 == 0]`,
    java: `public int[] filter_evens(int[] nums) {
    int c = 0;
    for (int x : nums) if (x % 2 == 0) c++;
    int[] r = new int[c];
    int j = 0;
    for (int x : nums) if (x % 2 == 0) r[j++] = x;
    return r;
}`,
    cpp: `vector<int> filter_evens(vector<int> nums) {
    vector<int> r;
    for (int x : nums) if (x % 2 == 0) r.push_back(x);
    return r;
}`,
  },

  'Running Sum': {
    python: `def running_sum(nums):
    r, s = [], 0
    for x in nums:
        s += x
        r.append(s)
    return r`,
    java: `public int[] running_sum(int[] nums) {
    int[] r = new int[nums.length];
    int s = 0;
    for (int i = 0; i < nums.length; i++) { s += nums[i]; r[i] = s; }
    return r;
}`,
    cpp: `vector<int> running_sum(vector<int> nums) {
    int s = 0;
    for (auto& x : nums) { s += x; x = s; }
    return nums;
}`,
  },

  'Replace Negatives': {
    python: `def replace_negatives(nums):
    return [0 if x < 0 else x for x in nums]`,
    java: `public int[] replace_negatives(int[] nums) {
    int[] r = new int[nums.length];
    for (int i = 0; i < nums.length; i++) r[i] = nums[i] < 0 ? 0 : nums[i];
    return r;
}`,
    cpp: `vector<int> replace_negatives(vector<int> nums) {
    for (auto& x : nums) if (x < 0) x = 0;
    return nums;
}`,
  },

  'Cumulative Max': {
    python: `def cumulative_max(nums):
    r, m = [], None
    for x in nums:
        m = x if m is None else (m if m > x else x)
        r.append(m)
    return r`,
    java: `public int[] cumulative_max(int[] nums) {
    int[] r = new int[nums.length];
    int m = 0;
    for (int i = 0; i < nums.length; i++) {
        if (i == 0 || nums[i] > m) m = nums[i];
        r[i] = m;
    }
    return r;
}`,
    cpp: `vector<int> cumulative_max(vector<int> nums) {
    int m = 0;
    for (int i = 0; i < (int)nums.size(); i++) {
        if (i == 0 || nums[i] > m) m = nums[i];
        nums[i] = m;
    }
    return nums;
}`,
  },

  'Concat Self': {
    python: `def concat_self(nums):
    return nums + nums`,
    java: `public int[] concat_self(int[] nums) {
    int n = nums.length;
    int[] r = new int[n * 2];
    for (int i = 0; i < n; i++) { r[i] = nums[i]; r[i + n] = nums[i]; }
    return r;
}`,
    cpp: `vector<int> concat_self(vector<int> nums) {
    vector<int> r(nums);
    for (int x : nums) r.push_back(x);
    return r;
}`,
  },

  'Count Occurrences': {
    python: `def count_occurrences(nums, target):
    return sum(1 for x in nums if x == target)`,
    java: `public int count_occurrences(int[] nums, int target) {
    int c = 0;
    for (int x : nums) if (x == target) c++;
    return c;
}`,
    cpp: `int count_occurrences(vector<int> nums, int target) {
    int c = 0;
    for (int x : nums) if (x == target) c++;
    return c;
}`,
  },

  // ─── Wave 6: final easy (mixed shapes) ───────────────────────────────────

  'Multiply All By K': {
    python: `def multiply_all(nums, k):
    return [x * k for x in nums]`,
    java: `public int[] multiply_all(int[] nums, int k) {
    int[] r = new int[nums.length];
    for (int i = 0; i < nums.length; i++) r[i] = nums[i] * k;
    return r;
}`,
    cpp: `vector<int> multiply_all(vector<int> nums, int k) {
    for (auto& x : nums) x *= k;
    return nums;
}`,
  },

  'Index Of': {
    python: `def index_of(nums, target):
    for i, x in enumerate(nums):
        if x == target: return i
    return -1`,
    java: `public int index_of(int[] nums, int target) {
    for (int i = 0; i < nums.length; i++)
        if (nums[i] == target) return i;
    return -1;
}`,
    cpp: `int index_of(vector<int> nums, int target) {
    for (int i = 0; i < (int)nums.size(); i++)
        if (nums[i] == target) return i;
    return -1;
}`,
  },

  'Equal Ignore Case': {
    python: `def equal_ignore_case(a, b):
    return a.lower() == b.lower()`,
    java: `public boolean equal_ignore_case(String a, String b) {
    return a.equalsIgnoreCase(b);
}`,
    cpp: `bool equal_ignore_case(string a, string b) {
    if (a.size() != b.size()) return false;
    for (int i = 0; i < (int)a.size(); i++) {
        char x = a[i], y = b[i];
        if (x >= 'A' && x <= 'Z') x += 32;
        if (y >= 'A' && y <= 'Z') y += 32;
        if (x != y) return false;
    }
    return true;
}`,
  },

  'Starts With': {
    python: `def starts_with(s, p):
    return s.startswith(p)`,
    java: `public boolean starts_with(String s, String p) {
    return s.startsWith(p);
}`,
    cpp: `bool starts_with(string s, string p) {
    if (p.size() > s.size()) return false;
    return s.compare(0, p.size(), p) == 0;
}`,
  },

  'Ends With': {
    python: `def ends_with(s, p):
    return s.endswith(p)`,
    java: `public boolean ends_with(String s, String p) {
    return s.endsWith(p);
}`,
    cpp: `bool ends_with(string s, string p) {
    if (p.size() > s.size()) return false;
    return s.compare(s.size() - p.size(), p.size(), p) == 0;
}`,
  },

  'Longest String': {
    python: `def longest_string(words):
    best = words[0]
    for w in words:
        if len(w) > len(best): best = w
    return best`,
    java: `public String longest_string(String[] words) {
    String best = words[0];
    for (String w : words) if (w.length() > best.length()) best = w;
    return best;
}`,
    cpp: `string longest_string(vector<string> words) {
    string best = words[0];
    for (auto& w : words) if (w.size() > best.size()) best = w;
    return best;
}`,
  },

  'Shortest String': {
    python: `def shortest_string(words):
    best = words[0]
    for w in words:
        if len(w) < len(best): best = w
    return best`,
    java: `public String shortest_string(String[] words) {
    String best = words[0];
    for (String w : words) if (w.length() < best.length()) best = w;
    return best;
}`,
    cpp: `string shortest_string(vector<string> words) {
    string best = words[0];
    for (auto& w : words) if (w.size() < best.size()) best = w;
    return best;
}`,
  },

  'Matrix Sum': {
    python: `def matrix_sum(m):
    return sum(sum(row) for row in m)`,
    java: `public int matrix_sum(int[][] m) {
    int s = 0;
    for (int[] row : m) for (int x : row) s += x;
    return s;
}`,
    cpp: `int matrix_sum(vector<vector<int>> m) {
    int s = 0;
    for (auto& row : m) for (int x : row) s += x;
    return s;
}`,
  },

  'Matrix Diagonal Sum': {
    python: `def diagonal_sum(m):
    return sum(m[i][i] for i in range(len(m)))`,
    java: `public int diagonal_sum(int[][] m) {
    int s = 0;
    for (int i = 0; i < m.length; i++) s += m[i][i];
    return s;
}`,
    cpp: `int diagonal_sum(vector<vector<int>> m) {
    int s = 0;
    for (int i = 0; i < (int)m.size(); i++) s += m[i][i];
    return s;
}`,
  },

  'Power of Three': {
    python: `def is_power_of_three(n):
    if n < 1: return False
    while n > 1:
        if n % 3 != 0: return False
        n //= 3
    return True`,
    java: `public boolean is_power_of_three(long n) {
    if (n < 1) return false;
    while (n > 1) {
        if (n % 3 != 0) return false;
        n /= 3;
    }
    return true;
}`,
    cpp: `bool is_power_of_three(long long n) {
    if (n < 1) return false;
    while (n > 1) {
        if (n % 3 != 0) return false;
        n /= 3;
    }
    return true;
}`,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MEDIUM REFERENCE SOLUTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  'Happy Number': {
    python: `def is_happy(n):
    seen = set()
    while n != 1 and n not in seen:
        seen.add(n)
        s = 0
        while n > 0:
            d = n % 10
            s += d * d
            n //= 10
        n = s
    return n == 1`,
    java: `public boolean is_happy(long n) {
    java.util.HashSet<Long> seen = new java.util.HashSet<>();
    while (n != 1 && !seen.contains(n)) {
        seen.add(n);
        long s = 0;
        while (n > 0) { long d = n % 10; s += d * d; n /= 10; }
        n = s;
    }
    return n == 1;
}`,
    cpp: `bool is_happy(long long n) {
    unordered_set<long long> seen;
    while (n != 1 && !seen.count(n)) {
        seen.insert(n);
        long long s = 0;
        while (n > 0) { long long d = n % 10; s += d * d; n /= 10; }
        n = s;
    }
    return n == 1;
}`,
  },

  'Reverse Integer': {
    python: `def reverse_integer(n):
    sign = -1 if n < 0 else 1
    n = abs(n)
    r = 0
    while n > 0:
        r = r * 10 + n % 10
        n //= 10
    return sign * r`,
    java: `public long reverse_integer(long n) {
    long sign = n < 0 ? -1 : 1;
    n = Math.abs(n);
    long r = 0;
    while (n > 0) { r = r * 10 + n % 10; n /= 10; }
    return sign * r;
}`,
    cpp: `long long reverse_integer(long long n) {
    long long sign = n < 0 ? -1 : 1;
    if (n < 0) n = -n;
    long long r = 0;
    while (n > 0) { r = r * 10 + n % 10; n /= 10; }
    return sign * r;
}`,
  },

  'Missing Number': {
    python: `def missing_number(nums):
    n = len(nums)
    return n * (n + 1) // 2 - sum(nums)`,
    java: `public long missing_number(int[] nums) {
    long n = nums.length;
    long total = n * (n + 1) / 2;
    long s = 0;
    for (int x : nums) s += x;
    return total - s;
}`,
    cpp: `long long missing_number(vector<int> nums) {
    long long n = nums.size();
    long long total = n * (n + 1) / 2;
    long long s = 0;
    for (int x : nums) s += x;
    return total - s;
}`,
  },

  'Single Number': {
    python: `def single_number(nums):
    r = 0
    for x in nums: r ^= x
    return r`,
    java: `public long single_number(int[] nums) {
    long r = 0;
    for (int x : nums) r ^= x;
    return r;
}`,
    cpp: `long long single_number(vector<int> nums) {
    long long r = 0;
    for (int x : nums) r ^= x;
    return r;
}`,
  },

  'Majority Element': {
    python: `def majority_element(nums):
    count, cand = 0, None
    for x in nums:
        if count == 0: cand = x
        count += 1 if x == cand else -1
    return cand`,
    java: `public long majority_element(int[] nums) {
    int count = 0, cand = 0;
    for (int x : nums) {
        if (count == 0) cand = x;
        count += (x == cand) ? 1 : -1;
    }
    return cand;
}`,
    cpp: `long long majority_element(vector<int> nums) {
    int count = 0, cand = 0;
    for (int x : nums) {
        if (count == 0) cand = x;
        count += (x == cand) ? 1 : -1;
    }
    return cand;
}`,
  },

  'Count Primes': {
    python: `def count_primes(n):
    if n < 2: return 0
    sieve = [True] * n
    sieve[0] = sieve[1] = False
    for i in range(2, int(n ** 0.5) + 1):
        if sieve[i]:
            for j in range(i * i, n, i): sieve[j] = False
    return sum(sieve)`,
    java: `public long count_primes(long n) {
    if (n < 2) return 0;
    boolean[] sieve = new boolean[(int)n];
    java.util.Arrays.fill(sieve, true);
    sieve[0] = sieve[1] = false;
    for (int i = 2; (long)i * i < n; i++) {
        if (sieve[i])
            for (int j = i * i; j < n; j += i) sieve[j] = false;
    }
    long c = 0;
    for (boolean b : sieve) if (b) c++;
    return c;
}`,
    cpp: `long long count_primes(long long n) {
    if (n < 2) return 0;
    vector<bool> sieve(n, true);
    sieve[0] = sieve[1] = false;
    for (long long i = 2; i * i < n; i++) {
        if (sieve[i])
            for (long long j = i * i; j < n; j += i) sieve[j] = false;
    }
    long long c = 0;
    for (bool b : sieve) if (b) c++;
    return c;
}`,
  },

  'Power': {
    python: `def power(base, exp):
    r = 1
    while exp > 0:
        if exp & 1: r *= base
        base *= base
        exp >>= 1
    return r`,
    java: `public long power(long base, long exp) {
    long r = 1;
    while (exp > 0) {
        if ((exp & 1) == 1) r *= base;
        base *= base;
        exp >>= 1;
    }
    return r;
}`,
    cpp: `long long power(long long base, long long exp) {
    long long r = 1;
    while (exp > 0) {
        if (exp & 1) r *= base;
        base *= base;
        exp >>= 1;
    }
    return r;
}`,
  },

  'Add Digits': {
    python: `def add_digits(n):
    if n == 0: return 0
    return 1 + (n - 1) % 9`,
    java: `public long add_digits(long n) {
    if (n == 0) return 0;
    return 1 + (n - 1) % 9;
}`,
    cpp: `long long add_digits(long long n) {
    if (n == 0) return 0;
    return 1 + (n - 1) % 9;
}`,
  },

  'Max Product of Three': {
    python: `def max_product_three(nums):
    nums = sorted(nums)
    return max(nums[-1] * nums[-2] * nums[-3], nums[0] * nums[1] * nums[-1])`,
    java: `public long max_product_three(int[] nums) {
    int[] a = nums.clone();
    java.util.Arrays.sort(a);
    int n = a.length;
    long p1 = (long)a[n-1] * a[n-2] * a[n-3];
    long p2 = (long)a[0] * a[1] * a[n-1];
    return Math.max(p1, p2);
}`,
    cpp: `long long max_product_three(vector<int> nums) {
    sort(nums.begin(), nums.end());
    int n = nums.size();
    long long p1 = (long long)nums[n-1] * nums[n-2] * nums[n-3];
    long long p2 = (long long)nums[0] * nums[1] * nums[n-1];
    return max(p1, p2);
}`,
  },

  'Hamming Distance': {
    python: `def hamming_distance(x, y):
    z = x ^ y
    c = 0
    while z > 0:
        c += z & 1
        z >>= 1
    return c`,
    java: `public long hamming_distance(long x, long y) {
    long z = x ^ y, c = 0;
    while (z > 0) { c += z & 1; z >>= 1; }
    return c;
}`,
    cpp: `long long hamming_distance(long long x, long long y) {
    long long z = x ^ y, c = 0;
    while (z > 0) { c += z & 1; z >>= 1; }
    return c;
}`,
  },

  'Max Subarray Sum': {
    python: `def max_subarray(nums):
    best = nums[0]
    current = nums[0]
    for i in range(1, len(nums)):
        current = max(nums[i], current + nums[i])
        best = max(best, current)
    return best`,
    java: `public long max_subarray(int[] nums) {
    long best = nums[0], current = nums[0];
    for (int i = 1; i < nums.length; i++) {
        current = Math.max(nums[i], current + nums[i]);
        best = Math.max(best, current);
    }
    return best;
}`,
    cpp: `long long max_subarray(vector<int> nums) {
    long long best = nums[0], current = nums[0];
    for (int i = 1; i < nums.size(); i++) {
        current = max((long long)nums[i], current + nums[i]);
        best = max(best, current);
    }
    return best;
}`,
  },

  'Product Except Self': {
    python: `def product_except_self(nums):
    n = len(nums)
    out = [1] * n
    prefix = 1
    for i in range(n):
        out[i] = prefix
        prefix *= nums[i]
    suffix = 1
    for i in range(n - 1, -1, -1):
        out[i] *= suffix
        suffix *= nums[i]
    return out`,
    java: `public int[] product_except_self(int[] nums) {
    int n = nums.length;
    int[] out = new int[n];
    out[0] = 1;
    for (int i = 1; i < n; i++)
        out[i] = out[i-1] * nums[i-1];
    int suffix = 1;
    for (int i = n - 1; i >= 0; i--) {
        out[i] *= suffix;
        suffix *= nums[i];
    }
    return out;
}`,
    cpp: `vector<int> product_except_self(vector<int> nums) {
    int n = nums.size();
    vector<int> out(n, 1);
    for (int i = 1; i < n; i++)
        out[i] = out[i-1] * nums[i-1];
    int suffix = 1;
    for (int i = n - 1; i >= 0; i--) {
        out[i] *= suffix;
        suffix *= nums[i];
    }
    return out;
}`,
  },

  'Move Zeros': {
    python: `def move_zeros(nums):
    out = []
    zeros = 0
    for x in nums:
        if x == 0:
            zeros += 1
        else:
            out.append(x)
    out.extend([0] * zeros)
    return out`,
    java: `public int[] move_zeros(int[] nums) {
    int[] out = new int[nums.length];
    int idx = 0;
    for (int x : nums) {
        if (x != 0) out[idx++] = x;
    }
    return out;
}`,
    cpp: `vector<int> move_zeros(vector<int> nums) {
    vector<int> out;
    for (int x : nums)
        if (x != 0) out.push_back(x);
    while (out.size() < nums.size())
        out.push_back(0);
    return out;
}`,
  },

  'Plus One': {
    python: `def plus_one(digits):
    n = len(digits)
    for i in range(n - 1, -1, -1):
        if digits[i] < 9:
            digits[i] += 1
            return digits
        digits[i] = 0
    return [1] + digits`,
    java: `public int[] plus_one(int[] digits) {
    int n = digits.length;
    for (int i = n - 1; i >= 0; i--) {
        if (digits[i] < 9) {
            digits[i]++;
            return digits;
        }
        digits[i] = 0;
    }
    int[] out = new int[n + 1];
    out[0] = 1;
    return out;
}`,
    cpp: `vector<int> plus_one(vector<int> digits) {
    int n = digits.size();
    for (int i = n - 1; i >= 0; i--) {
        if (digits[i] < 9) {
            digits[i]++;
            return digits;
        }
        digits[i] = 0;
    }
    vector<int> out(n + 1, 0);
    out[0] = 1;
    return out;
}`,
  },

  'Rotate Array': {
    python: `def rotate_array(nums, k):
    k = k % len(nums) if nums else 0
    return nums[-k:] + nums[:-k] if k else nums`,
    java: `public int[] rotate_array(int[] nums, int k) {
    if (nums.length == 0) return nums;
    k = k % nums.length;
    int[] out = new int[nums.length];
    for (int i = 0; i < nums.length; i++)
        out[i] = nums[(nums.length - k + i) % nums.length];
    return out;
}`,
    cpp: `vector<int> rotate_array(vector<int> nums, int k) {
    if (nums.empty()) return nums;
    k = k % nums.size();
    vector<int> out(nums.size());
    for (int i = 0; i < nums.size(); i++)
        out[i] = nums[(nums.size() - k + i) % nums.size()];
    return out;
}`,
  },

  'Sliding Window Max Sum': {
    python: `def window_max_sum(nums, k):
    if not nums or k > len(nums):
        return 0
    window_sum = sum(nums[:k])
    max_sum = window_sum
    for i in range(k, len(nums)):
        window_sum = window_sum - nums[i - k] + nums[i]
        max_sum = max(max_sum, window_sum)
    return max_sum`,
    java: `public int window_max_sum(int[] nums, int k) {
    if (nums.length == 0 || k > nums.length) return 0;
    int sum = 0;
    for (int i = 0; i < k; i++) sum += nums[i];
    int max_sum = sum;
    for (int i = k; i < nums.length; i++) {
        sum = sum - nums[i - k] + nums[i];
        max_sum = Math.max(max_sum, sum);
    }
    return max_sum;
}`,
    cpp: `int window_max_sum(vector<int> nums, int k) {
    if (nums.empty() || k > nums.size()) return 0;
    int sum = 0;
    for (int i = 0; i < k; i++) sum += nums[i];
    int max_sum = sum;
    for (int i = k; i < nums.size(); i++) {
        sum = sum - nums[i - k] + nums[i];
        max_sum = max(max_sum, sum);
    }
    return max_sum;
}`,
  },

  'Jump Game': {
    python: `def jump_game(nums):
    farthest = 0
    for i in range(len(nums)):
        if i > farthest:
            return False
        farthest = max(farthest, i + nums[i])
    return True`,
    java: `public boolean jump_game(int[] nums) {
    int farthest = 0;
    for (int i = 0; i < nums.length; i++) {
        if (i > farthest) return false;
        farthest = Math.max(farthest, i + nums[i]);
    }
    return true;
}`,
    cpp: `bool jump_game(vector<int> nums) {
    int farthest = 0;
    for (int i = 0; i < nums.size(); i++) {
        if (i > farthest) return false;
        farthest = max(farthest, i + nums[i]);
    }
    return true;
}`,
  },

  'Valid Mountain Array': {
    python: `def valid_mountain(nums):
    n = len(nums)
    if n < 3:
        return False
    i = 0
    while i + 1 < n and nums[i] < nums[i + 1]:
        i += 1
    if i == 0 or i == n - 1:
        return False
    while i + 1 < n and nums[i] > nums[i + 1]:
        i += 1
    return i == n - 1`,
    java: `public boolean valid_mountain(int[] nums) {
    int n = nums.length;
    if (n < 3) return false;
    int i = 0;
    while (i + 1 < n && nums[i] < nums[i + 1]) i++;
    if (i == 0 || i == n - 1) return false;
    while (i + 1 < n && nums[i] > nums[i + 1]) i++;
    return i == n - 1;
}`,
    cpp: `bool valid_mountain(vector<int> nums) {
    int n = nums.size();
    if (n < 3) return false;
    int i = 0;
    while (i + 1 < n && nums[i] < nums[i + 1]) i++;
    if (i == 0 || i == n - 1) return false;
    while (i + 1 < n && nums[i] > nums[i + 1]) i++;
    return i == n - 1;
}`,
  },

  'Kth Largest Element': {
    python: `def kth_largest(nums, k):
    nums.sort(reverse=True)
    return nums[k - 1]`,
    java: `public int kth_largest(int[] nums, int k) {
    int[] a = nums.clone();
    java.util.Arrays.sort(a);
    return a[a.length - k];
}`,
    cpp: `int kth_largest(vector<int> nums, int k) {
    sort(nums.begin(), nums.end(), greater<int>());
    return nums[k - 1];
}`,
  },

  'Two Sum Sorted': {
    python: `def two_sum_sorted(nums, target):
    left, right = 0, len(nums) - 1
    while left < right:
        s = nums[left] + nums[right]
        if s == target:
            return [left + 1, right + 1]
        elif s < target:
            left += 1
        else:
            right -= 1
    return []`,
    java: `public int[] two_sum_sorted(int[] nums, int target) {
    int left = 0, right = nums.length - 1;
    while (left < right) {
        int sum = nums[left] + nums[right];
        if (sum == target) return new int[]{left + 1, right + 1};
        else if (sum < target) left++;
        else right--;
    }
    return new int[]{};
}`,
    cpp: `vector<int> two_sum_sorted(vector<int> nums, int target) {
    int left = 0, right = nums.size() - 1;
    while (left < right) {
        int sum = nums[left] + nums[right];
        if (sum == target) return {left + 1, right + 1};
        else if (sum < target) left++;
        else right--;
    }
    return {};
}`,
  },

  'Longest Common Prefix': {
    python: `def longest_common_prefix(strs):
    if not strs:
        return ""
    for i in range(len(strs[0])):
        c = strs[0][i]
        for j in range(1, len(strs)):
            if i >= len(strs[j]) or strs[j][i] != c:
                return strs[0][:i]
    return strs[0]`,
    java: `public String longest_common_prefix(String[] strs) {
    if (strs.length == 0) return "";
    for (int i = 0; i < strs[0].length(); i++) {
        char c = strs[0].charAt(i);
        for (int j = 1; j < strs.length; j++) {
            if (i >= strs[j].length() || strs[j].charAt(i) != c)
                return strs[0].substring(0, i);
        }
    }
    return strs[0];
}`,
    cpp: `string longest_common_prefix(vector<string> strs) {
    if (strs.empty()) return "";
    for (int i = 0; i < strs[0].size(); i++) {
        char c = strs[0][i];
        for (int j = 1; j < strs.size(); j++) {
            if (i >= strs[j].size() || strs[j][i] != c)
                return strs[0].substr(0, i);
        }
    }
    return strs[0];
}`,
  },

  'Longest Substring Without Repeat': {
    python: `def longest_substring_no_repeat(s):
    char_idx = {}
    max_len = 0
    start = 0
    for i, c in enumerate(s):
        if c in char_idx and char_idx[c] >= start:
            start = char_idx[c] + 1
        char_idx[c] = i
        max_len = max(max_len, i - start + 1)
    return max_len`,
    java: `public long longest_substring_no_repeat(String s) {
    java.util.Map<Character, Integer> map = new java.util.HashMap<>();
    long max_len = 0;
    int start = 0;
    for (int i = 0; i < s.length(); i++) {
        char c = s.charAt(i);
        if (map.containsKey(c) && map.get(c) >= start)
            start = map.get(c) + 1;
        map.put(c, i);
        max_len = Math.max(max_len, i - start + 1);
    }
    return max_len;
}`,
    cpp: `long long longest_substring_no_repeat(string s) {
    unordered_map<char, int> mp;
    long long max_len = 0;
    int start = 0;
    for (int i = 0; i < s.size(); i++) {
        if (mp.find(s[i]) != mp.end() && mp[s[i]] >= start)
            start = mp[s[i]] + 1;
        mp[s[i]] = i;
        max_len = max(max_len, (long long)(i - start + 1));
    }
    return max_len;
}`,
  },

  'String Compression': {
    python: `def compress_string(s):
    if not s:
        return ""
    out = []
    i = 0
    while i < len(s):
        c = s[i]
        count = 0
        while i < len(s) and s[i] == c:
            count += 1
            i += 1
        out.append(c)
        if count > 1:
            out.append(str(count))
    return "".join(out)`,
    java: `public String compress_string(String s) {
    if (s.isEmpty()) return "";
    StringBuilder out = new StringBuilder();
    int i = 0;
    while (i < s.length()) {
        char c = s.charAt(i);
        int count = 0;
        while (i < s.length() && s.charAt(i) == c) {
            count++;
            i++;
        }
        out.append(c);
        if (count > 1) out.append(count);
    }
    return out.toString();
}`,
    cpp: `string compress_string(string s) {
    if (s.empty()) return "";
    string out = "";
    int i = 0;
    while (i < s.size()) {
        char c = s[i];
        int count = 0;
        while (i < s.size() && s[i] == c) {
            count++;
            i++;
        }
        out += c;
        if (count > 1) out += to_string(count);
    }
    return out;
}`,
  },

  'Isomorphic Strings': {
    python: `def isomorphic_strings(s, t):
    if len(s) != len(t):
        return False
    s_to_t = {}
    t_to_s = {}
    for c1, c2 in zip(s, t):
        if c1 in s_to_t:
            if s_to_t[c1] != c2:
                return False
        else:
            s_to_t[c1] = c2
        if c2 in t_to_s:
            if t_to_s[c2] != c1:
                return False
        else:
            t_to_s[c2] = c1
    return True`,
    java: `public boolean isomorphic_strings(String s, String t) {
    if (s.length() != t.length()) return false;
    java.util.Map<Character, Character> st = new java.util.HashMap<>();
    java.util.Map<Character, Character> ts = new java.util.HashMap<>();
    for (int i = 0; i < s.length(); i++) {
        char c1 = s.charAt(i), c2 = t.charAt(i);
        if (st.containsKey(c1) && st.get(c1) != c2) return false;
        if (ts.containsKey(c2) && ts.get(c2) != c1) return false;
        st.put(c1, c2);
        ts.put(c2, c1);
    }
    return true;
}`,
    cpp: `bool isomorphic_strings(string s, string t) {
    if (s.size() != t.size()) return false;
    unordered_map<char, char> st, ts;
    for (int i = 0; i < s.size(); i++) {
        if (st.count(s[i]) && st[s[i]] != t[i]) return false;
        if (ts.count(t[i]) && ts[t[i]] != s[i]) return false;
        st[s[i]] = t[i];
        ts[t[i]] = s[i];
    }
    return true;
}`,
  },

  'Word Pattern': {
    python: `def word_pattern(pattern, words):
    if len(pattern) != len(words):
        return False
    p_to_w = {}
    w_to_p = {}
    for p, w in zip(pattern, words):
        if p in p_to_w:
            if p_to_w[p] != w:
                return False
        else:
            p_to_w[p] = w
        if w in w_to_p:
            if w_to_p[w] != p:
                return False
        else:
            w_to_p[w] = p
    return True`,
    java: `public boolean word_pattern(String pattern, String[] words) {
    if (pattern.length() != words.length) return false;
    java.util.Map<Character, String> pw = new java.util.HashMap<>();
    java.util.Map<String, Character> wp = new java.util.HashMap<>();
    for (int i = 0; i < pattern.length(); i++) {
        char p = pattern.charAt(i);
        String w = words[i];
        if (pw.containsKey(p) && !pw.get(p).equals(w)) return false;
        if (wp.containsKey(w) && wp.get(w) != p) return false;
        pw.put(p, w);
        wp.put(w, p);
    }
    return true;
}`,
    cpp: `bool word_pattern(string pattern, vector<string> words) {
    if (pattern.size() != words.size()) return false;
    unordered_map<char, string> pw;
    unordered_map<string, char> wp;
    for (int i = 0; i < pattern.size(); i++) {
        char p = pattern[i];
        string w = words[i];
        if (pw.count(p) && pw[p] != w) return false;
        if (wp.count(w) && wp[w] != p) return false;
        pw[p] = w;
        wp[w] = p;
    }
    return true;
}`,
  },

  'Rotate String': {
    python: `def rotate_string(s, goal):
    return len(s) == len(goal) and goal in (s + s)`,
    java: `public boolean rotate_string(String s, String goal) {
    return s.length() == goal.length() && (s + s).contains(goal);
}`,
    cpp: `bool rotate_string(string s, string goal) {
    return s.size() == goal.size() && (s + s).find(goal) != string::npos;
}`,
  },

  'String to Integer': {
    python: `def atoi(s):
    s = s.lstrip()
    if not s:
        return 0
    sign = 1
    idx = 0
    if s[0] in ('+', '-'):
        if s[0] == '-':
            sign = -1
        idx = 1
    num = 0
    while idx < len(s) and s[idx].isdigit():
        num = num * 10 + int(s[idx])
        idx += 1
    num *= sign
    return max(-2147483648, min(2147483647, num))`,
    java: `public long atoi(String s) {
    s = s.replaceFirst("^\\\\s+", "");
    if (s.isEmpty()) return 0;
    int sign = 1, idx = 0;
    if (s.charAt(0) == '-' || s.charAt(0) == '+') {
        if (s.charAt(0) == '-') sign = -1;
        idx = 1;
    }
    long num = 0;
    while (idx < s.length() && Character.isDigit(s.charAt(idx))) {
        num = num * 10 + (s.charAt(idx) - '0');
        idx++;
    }
    num *= sign;
    return Math.max(-2147483648L, Math.min(2147483647L, num));
}`,
    cpp: `long long atoi(string s) {
    int i = 0;
    while (i < s.size() && s[i] == ' ') i++;
    if (i == s.size()) return 0;
    int sign = 1;
    if (s[i] == '-' || s[i] == '+') {
        if (s[i] == '-') sign = -1;
        i++;
    }
    long long num = 0;
    while (i < s.size() && isdigit(s[i])) {
        num = num * 10 + (s[i] - '0');
        i++;
    }
    num *= sign;
    return max(-2147483648LL, min(2147483647LL, num));
}`,
  },

  'First Unique Character': {
    python: `def first_unique_char(s):
    from collections import Counter
    counts = Counter(s)
    for i, c in enumerate(s):
        if counts[c] == 1:
            return i
    return -1`,
    java: `public long first_unique_char(String s) {
    java.util.Map<Character, Integer> map = new java.util.HashMap<>();
    for (char c : s.toCharArray())
        map.put(c, map.getOrDefault(c, 0) + 1);
    for (int i = 0; i < s.length(); i++)
        if (map.get(s.charAt(i)) == 1) return i;
    return -1;
}`,
    cpp: `long long first_unique_char(string s) {
    unordered_map<char, int> mp;
    for (char c : s) mp[c]++;
    for (int i = 0; i < s.size(); i++)
        if (mp[s[i]] == 1) return i;
    return -1;
}`,
  },

  'Group Anagrams Count': {
    python: `def group_anagrams_count(strs):
    from collections import defaultdict
    groups = defaultdict(set)
    for w in strs:
        key = "".join(sorted(w))
        groups[key].add(w)
    return len(groups)`,
    java: `public long group_anagrams_count(String[] strs) {
    java.util.Map<String, Integer> map = new java.util.HashMap<>();
    for (String w : strs) {
        char[] ch = w.toCharArray();
        java.util.Arrays.sort(ch);
        String key = new String(ch);
        map.put(key, map.getOrDefault(key, 0) + 1);
    }
    return map.size();
}`,
    cpp: `long long group_anagrams_count(vector<string> strs) {
    unordered_map<string, int> mp;
    for (string w : strs) {
        sort(w.begin(), w.end());
        mp[w]++;
    }
    return mp.size();
}`,
  },

  'Unique Paths': {
    python: `def unique_paths(m, n):
    dp = [[1] * n for _ in range(m)]
    for i in range(1, m):
        for j in range(1, n):
            dp[i][j] = dp[i - 1][j] + dp[i][j - 1]
    return dp[m - 1][n - 1]`,
    java: `public long unique_paths(long m, long n) {
    long[][] dp = new long[(int)m][(int)n];
    for (int i = 0; i < m; i++) {
        for (int j = 0; j < n; j++) {
            if (i == 0 || j == 0) dp[i][j] = 1;
            else dp[i][j] = dp[i - 1][j] + dp[i][j - 1];
        }
    }
    return dp[(int)m - 1][(int)n - 1];
}`,
    cpp: `long long unique_paths(long long m, long long n) {
    vector<vector<long long>> dp(m, vector<long long>(n, 1));
    for (int i = 1; i < m; i++) {
        for (int j = 1; j < n; j++) {
            dp[i][j] = dp[i - 1][j] + dp[i][j - 1];
        }
    }
    return dp[m - 1][n - 1];
}`,
  },

  'Trapping Rain Water': {
    python: `def trap_rain_water(heights):
    if not heights:
        return 0
    n = len(heights)
    left_max = [0] * n
    right_max = [0] * n
    left_max[0] = heights[0]
    for i in range(1, n):
        left_max[i] = max(left_max[i - 1], heights[i])
    right_max[n - 1] = heights[n - 1]
    for i in range(n - 2, -1, -1):
        right_max[i] = max(right_max[i + 1], heights[i])
    water = 0
    for i in range(n):
        water += min(left_max[i], right_max[i]) - heights[i]
    return water`,
    java: `public long trap_rain_water(int[] heights) {
    if (heights.length == 0) return 0;
    int n = heights.length;
    int[] left_max = new int[n], right_max = new int[n];
    left_max[0] = heights[0];
    for (int i = 1; i < n; i++)
        left_max[i] = Math.max(left_max[i - 1], heights[i]);
    right_max[n - 1] = heights[n - 1];
    for (int i = n - 2; i >= 0; i--)
        right_max[i] = Math.max(right_max[i + 1], heights[i]);
    long water = 0;
    for (int i = 0; i < n; i++)
        water += Math.min(left_max[i], right_max[i]) - heights[i];
    return water;
}`,
    cpp: `long long trap_rain_water(vector<int> heights) {
    if (heights.empty()) return 0;
    int n = heights.size();
    vector<int> left_max(n), right_max(n);
    left_max[0] = heights[0];
    for (int i = 1; i < n; i++)
        left_max[i] = max(left_max[i - 1], heights[i]);
    right_max[n - 1] = heights[n - 1];
    for (int i = n - 2; i >= 0; i--)
        right_max[i] = max(right_max[i + 1], heights[i]);
    long long water = 0;
    for (int i = 0; i < n; i++)
        water += min(left_max[i], right_max[i]) - heights[i];
    return water;
}`,
  },

  'Edit Distance': {
    python: `def edit_distance(word1, word2):
    m, n = len(word1), len(word2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1):
        dp[i][0] = i
    for j in range(n + 1):
        dp[0][j] = j
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if word1[i - 1] == word2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = 1 + min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    return dp[m][n]`,
    java: `public long edit_distance(String word1, String word2) {
    int m = word1.length(), n = word2.length();
    int[][] dp = new int[m + 1][n + 1];
    for (int i = 0; i <= m; i++) dp[i][0] = i;
    for (int j = 0; j <= n; j++) dp[0][j] = j;
    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (word1.charAt(i - 1) == word2.charAt(j - 1))
                dp[i][j] = dp[i - 1][j - 1];
            else
                dp[i][j] = 1 + Math.min(dp[i - 1][j], Math.min(dp[i][j - 1], dp[i - 1][j - 1]));
        }
    }
    return dp[m][n];
}`,
    cpp: `long long edit_distance(string word1, string word2) {
    int m = word1.size(), n = word2.size();
    vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));
    for (int i = 0; i <= m; i++) dp[i][0] = i;
    for (int j = 0; j <= n; j++) dp[0][j] = j;
    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (word1[i - 1] == word2[j - 1])
                dp[i][j] = dp[i - 1][j - 1];
            else
                dp[i][j] = 1 + min({dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]});
        }
    }
    return dp[m][n];
}`,
  },

  'Longest Palindromic Substring Length': {
    python: `def longest_palindromic_length(s):
    if not s:
        return 0
    def expand(l, r):
        while l >= 0 and r < len(s) and s[l] == s[r]:
            l -= 1
            r += 1
        return r - l - 1
    max_len = 0
    for i in range(len(s)):
        len1 = expand(i, i)
        len2 = expand(i, i + 1)
        max_len = max(max_len, len1, len2)
    return max_len`,
    java: `public long longest_palindromic_length(String s) {
    if (s.isEmpty()) return 0;
    int max_len = 0;
    for (int i = 0; i < s.length(); i++) {
        int len1 = expand(s, i, i);
        int len2 = expand(s, i, i + 1);
        max_len = Math.max(max_len, Math.max(len1, len2));
    }
    return max_len;
}
private int expand(String s, int l, int r) {
    while (l >= 0 && r < s.length() && s.charAt(l) == s.charAt(r)) {
        l--;
        r++;
    }
    return r - l - 1;
}`,
    cpp: `long long longest_palindromic_length(string s) {
    if (s.empty()) return 0;
    auto expand = [&](int l, int r) {
        while (l >= 0 && r < s.size() && s[l] == s[r]) {
            l--;
            r++;
        }
        return r - l - 1;
    };
    int max_len = 0;
    for (int i = 0; i < s.size(); i++) {
        max_len = max({max_len, expand(i, i), expand(i, i + 1)});
    }
    return max_len;
}`,
  },

  'Longest Valid Parentheses': {
    python: `def longest_valid_parens(s):
    dp = [0] * len(s)
    max_len = 0
    for i in range(1, len(s)):
        if s[i] == ')':
            if s[i - 1] == '(':
                dp[i] = (dp[i - 2] if i >= 2 else 0) + 2
            elif dp[i - 1] > 0:
                if i - dp[i - 1] - 1 >= 0 and s[i - dp[i - 1] - 1] == '(':
                    dp[i] = dp[i - 1] + 2 + (dp[i - dp[i - 1] - 2] if i - dp[i - 1] - 2 >= 0 else 0)
            max_len = max(max_len, dp[i])
    return max_len`,
    java: `public long longest_valid_parens(String s) {
    int[] dp = new int[s.length()];
    long max_len = 0;
    for (int i = 1; i < s.length(); i++) {
        if (s.charAt(i) == ')') {
            if (s.charAt(i - 1) == '(') {
                dp[i] = (i >= 2 ? dp[i - 2] : 0) + 2;
            } else if (dp[i - 1] > 0) {
                int left = i - dp[i - 1] - 1;
                if (left >= 0 && s.charAt(left) == '(') {
                    dp[i] = dp[i - 1] + 2 + (left > 0 ? dp[left - 1] : 0);
                }
            }
            max_len = Math.max(max_len, dp[i]);
        }
    }
    return max_len;
}`,
    cpp: `long long longest_valid_parens(string s) {
    vector<int> dp(s.size(), 0);
    long long max_len = 0;
    for (int i = 1; i < s.size(); i++) {
        if (s[i] == ')') {
            if (s[i - 1] == '(') {
                dp[i] = (i >= 2 ? dp[i - 2] : 0) + 2;
            } else if (dp[i - 1] > 0) {
                int left = i - dp[i - 1] - 1;
                if (left >= 0 && s[left] == '(') {
                    dp[i] = dp[i - 1] + 2 + (left > 0 ? dp[left - 1] : 0);
                }
            }
            max_len = max(max_len, (long long)dp[i]);
        }
    }
    return max_len;
}`,
  },

  'Sliding Window Maximum': {
    python: `def sliding_window_max(nums, k):
    from collections import deque
    dq = deque()
    out = []
    for i, x in enumerate(nums):
        while dq and dq[0][1] < i - k + 1:
            dq.popleft()
        while dq and dq[-1][0] <= x:
            dq.pop()
        dq.append((x, i))
        if i >= k - 1:
            out.append(dq[0][0])
    return out`,
    java: `public int[] sliding_window_max(int[] nums, int k) {
    java.util.Deque<Integer> dq = new java.util.LinkedList<>();
    int[] out = new int[nums.length - k + 1];
    int idx = 0;
    for (int i = 0; i < nums.length; i++) {
        while (!dq.isEmpty() && dq.peekFirst() < i - k + 1)
            dq.pollFirst();
        while (!dq.isEmpty() && nums[dq.peekLast()] <= nums[i])
            dq.pollLast();
        dq.offerLast(i);
        if (i >= k - 1)
            out[idx++] = nums[dq.peekFirst()];
    }
    return out;
}`,
    cpp: `vector<int> sliding_window_max(vector<int> nums, int k) {
    deque<int> dq;
    vector<int> out;
    for (int i = 0; i < nums.size(); i++) {
        while (!dq.empty() && dq.front() < i - k + 1)
            dq.pop_front();
        while (!dq.empty() && nums[dq.back()] <= nums[i])
            dq.pop_back();
        dq.push_back(i);
        if (i >= k - 1)
            out.push_back(nums[dq.front()]);
    }
    return out;
}`,
  },

  'Partition Equal Subset Sum': {
    python: `def partition_equal_subset(nums):
    total = sum(nums)
    if total % 2:
        return False
    target = total // 2
    dp = [False] * (target + 1)
    dp[0] = True
    for num in nums:
        for j in range(target, num - 1, -1):
            dp[j] = dp[j] or dp[j - num]
    return dp[target]`,
    java: `public boolean partition_equal_subset(int[] nums) {
    int total = 0;
    for (int x : nums) total += x;
    if (total % 2 == 1) return false;
    int target = total / 2;
    boolean[] dp = new boolean[target + 1];
    dp[0] = true;
    for (int num : nums) {
        for (int j = target; j >= num; j--)
            dp[j] = dp[j] || dp[j - num];
    }
    return dp[target];
}`,
    cpp: `bool partition_equal_subset(vector<int> nums) {
    int total = 0;
    for (int x : nums) total += x;
    if (total % 2) return false;
    int target = total / 2;
    vector<bool> dp(target + 1, false);
    dp[0] = true;
    for (int num : nums) {
        for (int j = target; j >= num; j--)
            dp[j] = dp[j] || dp[j - num];
    }
    return dp[target];
}`,
  },

  'Decode Ways': {
    python: `def decode_ways(s):
    if not s or s[0] == '0':
        return 0
    dp = [0] * len(s)
    dp[0] = 1
    for i in range(1, len(s)):
        if s[i] != '0':
            dp[i] = dp[i - 1]
        if i > 0 and 10 <= int(s[i - 1:i + 1]) <= 26:
            dp[i] += dp[i - 2] if i >= 2 else 1
    return dp[-1]`,
    java: `public long decode_ways(String s) {
    if (s.isEmpty() || s.charAt(0) == '0') return 0;
    long[] dp = new long[s.length()];
    dp[0] = 1;
    for (int i = 1; i < s.length(); i++) {
        if (s.charAt(i) != '0')
            dp[i] = dp[i - 1];
        int two = Integer.parseInt(s.substring(i - 1, i + 1));
        if (10 <= two && two <= 26)
            dp[i] += i >= 2 ? dp[i - 2] : 1;
    }
    return dp[s.length() - 1];
}`,
    cpp: `long long decode_ways(string s) {
    if (s.empty() || s[0] == '0') return 0;
    vector<long long> dp(s.size(), 0);
    dp[0] = 1;
    for (int i = 1; i < s.size(); i++) {
        if (s[i] != '0')
            dp[i] = dp[i - 1];
        int two = stoi(s.substr(i - 1, 2));
        if (10 <= two && two <= 26)
            dp[i] += i >= 2 ? dp[i - 2] : 1;
    }
    return dp[s.size() - 1];
}`,
  },

  'Regular Expression Match': {
    python: `def regex_match(s, p):
    memo = {}
    def dp(i, j):
        if (i, j) in memo:
            return memo[(i, j)]
        if j == len(p):
            return i == len(s)
        first = i < len(s) and (s[i] == p[j] or p[j] == '.')
        if j + 1 < len(p) and p[j + 1] == '*':
            res = (first and dp(i + 1, j)) or dp(i, j + 2)
        else:
            res = first and dp(i + 1, j + 1)
        memo[(i, j)] = res
        return res
    return dp(0, 0)`,
    java: `public boolean regex_match(String s, String p) {
    return dp(s, p, 0, 0, new java.util.HashMap<>());
}
private boolean dp(String s, String p, int i, int j, java.util.Map<String, Boolean> memo) {
    String key = i + "," + j;
    if (memo.containsKey(key)) return memo.get(key);
    if (j == p.length()) return i == s.length();
    boolean first = i < s.length() && (s.charAt(i) == p.charAt(j) || p.charAt(j) == '.');
    boolean result;
    if (j + 1 < p.length() && p.charAt(j + 1) == '*') {
        result = (first && dp(s, p, i + 1, j, memo)) || dp(s, p, i, j + 2, memo);
    } else {
        result = first && dp(s, p, i + 1, j + 1, memo);
    }
    memo.put(key, result);
    return result;
}`,
    cpp: `bool regex_match(string s, string p) {
    unordered_map<string, bool> memo;
    function<bool(int, int)> dp = [&](int i, int j) {
        string key = to_string(i) + "," + to_string(j);
        if (memo.count(key)) return memo[key];
        if (j == p.size()) return i == s.size();
        bool first = i < s.size() && (s[i] == p[j] || p[j] == '.');
        bool result;
        if (j + 1 < p.size() && p[j + 1] == '*') {
            result = (first && dp(i + 1, j)) || dp(i, j + 2);
        } else {
            result = first && dp(i + 1, j + 1);
        }
        return memo[key] = result;
    };
    return dp(0, 0);
}`,
  },

  'Kth Smallest in Matrix': {
    python: `def kth_smallest_matrix(matrix, k):
    import heapq
    heap = [(matrix[0][0], 0, 0)]
    visited = {(0, 0)}
    while k > 1:
        _, i, j = heapq.heappop(heap)
        for di, dj in [(0, 1), (1, 0)]:
            ni, nj = i + di, j + dj
            if ni < len(matrix) and nj < len(matrix[0]) and (ni, nj) not in visited:
                heapq.heappush(heap, (matrix[ni][nj], ni, nj))
                visited.add((ni, nj))
        k -= 1
    return heap[0][0]`,
    java: `public int kth_smallest_matrix(int[][] matrix, int k) {
    java.util.PriorityQueue<int[]> heap = new java.util.PriorityQueue<>((a, b) -> Integer.compare(a[0], b[0]));
    java.util.Set<String> visited = new java.util.HashSet<>();
    heap.offer(new int[]{matrix[0][0], 0, 0});
    visited.add("0,0");
    while (k > 1) {
        int[] cur = heap.poll();
        int i = cur[1], j = cur[2];
        for (int[] d : new int[][]{{0, 1}, {1, 0}}) {
            int ni = i + d[0], nj = j + d[1];
            if (ni < matrix.length && nj < matrix[0].length && !visited.contains(ni + "," + nj)) {
                heap.offer(new int[]{matrix[ni][nj], ni, nj});
                visited.add(ni + "," + nj);
            }
        }
        k--;
    }
    return heap.peek()[0];
}`,
    cpp: `int kth_smallest_matrix(vector<vector<int>> matrix, int k) {
    priority_queue<tuple<int,int,int>, vector<tuple<int,int,int>>, greater<tuple<int,int,int>>> heap;
    set<pair<int,int>> visited;
    heap.push({matrix[0][0], 0, 0});
    visited.insert({0, 0});
    while (k > 1) {
        auto [val, i, j] = heap.top();
        heap.pop();
        for (auto [di, dj] : vector<pair<int,int>>{{0, 1}, {1, 0}}) {
            int ni = i + di, nj = j + dj;
            if (ni < matrix.size() && nj < matrix[0].size() && !visited.count({ni, nj})) {
                heap.push({matrix[ni][nj], ni, nj});
                visited.insert({ni, nj});
            }
        }
        k--;
    }
    return get<0>(heap.top());
}`,
  },

};
