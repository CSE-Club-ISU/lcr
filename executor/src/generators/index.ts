import type { Language } from '../types.js';

export interface ProblemData {
  kind: 'algorithm' | 'data_structure';
  method_name: string;
  test_cases: string[];
  test_results: string[];
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
// ---------------------------------------------------------------------------
function generatePython(code: string, problem: ProblemData): string {
  if (problem.kind === 'data_structure') {
    return generatePythonDataStructure(code, problem);
  }
  return generatePythonAlgorithm(code, problem);
}

// Fixed deep-equality comparator used for all problems.
// Avoids per-problem compare_func injection.
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

  // method_name is validated before reaching here (alphanumeric + underscore only)
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

// data_structure harness: each test case is a JSON array of operations,
// e.g. [["push",1],["push",2],["pop"]]. The class is instantiated once per
// test case. The result of the LAST operation is compared against expected.
function generatePythonDataStructure(code: string, problem: ProblemData): string {
  const testData = problem.test_cases.map((tc, i) => ({
    input: tc,
    expected: problem.test_results[i],
  }));

  // method_name is validated before reaching here (alphanumeric + underscore only)
  // op[0] (method name) comes from admin-authored test case data, not user input.
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

// Escape a string so it can be embedded as the body of a Java string literal.
// JSON-escape is a strict subset of Java string literal escaping for the chars
// that appear in JSON (", \, and control chars), so this is safe.
function javaStringLiteralBody(s: string): string {
  return JSON.stringify(s).slice(1, -1);
}

// Minimal hand-rolled JSON parser + serializer embedded in the generated file.
// ~80 lines of Java, no external deps. Handles: null, boolean, number (long +
// double), string, array (List<Object>), object (Map<String,Object>).
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
`.trimStart();

function generateJava(code: string, problem: ProblemData): string {
  const testData = problem.test_cases.map((tc, i) => ({
    input: tc,
    expected: problem.test_results[i],
  }));

  const testJson = javaStringLiteralBody(JSON.stringify(testData));
  const isAlgo = problem.kind === 'algorithm';
  const method = problem.method_name;

  const runBlock = isAlgo ? `
          @SuppressWarnings("unchecked")
          java.util.List<Object> argsList = (java.util.List<Object>) parse((String) td.get("input"));
          actual = ${method}(argsList.toArray());` : `
          @SuppressWarnings("unchecked")
          java.util.List<java.util.List<Object>> ops =
            (java.util.List<java.util.List<Object>>) parse((String) td.get("input"));
          ${method} obj = new ${method}();
          actual = null;
          for (java.util.List<Object> op : ops) {
            String m = (String) op.get(0);
            Object[] a = op.subList(1, op.size()).toArray();
            actual = obj.call(m, a);
          }`;

  return `import java.util.*;
import java.lang.reflect.*;

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
        Throwable cause = (e instanceof InvocationTargetException && e.getCause() != null) ? e.getCause() : e;
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

// Escape a string for embedding inside a C++ raw string literal with
// delimiter )JSON". We scan for that exact delimiter in the data; in the
// astronomically unlikely case it appears, we fall back to a longer one.
function cppRawStringBody(s: string): { delimiter: string; body: string } {
  let delimiter = 'JSON';
  while (s.includes(`)${delimiter}"`)) {
    delimiter += '_';
  }
  return { delimiter, body: s };
}

function generateCpp(code: string, problem: ProblemData): string {
  const testData = problem.test_cases.map((tc, i) => ({
    input: tc,
    expected: problem.test_results[i],
  }));

  const { delimiter, body: testJson } = cppRawStringBody(JSON.stringify(testData));
  const isAlgo = problem.kind === 'algorithm';
  const method = problem.method_name;

  const runBlock = isAlgo ? `
      json args = json::parse(td["input"].get<std::string>());
      actual = ${method}(args);` : `
      auto ops = json::parse(td["input"].get<std::string>());
      ${method} obj;
      actual = nullptr;
      for (auto& op : ops) {
        std::string m = op[0].get<std::string>();
        json a = json::array();
        for (size_t i = 1; i < op.size(); ++i) a.push_back(op[i]);
        actual = obj.call(m, a);
      }`;

  return `#include <nlohmann/json.hpp>
#include <iostream>
#include <string>
#include <vector>
#include <stdexcept>
using json = nlohmann::json;

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
