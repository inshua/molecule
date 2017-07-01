#molecule html组件化技术

![overview](images/molecule-overview.png?raw=true)

molecule 框架基于 html 技术本身，实现了 html 的组件化。

* molecule 组件将 js 与 html 合为一体，每个 html 块都可以形成组件
* molecule 开发过程先形成可以运行的功能，再将其组件化，符合先原型后复用的软件工程思想
* molecule 无需使用 js 生成 html，html 是 html, js 是 js，混合而不杂乱
* molecule 组件页面总是能运行的，不需要写单独的 demo 网页
* molecule 切割巧妙，可以和 jQuery 组件互通

-------------

在 a.html 上有这样一个小部件，点击按钮，其旁边文本框的内容就变成大写
```html
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Molecule</title>
<script src="../jslib/jquery-3.2.1.js"></script>
<script src="../jslib/molecule.js"></script>
</head>
<body>
	<div>
		<input value="Hello World"><button id="bnUpperCase">Upper Case</button>
	</div>
</body>
<script>
	$('#bnUpperCase').click(function(){
		var $tx = $(this).parent().find('input');
		$tx.val($tx.val().toUpperCase());
	})
</script>

</html>
```
![molecule 1](images/molecule-1.png?raw=true)

下面使用 molecule 技术将该小模块组件化。

```html
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Molecule</title>
<script src="../jslib/jquery-3.2.1.js"></script>
<script src="../jslib/molecule.js"></script>
</head>
<body>
	<template>
		<div molecule-def="AmazingMolecule">
			<input value="Hello World"><button id="bnUpperCase">Upper Case</button>
			<script constructor>
				this.$el.find('#bnUpperCase').click(function(){
					var $tx = $(this).parent().find('input');
					$tx.val($tx.val().toUpperCase());
				})
			</script>
		</div>
	</template>
	<!-- 创建 3 个实例 -->
	<div molecule="AmazingMolecule"></div>
	<div molecule="AmazingMolecule"></div>
	<div molecule="AmazingMolecule"></div>
</body>

</html>
```

![molecule 2](images/molecule-2.png?raw=true)

molecule是基于 html 的组件技术。

当需要定义 molecule 时，先选择模板元素，将其置入 `template` 中，在该元素上加上 `molecule-def`,之后将原来分散在页面各处的支配该组件的脚本纳入到元素内，在 `script` 块加上 `constructor` 属性，使该块成为 `molecule 构造函数`，一个 molecule 就定义完成了。

`molecule 对象`的基类为 `Molecule`，定义于 `jslib/molecule.js`。molecule 构造函数中， 可以通过 `this.$el` 访问本对象所依附的 html 元素，为了编写组件方便，`this.$el` 已经是一个 jQuery 对象，如需要访问 html元素可以使用 `this.el`。

上面这个例子虽小，所揭示的是 molecule 一般的开发过程。通常制作一个 molecule 组件，都是从编写实际能运行的 html 开始，页面原型可以运行了，简单的做一下包装形成组件即可。其过程可以类比 d2js 后端开发，后端开发从数据库 sql 开始，sql能用后，简单的复制粘贴即得到 d2js 服务。这种从原型到组件的开发方式大大优于设计先行的事前诸葛亮的方式。

## molecule 实例可以附加自己 html 属性

每个 molecule 实例，可以加上自己的样式，或者在内部加入其它HTML元素，就像一个真正的 html 元素一样。

```html
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Molecule</title>
<script src="../jslib/jquery-3.2.1.js"></script>
<script src="../jslib/molecule.js"></script>
</head>
<body>
	<template>
		<div molecule-def="AmazingMolecule" class="red">
			<style> <!-- molecule 是 html css js 的结合体 -->
				.red, .red>input, .red>button{
					color: red;
				}
				.blue, .blue>input, .blue>button{
					color: blue;
				}
				.green-bg > input{
					background: lime;
				}
			</style>
			<input value="Hello World"><button id="bnUpperCase">Upper Case</button>
			<script constructor>
				this.$el.find('#bnUpperCase').click(function(){
					var $tx = $(this).parent().find('input');
					$tx.val($tx.val().toUpperCase());
				})
			</script>
		</div>
	</template>
	<!-- 创建 3 个实例 -->
	
	<!-- 自动获得 class="red" -->
	<div molecule="AmazingMolecule"></div>
	<!-- class="blue"覆盖原有的class="red", 拥有自己的 style="float:right"  -->
	<div molecule="AmazingMolecule" class="blue" style="float:right"></div> 
	<!-- 在自动获得的 class="red"上附加 green-bg --> 
	<div molecule="AmazingMolecule" class="+ green-bg"></div> 
</body>

</html>
```
![molecule css](images/molecule-css.png?raw=true)

