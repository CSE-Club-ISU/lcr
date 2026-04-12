import type { Language } from '../types.js';
import {
  parseAlgoSignature, parseDSSignature,
  javaType, javaReturnType, javaExtract, javaBox,
  cppType, cppExtract, cppToJson,
  type TypeName,
} from './typebridge.js';

export interface ProblemData {
  kind: 'algorithm' | 'data_structure';
  method_name: string;
  test_cases: string[];
  test_results: string[];
  param_types?: string;
  return_type?: string;
  method_signatures?: string;
}

export function getFileExtension(lang: Language): string {
  switch (lang) {
    case 'python': return '.py';
    case 'java':   return '.java';
    case 'cpp':    return '.cpp';
  }
}

export function getDockerImage(lang: Language): string {
  switch (lang) {
    case 'python': return process.env.DOCKER_IMAGE_PYTHON ?? 'python:3.12-slim';
    case 'java':   return process.env.DOCKER_IMAGE_JAVA   ?? 'eclipse-temurin:21-jdk-alpine';
    case 'cpp':    return process.env.DOCKER_IMAGE_CPP    ?? 'lcr-cpp-runner:latest';
  }
}

export function getTimeLimitMs(lang: Language): number {
  switch (lang) {
    case 'python': return parseInt(process.env.DOCKER_PYTHON_TIME_LIMIT_MS ?? '5000');
    case 'java':   return parseInt(process.env.DOCKER_JAVA_TIME_LIMIT_MS   ?? '8000');
    case 'cpp':    return parseInt(process.env.DOCKER_CPP_TIME_LIMIT_MS    ?? '5000');
  }
}

export function generateTestFile(code: string, lang: Language, problemData: ProblemData): string {
  switch (lang) {
    case 'python': return generatePython(code, problemData);
    case 'java':   return generateJava(code, problemData);
    case 'cpp':    return generateCpp(code, problemData);
  }
}

// ---------------------------------------------------------------------------
// Python test runner
// Python harness is unchanged — args are already native Python types via
// json.loads(). Type hints in the boilerplate are cosmetic only.
// ---------------------------------------------------------------------------
function generatePython(code: string, problem: ProblemData): string {
  if (problem.kind === 'data_structure') {
    return generatePythonDataStructure(code, problem);
  }
  return generatePythonAlgorithm(code, problem);
}

const PYTHON_COMPARE_FUNC = `
def compare(a, b):
    import json
    return json.dumps(a, sort_keys=True) == json.dumps(b, sort_keys=True)
`.trim();

function generatePythonAlgorithm(code: string, problem: ProblemData): string {
  const testData = problem.test_cases.map((tc, i) => ({
    input: tc,
    expected: problem.test_results[i],
  }));

  return `
import json, sys

${code}

${PYTHON_COMPARE_FUNC}

test_data = ${JSON.stringify(testData)}
results = []

for td in test_data:
    try:
        args = json.loads(td["input"])
        expected = json.loads(td["expected"])
        actual = ${problem.method_name}(*args) if isinstance(args, list) else ${problem.method_name}(args)
        passed = compare(actual, expected)
        results.append({"passed": passed, "input": td["input"], "expected": td["expected"], "actual": json.dumps(actual)})
    except Exception as e:
        results.append({"passed": False, "input": td["input"], "expected": td["expected"], "actual": "", "error": str(e)})

print(json.dumps({"results": results}))
`.trimStart();
}

function generatePythonDataStructure(code: string, problem: ProblemData): string {
  const testData = problem.test_cases.map((tc, i) => ({
    input: tc,
    expected: problem.test_results[i],
  }));

  return `
import json, sys

${code}

${PYTHON_COMPARE_FUNC}

test_data = ${JSON.stringify(testData)}
results = []

for td in test_data:
    try:
        ops = json.loads(td["input"])
        expected = json.loads(td["expected"])
        obj = ${problem.method_name}()
        actual = None
        for op in ops:
            method = op[0]
            args = op[1:] if len(op) > 1 else []
            actual = getattr(obj, method)(*args)
        passed = compare(actual, expected)
        results.append({"passed": passed, "input": td["input"], "expected": td["expected"], "actual": json.dumps(actual)})
    except Exception as e:
        results.append({"passed": False, "input": td["input"], "expected": td["expected"], "actual": "", "error": str(e)})

print(json.dumps({"results": results}))
`.trimStart();
}

