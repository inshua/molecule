/**
 * Molecule 类。 molecule 组件的共同基类。 请按指导手册使用 molecule，不要自己使用构造函数创建。
 * 
 * @class
 * @param container
 *            {HTMLElement} 所附着的 html 元素
 */
class Molecule {
    constructor(element, props){
        this.isMolecule = true;

        this.element = element;
        element.molecule = this;

        this.props = Object.assign(this.getDefaultProps(), props);        
        this.state = this.getInitialState();

        this.children = {};             // key - child      
        this.childrenKeys = [];         // 
        this.allChildren = {};       // all children key include children of children, avoid recreate
        this.conditions = {};
        this.attributesWillEcho = [];       // 渲染时将需要回显的HTML属性存于此处，渲染最后一步执行回显
        
        this.init();
        this.render();
    }

    getDefaultProps(){
        if(super.getDefaultProps){
            return Object.assign(super.getDefaultProps(), this.constructor.defaultProps, true);
        } else{
            return this.constructor.defaultProps || {};
        }
    }

    init(){     
        // 表达式类型的初始属性，整体在 init 函数中初始化。表达式类型的属性都生成为 ExpressionProperty, 此处进行求值
        for(let k of Object.keys(this.props)){
            var v = this.props[k];
            if(v instanceof ExpressionProperty && !v.isRuntime){
                v = v.expression.call(this);
            }
            this.prop(k, v, true);
        }        
    }

    getInitialState(){
        return {};
    }

    renderDOM(){    // 框架从 DOM 生成 renderDOM 函数
        
    }

    renderExpressionProps(){     // 表达式类型的初始属性，整体在 init 函数中初始化。表达式类型的属性都生成为 ExpressionProperty, 此处进行求值
        for(let k of Object.keys(this.props)){
            var v = this.props[k];
            if(v instanceof ExpressionProperty && v.isRuntime){
                v = v.expression.call(this);
            }
            this.prop(k, v);
        }        
    }

    render(){
        this.renderDOM();
        this.renderExpressionProps();
        this.echoAttributes();
    }

    echoAttributes(){
        for(let propName of this.attributesWillEcho){
            let desc = this.getPropDesc(propName);
            if(desc == null){
                this.element.setAttribute(propName, this.props[propName]);
            } else if(desc.type != 'x'){
                var value = this.props[propName];
                if(desc.type == 'o'){
                    value = JSON.stringify(value);
                }
                if(value != null){
                    this.element.setAttribute(desc.attr, value);
                } else {
                    this.element.removeAttribute(desc.attr);
                }
            }
        }
        this.attributesWillEcho = [];
    }

    prop(propName, value, force){
        if(!force && this.props[propName] === value) return;

        this.props[propName] = value;
        var echo = false;
        if(propName in this.element){     // related attribute of native prop will auto change, if native prop hasnt attr the prop just set to dom element
            this.element[propName] = value;
        } else {        // not native property
            if(HTML_ATTRS.isCustomProp(propName, this.element.tagName)){    
                echo = true
            } else { 
                // related attribute of native prop will auto change
            }
        }
        if(echo){
            this.attributesWillEcho.push(propName); // echo back attribute soon
        }
        return this;
    }

    setProps(props, force){
        for(var p of Object.getOwnPropertyNames(props)){
            this.prop(p, props[p], force);
        }
    }

    getPropDesc(propName){
        var t = this.constructor.propDescs;
        if(t){
           t = t[propName];
           if(t) return t;
           if(super.isMolecule) return super.getPropType(propName);
        }
    }

    isBaseType(propName){
        return 'snbd'.contains(this.getPropDesc(propName));
    }

    create(key, tagName, props, children){
        var element = this.allChildren[key];
        if(element == null){
            if(tagName == 'string'){
                element = document.createTextNode(props.textContent);
            } else {
                element = document.createElement(tagName);
            }
            element.key = key;
            this.allChildren[key] = element;
            
            let MoleculeType = Molecule.TYPES[props.m || 'Molecule'];       // all html children will set a molecule object
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
            var dp = jsondiffpatch.create({objectHash: function(obj, index) {return obj.key;}});
            var delta = dp.diff(this.childrenKeys, newKeys);
            if(delta){
                console.log('diff children of ', this.key, ':', delta);
                var oldKeys = this.childrenKeys.slice();
                for(var k in delta){
                    if(k == '_t') continue;
                    
                    let [childKey, index, op] = delta[k];
                    if(index == 0 && op == 0){          // remove
                        this.removeChild(childKey);
                    } else if (op == 3){                // move
                        let oldIndex = k.substr(1) * 1;
                        this.swap(oldKeys[oldIndex], oldKeys[index]);
                    } else if(op == null && index == null){     // new
                        this.insertAt(k * 1, children[newKeys.indexOf(childKey)])
                    }
                }
            }
        }        
    }

    insertAt(index, element){
        var old = this.childrenKeys[index];
        if(old){
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
        delete this.element['molecule'];
        this.element = null;
    }
}

Molecule.TYPES = {'Molecule': Molecule}

class ExpressionProperty{
    constructor(expression, isRuntime){
        this.expression = expression;
        this.isRuntime = isRuntime;
    }
}
