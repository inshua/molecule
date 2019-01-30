// import {HTML_ATTRS} from './html-attr.js'


// Molecule.prototype = { isMolecule: true }

// Molecule.prototype.onDOMNodeRemoved = function() {
//     if (this.dispose) { // 对于不需要关注 dispose 活动的 molecule，无需自动 dispose
//         if (this.$el.closest('[molecule-auto-dispose=false]').length) return; // 不自动删除

//         this.dispose();
//         if (Molecule.debug) console.info(this.id, ' removed')
//         Molecule.removeInstance(this);
//     }
// }

// /**
//  * 是否为某种类型的 molecule
//  * 
//  * @param molecule {string|object} 
//  * @returns {bool}
//  */
// Molecule.prototype.is = function(molecule){
//     if(typeof molecule == 'string'){
//         return this.moleculePrototype.moleculeName == molecule
//     } else if (typeof molecule == 'function'){
//         return this.moleculePrototype.moleculeConstructor == molecule
//     } else if(molecule instanceof HTMLElement){
//         return this.el == molecule
//     } else if(typeof molecule == 'object'){
//         return molecule == this
//     }
// }

// /**
// * 移除 molecule
// */
// Molecule.prototype.release = function() {
//    if (this.dispose) this.dispose();
//    Molecule.removeInstance(this);
// }

// Molecule.removeInstance = function(instance) {
//     var container = instance.el;
//     if (container[instance.moleculePrototype.fullname] == instance) {
//         delete container[instane.moleculePrototype.fullname];
//     }
//     if (container[instance.moleculePrototype.name] == instance) {
//         delete container[instance.moleculePrototype.name];
//     }
//     if (container['moleculeInstance'] == instance) {
//         delete container['moleculeInstance'];
//     }
// };

// Molecule.prototype.handleAttributeChange = jQuery.noop;

// Molecule.prototype.moleculeName = function(){
//     return this.moleculePrototype.moleculeName;
// };

// +(function($) {
//     $.fn.molecule = function() {
//         return Molecule.of(this);
//     };
// }(jQuery));

Molecule.DEV_LEVEL = 'codedom';         // codedom / compile

Molecule.defines = {};

Molecule.nextTempId = 1;

/**
 * 加载指定 html 文件中的所有 molecule。
 * 
 * @param html
 *            {string} 包含有 molecule 的 html 文件的文件路径。不用包含webapp路径。
 * @returns {Boolean} 是否加载成功
 */
Molecule.loadHtml = async function(res) {
    var result = false;
    var link = document.createElement('a');
    link.href = res;
    if(Molecule._LOAD_ONCE_RESOURCE[link.href]) return;
    
    Molecule._LOAD_ONCE_RESOURCE[link.href] = 1
    
    var resp = await fetch(link.href, {credentials: 'include'});
    var text = await resp.text();
    var dom = new DOMParser().parseFromString(text, 'text/html');
    await Molecule.scanDefines(dom, link.href);	// this is a promise
    return true;
}

Molecule.ready = function(element, handler) {    
    jQuery(element).on('molecule-inited', handler);    
}

Molecule.scanDefines = async function(starter, baseUrl) {
    for(var template of Array.prototype.slice.call((starter || document).querySelectorAll('template'))){
        var found = false;
        for(var el of Array.prototype.slice.call(template.content.querySelectorAll('[m-def]'))) {
            await Molecule.collectDefine(el, baseUrl);
            el.remove();
            found = true;
        };

        if (found && template.content.childElementCount == 0) {
            template.remove();
        }
    };
}