// ---------------------------------------------------------------------------
// Java test runner
// ---------------------------------------------------------------------------

function javaStringLiteralBody(s: string): string {
  return JSON.stringify(s).slice(1, -1);
}

// Minimal hand-rolled JSON parser + serializer + typed extraction/boxing helpers.
const JAVA_JSON_UTIL = `
  // ── Minimal JSON parser ──────────────────────────────────────────────────
  @SuppressWarnings("unchecked")
  static Object parse(String s) {
    return new Object() {
      int i = 0;
      Object value() {
        skip(); if (i >= s.length()) return null;
        char c = s.charAt(i);
        if (c == '"')  return str();
        if (c == '[')  return arr();
        if (c == '{')  return obj();
        if (c == 't')  { i += 4; return Boolean.TRUE; }
        if (c == 'f')  { i += 5; return Boolean.FALSE; }
        if (c == 'n')  { i += 4; return null; }
        return num();
      }
      String str() {
        i++; var sb = new StringBuilder();
        while (i < s.length()) {
          char c = s.charAt(i++);
          if (c == '"') break;
          if (c == '\\\\') {
            char e = s.charAt(i++);
            if (e == 'n') sb.append('\\n');
            else if (e == 'r') sb.append('\\r');
            else if (e == 't') sb.append('\\t');
            else if (e == 'u') { sb.append((char) Integer.parseInt(s.substring(i, i+4), 16)); i += 4; }
            else sb.append(e);
          } else sb.append(c);
        }
        return sb.toString();
      }
      List<Object> arr() {
        i++; var l = new java.util.ArrayList<Object>();
        skip();
        if (i < s.length() && s.charAt(i) == ']') { i++; return l; }
        while (i < s.length()) {
          l.add(value()); skip();
          if (i < s.length() && s.charAt(i) == ',') i++;
          else break;
        }
        if (i < s.length()) i++; // ']'
        return l;
      }
      java.util.Map<String,Object> obj() {
        i++; var m = new java.util.LinkedHashMap<String,Object>();
        skip();
        if (i < s.length() && s.charAt(i) == '}') { i++; return m; }
        while (i < s.length()) {
          skip(); String k = str(); skip();
          if (i < s.length()) i++; // ':'
          m.put(k, value()); skip();
          if (i < s.length() && s.charAt(i) == ',') i++;
          else break;
        }
        if (i < s.length()) i++; // '}'
        return m;
      }
      Object num() {
        int start = i;
        if (i < s.length() && s.charAt(i) == '-') i++;
        while (i < s.length() && (Character.isDigit(s.charAt(i)))) i++;
        boolean frac = i < s.length() && s.charAt(i) == '.';
        if (frac) { i++; while (i < s.length() && Character.isDigit(s.charAt(i))) i++; }
        boolean exp = i < s.length() && (s.charAt(i) == 'e' || s.charAt(i) == 'E');
        if (exp) { i++; if (i < s.length() && (s.charAt(i) == '+' || s.charAt(i) == '-')) i++;
          while (i < s.length() && Character.isDigit(s.charAt(i))) i++; }
        String tok = s.substring(start, i);
        if (frac || exp) return Double.parseDouble(tok);
        try { return Long.parseLong(tok); } catch (NumberFormatException e2) { return Double.parseDouble(tok); }
      }
      void skip() { while (i < s.length() && s.charAt(i) <= ' ') i++; }
    }.value();
  }

  // ── Minimal JSON serializer ──────────────────────────────────────────────
  @SuppressWarnings("unchecked")
  static String stringify(Object v) {
    if (v == null) return "null";
    if (v instanceof Boolean) return v.toString();
    if (v instanceof Long)    return v.toString();
    if (v instanceof Double)  {
      double d = (Double) v;
      if (d == Math.floor(d) && !Double.isInfinite(d) && Math.abs(d) < 1e15) return String.valueOf((long) d);
      return v.toString();
    }
    if (v instanceof Number)  return v.toString();
    if (v instanceof String)  {
      var sb = new StringBuilder().append('"');
      for (char c : ((String) v).toCharArray()) {
        if (c == '"')       sb.append("\\\\\\"");
        else if (c == '\\\\') sb.append("\\\\\\\\");
        else if (c == '\\n') sb.append("\\\\n");
        else if (c == '\\r') sb.append("\\\\r");
        else if (c == '\\t') sb.append("\\\\t");
        else if (c < 0x20)  sb.append(String.format("\\\\u%04x", (int) c));
        else                sb.append(c);
      }
      return sb.append('"').toString();
    }
    if (v instanceof List) {
      var sb = new StringBuilder().append('[');
      var l = (List<Object>) v; boolean first = true;
      for (Object e : l) { if (!first) sb.append(','); sb.append(stringify(e)); first = false; }
      return sb.append(']').toString();
    }
    if (v instanceof java.util.Map) {
      var sb = new StringBuilder().append('{');
      var m = (java.util.Map<String,Object>) v; boolean first = true;
      for (var entry : m.entrySet()) {
        if (!first) sb.append(',');
        sb.append(stringify(entry.getKey())).append(':').append(stringify(entry.getValue()));
        first = false;
      }
      return sb.append('}').toString();
    }
    return stringify(v.toString());
  }

  // Deep equality via canonical serialization
  static boolean compare(Object a, Object b) { return stringify(a).equals(stringify(b)); }

  // ── Scalar extraction helpers ────────────────────────────────────────────
  static int toInt(Object o) { return Math.toIntExact((Long) o); }
  static long toLong(Object o) { return (Long) o; }
  static double toDouble(Object o) { if (o instanceof Long) return (double)(long)(Long)o; return (Double) o; }
  static boolean toBool(Object o) { return (Boolean) o; }
  static String toStr(Object o) { return (String) o; }

  // ── 1-D array extraction helpers ─────────────────────────────────────────
  @SuppressWarnings("unchecked")
  static int[] toIntArray(Object o) {
    var l = (java.util.List<Object>) o;
    int[] a = new int[l.size()];
    for (int i = 0; i < l.size(); i++) a[i] = toInt(l.get(i));
    return a;
  }
  @SuppressWarnings("unchecked")
  static long[] toLongArray(Object o) {
    var l = (java.util.List<Object>) o;
    long[] a = new long[l.size()];
    for (int i = 0; i < l.size(); i++) a[i] = toLong(l.get(i));
    return a;
  }
  @SuppressWarnings("unchecked")
  static double[] toDoubleArray(Object o) {
    var l = (java.util.List<Object>) o;
    double[] a = new double[l.size()];
    for (int i = 0; i < l.size(); i++) a[i] = toDouble(l.get(i));
    return a;
  }
  @SuppressWarnings("unchecked")
  static String[] toStringArray(Object o) {
    var l = (java.util.List<Object>) o;
    return l.stream().map(x -> (String) x).toArray(String[]::new);
  }
  @SuppressWarnings("unchecked")
  static boolean[] toBoolArray(Object o) {
    var l = (java.util.List<Object>) o;
    boolean[] a = new boolean[l.size()];
    for (int i = 0; i < l.size(); i++) a[i] = toBool(l.get(i));
    return a;
  }

  // ── 2-D array extraction helpers ─────────────────────────────────────────
  @SuppressWarnings("unchecked")
  static int[][] toIntMatrix(Object o) {
    var l = (java.util.List<Object>) o;
    int[][] m = new int[l.size()][];
    for (int i = 0; i < l.size(); i++) m[i] = toIntArray(l.get(i));
    return m;
  }
  @SuppressWarnings("unchecked")
  static long[][] toLongMatrix(Object o) {
    var l = (java.util.List<Object>) o;
    long[][] m = new long[l.size()][];
    for (int i = 0; i < l.size(); i++) m[i] = toLongArray(l.get(i));
    return m;
  }
  @SuppressWarnings("unchecked")
  static double[][] toDoubleMatrix(Object o) {
    var l = (java.util.List<Object>) o;
    double[][] m = new double[l.size()][];
    for (int i = 0; i < l.size(); i++) m[i] = toDoubleArray(l.get(i));
    return m;
  }
  @SuppressWarnings("unchecked")
  static String[][] toStringMatrix(Object o) {
    var l = (java.util.List<Object>) o;
    String[][] m = new String[l.size()][];
    for (int i = 0; i < l.size(); i++) m[i] = toStringArray(l.get(i));
    return m;
  }

  // ── Map extraction helpers ───────────────────────────────────────────────
  @SuppressWarnings("unchecked")
  static java.util.Map<String,Integer> toStringIntMap(Object o) {
    var raw = (java.util.Map<String,Object>) o;
    var m = new java.util.LinkedHashMap<String,Integer>();
    for (var e : raw.entrySet()) m.put(e.getKey(), toInt(e.getValue()));
    return m;
  }
  @SuppressWarnings("unchecked")
  static java.util.Map<String,String> toStringStringMap(Object o) {
    return (java.util.Map<String,String>)(java.util.Map<?,?>) o;
  }
  @SuppressWarnings("unchecked")
  static java.util.Map<Integer,Integer> toIntIntMap(Object o) {
    // JSON keys are always strings, so this handles numeric-string keys
    var raw = (java.util.Map<String,Object>) o;
    var m = new java.util.LinkedHashMap<Integer,Integer>();
    for (var e : raw.entrySet()) m.put(Integer.parseInt(e.getKey()), toInt(e.getValue()));
    return m;
  }

  // ── Set extraction helpers ───────────────────────────────────────────────
  @SuppressWarnings("unchecked")
  static java.util.Set<Integer> toIntSet(Object o) {
    var l = (java.util.List<Object>) o;
    var s = new java.util.LinkedHashSet<Integer>();
    for (Object x : l) s.add(toInt(x));
    return s;
  }
  @SuppressWarnings("unchecked")
  static java.util.Set<String> toStringSet(Object o) {
    var l = (java.util.List<Object>) o;
    var s = new java.util.LinkedHashSet<String>();
    for (Object x : l) s.add((String) x);
    return s;
  }

  // ── Boxing helpers (primitive arrays → List<Object> for stringify) ────────
  static List<Object> boxIntArray(int[] a) {
    var l = new java.util.ArrayList<Object>(a.length);
    for (int v : a) l.add((long) v);
    return l;
  }
  static List<Object> boxLongArray(long[] a) {
    var l = new java.util.ArrayList<Object>(a.length);
    for (long v : a) l.add(v);
    return l;
  }
  static List<Object> boxDoubleArray(double[] a) {
    var l = new java.util.ArrayList<Object>(a.length);
    for (double v : a) l.add(v);
    return l;
  }
  static List<Object> boxBoolArray(boolean[] a) {
    var l = new java.util.ArrayList<Object>(a.length);
    for (boolean v : a) l.add(v);
    return l;
  }
  static List<Object> boxIntMatrix(int[][] m) {
    var l = new java.util.ArrayList<Object>(m.length);
    for (int[] row : m) l.add(boxIntArray(row));
    return l;
  }
  static List<Object> boxLongMatrix(long[][] m) {
    var l = new java.util.ArrayList<Object>(m.length);
    for (long[] row : m) l.add(boxLongArray(row));
    return l;
  }
  static List<Object> boxDoubleMatrix(double[][] m) {
    var l = new java.util.ArrayList<Object>(m.length);
    for (double[] row : m) l.add(boxDoubleArray(row));
    return l;
  }
  static List<Object> boxStringMatrix(String[][] m) {
    var l = new java.util.ArrayList<Object>(m.length);
    for (String[] row : m) l.add(java.util.Arrays.asList(row));
    return l;
  }
`.trimStart();

