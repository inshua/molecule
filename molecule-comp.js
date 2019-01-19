/**
 * Molecule 类。 molecule 组件的共同基类。 请按指导手册使用 molecule，不要自己使用构造函数创建。
 * 
 * @class
 * @param container
 *            {HTMLElement} 所附着的 html 元素
 */
const jsondiffp = jsondiffpatch.create({objectHash: function(obj, index) {return obj.key;}});
// jsondiffpatch.clone(obj)

class Molecule {
    constructor(element, props){
        this.isMolecule = true;

        this.element = element;
        element.molecule = this;

        this.props = {};
        this.initProps(props || {});

        this.state = this.getInitialState();

        this.children = {};             // key - child      
        this.childrenKeys = [];         // 
        
        this.attributesWillEcho = [];       // 渲染时将需要回显的HTML属性存于此处，渲染最后一步执行回显

        // first time render, echo props
        // for event handler this is a bad call, will bind and unbind once
        for(var k in this.props){
            this.prop(k, this.props[k], true);
        }
        this.render();
    }

    initProps(instanceProps){
        this.runtimeProps = {};
        let def = this.constructor.__defaultProps__ || {};
        for(let k of Object.keys(def)){
            var prop = def[k];
            if(k in instanceProps){     // instance props only give literal value, not Prop object
                prop = prop.replaceExpr(instanceProps[k])
            }
            if(prop.isRuntime){
                this.runtimeProps[k] = prop;
            }
            if(prop.type == 'evt'){
                let fun = prop.getValue(this).bind(this);
                this.element.addEventListener(k, fun);
                this.props[k] = fun;
            } else {
                this.props[k] = prop.getValue(this);
            }
        }
        for(let k in instanceProps){
            if(k in this.props == false){
                this.props[k] = instanceProps[k];
            }
        }
    }

    getInitialState(){
        return {};
    }

    renderDOM(){    // 框架从 DOM 生成 renderDOM 函数
        
    }

    renderRuntimeProps(){     
        for(let k of Object.keys(this.runtimeProps)){
            let v = this.runtimeProps[k].getValue(this);
            this.prop(k, v);
        }        
    }

    render(){
        this.renderRuntimeProps();
        this.renderDOM();
        this.echoAttributes();
    }

    echoAttributes(){
        for(let propName of this.attributesWillEcho){
            let prop = this.getPropDesc(propName);
            if(prop == null){
                // this.element.setAttribute(propName, this.props[propName]);  default dont echo
            } else {
                let attr = HTML_ATTRS.ofProp[propName] || propName;
                var value = this.props[propName];
                if(value != null){
                    if(prop.type == 'o'){
                        value = JSON.stringify(value);
                    }
                    this.element.setAttribute(attr, value);
                } else {
                    this.element.removeAttribute(attr);
                }
            }
        }
        this.attributesWillEcho = [];
    }

    prop(propName, value, force){
        let oldValue = this.props[propName];
        if(oldValue === value){
            if(!force) return;
        } else {
            this.props[propName] = value;
        }
        
        let prop = this.getPropDesc(propName);
        var echo = prop && prop.echo;
        if(propName in this.element){     // related attribute of native prop will auto change, if native prop hasnt attr the prop just set to dom element
            if(prop && prop.type == 'evt'){
                this.element.removeEventListener(propName, oldValue);  // TODO 应准确移除上次绑定的函数
                let fun = prop.getValue(this).bind(this);
                this.element.addEventListener(propName, fun);
                this.props[propName] = fun;
            } else{
                this.element[propName] = value;
            }
        } else {        // not native property
            // HTML_ATTRS.isCustomProp(propName, this.element.tagName)
        }
        if(echo){
            this.attributesWillEcho.push(propName); // echo back attribute soon
        }
        return this;
    }

    setProps(props, force){
        if(props == null) return;
        for(var p of Object.getOwnPropertyNames(props)){
            this.prop(p, props[p], force);
        }
    }

