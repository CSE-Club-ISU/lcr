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
  console.log(`  ✓ ${name}: ${args.title ?? name}`);
}

const problems = [
  {
    title: 'Two Sum',
    description:
      'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\n' +
      'You may assume that each input would have exactly one solution, and you may not use the same element twice.\n\n' +
      'Return the answer in any order.',
    difficulty: 'easy',
    method_name: 'two_sum',
    sample_test_cases: '[[2,7,11,15],9]|[[3,2,4],6]|[[3,3],6]',
    sample_test_results: '[0,1]|[1,2]|[0,1]',
    hidden_test_cases: '[[2,7,11,15],9]|[[3,2,4],6]|[[3,3],6]|[[-1,-2,-3,-4,-5],-8]|[[1,2,3,4,5],9]',
    hidden_test_results: '[0,1]|[1,2]|[0,1]|[2,4]|[3,4]',
    boilerplate_python: 'def two_sum(nums: list, target: int) -> list:\n    # Your code here\n    pass',
    boilerplate_java: '',
    boilerplate_cpp: '',
    compare_func_python: 'def compare(expected, actual): return sorted(expected) == sorted(actual)',
    compare_func_java: '',
    compare_func_cpp: '',
    problem_kind: 'algorithm',
  },
  {
    title: 'Min Stack',
    description:
      'Design a stack that supports push, pop, top, and retrieving the minimum element in constant time.\n\n' +
      'Implement the MinStack class:\n' +
      '- push(val) — pushes val onto the stack\n' +
      '- pop() — removes the element on top of the stack\n' +
      '- top() — returns the element on top of the stack\n' +
      '- get_min() — retrieves the minimum element in the stack',
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
    boilerplate_java: '',
    boilerplate_cpp: '',
    compare_func_python: 'def compare(expected, actual): return expected == actual',
    compare_func_java: '',
    compare_func_cpp: '',
    problem_kind: 'data_structure',
  },
];

console.log(`Seeding ${problems.length} problems to ${SERVER}/${DB_NAME}...`);
for (const p of problems) {
  await callReducer('seed_problem', p);
}
console.log('Done!');