function generateJava(code: string, problem: ProblemData): string {
  if (problem.kind === 'data_structure') {
    return generateJavaDS(code, problem);
  }
  return generateJavaAlgo(code, problem);
}

function generateJavaAlgo(code: string, problem: ProblemData): string {
  const testData = problem.test_cases.map((tc, i) => ({
    input: tc,
    expected: problem.test_results[i],
  }));
  const testJson = javaStringLiteralBody(JSON.stringify(testData));
  const method = problem.method_name;

  const sig = parseAlgoSignature(problem.param_types ?? '', problem.return_type ?? '');

  let runBlock: string;
  let boxActual: string;

  if (sig) {
    // Typed path: extract each param, call with native types
    const paramDecls = sig.params.map((t, i) =>
      `          ${javaType(t)} _p${i} = ${javaExtract(t, `argsList.get(${i})`)};`
    ).join('\n');
    const callArgs = sig.params.map((_, i) => `_p${i}`).join(', ');

    if (sig.ret === 'void') {
      runBlock = `
          @SuppressWarnings("unchecked")
          java.util.List<Object> argsList = (java.util.List<Object>) parse((String) td.get("input"));
${paramDecls}
          new solution().${method}(${callArgs});
          actual = null;`;
      boxActual = 'null';
    } else {
      const retJava = javaReturnType(sig.ret);
      runBlock = `
          @SuppressWarnings("unchecked")
          java.util.List<Object> argsList = (java.util.List<Object>) parse((String) td.get("input"));
${paramDecls}
          ${retJava} _r = new solution().${method}(${callArgs});
          actual = ${javaBox(sig.ret, '_r')};`;
      boxActual = javaBox(sig.ret, '_r');
    }
  } else {
    // Generic path (legacy): Object... args
    runBlock = `
          @SuppressWarnings("unchecked")
          java.util.List<Object> argsList = (java.util.List<Object>) parse((String) td.get("input"));
          actual = ${method}(argsList.toArray());`;
    boxActual = 'actual';
  }

  return `import java.util.*;
import java.util.stream.*;

public class solution {
  // ── User code ─────────────────────────────────────────────────────────────
${code.split('\n').map(l => '  ' + l).join('\n')}

${JAVA_JSON_UTIL}
  public static void main(String[] args_) throws Exception {
    String testJson = "${testJson}";
    @SuppressWarnings("unchecked")
    List<Map<String,Object>> tests = (List<Map<String,Object>>) parse(testJson);
    List<Map<String,Object>> results = new ArrayList<>();

    for (Map<String,Object> td : tests) {
      Map<String,Object> r = new LinkedHashMap<>();
      r.put("input",    td.get("input"));
      r.put("expected", td.get("expected"));
      Object actual = null;
      try {
        ${runBlock.trimStart()}
        Object expected = parse((String) td.get("expected"));
        r.put("passed", compare(actual, expected));
        r.put("actual", stringify(actual));
      } catch (Throwable e) {
        r.put("passed", false);
        r.put("actual", "");
        Throwable cause = e.getCause() != null ? e.getCause() : e;
        r.put("error", cause.getMessage() != null ? cause.getMessage() : cause.toString());
      }
      results.add(r);
    }

    Map<String,Object> out = new LinkedHashMap<>();
    out.put("results", results);
    System.out.println(stringify(out));
  }
}
`;
}