`molecule-def` 可以有自己的默认属性，实例自动继承定义时的属性，也可以拥有自己的属性，可以用自己的属性覆盖原来的属性。

对于 `class` 属性, 可以使用 `+` 表示延续 `molecule-def` 的样式再附加上自己的 `class`。

## molecule 的参数化

现在我们希望这个神奇的小组件除了支持转为大写，也要能支持转为小写，要支持属性中提供配置参数。

### 通过扩充 html 标记实现参数化

```html
	<template>
		<div molecule-def="AmazingMolecule" data-action="upper">
			<input value="Hello World"><button>Upper Case</button>
			<script constructor>
				var bn = this.$el.find('button');
				if(this.$el.data('action') == 'upper'){
					bn.html('Upper Case')
				} else {
					bn.html('Lower Case')
				}
				var me = this;
				bn.click(function(){
					var $tx = $(this).parent().find('input');
					if(me.$el.data('action') == 'upper'){
						$tx.val($tx.val().toUpperCase());
					} else {
						$tx.val($tx.val().toLowerCase());
					}
				})
			</script>
		</div>
	</template>
	<!-- 创建 2 个实例 -->
	<div molecule="AmazingMolecule"></div>
	<div molecule="AmazingMolecule" data-action="lower"></div>
```

![molecule init params](images/molecule-params.png?raw=true)

### molecule对象对外暴露方法供运行时调整

```html
	<template>
		<div molecule-def="AmazingMolecule">
			<input value="Hello World"><button>Upper Case</button>
			<script constructor>
				this.action = 'upper';
				
				var bn = this.$el.find('button');
				this.setAction = function(action){
					this.action = action;
					if(action == 'upper'){
						bn.html('Upper Case')
					} else {
						bn.html('Lower Case')
					}
				}
				
				var me = this;
				bn.click(function(){
					var $tx = $(this).parent().find('input');
					if(me.action == 'upper'){
						$tx.val($tx.val().toUpperCase());
					} else {
						$tx.val($tx.val().toLowerCase());
					}
				})
			</script>
		</div>
	</template>
	<div id="sample" molecule="AmazingMolecule"></div>
	<script>
		$(function(){
			setTimeout(function(){
				// 通过 $('#sample').molecule() 获取 molecule 对象
				var m = $('#sample').molecule();
				// 调用对象提供的方法设置参数
				m.setAction('lower');		
			}, 2000);
		});
	</script>
```

可以看到，在页面刚加载时，按钮显示为 `Upper Case`, 点击按钮文字变为大写，页面加载2秒后，按钮就变为 `Lower Case`，点击按钮文字变为小写。

这里，molecule 实例可以通过 `$(元素).molecule()` 获取它的程序对象，也就是构造函数所创建的 js 对象，即所谓 `molecule 对象`。通过这个对象可以控制 molecule 的行为。

## molecule 的组合

molecule 可以继续参与组合更复杂的 molecule， 例如第一版的转大写组件，现欲在其旁边加一个按钮，实现转小写功能，通过组合实现。

```html
	<template>
		<div molecule-def="AmazingMolecule">
			<input value="Hello World"><button id="bnUpperCase">Upper Case</button>
			<script constructor>
					this.$el.find('#bnUpperCase').click(function(){
						var $tx = $(this).parent().find('input');
						$tx.val($tx.val().toUpperCase());
					})
			</script>
		</div>
		<div molecule-def="AmazingMoleculeEx" init-children-first>
			<div molecule="AmazingMolecule"></div>
			<button id="bnLowerCase">Lower Case</button>
			<script constructor>
				this.$el.find('#bnLowerCase').click(function(){
					var $tx = $(this).parent().find('input');
					$tx.val($tx.val().toLowerCase());
				})
			</script>
		</div>
	</templat>
	<div molecule="AmazingMolecule"></div>
	<div molecule="AmazingMoleculeEx"></div>
```