Molecule._LOAD_ONCE_RESOURCE = {};
Molecule.collectDefine = async function(prototypeElement, baseUrl){
    var fullname = prototypeElement.getAttribute('m-def');
    prototypeElement.removeAttribute('m-def');
    var styles = Array.prototype.slice.call(prototypeElement.querySelectorAll('style'));
    styles = styles.concat(Array.prototype.slice.call(prototypeElement.parentNode.querySelectorAll("style[molecule-for='" + fullname + "']")));
    styles = styles.map(function(style) {
        style.remove();
        return style.innerHTML;
    }).join('\r\n');
    if (styles.trim().length) {
        styles = "/*from molecule " + fullname + "*/\r\n" + styles;
        var style = document.createElement('style');
        style.innerHTML = styles;
        document.head.appendChild(style);
    }

    //console.log('define molecule ' + fullname);

    try {
        var classScript = prototypeElement.querySelector('script[m-class]');
        if (classScript == null) {
            classScript = prototypeElement.parentNode.querySelector("script[molecule-for='" + fullname + "']");
        }
        if (classScript) {
            prototypeElement.moleculeConstructor = classScript;
            classScript.remove();
        }
        var scripts = Array.prototype.slice.call(prototypeElement.querySelectorAll('script'));
        scripts = scripts.concat( 
        		Array.prototype.slice.call( prototypeElement.parentNode.querySelectorAll("script[molecule-for='" + fullname + "']"))
            )
        var csses = Array.prototype.slice.call(prototypeElement.querySelectorAll('link[rel=stylesheet]'));
        csses = csses.concat(Array.prototype.slice.call(prototypeElement.parentNode.querySelectorAll("link[rel=stylesheet][molecule-for='" + fullname + "']")))
        var moleculeRefs = Array.prototype.slice.call(prototypeElement.querySelectorAll('molecule[src]'));  
        moleculeRefs = moleculeRefs.concat(Array.prototype.slice.call(prototypeElement.parentNode.querySelectorAll("molecule[src][molecule-for='" + fullname + "']")));
        var asyncScripts = [];
        scripts.concat(csses).concat(moleculeRefs).forEach(script => {
        	var append = true;
        	var isCss = (script.tagName == 'LINK');
        	var attr = 'src';
        	if(isCss) attr = 'href';
        	var src = script.getAttribute(attr);
        	if(src){
        		if(script.tagName != 'MOLECULE' && baseUrl && src != script[attr]){
            		var abs = absolute(baseUrl, script.getAttribute(attr));
            		script.setAttribute(attr, abs);
            		src = script[attr]
            	}
        		if(Molecule._LOAD_ONCE_RESOURCE[src] == null){
        			Molecule._LOAD_ONCE_RESOURCE[src] = 1
        		} else {
        			append = false;
        		}
        	}
            if(append) {
            	var clone = script.cloneNode(true);
            	if(src && (script.tagName == 'SCRIPT' || script.tagName == 'MOLECULE')){
            		asyncScripts.push(clone);
            	} else {	// css
            		document.head.appendChild(clone);
            	}
            }
            script.remove();
        });
        await loadScripts(asyncScripts);

        Molecule.defines[fullname] = prototypeElement;
        Molecule.defines[fullname].moleculeSrc = baseUrl;
        prototypeElement.moleculeName = fullname;
        prototypeElement.extends = prototypeElement.getAttribute('m');
        prototypeElement.removeAttribute('m');
        
        let code = await Molecule.compileDefine(prototypeElement, fullname);
        if(Molecule.DEV_LEVEL == 'compile'){
            let script = document.createElement('script');
            script.setAttribute('molecule-gen', fullname);
            script.innerHTML = code;
            document.head.append(script);
        }
    } catch (e) {
        console.error('load ' + fullname + ' failed, ', e);
    }
    
    
    function loadScripts(scripts){
    	return new Promise(async function next(resolve, reject){
    		if(scripts.length == 0){
				return resolve();
			}
    		var script = scripts.shift();
    		if(script.tagName == 'MOLECULE'){
    			var src = script.getAttribute('src');
    			if(baseUrl) src = absolute(baseUrl, src);
    			await Molecule.loadHtml(src);
    			next(resolve, reject);
    		} else {
				script.onload = function(){
					if(Molecule.debug) console.log(this.src + ' loaded')
					next(resolve, reject);
	    		}
	        	document.head.appendChild(script);
    		}
    	});
    }
    
    function absolute(base, relative) {
    	if(relative.charAt(0) == '/') return relative;
    	
        var stack = base.split("/"),
            parts = relative.split("/");
        stack.pop(); // remove current file name (or empty string)
                     // (omit if "base" is the current folder without
						// trailing slash)
        for (var i=0; i<parts.length; i++) {
            if (parts[i] == ".")
                continue;
            if (parts[i] == "..")
                stack.pop();
            else
                stack.push(parts[i]);
        }
        return stack.join("/");
    }
}

function dashToCamelCase( myStr ) {
    return myStr.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); });
}

function camelCaseToDash( myStr ) {
    return myStr.replace( /([a-z])([A-Z])/g, '$1-$2' ).toLowerCase();
}

