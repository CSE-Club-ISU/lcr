/**
 * Typed parameter/return bridge for the test harness generators.
 *
 * Vocabulary covers every type currently used in seed problems plus common
 * collection types (map, set) to support future problems.
 */

// ---------------------------------------------------------------------------
// Type vocabulary
// ---------------------------------------------------------------------------

export type TypeName =
  | 'int'    | 'long'   | 'double' | 'bool'   | 'string'
  | 'int[]'  | 'long[]' | 'double[]' | 'string[]' | 'bool[]'
  | 'int[][]'| 'long[][]'| 'double[][]'| 'string[][]'
  | 'map<string,int>' | 'map<string,string>' | 'map<int,int>'
  | 'set<int>' | 'set<string>'
  | 'void' | 'any';

const ALL_TYPES = new Set<string>([
  'int','long','double','bool','string',
  'int[]','long[]','double[]','string[]','bool[]',
  'int[][]','long[][]','double[][]','string[][]',
  'map<string,int>','map<string,string>','map<int,int>',
  'set<int>','set<string>',
  'void','any',
]);

function isTypeName(s: string): s is TypeName {
  return ALL_TYPES.has(s);
}

// ---------------------------------------------------------------------------
// Signature shapes
// ---------------------------------------------------------------------------

export interface AlgoSignature {
  params: TypeName[];
  ret: TypeName;
}

export interface MethodSignature {
  params: TypeName[];
  ret: TypeName;
}

export interface DSSignature {
  constructor: TypeName[];
  methods: Record<string, MethodSignature>;
}

// ---------------------------------------------------------------------------
// Parsers
// ---------------------------------------------------------------------------

/** Returns null when fields are absent/empty — fall back to generic harness. */
export function parseAlgoSignature(
  paramTypesJson: string,
  returnType: string,
): AlgoSignature | null {
  if (!paramTypesJson.trim() || !returnType.trim()) return null;
  try {
    const params = JSON.parse(paramTypesJson);
    if (!Array.isArray(params)) return null;
    if (!params.every(isTypeName)) return null;
    const ret = returnType.trim();
    if (!isTypeName(ret)) return null;
    return { params: params as TypeName[], ret: ret as TypeName };
  } catch {
    return null;
  }
}