在创建外层的 molecule时，内层的 molecule 的构造函数已先调用，所以外层的molecule的构造函数可以访问内层的molecule对象。

![molecule combine](images/molecule-combine.png?raw=true)

## molecule 的继承

`molecule` 采用 prototype 的方式实现继承。当 `molecule-def` 本身是一个 `molecule` 实例时，其行为就表现为继承。

例如第一版的转大写组件，可通过继承实现在其旁边加一个按钮，实现转小写功能，：

```html
	<template>
		<div molecule-def="AmazingMolecule">
			<input value="Hello World"><button id="bnUpperCase">Upper Case</button>
			<script constructor>
				this.$el.find('#bnUpperCase').click(function(){
					var $tx = $(this).parent().find('input');
					$tx.val($tx.val().toUpperCase());
				})
			</script>
		</div>
		<div molecule-def="AmazingMoleculeEx" molecule="AmazingMolecule">
			<button id="bnLowerCase">Lower Case</button>
			<script constructor extends>
				this.$el.find('#bnLowerCase').click(function(){
					var $tx = $(this).parent().find('input');
					$tx.val($tx.val().toLowerCase());
				})
			</script>
		</div>
	</template>
	<div molecule="AmazingMolecule"></div>
	<div molecule="AmazingMoleculeEx"></div>
```
可见，molecule 的继承思路与 js 的 prototype 原型链相似。实际创建时，先实例化父类，然后再叠加上子类自身的特征并执行子类的 molecule 构造函数。

在子类molecule构造函数中可以使用 `this` 访问原型 molecule。

![molecule combine](images/molecule-inherit.png?raw=true)


## molecule-placeholder

就像html标记一样，molecule实例也可以围合html。何谓围合html，像如下结构：
```html
<div molecule-def="MyMolecule">
	<span>dog</span>
</div>
<div molecule="MyMolecule">bone</div>
```
MyMolecule实例化后，`bone`默认位于 `dog` 之后。

如需要将 bone 放在 dog 之前，或其它自己想要围合的位置，可以使用 molecule 定义的特殊 tag：` <molecule-placeholder />`，用法如：

```html
<template>
	<div molecule-def="MyMolecule">
		<molecule-placeholder />
		<span>dog</span>
	</div>
</template>
<div molecule="MyMolecule">bone</div>
```

![molecule inject](images/molecule-inject-pos.png?raw=true)

除用于围合外，molecule-placeholder　也支持按 id 替换。

如示例中：

```html
	<template>
		<div molecule-def="A">
			from <span molecule-placeholder="p1" required></span> to <span molecule-placeholder="p2">New York</span>, exhaust 80 days
		</div>
		
	</template>
	
	<div molecule=A>
		<span molecule-replace="p1">Tokyo</span>
	</div>
	
	<div molecule=A>
		<span molecule-replace="p1">Peking</span>
		<span molecule-replace="p2">Konton</span>
	</div>
```

通过命名 p1 p2，及指定实例的 molecule-replace ，可以替换指定的 molecule-placeholder。

## molecule-slot and molecule-plug

molecule-placeholder 总是将占位元素删除，有时只希望实例将元素插入到原型相应的位置。此时 molecule-slot 和 molecule-plug 更有效。

如：

```html
	<template>
		<div molecule-def="Window">
			<div molecule-slot="toolbar">
			</div>
		</div>
		
	</template>
	
	<div molecule="Window">
		<button molecule-plug="toolbar">Open</button>
		<div molecule-plug="toolbar" class="edit band">
			<button>Copy</button>
			<button>Cut</button>
			<button>Paste</button>
		</div>
	</div>
```

## Table 元素的处理

在html中，td tr 等元素只能从属于相应的父节点。如 tr 只能属于 thead,tbody,tfoot,table中的一个，如将其置于 div 中，会由于归属问题导致事实上插入失败。

molecule 可自动处理 tr td 等表格元素。但需要将实例的元素改写为 `m:tr`, `m:td`, `m:th` 等等的形式。