function generateJavaDS(code: string, problem: ProblemData): string {
  const testData = problem.test_cases.map((tc, i) => ({
    input: tc,
    expected: problem.test_results[i],
  }));
  const testJson = javaStringLiteralBody(JSON.stringify(testData));
  const cls = problem.method_name;

  const sig = parseDSSignature(problem.method_signatures ?? '');

  let runBlock: string;

  if (sig) {
    // Typed path: per-method if/else dispatch
    const branches = Object.entries(sig.methods).map(([name, ms]) => {
      const paramExtracts = ms.params.map((t, i) =>
        `              ${javaType(t)} _p${i} = ${javaExtract(t, `a[${i}]`)};`
      ).join('\n');
      const callArgs = ms.params.map((_, i) => `_p${i}`).join(', ');

      if (ms.ret === 'void') {
        return `            if (m.equals("${name}")) {\n${paramExtracts}\n              obj.${name}(${callArgs}); actual = null; }`;
      } else {
        const retJava = javaReturnType(ms.ret);
        return `            if (m.equals("${name}")) {\n${paramExtracts}\n              ${retJava} _r = obj.${name}(${callArgs}); actual = ${javaBox(ms.ret, '_r')}; }`;
      }
    });
    const dispatchChain = branches.join('\n            else ');

    runBlock = `
          @SuppressWarnings("unchecked")
          java.util.List<java.util.List<Object>> ops =
            (java.util.List<java.util.List<Object>>) parse((String) td.get("input"));
          ${cls} obj = new ${cls}();
          actual = null;
          for (java.util.List<Object> op : ops) {
            String m = (String) op.get(0);
            Object[] a = op.subList(1, op.size()).toArray();
            ${dispatchChain}
          }`;
  } else {
    // Generic path (legacy): call() dispatch
    runBlock = `
          @SuppressWarnings("unchecked")
          java.util.List<java.util.List<Object>> ops =
            (java.util.List<java.util.List<Object>>) parse((String) td.get("input"));
          ${cls} obj = new ${cls}();
          actual = null;
          for (java.util.List<Object> op : ops) {
            String m = (String) op.get(0);
            Object[] a = op.subList(1, op.size()).toArray();
            actual = obj.call(m, a);
          }`;
  }

  return `import java.util.*;
import java.util.stream.*;

public class solution {
  // ── User code ─────────────────────────────────────────────────────────────
${code.split('\n').map(l => '  ' + l).join('\n')}

${JAVA_JSON_UTIL}
  public static void main(String[] args_) throws Exception {
    String testJson = "${testJson}";
    @SuppressWarnings("unchecked")
    List<Map<String,Object>> tests = (List<Map<String,Object>>) parse(testJson);
    List<Map<String,Object>> results = new ArrayList<>();

    for (Map<String,Object> td : tests) {
      Map<String,Object> r = new LinkedHashMap<>();
      r.put("input",    td.get("input"));
      r.put("expected", td.get("expected"));
      Object actual = null;
      try {
        ${runBlock.trimStart()}
        Object expected = parse((String) td.get("expected"));
        r.put("passed", compare(actual, expected));
        r.put("actual", stringify(actual));
      } catch (Throwable e) {
        r.put("passed", false);
        r.put("actual", "");
        Throwable cause = e.getCause() != null ? e.getCause() : e;
        r.put("error", cause.getMessage() != null ? cause.getMessage() : cause.toString());
      }
      results.add(r);
    }

    Map<String,Object> out = new LinkedHashMap<>();
    out.put("results", results);
    System.out.println(stringify(out));
  }
}
`;
}

