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
    title: 'Reverse String',
    description:
      'Write a function that reverses a string. The input string is given as a list of characters.\n\n' +
      'Return the reversed list.',
    difficulty: 'easy',
    method_name: 'reverse_string',
    sample_test_cases:
      JSON.stringify([['h', 'e', 'l', 'l', 'o']]) + '|' +
      JSON.stringify([['H', 'a', 'n', 'n', 'a', 'h']]),
    sample_test_results:
      JSON.stringify(['o', 'l', 'l', 'e', 'h']) + '|' +
      JSON.stringify(['h', 'a', 'n', 'n', 'a', 'H']),
    hidden_test_cases:
      JSON.stringify([['h', 'e', 'l', 'l', 'o']]) + '|' +
      JSON.stringify([['H', 'a', 'n', 'n', 'a', 'h']]) + '|' +
      JSON.stringify([['a']]) + '|' +
      JSON.stringify([['a', 'b']]),
    hidden_test_results:
      JSON.stringify(['o', 'l', 'l', 'e', 'h']) + '|' +
      JSON.stringify(['h', 'a', 'n', 'n', 'a', 'H']) + '|' +
      JSON.stringify(['a']) + '|' +
      JSON.stringify(['b', 'a']),
    boilerplate_python: 'def reverse_string(s: list) -> list:\n    # Your code here - return the reversed list\n    pass',
    boilerplate_java: '',
    boilerplate_cpp: '',
    compare_func_python: 'def compare(expected, actual): return expected == actual',
    compare_func_java: '',
    compare_func_cpp: '',
    problem_kind: 'algorithm',
  },
  {
    title: 'FizzBuzz',
    description:
      'Given an integer n, return a list of strings from 1 to n where:\n' +
      '- "FizzBuzz" if divisible by both 3 and 5\n' +
      '- "Fizz" if divisible by 3\n' +
      '- "Buzz" if divisible by 5\n' +
      '- The number as a string otherwise',
    difficulty: 'easy',
    method_name: 'fizz_buzz',
    sample_test_cases: '[3]|[5]|[15]',
    sample_test_results:
      JSON.stringify(['1', '2', 'Fizz']) + '|' +
      JSON.stringify(['1', '2', 'Fizz', '4', 'Buzz']) + '|' +
      JSON.stringify(['1', '2', 'Fizz', '4', 'Buzz', 'Fizz', '7', '8', 'Fizz', 'Buzz', '11', 'Fizz', '13', '14', 'FizzBuzz']),
    hidden_test_cases: '[3]|[5]|[15]|[1]|[10]',
    hidden_test_results:
      JSON.stringify(['1', '2', 'Fizz']) + '|' +
      JSON.stringify(['1', '2', 'Fizz', '4', 'Buzz']) + '|' +
      JSON.stringify(['1', '2', 'Fizz', '4', 'Buzz', 'Fizz', '7', '8', 'Fizz', 'Buzz', '11', 'Fizz', '13', '14', 'FizzBuzz']) + '|' +
      JSON.stringify(['1']) + '|' +
      JSON.stringify(['1', '2', 'Fizz', '4', 'Buzz', 'Fizz', '7', '8', 'Fizz', 'Buzz']),
    boilerplate_python: 'def fizz_buzz(n: int) -> list:\n    # Your code here\n    pass',
    boilerplate_java: '',
    boilerplate_cpp: '',
    compare_func_python: 'def compare(expected, actual): return expected == actual',
    compare_func_java: '',
    compare_func_cpp: '',
    problem_kind: 'algorithm',
  },
];

console.log(`Seeding ${problems.length} problems to ${SERVER}/${DB_NAME}...`);
for (const p of problems) {
  await callReducer('seed_problem', p);
}
console.log('Done!');