function getTagName(node){
    if(node instanceof Text) return 'string';
    if(node instanceof Comment) return 'comment';
    let tagName = node.tagName && node.tagName.toLowerCase();
    if(tagName == 'm' && node.hasAttribute('tag')){   // <m tag="table">
        tagName = node.getAttribute('tag').toLowerCase();
    }
    return tagName;
}

Molecule.compileDefine = async function(prototypeElement, fullname){
    let unit = new Unit();
    let c = new ClassDecl(fullname, prototypeElement.extends || 'Molecule')
    unit.children.push(c);

    let renderer = new MethodDecl('createChildren', ['$c', 'nested']);
    c.children.push(renderer);
    //renderer.children.push(new LineStmt('console.info(this.constructor.name, nested)'));
    //renderer.children.push(new LineStmt('debugger'));

    if(prototypeElement.moleculeConstructor){
        c.children.push(new Expr(prototypeElement.moleculeConstructor.innerHTML));
    }
    
    let defaultProps = {}
    for(let attr of prototypeElement.attributes){
        var value = attr.value;
        var [propName, attrName, type, isCustomProp, isExpr, isRuntime, isEcho] = Molecule.parseAttributeName(prototypeElement, attr.name);
        var expr = parseAttributeValue(value, type, isExpr, false) 
        defaultProps[propName] = new DefaultPropExpr(propName, type, isCustomProp, isExpr, isRuntime, isEcho, expr);
    }
    if(!soloTextNode(prototypeElement, defaultProps, false)){
        let createChildrenExpr = new MethodInvokeExpr('super', 'createChildren', ['$c', compileChildren(Array.from(prototypeElement.childNodes))], renderer);
        renderer.children.push(new ReturnStmt(createChildrenExpr));
    } else {
        renderer.children.push(new ReturnStmt(new MethodInvokeExpr('super', 'createChildren', [])));
    }

    let defaultPropsStmt = new AssignStmt(fullname + '.defaultProps', new ObjectLiteralExpr(defaultProps));
    unit.children.push(defaultPropsStmt);

    unit.children.push(new LineStmt(`Molecule.extends(${fullname})`));

    function parseAttributeValue(value, type, isExpr, isInstancing){
        if(type == 'evt'){
            if(isExpr){
                if(!isInstancing){
                    let fun = new FunctionDeclExpr('', [], [new ReturnStmt(new Expr(value))]);
                    // new Prop(function(event, target, $c){return <<code>>});
                    return new NewInstanceExpr('Molecule.EventHandlerProvider', [fun]);
                } else {
                    // this.element.click = this.wrapHandler(<<code>>)
                    return new MethodInvokeExpr('this', 'wrapHandler', [new Expr(value)]);
                }
            } else {
                if(!isInstancing){
                    // new Prop(function(){<<code>>}), in Prop.getValue(_this) bind to the instance
                    let fun = new FunctionDeclExpr('', ['event', 'target','$c'], [new LineStmt(value)]);
                    return fun;
                } else {
                    // button.click = this.wrapHandler(function(event, target, $c){<<code>>})    // `this` means molecule of renderDOM, in the <<code>> `target` means element
                    let fun = new FunctionDeclExpr('', ['event', 'target', '$c'], [new LineStmt(value)]);
                    return new MethodInvokeExpr('this', 'wrapHandler', [fun]);
                }
            }
        }
        if(isExpr){     // expr
            if(isInstancing)
                return new Expr(value);
            else
                return new FunctionDeclExpr('', ['$c'], [new ReturnStmt(new Expr(value))])
        } else {
            return new LiteralExpr(Molecule.castType(value, type), type);
        }
    }

    function soloTextNode(el, props, isInstancing){
        if(el.childNodes.length == 1 && el.firstChild instanceof Text){
            let s = el.firstChild.textContent;
            if(s.indexOf('{{') != -1 && s.indexOf('}}') != -1){
                // 
            } else {
                if(!isInstancing){
                    props['innerHTML'] = new DefaultPropExpr('innerHTML', 's', false, true, false, false, s);
                } else {
                    props['innerHTML'] = new LiteralExpr(s, 's');
                }
                return true;
            }
        }
    }

    function compileChildren(children, renderer, embedFunctionId={id:1}, prefix='key'){
        let array = new ArrayLiteralExpr();
        var keyId = 1;
        for(let child of children){
            let props = {};
            let tagName = getTagName(child);
            var key = null;
            if(child instanceof HTMLElement){
                for(let cattr of child.attributes){
                    let value = cattr.value;
                    let [propName, attrName, type, isCustomProp, isExpr, isRuntime, isEcho] = Molecule.parseAttributeName(child, cattr.name);
                    if(isRuntime) throw ':r(untime) option can only appear within molecule define';
                    if(isEcho) throw ':e(cho) option can only appear within molecule define';
                    var expr = parseAttributeValue(value, type, isExpr, true);
                    if(propName == 'key'){
                        key = expr;
                    } else {
                        props[propName] = expr;
                    }
                }
                if(!key){
                    key = new ConcatStringExpr(prefix, '_', keyId++);
                }
            } else if(child instanceof Text){
                // TODO 有时需要文本隔开，如两个按钮
                if((child.nextSibling || !array.isEmpty()) && child.textContent.trim() == '') continue;  // ignore empty blank
                key = new ConcatStringExpr(prefix , '_', keyId++);
                var embed = compileText(child, renderer, key);
                if(embed){
                    array.extends(embed);
                    continue;
                } else {
                    tagName = 'string';
                    props.textContent = child.textContent;
                }
            } else if(child instanceof Comment){
                tagName = 'comment';
                props.textContent = child.textContent;
            }

            if(tagName == 'if'){
                let funcName = fullname + '_if_' + (embedFunctionId.id ++);
                renderer.children.push(compileIfFunction(child, funcName, renderer, embedFunctionId));
                array.push(new ExpandIteratorExpr(new FunctionInvokeExpr(funcName,[])));
                continue;
            } else if (tagName == 'for'){
                let funcName = fullname + '_loop_' + (embedFunctionId.id ++);
                renderer.children.push(compileForLoopFunction(child, funcName, renderer, embedFunctionId));
                array.push(new ExpandIteratorExpr(new FunctionInvokeExpr(funcName,[new Expr('nested')], prefix)));
                continue;
            } else if(tagName == 'switch'){
                let funcName = fullname + '_switch_' + (embedFunctionId.id ++);
                renderer.children.push(compileSwitchFunction(child, funcName, renderer, embedFunctionId));
                array.push(new ExpandIteratorExpr(new FunctionInvokeExpr(funcName,[])));
                continue;
            }
            
            let d = {$:tagName, key: key, props: new ObjectLiteralExpr(props)};
            if(!soloTextNode(child, props, true)){
                let childrenDeep = compileChildren(Array.from(child.childNodes), renderer, embedFunctionId);
                if(!childrenDeep.isEmpty()) d.children = childrenDeep;
            }
            array.push(new ObjectLiteralExpr(d));
        }
        return array;
    }

    function compileText(textNode, renderer, baseKey){
        let text = textNode.textContent;
        let pos = text.indexOf('{{');
        if(pos == -1) return;
        
        var array = new ArrayLiteralExpr();
        var end = 0;
        var keyId = 1;
        for(var start = pos;start != -1; start = text.indexOf('{{', end)){
            var notCode = text.substring(end, start);
            if(end != 0 || notCode.trim()){
                var d = {$:'string', key: baseKey.extends('_' , keyId++), props:{textContent: notCode}};
                array.push(new ObjectLiteralExpr(d));
            }
            start += 2;
            var end = text.indexOf('}}', start);  // TODO 还需要跳过 js 里的 {{}}
            var code = text.substring(start, end);
            var key = baseKey.extends('_' , keyId++);
            array.push(new ExpandIteratorExpr(new MethodInvokeExpr('this', 'wrapChildren', [new Expr(code), key])));  // ...this.wrapChildren(expr, key)
            end += 2;
        }
        var remain = text.substring(end);
        if(remain.trim()){
            var d = {$:'string', key: baseKey.extends('_' , keyId++), props:{textContent: remain}};
            array.push(new ObjectLiteralExpr(d));
        }
        return array;
    }

    function compileIfFunction(ifElement, funcName, renderer, embedFunctionId){
        let branches = [];
        let cond = new Expr(ifElement.getAttribute('cond'));
        let branch = {cond: cond, then: []}
        branches.push(branch);
        for(let then = ifElement.firstChild; then != null; then = then.nextSibling){
            if(then.tagName == 'ELSE'){
                let elseEl = then;
                let cond = elseEl.getAttribute('cond')
                let elseBranch = {cond: cond ? new Expr(cond) : null, then:[]}                    
                for(let elseEl = then.firstChild; elseEl != null; elseEl = elseEl.nextSibling){
                    elseBranch.then.push(elseEl);
                }
                branches.push(elseBranch);
            } else {
                branch.then.push(then);
            }
        }
        var index = 0
        for(let branch of branches){
            index ++;
            branch.then = [new ReturnStmt(compileChildren(branch.then, renderer, embedFunctionId, funcName + '_' + index))];
        }

        let stmt = new IfStmt(branches);
        let fun = new ConstDeclStmt(funcName, new BracketExpr(new LambdaExpr(null, [stmt])));
        renderer.children.push(fun);
    }

    function compileForLoopFunction(forElement, funcName, renderer, embedFunctionId){
        /*
            <for it='' over='' [key='']></for>
            <for var='' from='' to='' step='' [key='']></for>
            <for init='' cond='' step='' key=''></for>
            <for times=''></for>
         */
        let resultDecl = new VarDeclStmt('array', new Expr('[]'));
        var forStmt = null;

        var iterator = null, container = null, keyExpr = null;
        if(forElement.hasAttribute('key')){
            keyExpr = new Expr(forElement.getAttribute('key'));
        }
        let varName = forElement.getAttribute('var');
        if(varName){
            iterator = new Expr(varName);
            container = new MethodInvokeExpr('this', 'range', [new Expr(forElement.getAttribute('from')), new Expr(forElement.getAttribute('to')), new Expr(forElement.getAttribute('step'))]);
        }
        if(!iterator){
            iterator = forElement.getAttribute('it');
            if(iterator){
                iterator = new Expr(iterator);
                container = new Expr(forElement.getAttribute('over'));
            }
        }
        let children = compileChildren(Array.from(forElement.childNodes), renderer, embedFunctionId, funcName);
        let c2 = new ConstDeclStmt('children', children);
        if(iterator){
            keyExpr = keyExpr || new MethodInvokeExpr('JSON', 'stringify', [iterator]);
            // keyExpr = keyExpr || new ConcatStringExpr(funcName, '_' , new MethodInvokeExpr('JSON', 'stringify', [iterator]));
            let cloneChildren = new MethodInvokeExpr('this', 'cloneChildren', [new Expr('children'), keyExpr]);
            let extendsChildren = new MethodInvokeStmt('Array.prototype.push', 'apply', [new Expr('array'), cloneChildren]);
            forStmt = new ForIteratorStmt(iterator, container, [c2, extendsChildren]);
        } else {
            let isTimes = forElement.hasAttribute('times');
            if(isTimes){
                keyExpr = keyExpr || new Expr('time');
            }
            let cloneChildren = new MethodInvokeExpr('this', 'cloneChildren', [new Expr('children'), keyExpr]);
            let extendsChildren = new MethodInvokeStmt('Array.prototype.push', 'apply', [new Expr('array'),  cloneChildren]);
            if(isTimes){
                forStmt = new ForLoopStmt(new Expr('let time=1'), new LtEqExpr(new Expr('time'), new Expr(forElement.getAttribute('times'))), new Expr('time++'), 
                        [c2, extendsChildren]); 
            } else {
                forStmt = new ForLoopStmt(new Expr(forElement.getAttribute('init')), new Expr(forElement.getAttribute('cond')), new Expr(forElement.getAttribute('step')), 
                        [c2, extendsChildren]);
            }
        }
        let fun = new ConstDeclStmt(funcName, new BracketExpr(new LambdaExpr(['nested', 'prefix'], [resultDecl,  forStmt, new ReturnStmt(new Expr('array'))])));
        renderer.children.push(fun);
    }

    function compileSwitchFunction(switchElement, funcName, renderer, embedFunctionId){
        let branches = [];
        let cond = new Expr(switchElement.getAttribute('cond'));
        for(let then = switchElement.firstChild; then != null; then = then.nextSibling){
            if(then.tagName == 'CASE'){
                let branchEl = then;
                let props = {};
                for(let cattr of branchEl.attributes){
                    let value = cattr.value;
                    let [propName, attrName, type, isCustomProp, isExpr, isRuntime, isEcho] = Molecule.parseAttributeName(branchEl, cattr.name);
                    let expr = parseAttributeValue(value, type, isExpr, true);
                    props[propName] = expr;
                }
                let cond = props['value'];
                let branch = {cond: cond, then:[]}                    
                for(let branchDoEl = branchEl.firstChild; branchDoEl != null; branchDoEl = branchDoEl.nextSibling){
                    branch.then.push(branchDoEl);
                }
                branches.push(branch);
            }
        }
        var index = 0
        for(let branch of branches){
            index ++;
            branch.then = [new ReturnStmt(compileChildren(branch.then, renderer, embedFunctionId, funcName + '_' + index))];
        }

        let stmt = new SwitchStmt(cond, branches);
        let fun = new ConstDeclStmt(funcName, new BracketExpr(new LambdaExpr(null, [stmt])));
        renderer.children.push(fun);
    }

    let code = unit.toCode(0);
    console.log(code);
    return code;
}