// ---------------------------------------------------------------------------
// C++ test runner
// ---------------------------------------------------------------------------

function cppRawStringBody(s: string): { delimiter: string; body: string } {
  let delimiter = 'JSON';
  while (s.includes(`)${delimiter}"`)) {
    delimiter += '_';
  }
  return { delimiter, body: s };
}

function generateCpp(code: string, problem: ProblemData): string {
  if (problem.kind === 'data_structure') {
    return generateCppDS(code, problem);
  }
  return generateCppAlgo(code, problem);
}

function generateCppAlgo(code: string, problem: ProblemData): string {
  const testData = problem.test_cases.map((tc, i) => ({
    input: tc,
    expected: problem.test_results[i],
  }));
  const { delimiter, body: testJson } = cppRawStringBody(JSON.stringify(testData));
  const method = problem.method_name;

  const sig = parseAlgoSignature(problem.param_types ?? '', problem.return_type ?? '');

  let runBlock: string;

  if (sig) {
    const paramDecls = sig.params.map((t, i) =>
      `      ${cppType(t)} _p${i} = ${cppExtract(t, `args[${i}]`)};`
    ).join('\n');
    const callArgs = sig.params.map((_, i) => `_p${i}`).join(', ');

    if (sig.ret === 'void') {
      runBlock = `
      json args = json::parse(td["input"].get<std::string>());
${paramDecls}
      ${method}(${callArgs});
      actual = nullptr;`;
    } else {
      runBlock = `
      json args = json::parse(td["input"].get<std::string>());
${paramDecls}
      auto _r = ${method}(${callArgs});
      actual = ${cppToJson(sig.ret, '_r')};`;
    }
  } else {
    // Generic path (legacy)
    runBlock = `
      json args = json::parse(td["input"].get<std::string>());
      actual = ${method}(args);`;
  }

  return `#include <nlohmann/json.hpp>
#include <iostream>
#include <string>
#include <vector>
#include <map>
#include <set>
#include <stdexcept>
#include <algorithm>
#include <climits>
#include <numeric>
#include <unordered_map>
#include <unordered_set>
#include <queue>
#include <stack>
using json = nlohmann::json;
using namespace std;

${code}

int main() {
  json testData;
  try {
    testData = json::parse(R"${delimiter}(${testJson})${delimiter}");
  } catch (const std::exception& e) {
    std::cerr << "Failed to parse test data: " << e.what() << std::endl;
    return 1;
  }

  json results = json::array();

  for (auto& td : testData) {
    json r;
    r["input"]    = td["input"];
    r["expected"] = td["expected"];
    json actual;
    try {
      ${runBlock.trimStart()}
      json expected = json::parse(td["expected"].get<std::string>());
      r["passed"] = (actual == expected);
      r["actual"] = actual.dump();
    } catch (const std::exception& e) {
      r["passed"] = false;
      r["actual"] = "";
      r["error"]  = e.what();
    }
    results.push_back(r);
  }

  std::cout << json({{"results", results}}).dump() << std::endl;
  return 0;
}
`;
}

