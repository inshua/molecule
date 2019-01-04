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

