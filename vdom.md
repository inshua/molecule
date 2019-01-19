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