function generateCppDS(code: string, problem: ProblemData): string {
  const testData = problem.test_cases.map((tc, i) => ({
    input: tc,
    expected: problem.test_results[i],
  }));
  const { delimiter, body: testJson } = cppRawStringBody(JSON.stringify(testData));
  const cls = problem.method_name;

  const sig = parseDSSignature(problem.method_signatures ?? '');

  let runBlock: string;

  if (sig) {
    const branches = Object.entries(sig.methods).map(([name, ms]) => {
      const paramDecls = ms.params.map((t, i) =>
        `        ${cppType(t)} _p${i} = ${cppExtract(t, `a[${i}]`)};`
      ).join('\n');
      const callArgs = ms.params.map((_, i) => `_p${i}`).join(', ');

      if (ms.ret === 'void') {
        return `      if (m == "${name}") {\n${paramDecls}\n        obj.${name}(${callArgs}); actual = nullptr; }`;
      } else {
        return `      if (m == "${name}") {\n${paramDecls}\n        auto _r = obj.${name}(${callArgs}); actual = ${cppToJson(ms.ret, '_r')}; }`;
      }
    });
    const dispatchChain = branches.join('\n      else ');

    runBlock = `
      auto ops = json::parse(td["input"].get<std::string>());
      ${cls} obj;
      actual = nullptr;
      for (auto& op : ops) {
        std::string m = op[0].get<std::string>();
        json a = json::array();
        for (size_t i = 1; i < op.size(); ++i) a.push_back(op[i]);
        ${dispatchChain}
      }`;
  } else {
    // Generic path (legacy): call() dispatch
    runBlock = `
      auto ops = json::parse(td["input"].get<std::string>());
      ${cls} obj;
      actual = nullptr;
      for (auto& op : ops) {
        std::string m = op[0].get<std::string>();
        json a = json::array();
        for (size_t i = 1; i < op.size(); ++i) a.push_back(op[i]);
        actual = obj.call(m, a);
      }`;
  }

  return `#include <nlohmann/json.hpp>
#include <iostream>
#include <string>
#include <vector>
#include <map>
#include <set>
#include <stdexcept>
#include <algorithm>
#include <climits>
#include <numeric>
#include <unordered_map>
#include <unordered_set>
#include <queue>
#include <stack>
using json = nlohmann::json;
using namespace std;

${code}

int main() {
  json testData;
  try {
    testData = json::parse(R"${delimiter}(${testJson})${delimiter}");
  } catch (const std::exception& e) {
    std::cerr << "Failed to parse test data: " << e.what() << std::endl;
    return 1;
  }

  json results = json::array();

  for (auto& td : testData) {
    json r;
    r["input"]    = td["input"];
    r["expected"] = td["expected"];
    json actual;
    try {
      ${runBlock.trimStart()}
      json expected = json::parse(td["expected"].get<std::string>());
      r["passed"] = (actual == expected);
      r["actual"] = actual.dump();
    } catch (const std::exception& e) {
      r["passed"] = false;
      r["actual"] = "";
      r["error"]  = e.what();
    }
    results.push_back(r);
  }

  std::cout << json({{"results", results}}).dump() << std::endl;
  return 0;
}
`;
}
