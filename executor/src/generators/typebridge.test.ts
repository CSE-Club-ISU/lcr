import { describe, it, expect } from 'bun:test';
import { parseAlgoSignature, parseDSSignature } from './typebridge.js';

// ---------------------------------------------------------------------------
// parseAlgoSignature
// ---------------------------------------------------------------------------

describe('parseAlgoSignature', () => {
  it('parses a simple two-int signature', () => {
    const result = parseAlgoSignature('["int","int"]', 'int');
    expect(result).toEqual({ params: ['int', 'int'], ret: 'int' });
  });

  it('parses mixed primitive params', () => {
    const result = parseAlgoSignature('["int","string","bool"]', 'string');
    expect(result).toEqual({ params: ['int', 'string', 'bool'], ret: 'string' });
  });

  it('parses void return type', () => {
    const result = parseAlgoSignature('["int"]', 'void');
    expect(result).toEqual({ params: ['int'], ret: 'void' });
  });

  it('parses 1-D array param types', () => {
    const result = parseAlgoSignature('["int[]","string[]"]', 'int[]');
    expect(result).toEqual({ params: ['int[]', 'string[]'], ret: 'int[]' });
  });

  it('parses 2-D array param types', () => {
    const result = parseAlgoSignature('["int[][]","string[][]"]', 'int[][]');
    expect(result).toEqual({ params: ['int[][]', 'string[][]'], ret: 'int[][]' });
  });

  it('parses map types', () => {
    const result = parseAlgoSignature('["map<string,int>","map<int,int>"]', 'map<string,string>');
    expect(result).toEqual({
      params: ['map<string,int>', 'map<int,int>'],
      ret: 'map<string,string>',
    });
  });

  it('parses set types', () => {
    const result = parseAlgoSignature('["set<int>","set<string>"]', 'set<int>');
    expect(result).toEqual({ params: ['set<int>', 'set<string>'], ret: 'set<int>' });
  });

  it('parses empty params array', () => {
    const result = parseAlgoSignature('[]', 'string');
    expect(result).toEqual({ params: [], ret: 'string' });
  });

  it('returns null for empty paramTypesJson string', () => {
    expect(parseAlgoSignature('', 'int')).toBeNull();
  });

  it('returns null for whitespace-only paramTypesJson', () => {
    expect(parseAlgoSignature('   ', 'int')).toBeNull();
  });

  it('returns null for empty returnType string', () => {
    expect(parseAlgoSignature('["int"]', '')).toBeNull();
  });

  it('returns null for whitespace-only returnType', () => {
    expect(parseAlgoSignature('["int"]', '  ')).toBeNull();
  });

  it('returns null for unknown param type', () => {
    expect(parseAlgoSignature('["unknown_type"]', 'int')).toBeNull();
  });

  it('returns null for unknown return type', () => {
    expect(parseAlgoSignature('["int"]', 'unknown_type')).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    expect(parseAlgoSignature('{not json}', 'int')).toBeNull();
  });

  it('returns null when JSON is not an array', () => {
    expect(parseAlgoSignature('{"key":"value"}', 'int')).toBeNull();
  });

  it('trims whitespace from returnType', () => {
    const result = parseAlgoSignature('["int"]', '  int  ');
    expect(result).toEqual({ params: ['int'], ret: 'int' });
  });
});

// ---------------------------------------------------------------------------
// parseDSSignature
// ---------------------------------------------------------------------------

describe('parseDSSignature', () => {
  it('parses a constructor-only signature', () => {
    const json = JSON.stringify({ constructor: ['int', 'string'] });
    const result = parseDSSignature(json);
    expect(result).toEqual({ constructor: ['int', 'string'], methods: {} });
  });

  it('parses a signature with constructor and methods', () => {
    const json = JSON.stringify({
      constructor: ['int'],
      push: { params: ['int'], return: 'void' },
      pop: { params: [], return: 'int' },
    });
    const result = parseDSSignature(json);
    expect(result).toEqual({
      constructor: ['int'],
      methods: {
        push: { params: ['int'], ret: 'void' },
        pop: { params: [], ret: 'int' },
      },
    });
  });

  it('returns null when constructor field is absent (inherited Object.constructor is not an array)', () => {
    // parseDSSignature reads raw['constructor'] which picks up the inherited
    // Object.constructor (a function, not an array) when the field is absent,
    // so the parse correctly returns null rather than silently ignoring it.
    const json = JSON.stringify({
      peek: { params: [], return: 'string' },
    });
    expect(parseDSSignature(json)).toBeNull();
  });

  it('parses method with array param and return types', () => {
    const json = JSON.stringify({
      constructor: [],
      sort: { params: ['int[]'], return: 'int[]' },
    });
    const result = parseDSSignature(json);
    expect(result).toEqual({
      constructor: [],
      methods: { sort: { params: ['int[]'], ret: 'int[]' } },
    });
  });

  it('returns null for empty string', () => {
    expect(parseDSSignature('')).toBeNull();
  });

  it('returns null for whitespace-only string', () => {
    expect(parseDSSignature('   ')).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    expect(parseDSSignature('{bad json')).toBeNull();
  });

  it('returns null when JSON is not an object', () => {
    expect(parseDSSignature('["int","string"]')).toBeNull();
  });

  it('returns null when constructor is not an array', () => {
    const json = JSON.stringify({ constructor: 'int' });
    expect(parseDSSignature(json)).toBeNull();
  });

  it('returns null when constructor contains an unknown type', () => {
    const json = JSON.stringify({ constructor: ['unknown_type'] });
    expect(parseDSSignature(json)).toBeNull();
  });

  it('returns null when a method has an unknown param type', () => {
    const json = JSON.stringify({
      constructor: [],
      insert: { params: ['unknown_type'], return: 'void' },
    });
    expect(parseDSSignature(json)).toBeNull();
  });

  it('returns null when a method has an unknown return type', () => {
    const json = JSON.stringify({
      constructor: [],
      get: { params: ['int'], return: 'unknown_type' },
    });
    expect(parseDSSignature(json)).toBeNull();
  });

  it('returns null when a method params field is not an array', () => {
    const json = JSON.stringify({
      constructor: [],
      get: { params: 'int', return: 'int' },
    });
    expect(parseDSSignature(json)).toBeNull();
  });

  it('returns null when a method return field is not a string', () => {
    const json = JSON.stringify({
      constructor: [],
      get: { params: ['int'], return: 42 },
    });
    expect(parseDSSignature(json)).toBeNull();
  });
});