    getPropDesc(propName){
        return this.runtimeProps[propName] || this.constructor.__defaultProps__[propName];
    }

    toElement(eleDef){
        if(eleDef instanceof Node) return eleDef;
        
        var key = eleDef.key;
        let children = eleDef.children;
        let tagName = eleDef.$;
        let props = eleDef.props;

        if(key instanceof Function) key = key.call(this);       // 理论上 defaultProps 也可以提供 key，但是没有创建前就计算属性值不妥
        var element = this.children[key];
        if(element == null){
            if(tagName == 'string'){
                element = document.createTextNode(props.textContent);
                delete props['textContent'];
            } else {
                element = document.createElement(tagName);
            }
            element.key = key;
            
            let MoleculeType = Molecule.TYPES[eleDef.m || 'Molecule'];       // all html children will set a molecule object
            var m = new MoleculeType(element, props);
            m.key = key;
        } else {
            var m = element.molecule;
            m.setProps(props);
        }
        m.assignChildren(children);
        
        return element;
    }

    assignChildren(children){
        if(children == null || children.length == 0){
            if(this.childrenKeys.length) this.removeAllChildren()
        } else {
            let newKeys = children.map(c => c.key);
            var delta = jsondiffp.diff(this.childrenKeys, newKeys);
            if(delta){
                console.log('diff children of ', this.key, ':', delta);
                var oldKeys = this.childrenKeys.slice();
                for(var k in delta){
                    if(k == '_t') continue;     // in diff result, _t:'a' means type: 'array'
                    
                    let [childKey, index, op] = delta[k];
                    if(index == 0 && op == 0){          // remove
                        this.removeChild(childKey);
                    } else if (op == 3){                // move
                        let oldIndex = k.substr(1) * 1;
                        this.swap(oldKeys[oldIndex], oldKeys[index]);
                    } else if(op == null && index == null){     // new
                        let c = children[newKeys.indexOf(childKey)];
                        this.insertAt(k * 1, this.toElement(c));
                        c.done = true;
                    }
                }
            }
            for(let c of children){
                if(!c.done) this.toElement(c);                
            }
        }        
    }

    insertAt(index, element){
        var old = this.childrenKeys[index];
        if(old){
            old = this.children[old];
            old.before(element);
            this.childrenKeys.splice(index, 0, element.key);
            this.children[element.key] = element;
        } else {
            this.element.appendChild(element);
            this.childrenKeys.push(element.key);
            this.children[element.key] = element;
        }
    }

    removeAllChildren(){
        for(let k of this.childrenKeys){
            let el = this.children[k];
            el.molecule.dispose()
            el.remove();
        }
        this.children = {};
        this.childrenKeys = []; 
    }

    removeChild(childKey){
        if(typeof childKey == 'string'){
            this.childrenKeys.splice(this.childrenKeys.indexOf(childKey),1);
            this.children[childKey].molecule.dispose();
            this.children[childKey].remove();
            delete this.children[childKey]
        } else {
            let child = childKey, childKey = child.key;
            this.childrenKeys.splice(this.childrenKeys.indexOf(childKey),1);
            child.remove();
            child.molecule.dispose();
            delete this.children[childKey];
        }
    }

    swap(childKey1, childKey2){
        let index1 = this.childrenKeys.indexOf(childKey1), index2 = this.childrenKeys.indexOf(childKey2);
        this.swapNodes(this.children[childKey1], this.children[childKey2]);
        let t = this.childrenKeys[index1];
        this.childrenKeys[index1] = this.childrenKeys[index2];
        this.childrenKeys[index2] = t;
    }

    //https://stackoverflow.com/questions/10716986/swap-2-html-elements-and-preserve-event-listeners-on-them/10717422#10717422
    swapNodes(obj1, obj2) {
        var parent2 = obj2.parentNode;
        var next2 = obj2.nextSibling;
        if (next2 === obj1) {
            parent2.insertBefore(obj1, obj2);
        } else {
            obj1.parentNode.insertBefore(obj2, obj1);
            if (next2) {
                parent2.insertBefore(obj1, next2);
            } else {
                parent2.appendChild(obj1);
            }
        }
    }