/** Returns null when field is absent/empty — fall back to generic harness. */
export function parseDSSignature(methodSignaturesJson: string): DSSignature | null {
  if (!methodSignaturesJson.trim()) return null;
  try {
    const raw = JSON.parse(methodSignaturesJson);
    if (typeof raw !== 'object' || raw === null) return null;

    const ctorRaw = raw['constructor'];
    const constructor: TypeName[] = [];
    if (ctorRaw !== undefined) {
      if (!Array.isArray(ctorRaw)) return null;
      for (const p of ctorRaw) {
        if (!isTypeName(p)) return null;
        constructor.push(p as TypeName);
      }
    }

    const methods: Record<string, MethodSignature> = {};
    for (const [name, sig] of Object.entries(raw)) {
      if (name === 'constructor') continue;
      if (typeof sig !== 'object' || sig === null) return null;
      const s = sig as Record<string, unknown>;
      if (!Array.isArray(s['params'])) return null;
      if (typeof s['return'] !== 'string') return null;
      const params: TypeName[] = [];
      for (const p of s['params'] as unknown[]) {
        if (!isTypeName(p as string)) return null;
        params.push(p as TypeName);
      }
      const ret = s['return'] as string;
      if (!isTypeName(ret)) return null;
      methods[name] = { params, ret: ret as TypeName };
    }
    return { constructor, methods };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Java mappings
// ---------------------------------------------------------------------------

/** Java declared type for a parameter or local variable. */
export function javaType(t: TypeName): string {
  switch (t) {
    case 'int':               return 'int';
    case 'long':              return 'long';
    case 'double':            return 'double';
    case 'bool':              return 'boolean';
    case 'string':            return 'String';
    case 'int[]':             return 'int[]';
    case 'long[]':            return 'long[]';
    case 'double[]':          return 'double[]';
    case 'string[]':          return 'String[]';
    case 'bool[]':            return 'boolean[]';
    case 'int[][]':           return 'int[][]';
    case 'long[][]':          return 'long[][]';
    case 'double[][]':        return 'double[][]';
    case 'string[][]':        return 'String[][]';
    case 'map<string,int>':   return 'java.util.Map<String,Integer>';
    case 'map<string,string>':return 'java.util.Map<String,String>';
    case 'map<int,int>':      return 'java.util.Map<Integer,Integer>';
    case 'set<int>':          return 'java.util.Set<Integer>';
    case 'set<string>':       return 'java.util.Set<String>';
    case 'void':              return 'void';
    case 'any':               return 'Object';
  }
}

/** Java return type for a method declaration (Object for primitives so harness can hold null). */
export function javaReturnType(t: TypeName): string {
  if (t === 'void') return 'void';
  if (t === 'int')  return 'int';
  if (t === 'long') return 'long';
  if (t === 'double') return 'double';
  if (t === 'bool') return 'boolean';
  return javaType(t);
}

/**
 * Java expression that extracts a typed value from a generic Object.
 * `expr` is the source Object expression (e.g. "argsList.get(0)").
 */
export function javaExtract(t: TypeName, expr: string): string {
  switch (t) {
    case 'int':               return `toInt(${expr})`;
    case 'long':              return `toLong(${expr})`;
    case 'double':            return `toDouble(${expr})`;
    case 'bool':              return `toBool(${expr})`;
    case 'string':            return `toStr(${expr})`;
    case 'int[]':             return `toIntArray(${expr})`;
    case 'long[]':            return `toLongArray(${expr})`;
    case 'double[]':          return `toDoubleArray(${expr})`;
    case 'string[]':          return `toStringArray(${expr})`;
    case 'bool[]':            return `toBoolArray(${expr})`;
    case 'int[][]':           return `toIntMatrix(${expr})`;
    case 'long[][]':          return `toLongMatrix(${expr})`;
    case 'double[][]':        return `toDoubleMatrix(${expr})`;
    case 'string[][]':        return `toStringMatrix(${expr})`;
    case 'map<string,int>':   return `toStringIntMap(${expr})`;
    case 'map<string,string>':return `toStringStringMap(${expr})`;
    case 'map<int,int>':      return `toIntIntMap(${expr})`;
    case 'set<int>':          return `toIntSet(${expr})`;
    case 'set<string>':       return `toStringSet(${expr})`;
    case 'void':              return expr;
    case 'any':               return expr;
  }
}

/**
 * Java expression that boxes a typed value into an Object suitable for
 * passing to stringify(). Primitive arrays need boxing; primitives can be
 * auto-boxed; complex types are already reference types.
 */
export function javaBox(t: TypeName, expr: string): string {
  switch (t) {
    case 'int[]':      return `boxIntArray(${expr})`;
    case 'long[]':     return `boxLongArray(${expr})`;
    case 'double[]':   return `boxDoubleArray(${expr})`;
    case 'bool[]':     return `boxBoolArray(${expr})`;
    case 'string[]':   return `java.util.Arrays.asList(${expr})`;
    case 'int[][]':    return `boxIntMatrix(${expr})`;
    case 'long[][]':   return `boxLongMatrix(${expr})`;
    case 'double[][]': return `boxDoubleMatrix(${expr})`;
    case 'string[][]': return `boxStringMatrix(${expr})`;
    case 'void':       return 'null';
    default:           return expr; // reference types / Object / primitives auto-box
  }
}

// ---------------------------------------------------------------------------
// C++ mappings
// ---------------------------------------------------------------------------

/** C++ declared type. */
export function cppType(t: TypeName): string {
  switch (t) {
    case 'int':               return 'int';
    case 'long':              return 'long long';
    case 'double':            return 'double';
    case 'bool':              return 'bool';
    case 'string':            return 'std::string';
    case 'int[]':             return 'std::vector<int>';
    case 'long[]':            return 'std::vector<long long>';
    case 'double[]':          return 'std::vector<double>';
    case 'string[]':          return 'std::vector<std::string>';
    case 'bool[]':            return 'std::vector<bool>';
    case 'int[][]':           return 'std::vector<std::vector<int>>';
    case 'long[][]':          return 'std::vector<std::vector<long long>>';
    case 'double[][]':        return 'std::vector<std::vector<double>>';
    case 'string[][]':        return 'std::vector<std::vector<std::string>>';
    case 'map<string,int>':   return 'std::map<std::string,int>';
    case 'map<string,string>':return 'std::map<std::string,std::string>';
    case 'map<int,int>':      return 'std::map<int,int>';
    case 'set<int>':          return 'std::set<int>';
    case 'set<string>':       return 'std::set<std::string>';
    case 'void':              return 'void';
    case 'any':               return 'json';
  }
}

/**
 * C++ expression that extracts a typed value from a json node.
 * `expr` is the source json expression (e.g. "args[0]").
 */
export function cppExtract(t: TypeName, expr: string): string {
  // nlohmann::json supports get<T>() for all standard types including
  // vector, map, set — so this is always a one-liner.
  if (t === 'void' || t === 'any') return expr;
  return `${expr}.get<${cppType(t)}>()`;
}

/**
 * C++ expression that converts a typed return value to json for the harness.
 * nlohmann::json constructs from all standard types implicitly.
 */
export function cppToJson(t: TypeName, expr: string): string {
  if (t === 'void') return 'json(nullptr)';
  if (t === 'any')  return expr; // already json
  return `json(${expr})`;
}

// ---------------------------------------------------------------------------
// Python type hints (cosmetic only — no harness changes needed)
// ---------------------------------------------------------------------------

export function pyHint(t: TypeName): string {
  switch (t) {
    case 'int':               return 'int';
    case 'long':              return 'int';
    case 'double':            return 'float';
    case 'bool':              return 'bool';
    case 'string':            return 'str';
    case 'int[]':             return 'list[int]';
    case 'long[]':            return 'list[int]';
    case 'double[]':          return 'list[float]';
    case 'string[]':          return 'list[str]';
    case 'bool[]':            return 'list[bool]';
    case 'int[][]':           return 'list[list[int]]';
    case 'long[][]':          return 'list[list[int]]';
    case 'double[][]':        return 'list[list[float]]';
    case 'string[][]':        return 'list[list[str]]';
    case 'map<string,int>':   return 'dict[str, int]';
    case 'map<string,string>':return 'dict[str, str]';
    case 'map<int,int>':      return 'dict[int, int]';
    case 'set<int>':          return 'set[int]';
    case 'set<string>':       return 'set[str]';
    case 'void':              return 'None';
    case 'any':               return 'Any';
  }
}