Molecule.attrReg = /(?<name>[^\/^:]+)(?<type>:([s|n|b|d|o]|evt))?(?<isExpr>:x)?(?<isRuntime>:r)?(?<isEcho>:e)?$/;
Molecule.parseAttributeName = function(element, attrName){ 
    /*
        attr syntax: [m-]attr[:n|s|o|b|d|x|e][/r]
        regexp: /(?<name>[^\/^:]+)(?<type>:[s|n|b|d|o|evt])?(?<isExpr>:x)?(?<isRuntime>:r)?(?<isEcho>:e)?$/
    */
    let groups = Molecule.attrReg.exec(attrName).groups;
    var {name, type, isExpr, isRuntime, isEcho} = groups;
    var propName = null, isCustomProp = false;
    let tagName = getTagName(element);
    if(type == ':evt'){            
        isCustomProp = !(name in element);
        propName = name;
    } else if(name.startsWith('on') && type == null) {
        type = ':evt';
        propName = name;
    } else {
        let desc = HTML_ATTRS.ofAttr[name];            
        if(desc != null) propName = desc.prop;
        isCustomProp = propName == null || (!desc.global && desc.tags.indexOf(tagName) == -1);
        if(isCustomProp){
            propName = dashToCamelCase(name);       // prop without attr
        }
    }
    isCustomAttr = HTML_ATTRS.isCustomAttr(name, tagName);
    attrName = isCustomAttr ? name + (type||'') : name;
    type = type ? type.substr(1) : 's';
    return [propName, attrName, type, isCustomProp, isExpr && true, isRuntime && true, isEcho && true];
}