另外，在声明部分的 placeholder 不能使用 `<molecule-placeholder>`，应使用 `<template molecule-placeholder>`。这是因为 `template` 可以放入任意元素中。

```html
	<div molecule-def="A">
		<table>
			<thead>
				<tr>
					<!-- template 可以插入到 table 元素下而不产生排斥反应，所以在这种场景应使用 template molecule-placeholder --> 
					<template molecule-placeholder></template> 
				</tr>
			</thead>
		</table>
	</div>
	<div molecule="A">
		<m:td>name</m:td>
	</div>
```

对于原型为 table 元素的 `molecule-slot`，其实例 `molecule-plug` 的写法如下：

```html
	<template>
		<table molecule-def="A" border="1">
			<caption molecule-slot="caption"></caption>
			<thead molecule-slot="thead">
			</thead>
		</table>
	</template>
	
	<table molecule=A>
		<template molecule-plug="caption">Table 1</template>
		<template molecule-plug="thead"> <!-- template 包含的各个 td 都插入到原型 slot 中 -->
			<td>name</td>
			<td>email</td>
			<td>address</td>
		</template>
	</table>
```

## molecule 与 d2js 的渲染收集

对molecule渲染和收集，需要 molecule 构造函数中提供名为 `getValue` 和 `setValue`的两个函数，指定渲染器为 `renderer="molecule"`，收集器的第一个管道函数为 `m`，如 `m|s` 或 `m|oc`。

```html
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Molecule</title>
<script src="../jslib/jquery-3.2.1.js"></script>
<script src="../jslib/molecule.js"></script>
<script src="../jslib/d2js/dataset.js"></script>
<script src="../jslib/d2js/render.js"></script>
<script src="../jslib/d2js/collector.js"></script>
<script src="../jslib/d2js/renderers.js"></script>
<script src="../jslib/d2js/pipelines.js"></script>


</head>
<body>
	<template>
		<div molecule-def="AmazingMolecule">
			<input value="Hello World"><button id="bnUpperCase">Upper Case</button>
			<script constructor>
				this.$el.find('#bnUpperCase').click(function(){
					var $tx = $(this).parent().find('input');
					$tx.val($tx.val().toUpperCase());
				})
				this.getValue = function(){return this.$el.find('input').val().toUpperCase();}
				this.setValue = function(value){this.$el.find('input').val(value);}
			</script>
		</div>
	</template>
	<div id="sample" molecule="AmazingMolecule" renderer="molecule" collector="m|s" data="text"></div>
	<script>
		$(function(){
			var obj = {text : 'Planet'};
			$('#sample').render(obj, true);
			$('#sample').on('input', function(){
				$('#sample').collect(obj, true);
				console.log(obj);
			});
		})
	</script>
</body>

</html>
```

![molecule d2js](images/molecule-d2js.png?raw=true)


## 调试 molecule

molecule-def 的元素在运行时会被移除，创建组件时再次加入，因此其中的js代码已经失去了所属文件信息。这样一来， molecule无法便利的设置断点，只能利用 `debugger` 语句。而在 safari 浏览器中，这种无归属文件的程序进入断点后也无法显示源码，所以，目前无法用 safari 调试 molecule 脚本。

如 molecule 不符合预期，可以在实例元素旁加上 `molecule-trace` 跟踪其实例化过程。

	<div id="sample" molecule="AmazingMolecule" molecule-trace></div>

## 在其它页面使用 molecule

molecule 不但可以用于定义它的网页，也可以作为组件导入到其它页面中使用。

上面的示例中，使用的页面名称为 a.html，放于网站 d2js，即，路径为 http://host:port/a.html。在同级目录创建 b.html。

```html
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Molecule</title>
<script src="../jslib/jquery-3.2.1.js"></script>
<script src="../jslib/molecule.js"></script>
<script>
	Molecule.loadHtml('a.html')
</script>
</head>
<body>
	<div molecule="AmazingMolecule">
</body>
</html>
```

可以看到，`/a.html` 中定义的molecule _AmazingMolecule_ 已经在 b.html 实例化了。

这种加载方式是通过 `DOMParser` 在浏览器实现的。

使用 d2js 服务器技术时，除了该方式，还可以将 a.html 放在 `molecules 文件夹`，在浏览器地址栏输入 `molecules/extract.jssp`, 该 `extract.jssp` 运行后，a.html 中的 molecule 即进入组件库（生成 namespace.json 文件），这种方式自动在服务器按需加载 molecule：

