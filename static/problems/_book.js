// Printed page references into Axel Rauschmayer, "Speaking JavaScript"
// (O'Reilly, 2014, ISBN 978-1-449-36503-5) for the Tier 0 problems.
// Page numbers are the printed ones (PDF page minus 22 in the ebook).
// The book teaches ES5, so later syntax (arrows, let/const, template
// literals, spread, Map/Set, ?? and ?., async/await) is not in it; those
// entries point at the ES5 idea underneath and say so.

export const BOOK = {
  title: 'Speaking JavaScript',
  author: 'Axel Rauschmayer',
  edition: 'O’Reilly, 2014',
  newer: 'The same author’s free “Exploring ES6” (exploringjs.com) covers the post-2014 syntax.',
};

export const READING = {
  'js-arrows': {
    pages: [
      ['165', 'The Three Roles of Functions: a function with no return gives undefined'],
      ['166–167', 'Defining Functions: function expressions, the long form of an arrow'],
      ['18–20', 'Functions (quick start)'],
    ],
    gap: 'Arrow functions are ES2015. `n => n * 2` is `function (n) { return n * 2 }`, and `n => { n * 2 }` is the same function with the return left out.',
  },
  'js-template-strings': {
    pages: [
      ['137', 'Concatenating Strings'],
      ['89', 'The Conditional Operator ( ? : )'],
      ['83–86', 'Equality Operators: === Versus =='],
    ],
    gap: 'Template literals (backticks) are ES2015; the book builds strings with +.',
  },
  'js-truthiness': {
    pages: [
      ['97–98', 'Converting to Boolean; Truthy and Falsy Values'],
      ['12–13', 'Booleans (quick start)'],
      ['279', 'Array length'],
      ['218–220', 'Object.keys(obj).length for “is this object empty?”'],
    ],
  },
  'js-const-let': {
    pages: [
      ['179–182', 'Declaring a Variable; Variables Are Function-Scoped'],
      ['63', 'Strict mode: assigning to an undeclared variable throws'],
      ['229–231', 'Protecting Objects: Object.freeze, the thing const is not'],
    ],
    gap: 'const and let are ES2015; the book only has var. They behave like var except that they are block-scoped and const can’t be reassigned.',
  },
  'js-strings': {
    pages: [
      ['139–143', 'String Prototype Methods'],
      ['140', 'split(separator?, limit?): the limit drops the rest'],
      ['141', 'trim() and indexOf()'],
      ['139', 'slice(start, end?)'],
      ['290', 'Array join()'],
    ],
    gap: 'String includes() is ES2015; indexOf(x) !== -1 is the ES5 spelling.',
  },
  'js-sorting': {
    pages: [
      ['287–289', 'Sorting and Reversing Elements (Destructive), with comparators'],
      ['136', 'Comparing Strings'],
      ['290', 'slice() to copy before sorting'],
    ],
  },
  'js-array-predicates': {
    pages: [
      ['291–292', 'Examination Methods: indexOf, some, every'],
      ['277', 'The in Operator and Indices: in checks indexes'],
      ['71–72', 'undefined and null: why .find(…).name crashes'],
    ],
    gap: 'find() and includes() are ES2015+, and ?. is ES2020.',
  },
  'js-loops': {
    pages: [
      ['146–150', 'Loops, break and continue'],
      ['148–149', 'for-in, and why not to use it on arrays'],
      ['293', 'forEach() cannot break'],
      ['295', 'Best Practices: Iterating over Arrays'],
    ],
    gap: 'for…of and entries() are ES2015.',
  },
  'js-counting': {
    pages: [
      ['266–269', 'Pitfalls: Using an Object as a Map'],
      ['104', 'Converting to Number: undefined becomes NaN'],
      ['106–110', 'Special Number Values: NaN'],
      ['199', 'Reading a missing property gives undefined'],
    ],
    gap: '?? is ES2020; the book defaults with || (page 100), which is safe here because a count of 0 is never stored.',
  },
  'js-objects': {
    pages: [
      ['197–203', 'Layer 1: Single Objects'],
      ['217–220', 'Iteration and Detection of Properties; Object.keys()'],
      ['148–149', 'for-in on objects'],
      ['293–294', 'Reduction Methods: reduce()'],
      ['270', 'Cheat Sheet: Working with Objects'],
    ],
    gap: 'Object.entries() and Object.values() are ES2017; in ES5 you map over Object.keys().',
  },
  'js-sets-maps': {
    pages: [
      ['266–269', 'Pitfalls: Using an Object as a Map, the problems Map and Set solve'],
      ['218', 'Checking Whether a Property Exists'],
      ['337–339', 'JSON.stringify() keeps only plain properties; a Map has none, so it prints {}'],
    ],
    gap: 'Set and Map are ES2015 and not in the book.',
  },
  'js-nullish': {
    pages: [
      ['71–74', 'undefined and null, and where each one occurs'],
      ['99–101', 'Logical And (&&) and Or (||)'],
      ['173–174', 'Optional Parameters: the x = x || default idiom and its falsy trap'],
      ['98', 'Truthy and Falsy Values'],
    ],
    gap: '?? and ?. are ES2020. (a && a.b) is the ES5 spelling of a?.b.',
  },
  'js-spread': {
    pages: [
      ['289', 'concat(): the ES5 way to join arrays'],
      ['290', 'slice(): copying and taking “the rest”'],
      ['205', 'apply(): the ES5 way to spread an array into arguments'],
    ],
    gap: 'Spread, rest and destructuring are ES2015 (object spread is ES2018) and not in the book.',
  },
  'js-positional-args': {
    pages: [
      ['174–175', 'Pitfall: Unexpected Optional Parameters, which is this exact map(parseInt) bug'],
      ['120–121', 'Integers via parseInt()'],
      ['171–173', 'Handling Missing or Extra Parameters'],
      ['293', 'map(callback): the callback gets (element, index, array)'],
    ],
  },
  'js-scope': {
    pages: [
      ['180–183', 'The Scope of a Variable; function scope; hoisting'],
      ['193–196', 'Closures, and Pitfall: Inadvertently Sharing an Environment'],
      ['22–24', 'Variable Scoping and Closures (quick start)'],
    ],
    gap: 'The book describes var, which is function-scoped. let and const are scoped to the { … } block, which is why the #6 error happened.',
  },
  'js-nested-callbacks': {
    pages: [
      ['291–294', 'Array iteration methods: filter, map, reduce'],
      ['166–169', 'Defining Functions; function declaration or expression'],
      ['193', 'Closures: an inner helper can see outer names'],
    ],
  },
  'js-json': {
    pages: [
      ['333–341', 'JSON: stringify() and parse()'],
      ['135–136', 'Converting to String: [object Object]'],
      ['69–71', 'Primitive Values Versus Objects: objects compare by identity'],
      ['83–86', '=== and =='],
    ],
  },
  'js-errors': {
    pages: [
      ['157–160', 'Exception Handling; try-catch-finally; throw'],
      ['161–162', 'Error Constructors; Stack Traces'],
      ['340', 'JSON.parse() throws on bad input'],
      ['21', 'Exception Handling (quick start)'],
    ],
  },
  'js-regex-throw': {
    pages: [
      ['304', 'RegExp.prototype.test: Is There a Match?'],
      ['301', 'Assertions: ^ and $'],
      ['312', 'Tips and Tricks: without ^ and $ a regex matches anywhere'],
      ['314–315', 'Regular Expression Cheat Sheet'],
      ['159', 'throw'],
      ['99–101', '&& and || return an operand, not a boolean'],
    ],
  },
  'js-await': {
    pages: [],
    gap: 'Not in this book: promises are ES2015 and async/await is ES2017, and the preface says asynchronous programming is out of scope. Pages 165–167 (functions as values) are the useful background.',
  },
  'js-thunks': {
    pages: [
      ['165–167', 'Functions are values: f is the recipe, f() runs it'],
      ['193–195', 'Closures: a thunk remembers the mirror it was made for'],
    ],
    gap: 'The eager-promise part is post-ES5 and not in the book.',
  },
  'js-then': {
    pages: [
      ['183–185', 'Introducing a New Scope via an IIFE: the (() => …)() shape'],
      ['193–195', 'Closures'],
    ],
    gap: 'Promises and .then() are ES2015 and not in the book.',
  },
};