    dispose(){
        this.removeAllChildren();
        delete this.element['molecule'];
        this.element = null;
    }

    wrapChildren(expr, baseKey){        // TODO assignChildren 时支持 DOM Node 和 string/date/base types...
        var keyId = 1;
        if(!Array.isArray(expr)){
            return [wrapSolo.call(this, expr)]
        } else {
            return expr.map(wrapSolo.bind(this));
        }

        function wrapSolo(expr){
            if(expr instanceof Node){
                if(!expr.molecule){
                    expr.molecule = new Molecule(expr);
                    expr.molecule.key = expr.key = baseKey + '_' + (keyId++);  
                }
                return expr
            } else if(typeof expr == 'object' && expr.$){
                if(expr.key == null) expr.key = baseKey + '_' + (keyId++);
                return this.toElement(expr);
            } else {
                var el = this.toElement({$:'string', key: baseKey + '_' + (keyId++), props:{textContent:expr + ''}});
                return el;
            }
        }
    }
}

Molecule.__defaultProps__ = {}

Molecule.TYPES = {'Molecule': Molecule}

Molecule.extends = function(subclass){
    let defaultProps = [];
    for(var p = subclass; ; p = Object.getPrototypeOf(p.prototype).constructor){
        defaultProps.push(p.defaultProps);
        if(p == Molecule) break;
    }
    defaultProps.reverse();
    let props = Object.assign.apply(null, [{}].concat(defaultProps));
    subclass.__defaultProps__ = props;
    
    Molecule.TYPES[subclass.name] = subclass;
}

Molecule.castType = function(value, type){
    switch(type){
    case 's':
        return typeof value == 'string' ? value : value + '';
    case 'n':
        return typeof value == 'number' ? value : value * 1;
    case 'b':
        switch(typeof value){
        case 'boolean': return value;    
        case 'string':        
            value = value.toLowerCase();
            if(value == 'true') return true;
            if(value == 'false') return false;
            if(value == 'y' || value == 'yes') return true;
            if(value == 'n' || value == 'no') return false;
            return true;
        case 'undefined':
            return true;
        case 'object':
            return value != null;
        default:
            return value ? true : false;
        }
    case 'o':
        return value;
    case 'd':
        switch(typeof value){
        case 'number':
            return new Date(value);
        case 'string':
            return Date.parse(value);
        case 'object':
            return value instanceof Date ? value : new Date(value);
        default:
            return new Date(value);
        }
    default:
        return value;
    }
}

class ExpressionProperty{
    constructor(expression, isRuntime){
        this.expression = expression;
        this.isRuntime = isRuntime;
    }
}

class Prop{
    // /(?<isCustomProp>m-)?(?<name>[^\/^:]+)(?<type>:[s|n|b|d|o|evt])?(?<isExpr>:x)?(?<isRuntime>:r)?(?<isEcho>:e)?$/
    constructor(expression, type, isRuntime, isNative, echo){
        this.expression = expression;
        this.type = type;
        this.isRuntime = isRuntime;
        this.isNative = isNative;
        if(echo == null){
            if(this.isNative) echo = false;  // native attribute need not echo back
        }
        this.echo = echo && true;       // default false
    }
    getValue(_this){
        if(this.type == 'evt'){
            return Molecule.castType(this.expression, this.type);
        } else {
            let r = this.expression instanceof Function ? this.expression.call(_this) : this.expression;        //TODO 这里用 this 未必恰当，可能需要用 this.container，子元素如何获得父元素的属性呢
            return Molecule.castType(r, this.type);
        }
    }
    replaceExpr(expr){
        return new Prop(expr, this.type, this.isRuntime, this.isNative, this.echo);
    }
}