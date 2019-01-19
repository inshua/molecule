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

Molecule.defines = {};

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
            //await Molecule.registerPrototype(el, baseUrl);
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
Molecule.registerPrototype = async function(el, baseUrl) {
    var fullname = el.getAttribute('m-def');
    var styles = Array.prototype.slice.call(el.querySelectorAll('style'));
    styles = styles.concat(Array.prototype.slice.call(el.parentNode.querySelectorAll("style[molecule-for='" + fullname + "']")));
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
        var script = el.querySelector('script[constructor]');
        if (script == null) {
            script = el.parentNode.querySelector("script[molecule-for='" + fullname + "']");
        }
        if (script) {
            var fun = new Function(script.innerHTML);
            if(script.hasAttribute('module')){
                fun.module = await import(script.getAttribute('module'))
            }
            el.moleculeConstructor = fun;
            fun.extends = script.getAttribute('extends') || script.hasAttribute('extends');
            script.remove();
        }
        var scripts = Array.prototype.slice.call(el.querySelectorAll('script'));
        scripts = scripts.concat( 
        		Array.prototype.slice.call( el.parentNode.querySelectorAll("script[molecule-for='" + fullname + "']"))
            )
        var css = Array.prototype.slice.call(el.querySelectorAll('link[rel=stylesheet]'));
        css = css.concat(Array.prototype.slice.call(el.parentNode.querySelectorAll("link[rel=stylesheet][molecule-for='" + fullname + "']")))
        var moleculeRefs = Array.prototype.slice.call(el.querySelectorAll('molecule[src]'));  
        moleculeRefs = moleculeRefs.concat(Array.prototype.slice.call(el.parentNode.querySelectorAll("molecule[src][molecule-for='" + fullname + "']")));
        var asyncScripts = [];
        scripts.concat(css).concat(moleculeRefs).forEach(script => {
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

        Molecule.defines[fullname] = el;
        Molecule.defines[fullname].moleculeSrc = baseUrl;
        el.moleculeName = fullname;
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

Molecule.collectDefine = async function(prototypeElement, baseUrl){
    var fullname = prototypeElement.getAttribute('m-def');
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
            var fun = new Function(classScript.innerHTML);
            if(classScript.hasAttribute('module')){
                fun.module = await import(classScript.getAttribute('module'))
            }
            prototypeElement.moleculeConstructor = fun;
            fun.extends = classScript.getAttribute('extends') || classScript.hasAttribute('extends');
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
        
        await Molecule.compileDefine(prototypeElement, fullname);
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


Molecule.compileDefine = async function(prototypeElement, fullname){
    const attrReg = /(?<isCustomProp>m-)?(?<name>[^\/^:]+)(?<type>:[s|n|b|d|o|evt])?(?<isExpr>:x)?(?<isRuntime>:r)?(?<isEcho>:e)?$/;

    let uinit = new Unit();
    let c = new ClassDecl(fullname, prototypeElement.extends || 'Molecule')
    uinit.children.push(c);

    let renderer = new MethodDecl('renderDOM', prototypeElement.getAttribute('args') || '');
    c.children.push(renderer);
    
    let defaultProps = {}
    for(let attr of prototypeElement.attributes){
        var value = attr.value;
        var [propName, attrName, type, isCustomProp, isExpr, isRuntime, isEcho] = parseAttributeName(prototypeElement, attr.name);
        var expr = parseAttributeValue(value, type, isExpr) 
        defaultProps[propName] = new DefaultPropExpr(propName, type, isCustomProp, isExpr, isRuntime, isEcho, expr);
    }
    renderer.children.push(new MethodInvokeStmt('this', 'assignChildren', compileChildren(prototypeElement, renderer)));

    let defaultPropsStmt = new AssignStmt(fullname + '.defaultProps', new ObjectLiteralExpr(defaultProps));
    uinit.children.push(defaultPropsStmt);

    uinit.children.push(new LineStmt(`Molecule.extends(${fullname});`));

    /* 
        attr syntax: [m-]attr[:n|s|o|b|d|x|e][/r]
        regexp: /(?<isCustomProp>m-)?(?<name>[^\/^:]+)(?<type>:[s|n|b|d|o|evt])?(?<isExpr>:x)?(?<isRuntime>:r)?(?<isEcho>:e)?$/
    */
    function parseAttributeName(element, attrName){
        let groups = attrReg.exec(attrName).groups;
        var {isCustomProp, name, type, isExpr, isRuntime, isEcho} = groups;
        var propName = null;
        if(type == ':evt'){            
            isCustomProp = !(name in element);
            if(name.startsWith('on')) {
                propName = name.substr(2);
            } else{
                propName = name;
            }
        } else if(name.startsWith('on') && type == null) {
            type = ':evt';
            propName = name.substr(2);
        } else {
            let desc = HTML_ATTRS.ofAttr[name];            
            if(desc != null) var propName = desc.prop;
            
            isCustomProp = isCustomProp || propName == null || (!desc.global && desc.tags.indexOf(element.tagName.toLowerCase()) == -1);
            if(isCustomProp && propName == null){
                propName = dashToCamelCase(name);       // prop without attr
            }
        }
        let isCustomAttr = HTML_ATTRS.isCustomAttr(name, element.tagName);
        attrName = isCustomAttr ? name + (type||'') : name;
        type = type ? type.substr(1) : 's';
        if(type == 'evt') isExpr = true;
        return [propName, attrName, type, isCustomProp, isExpr && true, isRuntime && true, isEcho && true];
    }

    function parseAttributeValue(value, type, isExpr){
        if(isExpr){     // expr
            return new Expr(value);
        } else {
            return new LiteralExpr(Molecule.castType(value, type), type);
        }
    }

    function compileChildren(element, renderer, fullkey){
        let array = new ArrayLiteralExpr();
        var keyId = 1;
        for(let child of Array.from(element.childNodes)){
            let props = {};
            let tagName = child.tagName && child.tagName.toLowerCase();
            var key = null;
            if(child instanceof HTMLElement){
                for(let cattr of child.attributes){
                    let value = cattr.value;
                    let [propName, attrName, type, isCustomProp, isExpr, isRuntime, isEcho] = parseAttributeName(element, cattr.name);
                    if(isRuntime) throw ':r(untime) option can only appear within molecule define';
                    if(isEcho) throw ':e(cho) option can only appear within molecule define';
                    var expr = parseAttributeValue(value, type);
                    if(propName == 'key'){
                        key = expr;
                    } else {
                        props[propName] = expr;
                    }
                }
                if(!key){
                    key = 'key_' + (keyId++);
                }
            } else if(child instanceof Text){
                if((child.nextSibling || !array.isEmpty()) && child.textContent.trim() == '') continue;  // ignore empty blank
                key = 'key_' + (keyId++);
                var embed = compileText(child, renderer, key);
                if(embed){
                    array.extends(embed);
                    continue;
                } else {
                    tagName = 'string';
                    props.textContent = child.textContent;
                }
            }
            if(tagName == 'if'){
                let funcName = 'if_' + fullkey + '_' + key;
                renderer.children.push(compileIfFunction(element, key));
                array.push(new ExpandIteratorExpr(new FunctionInvokeExpr(funcName,[])));
            } else if (tagName == 'for'){
                
            }
            let d = {$:tagName, key: key, props: props};
            let childrenDeep = compileChildren(child, renderer, fullkey + '_' + key);
            if(!childrenDeep.isEmpty()) d.children = childrenDeep;
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
                var d = {$:'string', key: baseKey + '_' + (keyId++), props:{textContent: notCode}};
                array.push(new ObjectLiteralExpr(d));
            }
            start += 2;
            var end = text.indexOf('}}', start);  // TODO 还需要跳过 js 里的 {{}}
            var code = text.substring(start, end);
            var key = baseKey + '_' + (keyId++);
            array.push(new ExpandIteratorExpr(new MethodInvokeExpr('this', 'wrapChildren', [new Expr(code), new LiteralExpr(key,'s')])));  // ...this.wrapChildren(expr, key)
            end += 2;
        }
        var remain = text.substring(end);
        if(remain.trim()){
            var d = {$:'string', key: baseKey + '_' + (keyId++), props:{textContent: remain}};
            array.push(new ObjectLiteralExpr(d));
        }
        return array;
    }

    let code = uinit.toCode(0);
    // let script = document.createElement('script');
    // script.setAttribute('molecule-gen', fullname);
    // script.innerHTML = code;
    // document.head.append(script);
    console.log(code);
    return code;
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
Molecule.scanMolecules = function(starter, manual) {
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
            createMolecule(ele);
        }
        if (!ele.hasAttribute('init-children-first')) {
            for (var i = ele.children.length - 1; i >= 0; i--) {
                stk.push(ele.children[i]);
            }
        }
    }

    Molecule._scanningEle = null;
    if (Molecule.debug) console.info('molecule scan', starter, 'over');

    function findMoleculeDef(moleculeName) {
        var def = Molecule.defines[moleculeName];
        if (def == null) {
            throw new Error(moleculeName + ' not found');
        }
        return def;
    }

    function createMolecule(target) {
        // molecule 声明先创建子molecule的先创建子 molecule
        if (Molecule.debug) console.log('------------------------------');
        var fullname = target.getAttribute('m');
        var node = findMoleculeDef(fullname);

        var template = target.cloneNode(false);

        var inner = target.innerHTML;
        if (Molecule.debug) console.info(fullname + ' outerHTML', target.outerHTML);

        var debugForTrace = false
        if (target.hasAttribute('molecule-trace')) {
        	if(!Molecule.debug){
        		debugForTrace = true
        		Molecule.debug = true
        	}
        	debugger;
        }

        var defs = [node];
        while (node.hasAttribute('m')) {
            node = findMoleculeDef(node.getAttribute('m'));
            defs.unshift(node);
        }
        if (Molecule.debug) {
            console.info('process ' + fullname + ',hierachy path ' + defs.map(function(def) { return def.getAttribute('m-def') }).join());
        }

        for (var d = 0; d < defs.length; d++) { // 逐代设置属性
            var node = defs[d];

            for (var i = 0; i < node.attributes.length; i++) {
                var attr = node.attributes[i].name;
                var v = target.getAttribute(attr);
                if (v) { // 应该覆盖的定义
                    if (!template.hasAttribute(attr)) { // 是父类所赋予的属性而不是用户指定的，应当被子类覆盖
                        target.setAttribute(attr, combineValue(attr, v, node.getAttribute(attr)));
                    } else {
                        target.setAttribute(attr, combineValue(attr, node.getAttribute(attr), v));
                    }
                } else {
                    target.setAttribute(attr, node.getAttribute(attr));
                }
            }
        }

        var template = defs[0].cloneNode(true);
        for (var d = 1; d < defs.length; d++) { // 逐代设置 innerHTML
            var node = defs[d].cloneNode(true);
            if(Molecule.debug) console.info('applyTemplate ', template.outerHTML, '\r\nto', node.outerHTML);
            applyTemplate(node, template);
			template = node;
			if(Molecule.debug) console.info('got ', template.outerHTML);
        }
        if(Molecule.debug) console.info('applyTemplate ', template.outerHTML, 'to', target.outerHTML);
        applyTemplate(target, template);
        if(Molecule.debug) console.info(fullname + ' become', target.outerHTML);

        target.removeAttribute('m');
        if (target.hasAttribute('m-inst') == false) target.setAttribute('m-inst', node.getAttribute('m-def'));
        target.removeAttribute('m-def');
        
        if (target.hasAttribute('init-children-first')) {
            target.removeAttribute('init-children-first');
            Molecule.scanMolecules(target, manual);
        }

        Molecule.processing = true; // 检查此变量确定是否在 molecule 过程中，如不在过程中可以跳过部分代码
        for (var d = 0; d < defs.length; d++) { // 逐代执行脚本
            createMoleculeInstance(defs[d]);
        }
        Molecule.processing = false;
        if(debugForTrace) { Molecule.debug = false; debugger; }

        jQuery(target).trigger('molecule-inited', [target, fullname]);

        function createMoleculeInstance(def) {
            if (def.moleculeConstructor) {
                var exists = target['moleculeInstance'];
                if (exists) {
                    if (exists.moleculePrototype == def) {
                        throw new Error("already has an instanceof of " + def.moleculeName)
                    }
                }
                let m = exists;
                if (m) {
                    if (def.moleculeConstructor.extends) {
                        if (def.moleculeConstructor.extends === true) {

                        } else if (m.is(def.moleculeConstructor.extends) == false) {
                            throw new Error(def.moleculeName + "should extends on " + def.moleculeConstructor.extends)
                        }
                    }
                } else {
                    if(def.moleculeConstructor.module){                        
                        m = new (def.moleculeConstructor.module.default)(target)
                    } else {
                        m = new Molecule(target);
                    }
                }
                if (m == null) debugger;
                m.moleculePrototype = def;
                def.moleculeConstructor.call(m);
                target[def.getAttribute('m-def')] = m;
                if (!exists) target[def.moleculeName] = m;
                if (target['moleculeInstance'] == null) {
                    target['moleculeInstance'] = m;
                }
            }
        }

        function applyTemplate(target, templateMirror) {
            Array.prototype.forEach.call(templateMirror.querySelectorAll('[molecule-placeholder]'), function(holder) {
                var id = holder.getAttribute('molecule-placeholder');
                var replacer = null;
                if (id == null || id == '') {
                    replacer = target.querySelector('[molecule-replace]');
                } else {
                    replacer = target.querySelector('[molecule-replace=' + id + ']');
                }
                if (replacer != null) {
                    copyAttributes(holder, replacer, false);
                    replacer.removeAttribute('molecule-replace');
                    replacer.removeAttribute('molecule-placeholder');
                    replaceNode(holder, replacer);
                }   
            });
            Array.prototype.forEach.call(templateMirror.querySelectorAll('[molecule-slot]'), function(slot) {
                var id = slot.getAttribute('molecule-slot');
                var plug = null;
                if (id == null) {
                    plug = target.querySelectorAll('[molecule-plug]');
                } else {
                    plug = target.querySelectorAll('[molecule-plug=' + id + ']');
                }
                if (plug.length) {
                	Array.prototype.forEach.call(plug, function(plug){
	                    var p = plug;
	                    if (p.tagName == 'TEMPLATE') {
	                        p = plug.content;
	                        plug.remove();
	                    	Array.prototype.slice.call(p.childNodes).forEach(child => slot.appendChild(child));
						} else {
	                    	slot.appendChild(p);
	                    	p.removeAttribute('molecule-plug');
						}
                	});
                }
            });

            // 处理无名称的 placehodler
            // 有名称的 placeholder 只与同名称的 replace 匹配，匹配不到也不移除
            var p = templateMirror.querySelector('molecule-placeholder');
            if(p && p.getAttribute('molecule-placeholder')) p = null;   
            if(!p) p = templateMirror.querySelector('[molecule-placeholder]');
            if(p && p.getAttribute('molecule-placeholder')) p = null;
            if (p) {
            	var parent = p.parentNode;
            	var isTableElement = ['TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR'].indexOf(parent.nodeName) > -1;
            	var childNodes = Array.prototype.slice.call(target.childNodes);
            	var indicator = p;
            	for(var i=childNodes.length -1; i>=0; i--){
                    var c = childNodes[i];
                    if(isTableElement){		// unescapeTableElement
                    	c = unescapeTableElement(c, parent);
                    }
            		parent.insertBefore(c, indicator);
            		indicator= c;
            	}
                p.remove();
            } else {
                Array.prototype.slice.call(target.childNodes).forEach(child => templateMirror.appendChild(child));
            }
            Array.prototype.slice.call(templateMirror.childNodes).forEach(child => target.appendChild(child));
        }

        function copyAttributes(src, dest, override) {
            for (var i = 0; i < src.attributes.length; i++) {
                var attr = src.attributes[i].name;
                var v = dest.getAttribute(attr);
                var srcValue = src.getAttribute(attr)
                if (!dest.hasAttribute(attr) || override || v.startsWith('+')) {
                    dest.setAttribute(attr, combineValue(attr, srcValue, v));
                } else {
                    dest.setAttribute(attr, srcValue);
                }
            }
        }

        function replaceNode(origin, newNode) {
            origin.parentNode.insertBefore(newNode, origin);
            origin.remove();
        }
        
        function unescapeTableElement(node, parentNode){
        	var allowedChildren = {
        	     'TABLE' : ['TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR'],
        	     'THEAD' : ['TR'],
        	     'TBODY' : ['TR'],
        	     'TFOOT' : ['TR'],
        	     'TR' : ['TH', 'TD']
        	};
        	
        	var allowed = allowedChildren[parentNode.nodeName];
        	if(node.nodeName.startsWith('M:')){
        		var tag = node.nodeName.substr(2);
        		var nd = document.createElement(tag);
            	for (var i = 0; i < node.attributes.length; i++) {
                    var attr = node.attributes[i].name;
                    var v = node.getAttribute(attr);
                    nd.setAttribute(attr, v);
                }
                var nodes = Array.prototype.slice.call(node.childNodes);
                for(var i = 0;i < nodes.length; i++){
                	var c = nodes[i];
                	if(allowed && allowed.indexOf(tag) > -1){
                		c = unescapeTableElement(c, nd);
                		nd.appendChild(c);
                	} else {
                		console.error('cannot insert ', tag, 'into', parentNode);
                		debugger;
                	}
                }
        		node.remove();
        		node = nd;
        	} else {
        		 var nodes = Array.prototype.slice.call(node.childNodes);
                 for(var i = 0;i < nodes.length; i++){
                 	var c = nodes[i];
                 	if(allowed && allowed.indexOf(tag) > -1){
                 		var c2 = unescapeTableElement(c, nd);
                 		if(c2 != c){replaceNode(c, c2);}
                 	}
                 }
        	}
            return node;
        }

        return target;
    }

    function combineValue(attr, baseValue, inheritedValue) {
        if (attr == 'class' && inheritedValue && inheritedValue.charAt(0) == '+') { // molecule="block"
																					// class="+
																					// myclass"
            return (baseValue || '') + ' ' + inheritedValue.substr(1);
        } else if (attr == 'style' && inheritedValue && inheritedValue.charAt(0) == '+') {
            return (baseValue || '') + ' ' + inheritedValue.substr(1);
        } else {
            return inheritedValue;
        }
    }
}

Molecule.of = function(ele) {
    if(ele.jquery) ele = ele[0];
    if(ele == null) return;
    var r = ele.moleculeInstance;
    if(r == null && ele.hasAttribute('m')) {
        Molecule.scanMolecules(ele);
        return ele.moleculeInstance;
    }
    return r;
}

while(Array.prototype.defCss == null){		// i dont known why plug this
											// function always faild, so...
	/**
	 * 使用 js 定义 css [{$ : 'p', color : 'red', 'font-size' : 'large'}, {$ : 'h1',
	 * color : 'blue'}];
	 */
	Array.prototype.defCss = function(container){
		container = container || document.head;
		var styleElement = document.createElement("style");
        styleElement.type = "text/css";
        container.appendChild(styleElement);
        
        var styleSheet = styleElement.sheet;
		for(var i=0; i<this.length; i++){
			var rule = this[i];
			var selector = rule.$;
			var rules = '';
			for(var attr in rule){ if(rule.hasOwnProperty(attr) && attr != '$'){
				rules += attr.replace(/_/g, '-') + ':' + rule[attr] + ';';
			}}
			if (styleSheet.insertRule)
	            styleSheet.insertRule(selector + ' {' + rules + '}', styleSheet.cssRules.length);
	        else if (styleSheet.addRule)
	            styleSheet.addRule(selector, rules);
	        			
		}
        return styleElement;
	}
}

jQuery.holdReady(true);
jQuery(document).on('DOMContentLoaded', async function(){
	for(var m of Array.prototype.slice.call(document.querySelectorAll('molecule[src]'))){
		if(Molecule.debug) console.log('load from ' + m.getAttribute('src'));
		await Molecule.loadHtml(m.getAttribute('src'));
	}
	
	await Molecule.scanDefines(document, document.baseURI);
	// Molecule.scanMolecules();
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