```html
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Molecule</title>
<script src="../jslib/jquery-3.2.1.js"></script>
<script src="../jslib/molecule.js"></script>
</head>
<body>
	<div molecule="AmazingMolecule">
</body>
</html>
```


## 常用的 molecule

在 molecules 文件夹中， `basic.html`, `trigger.html`, `tree.html` 提供了很多常用的组件，包括`表格`、`对话框`、`树`、`下拉树`等等，相信可以给开发带来较大帮助。 这些组件分别有 bootstrap 和 semantic-ui 两种版本，可按自己需要选择。和所有 molecule 组件一样，组件页面本身可以独立运行。

此外，很多 jquery 组件都可以较轻松的包装为 molecule 组件。

例如，使用 jquery 方式的 semantic-ui 的 toggle 组件如下：
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>molecule</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="../jslib/jquery-3.2.1.js"></script>
	<link href="../jslib/semantic-ui/semantic.css" rel="stylesheet" media="screen">
	<script src="../jslib/semantic-ui/semantic.js"></script>
    <script src="../jslib/molecule.js"></script>
</head>
<body>
	<div id="switch" class="ui toggle checkbox"><label>Agree</label><input type="checkbox"></div>
	<script>
		$(function(){$('#switch').checkbox();});
	</script>
</body>
</html>
```
将它转为 molecule 组件：

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>molecule</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="../jslib/jquery-3.2.1.js"></script>
	<link href="../jslib/semantic-ui/semantic.css" rel="stylesheet" media="screen">
	<script src="../jslib/semantic-ui/semantic.js"></script>
    <script src="../jslib/molecule.js"></script>
</head>
<body>
	<template>
		<div molecule-def="Toggle" class="ui toggle checkbox">
			<label></label>
			<input type="checkbox">
			<script constructor>
				this.$el.find('label').html(this.$el.attr('label'));
				this.$el.checkbox();	// 初始化jQuery组件
				// 为 d2js 提供 getValue 和 setValue，也可以单独调用如 $ele.molecule().getValue()
				this.getValue = function(){return this.$el.find('input').prop('checked');}
				this.setValue = function(value){return this.$el.find('input').prop('checked', value);}
			</script>
		</div>
	</templat>
	<!-- sample -->
	<div molecule="Toggle" label="Do You Agree?"></div>
</body>
</html>
```

![molecule toggle](images/molecule-toggle.png?raw=true)

## 其它问题

### 无法嵌套 script 的元素如何嵌套 molecule 构造函数

像 `input`,`img` 这样的元素，不支持嵌套 `<script>`。对于这样的元素，可以在下一个节点放一个 `molecule-for=MOLECULE名`的 script 块，如：

```html
<input molecule-def="MyInput">
<script molecule-for="MyInput" constructor>
	...
</script>
```

同样，style 也可以采用这种方式放在 tag 外。

### molecule 手工初始化

molecule 实例可以声明为 `molecule-init="manual"`，这样这个 molecule不会自动创建。手动创建 molecule 可以调用
	
	Molecule.init(ele, true)
	
或

	$ele.molecule()
 
jQuery 函数 molecule()如已实例 molecule 则返回 molecule 对象，还未实例化时则实例化 molecule并返回实例化后的 molecule对象。

### molecule析构函数

molecule 构造函数中，可以定义析构函数：

```js
	this.dispose = function(){
	...
	}
```
	
molecule 的析构过程由 Document 的 `DOMNodeRemoved` 事件引发，也即，节点从 Document 移除时，其关联的 molecule 即移除。

但有时并不希望发生 DOMNodeRemoved 时移除 molecule，例如，节点可能只是暂时不属于 Document，但是后面仍将添加回 Document，或移动节点到新的父节点，这时可以指定该实例的 html 属性 `molecule-auto-dispose` 为 false。

```html
	<div molecule="AmazingMolecule" molecule-auto-dispose="false"></div>
```

不提供析构函数的 molecule　不会被自动清除，无需声明 molecule-auto-dispose。
-----
关于 molecule 更多内容，请参考 `molecule-test` 中的示例。