/**
 * 以 starter 为出发元素，初始化该元素及其子元素中的所有 molecule，如果有 molecule-init=manual 的，也将强行创建。
 * 
 * @param starter
 *            {HTMLElement} html 元素
 */
Molecule.init = function(starter) {
    Molecule.scanMolecules(starter, true);
}

/**
 * 以 starter 为出发元素，初始化该元素及其子元素中的所有 molecule。
 * 
 * @param starter
 *            {HTMLElement} html 元素
 * @param manual
 *            {bool} 是否初始化声明为 molecule-init=manual 的元素
 */
Molecule.scanMolecules = async function(starter, manual) {
    if (starter && starter.jquery) {
        starter = starter[0];
    }
    starter = starter || document.body;
    if(starter == null) return;
    Molecule._scanningEle = starter;
    if (Molecule.debug) console.info('molecule scan', starter);
    var stk = [starter];
    while (stk.length) {
        var ele = stk.pop();
        if (ele.hasAttribute('m')) {
            if (ele.getAttribute('molecule-init') == 'manual' && !manual) continue; // 跳过声明为手工创建的元素
            await createMolecule(ele);
        }
        if (!ele.hasAttribute('init-children-first')) {
            for (var i = ele.children.length - 1; i >= 0; i--) {
                stk.push(ele.children[i]);
            }
        }
    }

    Molecule._scanningEle = null;
    if (Molecule.debug) console.info('molecule scan', starter, 'over');

    async function createMolecule(target){
        if(!createMoleculeWithoutInnerClass(target)){     // 尽量不创建内部类
            const moleculeName = target.getAttribute('m');
            target.removeAttribute('m');
            target.extends = moleculeName;
            const className = 'Temp_' + (Molecule.nextTempId ++);
            const code = await Molecule.compileDefine(target, className); 
            const fun = new Function(code + ` ;return ${className};`);
            const clazz = fun();
            for(let cattr of target.attributes){
                target.removeAttribute(cattr);
            }
            target.innerHTML = '';  // remove all children;
            new clazz(target);
        }

        function createMoleculeWithoutInnerClass(target) {
            if(target.childElementCount) return false;

            let moleculeName = target.getAttribute('m');
            var clazz = Molecule.TYPES[moleculeName];
            if(clazz == null) throw new Error(`molecule class '${moleculeName}' not found`);
            let props = {};
            var key = null;
            for(let cattr of target.attributes){
                let value = cattr.value;
                let [propName, attrName, type, isCustomProp, isExpr, isRuntime, isEcho] = Molecule.parseAttributeName(target, cattr.name);
                if(isExpr || type == 'evt'){
                    return false;
                }
                if(isRuntime) throw ':r(untime) option can only appear within molecule define';
                if(isEcho) throw ':e(cho) option can only appear within molecule define';
                var expr = parseAttributeValue(value, type, isExpr, true);
                if(propName == 'key'){
                    key = expr;
                } else {
                    props[propName] = expr;
                }
                if(type == 'evt'){
                    target.removeAttribute(cattr.name);
                }
            }
            delete props['m'];
            if(!key){
                key = 'key_' + (Molecule.nextTempId++);
            }
            return new clazz(target, props);
        }
    
        function parseAttributeValue(value, type, isExpr){
            switch(type){
            case 's':
                return value;
            case 'n':
                return value == ''? null : value * 1;
            case 'b':
                value = value.toLowerCase();
                if(value == 'true') return true;
                if(value == 'false') return false;
                if(value == 'y' || value == 'yes') return true;
                if(value == 'n' || value == 'no') return false;
                return true;
            case 'o':
                return JSON.parse(value);
            case 'd':
                var n = Number.parseInt(value);
                if(!isNaN(n))
                    return new Date(value);
                else
                    return Date.parse(value);
            }
            return value;
        }
    }
}

