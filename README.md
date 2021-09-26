# Babel-compile-demo

此项目旨在加深对 Babel 的了解。

## 1. 初始化项目

```bash
$ npm init -y
```

## 2. 安装 Babel

安装两个包，其中 `@babel/core` 是 Babel 的核心库，`@babel/cli` 用于在命令行中使用 `babel` 命令编译文件：

```bash
$ npm i @babel/core @babel/cli -D
```

## 3. 编译测试

我们创建一个 `src/index.js` 文件，在里面编写如下内容：

```js
// src/index.js
const sym = Symbol();

const promise = Promise.resolve();

const arr = ["arr", "yeah!"];
const check = arr.includes("yeah!");

class Person { };

new Person();

console.log(arr[Symbol.iterator]());
```

然后我们在 `package.json` 中添加一个 npm script ，将 `src` 下的文件全部编译到 `lib` 目录下：

```json
"scripts": {
  "compile": "babel src --out-dir lib"
},
```

然后我们在没有安装任何 `plugin` 的情况下进行编译：

```bash
$ npm run compile
```

可以看到就是原样输出：

```js
// lib/index.js
const sym = Symbol();
const promise = Promise.resolve();
const arr = ["arr", "yeah!"];
const check = arr.includes("yeah!");

class Person {}

;
new Person();
console.log(arr[Symbol.iterator]());
```

## 4. 安装并配置插件

接下来我们安装 `@babel/preset-env` 用于转换 ES2015+ 语法，以及 `core-js` 对 API 进行 polyfill ：

```bash
$ npm i @babel/preset-env core-js -D
```

然后我们在根目录下创建 `babel.config.js` ，编写内容如下：

```js
module.exports = {
  presets: [
    [
      "@babel/preset-env",
      {
        useBuiltIns: "usage",
        corejs: 3
      }
    ]
  ],
  plugins: []
}
```

执行编译，查看编译后的文件，可以看到 `class` 是整个被编译了，然后 `Symbol` 、`Promise` 、`includes` 、`iterator` 等 API 都是采用全局污染的方式处理：

```js
"use strict";

require("core-js/modules/es.symbol.js");

require("core-js/modules/es.symbol.description.js");

require("core-js/modules/es.object.to-string.js");

require("core-js/modules/es.promise.js");

require("core-js/modules/es.array.includes.js");

require("core-js/modules/es.symbol.iterator.js");

require("core-js/modules/es.array.iterator.js");

require("core-js/modules/es.string.iterator.js");

require("core-js/modules/web.dom-collections.iterator.js");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var sym = Symbol();
var promise = Promise.resolve();
var arr = ["arr", "yeah!"];
var check = arr.includes("yeah!");

var Person = function Person() {
  _classCallCheck(this, Person);
};

;
new Person();
console.log(arr[Symbol.iterator]());
```

## 5. 安装 @babel/plugin-transform-runtime

从上面的编译结果可以看出，polyfill 被添加到全局范围，会存在原型链污染的问题。这样一来如果还用到了 bluebird 之类的第三方 polyfill 可能会受到影响。为了避免这种情况，我们可以使用 `@babel/plugin-transform-runtime` 插件：

```bash
$ npm i @babel/plugin-transform-runtime -D
```

然后在 `babel.config.js` 中添加如下配置：

```js
module.exports = {
  presets: [
    [
      "@babel/preset-env",
      {
        useBuiltIns: "usage",
        corejs: 3
      }
    ]
  ],
  plugins: [
    [
      '@babel/plugin-transform-runtime',
      {
        // false 从 @babel/runtime 中引入 helper 函数
        // 2 从 @babel/runtime-corejs2 中引入 helper 函数和 polyfill
        // 3 从 @babel/runtime-corejs3 中引入 helper 函数和 polyfill
        corejs: 3,
        helpers: true,
        regenerator: true,
        useESModules: true,
      },
    ],
  ]
}
```

再次执行编译，结果如下：

```js
"use strict";

var _interopRequireDefault = require("@babel/runtime-corejs3/helpers/interopRequireDefault");

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime-corejs3/helpers/esm/classCallCheck"));

var _symbol = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/symbol"));

var _promise = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/promise"));

var _includes = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/instance/includes"));

var _getIterator2 = _interopRequireDefault(require("@babel/runtime-corejs3/core-js/get-iterator"));

var sym = (0, _symbol["default"])();

var promise = _promise["default"].resolve();

var arr = ["arr", "yeah!"];
var check = (0, _includes["default"])(arr).call(arr, "yeah!");

var Person = function Person() {
  (0, _classCallCheck2["default"])(this, Person);
};

;
new Person();
console.log((0, _getIterator2["default"])(arr));
```

对比上一次编译可以看出，polyfill 不再添加到全局范围，因此不会产生原型链污染的问题。另外 `@babel/plugin-transform-runtime` 从 `@babel/runtime-corejs3` 统一引入 hepler 函数，而不是将 helper 函数直接定义在当前模块内，例如上面编译结果中的 `_classCallCheck2` ，这在一定程度上可以减小打包后的体积，避免某些模块重复打包。

这边总结下 `@babel/plugin-transform-runtime` 主要的三个作用：

- 自动引入 `@babel/runtime/regenerator` ，当你使用了 `generator/async` 函数 (通过 `regenerator` 选项打开，默认为 `true`)
- 提取一些 babel 中的 helper 函数来达到减小打包体积的作用
- 如果开启了 `corejs` 选项(默认为 `false`)，会自动建立一个沙箱环境，避免和全局引入的 polyfill 产生冲突

看大佬的文章说 `@babel/plugin-transform-runtime` 不会对实例方法进行 polyfill ，例如数组的 `includes` 和 `filter` ，但是对静态方法会进行 polyfill ，例如 `Array.isArray` 。

经过本人实验，这是在 `corejs` 配置项设为 `2` 的结果：

```js
var _interopRequireDefault = require("@babel/runtime-corejs2/helpers/interopRequireDefault");
var _isArray = _interopRequireDefault(require("@babel/runtime-corejs2/core-js/array/is-array"));

var arr = ["arr", "yeah!"];
var check = arr.includes("yeah!");

(0, _isArray["default"])([1, 2]);
```

不过 `corejs` 设为 `3` 之后，实例方法就会被 polyfill ：

```js
var _interopRequireDefault = require("@babel/runtime-corejs3/helpers/interopRequireDefault");
var _includes = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/instance/includes"));
var _isArray = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/array/is-array"));

var arr = ["arr", "yeah!"];
var check = (0, _includes["default"])(arr).call(arr, "yeah!");

(0, _isArray["default"])([1, 2]);
```

## 参考

[@babel/plugin-transform-runtime](https://babeljs.io/docs/en/babel-plugin-transform-runtime)
