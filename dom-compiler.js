function dashToCamelCase( myStr ) {
    return myStr.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); });
}

function camelCaseToDash( myStr ) {
    return myStr.replace( /([a-z])([A-Z])/g, '$1-$2' ).toLowerCase();
}


Molecule.compileDefine = async function(prototypeElement, fullname){
    const attrReg = /(?<isCustomProp>m-)?(?<name>[^\/^:]+)(?<type>:[s|n|b|d|o|evt])?(?<isRuntime>:r)?(?<isEcho>:e)?$/;

    let uinit = new Unit();
    let c = new ClassDecl(fullname, prototypeElement.extends || 'Molecule')
    uinit.children.push(c);

    //let init = new ConstructorDecl();
    let init = new MethodDecl('init');
    init.children.push(new LineStmt('super.init();'))
    c.children.push(init);

    let renderer = new MethodDecl('renderDOM', prototypeElement.getAttribute('args') || '');
    c.children.push(renderer);
    
    let defaultProps = {}
    let propDescs = {}

    for(let attr of prototypeElement.attributes){
        var elementName = 'this.element';

        var value = attr.value;
        let [propName, attrName, type, isCustomProp, isRuntime] = parseAttributeName(prototypeElement, attr.name);
        var expr = parseAttributeValue(value, type)
        if(isRuntime){      // put into renderer
            if(type == 'e'){  // event assign, put into init
                renderer.children.push(new AttachEventExprStmt(elementName, propName, expr, isCustomProp));
            } else {
                renderer.children.push(new PropAssignExprStmt(elementName, propName, expr, isCustomProp));
                if(isCustomProp) propDescs[propName] = {attr: attrName, isRuntime: isRuntime, type: type};
            }
        } else {
            if(type == 'e'){  // event assign, put into init
                init.children.push(new AttachEventExprStmt(elementName, propName, expr, isCustomProp));
            } else {    // values, put into defaultProps
                if(type == 'x'){
                    defaultProps[propName] = FunctionDecl.fromStatements('', [new ReturnStmt(expr)]);
                } else {
                    defaultProps[propName] = expr;
                }
                if(isCustomProp) propDescs[propName] = {attr: attrName, isRuntime: isRuntime, type: type};
            }
        }                
        compileChildren(prototypeElement, elementName, renderer);
    }

    let defaultPropsStmt = new AssignStmt(fullname + '.defaultProps', new ObjectLiteralExpr(defaultProps));
    uinit.children.push(defaultPropsStmt);

    let propDescsStmt = new AssignStmt(fullname + '.propDescs', new ObjectLiteralExpr(propDescs));
    uinit.children.push(propDescsStmt);

    /* 
        attr syntax: [m-]attr[:n|s|o|b|d|x|evt][:r][:e]
    */
    function parseAttributeName(element, attrName){
        let groups = attrReg.exec(attrName).groups;
        let {isCustomProp, name, type, isRuntime, isEcho} = groups;
        if(type == ':evt' || name.startsWith('on')){
            isCustomProp = !(name in element);
            var propName = name;
        } else {
            let desc = HTML_ATTRS.ofAttr[name];            
            if(desc != null) var propName = desc.prop;
            
            isCustomProp = isCustomProp || propName == null || (!desc.global && desc.tags.indexOf(element.tagName.toLowerCase()) == -1);
            if(isCustomProp && propName == null){
                propName = dashToCamelCase(name);       // prop without attr
            }
        }
        let isCustomAttr = HTML_ATTRS.isCustomAttr(name, element.tagName);
        return [propName, isCustomAttr ? name + (type||'') : name, type ? type.substr(1) : 's', isCustomProp, isRuntime && true, isEcho && true];
    }

    function parseAttributeValue(value, type){
        if(type == 'x' || type == 'evt'){     // expr
            return new Expr(value);
        } else {
            return new LiteralExpr(value, type);
        }
    }

    function compileChildren(element, elementName, renderer){
        for(let child of Array.from(element.children)){
            let childElementName = child.tagName + '_' + randomKey();
            compileCreateInnerElement(childElementName, childKey, child.tagName, elementName, renderer);
            for(let cattr of child.attributes){
                let value = cattr.value;
                let [name, type, isCustomProp, isRuntime] = parseAttributeName(element, cattr.name);
                if(isRuntime){
                    throw ':r(render) option can only appear within molecule define';
                }

                var expr = parseAttributeValue(value, type)
                if(type == 'evt'){
                    codeBlock.children.push(new AttachEventExprStmt(elementName, name, expr, isCustomProp));
                } else {
                    codeBlock.children.push(new PropAssignExprStmt(elementName, name, expr, isCustomProp));
                }
            }            
            compileChildren(child, childElementName, renderer);
        }
    }


    function compileCreateInnerElement(name, tagName, parentName, codeContainer){
        let key = name;
        codeContainer.push(new VarDeclStmt(name, `this.elements['${key}']`));   // var n = this.elements['key1']
        let ifStmt = new IfStmt(`!${name}`);                // if(!n)
        ifStmt.trueBlock.push(new AssignStmt(name, `document.createElement('${tagName}')`));    // n = document.createElement('tag')
        ifStmt.trueBlock.push(new AssignStmt(`this.elements['${key}']`, name));         // this.elements['key1'] = n
        ifStmt.trueBlock.push(new LineStmt(`${name}.setAttribute('key', '${key}')`))    // n.setAttribute('key', 'key1')
        ifStmt.trueBlock.push(new LineStmt(`${parentName}.appendChild(${name})`))       // p.appendChild(n);
        codeContainer.push(ifStmt);
    }

    let code = uinit.toCode(0);
    // let script = document.createElement('script');
    // script.setAttribute('molecule-gen', fullname);
    // script.innerHTML = code;
    // document.head.append(script);
    console.log(code);
    return code;
}