Molecule.of = async function(ele) {
    if(ele.jquery) ele = ele[0];
    if(ele == null) return;
    var r = ele.moleculeInstance;
    if(r == null && ele.hasAttribute('m')) {
        await Molecule.scanMolecules(ele);
        return ele.moleculeInstance;
    }
    return r;
}

jQuery.holdReady(true);
jQuery(document).on('DOMContentLoaded', async function(){
	for(var m of Array.prototype.slice.call(document.querySelectorAll('molecule[src]'))){
		if(Molecule.debug) console.log('load from ' + m.getAttribute('src'));
		await Molecule.loadHtml(m.getAttribute('src'));
	}
	
	await Molecule.scanDefines(document, document.baseURI);
	await Molecule.scanMolecules();
	jQuery.holdReady(false);
	
	jQuery(document).on('DOMNodeInserted', function(e) {
	    var target = (e.originalEvent.target || e.target);
	    if (target.tagName) { // 可能嵌套于未声明为 molecule的元素中，<div><div m=...></div></div>, 仅能收到外层 div 的事件
	        if (Molecule._scanningEle && jQuery.contains(Molecule._scanningEle, target)) return; // 正在扫描父元素，早晚会扫到它
	        if (Molecule.debug) console.info('DOMNodeInserted ', e.target);
	        Molecule.scanMolecules(target);
	    }
	});
	
	
	jQuery(document).on('DOMNodeRemoved', function(e) {
	    var target = (e.originalEvent.target || e.target);
	    if (target.tagName) { // 可能嵌套于未声明为 molecule的元素中，<div><div m=...></div></div>, 仅能收到外层 div 的事件
	        if (target.moleculeInstance) {
	            target.moleculeInstance && target.moleculeInstance.onDOMNodeRemoved();
	        }
	        Array.prototype.forEach.call(target.querySelectorAll('[m-inst]'), ele => {
	        	ele.moleculeInstance && ele.moleculeInstance.onDOMNodeRemoved();
	        });
	    }
    });
    
    $(function observeThemeChange(){
        var config = { attributes: true, childList: true, subtree: true, attributeOldValue : true };

        var callback = function(mutationsList) {
            for(var mutation of mutationsList) {
                if (mutation.type == 'attributes') {
                    if(mutation.target.moleculeInstance){
                        const inst = mutation.target.moleculeInstance;
                        // if(inst.handleAttributeChange) 
                        inst.handleAttributeChange(mutation.attributeName, mutation);
                    }                    
                }
            }
        };

        var observer = new MutationObserver(callback);
        observer.observe(document.body, config);
        // observer.disconnect();
    });
});
