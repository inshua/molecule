<el m-attr:type:r="a"> </el>

* m- 是否是自定义属性
* type 数据类型
* r 指定是否在 render 时作用。在 molecule 原型中可出现，实例化时不能出现。

实例化过程：
    
    构造属性，生成 construtor.defaultProps。其中，类型为 x 和 e 的生成于构造函数。
    render 用属性，作为 setAttr 语句生成于 render 函数。
    子元素的属性，用于 constructor 的 props 参数。

    子元素的创建放在 render 函数，可通过 diff 实现删除。
    
在 molecule 原设计中 m-def m 同时使用可实现继承的效果，在本设计中是否能达到同样的效果呢？
    如果一个 prototype 中既有 m 又有 m-def，貌似只要执行 super(props) 就能将 props 传到父类，但很难分出哪些属性应归纳为子类的 defaultProps。 `均视为 defaultProps 即可，因 defaultProps 也有覆盖`

#生命周期

##react 的生命周期

[React生命周期浅谈 - 王磊同学小讲堂 - SegmentFault 思否](https://segmentfault.com/a/1190000009461717)
[图解ES6中的React生命周期 - 掘金](https://juejin.im/post/5a062fb551882535cd4a4ce3)

getInitialState
getDefaultProps
componentWillMount(once)
render
componentDidMount(once)

##molecule生命周期

DOM 生成为
```js
getDefaultProps(){      // 常量类型的初始属性，从 Constructor.defaultProps mixin 并初始化，该函数为 Molecule 基类提供，可覆盖。

}
init(){     // 表达式类型的初始属性，整体在 init 函数中初始化。

}
getInitialState(){  // 获取初始状态，可在 constructor 中通过 this.state = {}... 设置，这是一个入口

}

renderDOM(){        // 从 DOM 生成渲染函数，含维护子元素

}
```

script 中放置 
```js 
constructor(){      // 构造函数
   
}
render(){           // 渲染函数，Molecule 基类中，该函数直接调用 this.renderDOM()

}
```

###html attribute 与 dom property
[[译]HTML attribute与DOM property之间的区别？ - 南洋前端 - SegmentFault 思否](https://segmentfault.com/a/1190000008781121)

存在以下几种属性:

1. 有对应的 html attribute 的 dom property
    1. html attr - prop 完全对应，prop 正好也是 string 类型
    1. html attr - prop 类型不同，表述不同，但能对应，如 style, className, checked, data- 等
1. 是原生 attribute，但没有对应的 property，如 aria- 相关的一堆属性
1. customer attribute，没有对应的 dom property，且用户比较在意，需要显示在 HTML 中，但是这种 customer attribute 显然只能是字符串。
1. customer property。用 html attr 说明纯属无奈之举。
1. molecule property。也用 html attr 说明。

后二者 molecule property 和 customer property 可以归并。
* customer/molecule property 用 html attr 说明，当有变化或实例化时是否需要回显(更新 html)? 
    * NO，可以像 react 一样开发 devtool 显示 molecule
    * 对于简单类型的予以回显，对象类型不回显
        * 如对象类型不回显，在实例化时就不会以 html attr 呈现出来，所以只在Design阶段存在，用户阶段从始至终看不到
        * 对象类型在使用阶段提供，也是允许的，但此种情形不能支持回显。`TODO: 也应能支持。需要先记录下这些纯运行时属性（需要排除 m= m-def= 同时存在的情形）。`

如上述 customer prop 支持回显，则实际上与 customer attribute 已经一样。

综上，对于基本类型的 customer attribute/customer property/molecule property 合并对待，对于复合类型的 molecule property 支持用 html attr 说明，但不回显。

对于没有对应 prop 的 attr，技术上视同 custom attribute。

也就是说只有2种：
1. 有对应 prop 的 attr，原生 attr
1. 无对应 prop 的 attr，无论是否原生 attr

前者：prop 归纳于原生 prop，attr 支持回显（原生支持）
后者：prop 归纳于 instance.props，同时也作为 dom.prop 登记，attr 支持回显，由于属性设置时具有类型，回显时也要支持类型。最好全部支持而不局限于 string。


###attribute - property 映射表

https://www.quackit.com/html/html_cheat_sheet.cfm
http://overapi.com/html-dom
http://www.cheat-sheets.org/sites/w3cdom.org/

https://www.w3.org/TR/2015/WD-html51-20151008/
https://www.w3.org/TR/2015/WD-html51-20151008/semantics.html 

https://github.com/Microsoft/vscode-html-languageservice/blob/62efc4b0768640e0c1f5f67974205e0c4abbfaf7/src/parser/htmlTags.ts

最终从 vscode 源码得到所有属性表————然而这并不是 dom 属性表。但要推出所有 dom 属性也很容易。

通过程序得到了所有 attr-prop 映射表。

映射表的用法：通过 attr 查 prop，如存在，则属于原生属性，如不存在，则视为非原生属性（attr 存在 prop 为空也视为 attr 不存在）。

修改原生 prop 会自动找到相应的 attr 更新，如无 attr 的，既然已经登记到 instance.props，则通过 molecule 的回显机制也可实现回显。
修改非原生 prop，则自己定位到 attr 更新之。


###实例化

实例化的原则是，对于 Molecule propDescs 中提到的属性，实例化时应逐个获取 attribute 设置值，将其设置到 props。对于 Molecule propDescs 没有提到的属性，全部可以忽略。

对于声明为 :r  的属性，放在 renderInstance() 中。也就是说实例化除了在 props 阶段有一个 merge prop 的过程，对实例还需插一个 renderInstance 函数。

###sample

```js
class Test extends Molecule {
	init() {
		super.init();
    }
    renderChildren(){
        // generated code for render children        
        this.appendChild(key:'randomKey-1', tag:'div', props: props)  //html
        this.appendChild(key:'randomKey-2', tag:'div', molecule:'Molecule2', props: props)  // molecule
        this.appendChild(key:'randomKey-3', tag:'div', molecule:'Molecule2', props: props, parent:'randomKey-2')  // sub-children molecule
        
        this.appendChild(key:'randomKey-2', tag:'div', molecule:'Molecule2', props: props, children:[
            this.create(key:'randomKey-3', tag:'div', molecule:'Molecule2', props:props2),
            this.create(key:'randomKey-3', tag:'div', molecule:'Molecule3', props:props2)
        ])  // direct give children

        this.assignChildren([this.create('randomKey-1', 'div', props, [this.create(...), ...])])  // direct set children, allow drop all children gone

        // the last mode selected. so <for></for> label compiled to a iterator
    } 
}
Test.defaultProps = {       // Prop(value, type, isRuntime, isNative)
	id: Prop("test2", 's', true, false),
	title: Prop("test title", 's', true, false),
    value: Prop("value not belong to div", 's', true, false),
    attr6: Prop(function(){return 1+2}, 's', true, false),
    draggable: Prop(true, 'b', true, true),
    click: EventHandler(function(){return this.handleClick}, 'e', true, true)
    test: EventHandler(function(){return this.test}, 'e', true, false)
};
```

##if 的代码生成

```html
<if cond="cond1">
    <div>1</div>
    <else cond="cond2">
        <div>2</div>
    </else>
    <else>
        <div>3</div>
    </else>
</if>
```

此段是否可生成
```js
    If(cond1, [this.create('div1')], cond2, [this.create('div2'), [this.create('div3')]])
```

答案是否定的，因为这样会三选一的创建过程变为各个都创建但是只取一个，例如只有 cond1 成立，但 div2 div3 都会创建。

因此必须生成真正的 if 语句。生成一个函数是比较合适的：

```js
[...].concat((function(){
    if(cond1){
        return [this.create('div1')]
    } else if(cond2){
        return [this.create('div2')]
    } else {
        return [this.create('div3')]
    }
}).call(this)).concat(...)
```

当代码出现 `<if>` `<for>` `"{}"` 时，应当切割出 `].concat(...).concat([`。 这样可以在形式上保证整个代码依然是一个数组。

使用 iterable 应当是更好的选择。

##for 的代码生成

```html
<for init="init" end="end" inc="">
    <div key=""></div>
</for>
<for it="" of="">
    <div key=""></div>
</for>
<for it="" in="">
    <div key=""></div>
</for>
```

for 循环创建的元素，其key必须显式指定，且其子元素的 key 应从父级得到（考虑 for 嵌套）。因此应先生成父元素再生成子元素。

为了实现for，代码必须表现为

```js
    currEle = this.create(xx);
    children = [...];
    currEle.setChildren(children);

    currEle = children[2];
    currEle.setChildren();      // 必须使用堆栈跟踪当前元素和 children
```

也就是说先创建父元素再创建子元素。但是当子元素里有嵌套时这个活动很难进行。

也许将 children 变为一串函数是一个可取的做法。也就是说

```js
    this.assignChildren([this.create(...), this.create(...)])
```
改为

```js
    this.assignChildren([(parent)=> this.create(...), (parent)=> this.create(...)])
```

这样所有 children 都不会立即创建，过程将表现为一个闭包一个闭包的展开，先展开父再展开子。采用这种办法上面 if 面临的问题也解决了。

##{{children}}的代码生成

在 text node 里可以放置 {{children}}。

这种代码如何生成呢？

children 将得到一个生成 [] 的表达式，若干个 {{children1}}{{children2}}{{children3}}... 得到 concat().concat().concat()。

表达式里存放的是 ()=> wrap(children1)，

其中 wrap 实现为，
如数组里放置的是 html node，生成 create;
如数组里放置的是 string，生成 createString;
如放置的是一个值, 生成 [createString]

;

## 代码生成

综上所述，代码生成还是用堆栈形态一行行生成较好。

```js

var curr = this;
var children = [];

children.push(this.create('c1'));    
children.push(this.create('c2'));    

stack.push([curr, children]);   // c3 has children
curr = this.create('c3');       
children.push(curr)
children = []
    children.push(this.create('c3-1'));
    children.push(this.create('c3-2'));
curr.assignChildren(children);
curr, children = stack.pop();   // c3 end

stack.push([curr, children]);   // c4 has children
curr = this.create('c4');
children.push(curr)       
children = []
    children.push(this.create('c4-1')); 
    
    stack.push([curr, children]);   // c4-2 has children
    curr = this.create('c4-2');       
    children.push(curr)
    children = []
        children.push(this.create('c4-2-1')); 
        children.push(this.create('c4-2-2'));
    curr.assignChildren(children);
    curr, children = stack.pop();   // c4-2 end
curr.assignChildren(children);
curr, children = stack.pop();       // c4 end

children.push(this.create('c5'));

curr.assignChildren(children)       // end

```

该生成方式本身没有问题。

但是存在一个棘手的其它角度的问题。这个问题来自 expression 类型的 attribute。设想有一个 attribute 是 `width = parent.width * 0.5`。 在创建过程中，assignChidlren 前，容器自己也没有一个确切的宽度。另外，当元素还没有加入 DOM 树时，也不可能计算一些依赖于 document 的表达式。

所以在 react 中又引入了一个 `componentDidMount()` 以切入挂树事件（react 挂的是 vdom，挂树在先 render 在后）。也就是在上面代码的 `//end` 后执行。

我可以将标记为 runtime 的表达式都放到挂树后执行。顺序应该是深度递归的。也可以将表达式属性分为 runtime 和 mount 两种，其中 runtime 类型的在 mount 和 render 时均执行，mount 类型的只在挂树时执行（通常只执行一次）。

是否可以将非 runtime 的表达式统一放在挂树时执行呢？似乎是可以的。

如何判断有没有挂树呢？主要看发起 create 的 molecule 其 element 能不能上溯到 document.body。

综上，此法可解决前面的所有问题。

##{{children}} 的问题

在中间嵌入的 children 有
* string。 作为 textContent 的 text node 或作为 innerText。
* dom element / dom elemenets。 前者应自动转为数组。 这种 children 表达式只能是 runtime，所以只能运行于 render 过程。其标注没有提供 html 定义，所以不能从 html compile to js。对应只能生成 `children.extends(this.wrapChildren({{the code}}))。`。

# key 的生成

key 可以由用户自己指定（指定时需保证唯一性），但主要还是自动生成。

生成方法为: 父节点的 key + this.nextKey()

当用户自己提供key时，用户所给的 key 最好能与父节点的 key 合并这样才能足够唯一。用户所给的 key 基本是局部域唯一的，如 id 作为 key，其通常表现为 1,2,3,4... 很容易与生成的 key 冲突。

这个问题的起因是容器和直属容器分离了。更根本的原因是，`this.create('div', null, [this.create(),])` 这样必然要求先创建 children 后创建 parent。

如果能将元素从 container 移到真正的直属容器，则问题可以消除。key 可以局部化。

有两个办法让直属容器真正扮演容器。

1. 指令式创建，一行一行的跑，先创建父再创建子。因此代码生成没有这个问题。代码生成是指令式的。
1. 数组里不要提供 `[this.create(), this.create()]`，代之以纯粹的 json，如 `[{tag:'div', prop1:'', prop2:''}]`, 从纯 JSON 生成，则可以自主控制顺序，确保先创建父元素。
1. 数组里提供的是 `[()=> this.create(), ()=>this.create()]`，都是生成器，这样也可以先创建父元素。


# 生成方式

综上，还是以数据形式提供树较好。

像 https://github.com/Matt-Esch/virtual-dom 这种框架和 react。使用的形式如下：
```js
var VNode = require('virtual-dom/vnode/vnode');
var VText = require('virtual-dom/vnode/vtext');

function render(data) {
    return new VNode('div', {
        className: "greeting"
    }, [
        new VText("Hello " + String(data.name))
    ]);
}

module.exports = render;
```
在创建期就可以调用 VNode 返回 Virtual DOM Node，这是因为它有 vdom 和实际 dom 完全分离。而我并没有实现真正的 vdom，只是实现了 dom children 的整体比对更新而已。

所以人工代码类似：

```js
    this.assignChildren([{$:'h1', children:[{$:'string', textContent:'hello world'}]}]);
```
生成的代码类似:

```js
    let predicate1 = ()=>{
        if(cond){
            return [{$:'string', textContent:'yes'}];
        } else {
            return [{$:'string', textContent:'no'}];
        }
    };
    let loop1 = ()=>{
        return [1,2,3].map((e)=> {$:'div', textContent: e});
    }
    let loop2 = ()=>{
        let r = [];
        for(var i = 0; i<100; i++){
            r.extends([{$:'div', key:i, children:[textContent:'hello ' + i]}]).extends(predicate1())
        }
        return r;
    }
    let children = [{$:'h1', children:[{$:'string', textContent:'hello world'}].concat(predicate1()).concat(loop1)}]
    this.assignChildren(children);
```

前面所说的堆栈形态也是可行的。唯不知是堆栈形态的效率高还是这种形态的效率高。从代码优雅程度来看这个是更漂亮。


##text中包含 {{}} 的处理

这种嵌入式表达式有以下几种情形：

1. 是一个字符串表达式，或一个最终非 HTMLElemnt, Text 之类的表达式。这种表达式可以简单的转为 Text，但应确保其 key 每次都一样，不然每次渲染都会移除并重绘上新 Text。其实也未尝不可，毕竟是表达式，相当于 runtime 了。
2. 是一个 HTMLElement 或 Text。对于此种元素，如没有 molecule 应为其安排一个 molecule。如已有 molecule 则沿用，提供方可以自己控制是否提供上一个对象，如提供的是新对象则会发生 remove/add，否则发生 update。
3. 是一个 molecule 定义JSON，即形如：{$:'div', props:{}...} 格式的 js 对象。
4. 是一个数组，其元素是 2。似乎只要继续 assignChildren 即可。
5. 是一个数组，其元素是 1。应作为 1 处理。转为文字即可。
6. 是一个数组，其元素是 3。处理方式类似。

##event 的处理

在书写形式上，event 支持以下几种挂载

prop name 方面，支持:

1. onxxx
1. onxxx:evt
1. onxxx:evt:x

在值方面支持：

1. ="alert(this.props.name)"
2. ="this.handleClick"

值的书写方法中，法1是直接提供表达式，该表达式应包装为函数，形如：

```js
M.defaultProps = {
    click: function(){alert(this.props.name)},
}
new M(el, {click: function(){alert(this.props.name}})   // for instance
```

法2提供的是函数，应包装为：

```js
M.defaultProps = {
    click: function(){return this.handler}
}
new M(el, click: this.handler)   // for instance
```

写法1定义和实例化生成的代码是一致的，写法2不一致，写法2可以认为是一种特例。按写法2提供的表达式在 m-def 中的应包装为一个 Provider，在实例化时却直接使用。写法1是惯例写法，可将写法2包装为 :x。

这也就是说：
```html
<div m-def=M click:evt:x="this.handleClick"></div>
```
转为
```js
M.defaultProps = {
    click: new EventHandlerProvider(this.handler)
}
```
需要在 init 时提取 handler。

而
```html
<div m=M click:evt:x="this.handleClick"></div>
```
转为
```js
new M(el, {click:this.handleClick})
```

写法一
```html
<div m-def=M click:evt="alert(this.props.name)"></div>
```
转为
```js
M.defaultProps = {
    click: function(){alert(this.props.name)}
}
```

```html
<div m=M click:evt="alert(this.props.name)"></div>
```
转为
```js
new M(el, {click:function(){alert(this.props.name)}})
```


# 实例化的问题

如果一个页面全部是组件，最终HTML部分只需要

```html
<div m=Page1></div>
```

这样实例化很简单，因为所有组件都已经转为 js，只需要执行 `new Page1(element)` 即可。

能不能像 molecule 时代意义，任何一段 HTML 加上 molecule=Xxx 立即套用组件呢？

molecule 的设计里这是一个很核心的理念，可以实现一个很好的运行时和设计时的切换。

要实现这种运行时 DOM 直接取用，要处理的问题有：

1. `类型化的属性`。要支持类型化的属性，这些属性可以提取后删除，立即值处理比较简单。
1. `表达式属性`。
    1. 表达式可以转为 InstanceExpr(function(){expr})，这样能例外处理。
1. `事件处理器`
    1. 事件处理器同样有 :r 两种，由于这里没有代码生成，只要设法给出 handler 的值即可。
1. `子元素`
    1. children 不能通过 codedom 编译，通过 assignChildren 似乎也是没有意义的。
    1. 只要把 children 当做一个整体，用 {{children}} 占位，在 assignChildren 时调用该函数返回 childNodes 即可？
        1. 应该返回的是 cloneNode(true), 因为 {{children}} 如放在 <for> 里可以被反复调用 
    1. children 的属性、事件处理器应如何处理？！children中如有 {{}} 应如何处理？！如有 if for 应如何处理？!!
        1. 在理念上，children 作为运行时，应达到和设计时一样，能提供 if for 等标签。这样才能方便的从运行时转为设计时。
        1. 事实上要达到这种目的，只有一个做法，就是把实例直接转为一个匿名的 Molecule class，干掉所有 attributes 和 children 只留下 tag 并以该 class 实例化。缺点是这个组件内的子元素如正在被外界使用会失去引用。
        1. 另外，这些 if for 之类的 tag 在模板里可以套在 tr 外，但在实例化页面里这么做是不行的。
        1. 经测试，即使在 template 中也是不允许的。
        1. 所以我用 <m tag=table></m> <m tag=tr></m> 这种形式来表达，在生成代码环节转换即可

综上，作为匿名 Molecule 类可能是最好的办法。可以生成这样的代码：

```js
    class Temp extends m-def{

    }
    Temp.defaultProps = {}
    return Temp
```
通过 (new Function())(ele) 即可实例化。

##继承，实例中子元素、子类中子元素的问题

在 molecule 原来的设计中，通过 molecule-placeholder 占位的元素在最后被嵌入，其它元素从基类到子类一级一级展开。

在本设计中， `{{children}}` 的效果和 `molecule-placeholder` 并不相同，它可以调整为 `{{this.props.children}}`。

最终希望看到的是：

```js
class T1{
    renderDOM(){
        // emb T2 in return children 
    }
}

class T2{
    renderDOM(){
        // emb T3 in return children. T3's renderDOM as my children
    }
}

class T3{
    renderDOM(){
        // from html 
    }
}
```
为达此目的，`renderDOM` 似乎应该演变为如下 `createChildren`.
```js
class T1{
    createChildren(nested){
        // nested is a function or an array can embed in children
        super.createChildren([/*auto generated code with *netsted* embed in*/]);
    }
}

class T2{
    createChildren(nested){
        super.createChildren([/*auto generated created children code*/]);
    }
}

class T3{
    createChildren(nested){
        super.createChildren([/* me */]);
    }
}
```
这种次序决定了继承可以将子类的元素容纳进父类。如子类需要对父类进行包裹，则不宜采用继承观念，使用简单的容器类是更好的选择。
实际上界面这种东西继承一直不是容易的事。
从 `Component` `Control` `ButtonBase` `Button` 等顺序可以看出，至少前面2种组件都是没有界面的。在 molecule 里，这种组件可以用js方式从 `Molecule` 类直接派生而不是从 DOM 开始。

## 元素删除的处理、删除的动画

现在需要在删除元素时播放一段动画。

由于增加删除动作都是由 assignChildren 维护的，需要从 assignChildren 中分离出一个删除动作。

该删除动作触发 onwillremove 事件，在事件中启动动画，并在播放完后执行 `event.continue()`。因此 assignChildren 应表现为一个 promise 结构。

是一个一个删呢还是并发的删呢？

在 React 的 ReactTransitionGroup 的设计里是这么做的：

```js
  // https://github.com/reactjs/react-transition-group/blob/v1-stable/src/CSSTransitionGroupChild.js
  componentWillAppear = (done) => {
    if (this.props.appear) {
      this.transition('appear', done, this.props.appearTimeout);
    } else {
      done();
    }
  }

  componentWillEnter = (done) => {
    if (this.props.enter) {
      this.transition('enter', done, this.props.enterTimeout);
    } else {
      done();
    }
  }

  componentWillLeave = (done) => {
    if (this.props.leave) {
      this.transition('leave', done, this.props.leaveTimeout);
    } else {
      done();
    }
  }
```

仔细阅读了它的代码，componentWillAppear 来自于 performAppear，而 performAppear 来自 `componentDidMount`，所以这个 componentWillAppear 是自己实现的。
willenter 和 willleave 则来自 `componentDidUpdate`，依靠自己编写代码比对发现哪些元素增加了哪些移除了。见 https://github.com/reactjs/react-transition-group/blob/v1-stable/src/TransitionGroup.js。

从代码可以发现 react 并不是为 animation 设计的，所以提供的支援很少，这部分代码 (自己比对 getChildMapping) 有点黑客了。

React 这个插件实现为两个 vdom 组件 `<TransitionGroup><CSSTransition>` 并将实际的组件包围在里面。这个设计看起来很有意思，实际上有点错乱，按内容层次来说，组件的动画是组件自身的行为，表达为下面的形式更为可取：
```html
    <div onwillenter="this.addClass('').afterAnimate(event.done)" onwillleave="this.attr('class',).afterAnimate(event.done)"></div>
```
显然，这种表达形式太基础太底层，可以通过一种插件的机制来做到更好。
```html
    <div plugins="[...this.props.plugins, transition({name:'test',duration:200})]"></div> <!-- 加入一个 transition 插件 -->
    或
    <div oninited="this.installPlugin('transition', {name:'test',duration:200})"></div> <!-- 加入一个 transition 插件 -->
```
插件可以拦截组件的事件(以 promise 形式切入)，在组件初始化时可以装载插件。

## 生命周期、事件

molecule 按生命周期触发如下事件：

* willinit - 在初始完毕触发(子元素仍未装载，this.element 可以得到)
* willrender - 在即将渲染时触发
* willfill - 在子元素将装载时触发
* filled - 在子元素装载后触发
* rendered - 渲染完毕触发
* inited - 在初始完毕触发(第一次初始化并已渲染完)
* willenter - 在将要加入 DOM 树时触发 后续事件为 TODO
* entered - 加入DOM树后触发
* willswap - 与其它节点交换触发
* willleave - 在将要删除时触发
* leaved - 删除后发生

也可在派生类覆盖同名函数实现定制。

## 交换动画

https://github.com/FormidableLabs/react-shuffle
https://github.com/joshwcomeau/react-flip-move/tree/gh-pages
http://joshwcomeau.github.io/react-flip-move/examples/#/laboratory?_k=o035x8

核心原理：
https://aerotwist.com/blog/flip-your-animations/#the-general-approach

jQuery 的：
https://vestride.github.io/Shuffle/

##代码组织

react 将 html 包裹于 js 中，其代码组织利用了 js 的代码组织方式。呈现出 module - class 这样的层次结构，另外，文件夹有时也能帮点忙。

在 molecule 中，我通过将 script 标签扩充 `m-class` 可以得到其它方法，但还是缺少了 `module` 这样的层次。

也许可以通过 `<module>` 这样的标签来形成单元解决。即

```html
    <template>
        <module name="mui">
            <script>
                const style = ...
            </script>
            <div m-def="">

            </div>
        </module>
    </template>
```
这样做是否有效颦之忧，需要斟酌。

在原来 molecule 的设计中，有两种 `script`，一种是 `constructor`，一种是普通 script。后者会提取出来执行一次（作为全局执行）。

网上也有一些相关讨论：https://github.com/w3c/webcomponents/issues/645

应该说这么做是可行的。

另一种做法，`索性将 html 文件视为一个 module`。 这样最终与 js 近乎完全对等。

后面这种做法好点。从前 js 也是一个一个的文件，后来也是这么直接变为模块的。

如何引用模块呢？

按 `molecule src="xxx"` 的老办法也是可行的，将其转为 `import` 即可。

如需在 js 里引用 molecule 模块，可以提供一个这样的调用：

```js
    let m = await Molecule.load('xxx.html')
```

总的来说应趋向于模块化为主导。

目前 browser 对 import 支持还很弱。

1. `import 'lib/a'`   不支持。不支持定位 `node_modules` 这样的目录，必须用 '/' 或 '.' 开始的绝对或相对路径。
1. `import './a'`  不支持，必须提供后缀。也没有 `package.json`，所以只能提供 `a.js`。
1. `import wrap('lib/a.js')`  不支持，必须提供 `literal string`，不能用变量常量，不能用函数
1. `const {Molecule } = await myimport('lib/a.js')` 不支持，`await` 必须放在 `async` 内包装起来。

由于这些局限，最终想到的办法是：

```html
<html>
    <head>
        <meta name="import_context" value="">               <!-- 决定 from '/a/b/c.js' 的路径 -->
        <meta name="modules_path" value="node_modules">     <!-- 决定 from 'a/b.js' 的路径，modules_path 包含 import_context -->
    </head>
    <template>
        <import from="" names="">        
        <div m-def=></div>
```
当生成代码时，根据所给 <meta> 和 <import> 标记生成 `import "literal string"`。

这样 import 语句都是从 tag 生成的，可以避免手写 import 无法解决的麻烦。

未来当 import 语句得到改善后，生成的代码也可以做相应调整。

这种思路是将整个 html 转为一个 js，然而客户端生成 js 几个路都不怎么行。

1. 生成 `<script type=module>`、设置 innerHTML 并 appendChild，这个办法生成的 module 没有名字，不支持引用，只能集合在页面里用一用而已。
1. 生成 `<script>` 则不支持 import，不支持 import 后面使用很被动
1. 我试验了一种有趣的办法 `<script type=module src="URL.createObjectURL(blob code)">`，这个办法有用，但是脚本是临时性的，所以不能引用名称。这样就无法在 `Button.js` 里通过 `import 'ButtonBase.js'` 来导入另一个文件。

因此 Molecule 的管理只能通过另外的机制来实现，也就是传统的 `<molecule src=>` 来引用其它组件包。这些组件在地位上是扁平的。

最终方案：

1. `import from another file`： 如为引用组件 `<molecule src=>`，如引用js module, `<import from="">`，如引用普通 js， `<script src=>`
1. `extends module.Class`，`<tag m-def=A m=super>`： 生成 `class Button extends Molecule.Types['ButtonBase']`。
1. 模块内的 token，不会污染其它模块。既然已经将 html 生成 module，其脚本（也就是 <script> 方式给出的）自然可以归并为模块内的 token。

未来最好能生成恰好的 js。

一个典型的这种 HTML 将生成:

```js
import xxx from xxx

class Button extends MoleculeTypes['mui.ButtonBase']{       // fullname 用 mui.Button，内部用 mui$Button，名称用 Button，不对外 export

}

MoleculeTypes['mui.Button'] = Button;
```


##继承问题

JS 的继承并不支持真正的 private member。

什么是真正的 private member？

```java
public class A {

	private String name;
	
	public String getName(){
		return this.name;
	}
	
	A(){
		this.name = "A";
	}
}
```

```java
public class B extends A {

	private String name;
	
	public String getName(){
		return this.name;
	}

	public void hello(){
		System.out.println(this.getName());
		System.out.println(super.getName());
	}
	
	B(){
		this.name = "B";
	}

}
```

```java
public class Main {
	public static void main(String[] args) {
		new B().hello();
	}
}
```

在上面的代码里， B.hello 将依次输出 B 和 A，B 并没有覆盖 A 的成员。getName 方法可以做到子类一套父类一套，分别独立。

而在 js 里，虽然也支持继承，但是 js 的继承并没有真正的不覆盖，getName 虽然可以调用 super 或不调用，但方法始终是覆盖的。
方法或者可以解决，因为 proto 是可以区分的，但是目前 arguments.callee 已经被屏蔽，不能获得当前的 prototype 是 A 还是 B。
状态却无法解决，因为 proto 里是没有私有成员一说。
当然，如果确实能从 argument.callee 区分出当前处于哪个 proto，也可以通过其它手段实现不同的入口选择不同的状态。
然而所有的路都被堵死了。

在 molecule 中为何需要继承呢？

还是在 ButtonBase 和 Button 的经典问题。

在 material-ui 里有 ButtonBase 和 Button 两个组件，这两个组件分别渲染同一个按钮的一些方面。在 react 里是通过一个嵌套盒子来实现的：

```
Button.render  -> output <ButtonBase props....>
ButtonBase.render -> output <html tag props>
```

```js
// buttonbase
      <ComponentProp
        className={className}
        onBlur={this.handleBlur}
        onFocus={this.handleFocus}
        onMouseDown={this.handleMouseDown}
        onMouseLeave={this.handleMouseLeave}
        ref={buttonRef}
        tabIndex={disabled ? '-1' : tabIndex}
        {...buttonProps}
        {...other}
      >
        {children}
        {!disableRipple && !disabled ? (
          <NoSsr>
            {/* TouchRipple is only needed client side, x2 boost on the server. */}
            <TouchRipple innerRef={this.onRippleRef} center={centerRipple} {...TouchRippleProps} />
          </NoSsr>
        ) : null}
      </ComponentProp>
```
```js
// button
    <ButtonBase
      className={className}
      disabled={disabled}
      focusRipple={!disableFocusRipple}
      focusVisibleClassName={clsx(classes.focusVisible, focusVisibleClassName)}
      {...other}
    >
      <span className={classes.label}>{children}</span>
    </ButtonBase>
```
这样按盒子的规则，Button先render出一个 ButtonBase,ButtonBase 将 Button 提供的 props 进一步 render 到 ComponentProp 上。

这个过程如按继承理解，可以认为先是 subclass 给出一个输出，之后 super class 继续加工这份输出。

如 js 确实支持带有私有成员的真正继承，该过程可以灵活控制，先输出自己的再输出 super 的或者反之，都可。然而由于不支持真正私有成员，super 的方法总是用 subclass 的属性，这样导致不能先 sub 后 super。

该问题最后的解决办法是用 vb 的老办法，在 Button 里放一个 ButtonBase，由 Button 控制何时调用 ButtonBase 的相关函数。

这也许是唯一可行的办法吧。

幸而 Button 和 ButtonBase 并没有需要复用的 method 和 property，都是输出一些 class 和挂载事件处理，因此该方法确实可行。

## 递归属性的问题

在 material-ui 里，经常出现这一段逻辑
```js
    const { className, ...other } = this.props;

    return <Comp className={classNames(classes.root, className)} ...other></Comp>
```
这里先将现有的（instance 的） className 取出，之后输出到待渲染的对象。

这个过程中，“我”和“渲染输出”是两个对象。

而在 molecule 实现里，“我” 和 “渲染输出” 是一个对象，这样导致每次渲染，都会发生 className + classes.root 的操作，导致 className 不断增长。

如何解决这个问题呢？

1. 提供属性名时 className 叫别的名字例如 myclass，这样输出属性和输入属性名字不同，就不会发生递归。
1. 记忆初始化的属性为 this.instanceProps，提取 instanceProps 中的属性值。

另外，other 这种形式在 molecule 里是没有意义的，因为输入对象和输出对象相同，属性本来就全部给出了。