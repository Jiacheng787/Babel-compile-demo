const sym = Symbol();

const promise = Promise.resolve();

const arr = ["arr", "yeah!"];
const check = arr.includes("yeah!");

class Person { };

new Person();

console.log(arr[Symbol.iterator]());

Array.isArray([1, 2]);
