class Statement{

    constructor(){
        this.children = [];
    }

    indent(level){
        return '\t'.repeat(level);
    }

    toCode(indent){

    }

    childrenCode(indent){
        var result = '';
        for(let c of this.children){
            if(c != null) result += c.toCode(indent + 1) + '\n'
        }
        return result;
    }
}

class Unit extends Statement{

    toCode(indent){
        return this.childrenCode(indent-1);
    }
    
}

class Expr extends Statement{
    constructor(code){
        super()
        this.code = code;
    }
    toCode(indent){
        return this.code;
    }
}

Expr.toCode = function(expr, indent, stringify=true){
    return expr instanceof Expr ? expr.toCode(indent) : (stringify ? JSON.stringify(expr) : expr + '');
}

class ExpressionStmt extends Statement{
    constructor(expr){
        super();
        this.expr = expr;
    }

    toCode(indent){
        return `${this.indent(indent)}${this.expr.toCode(indent)};`
    }
}

class LiteralExpr extends Expr{     // const value
    constructor(value, type){
        super()
        this.value = value;
        this.type = type;
    }
    toCode(indent){
        switch(this.type){
        case 's': 
            return this.value == null ? 'null' : JSON.stringify(this.value);
        case 'n':            
        case 'b':
        case 'o':   // defered via JSON string
        case 'e':
            return this.value == null ? 'null' : this.value;
        case 'd':
            return this.value == null ? 'null' : `Date.parse(${JSON.stringify(this.value)})`;
        }
    }
    eval(){
        switch(this.type){
        case 's': 
            return this.value;
        case 'n':            
        case 'b':
        case 'o':   // defered via JSON string
        case 'e':
            return this.value == null ? null : JSON.parse(this.value);
        case 'd':
            return this.value == null ? null : Date.parse(this.value);
        }
    }
}

class ObjectLiteralExpr extends Expr{
    constructor(define){
        super();
        this.define = define;
    }
    toCode(indent){
        var s = '{\n';
        for(let k in this.define){
            let expr = this.define[k];
            s += `${this.indent(indent + 1)}${k}: ${Expr.toCode(expr, indent + 3)},\n`
        }
        s += this.indent(indent) + '}';
        return s;
    }
}


class AssignStmt extends Statement{
    constructor(left, right){
        super()
        this.left = left;
        this.right = right;     // right must be expr
    }
    
    toCode(indent){
        return this.indent(indent) + this.left + ' = ' + this.right.toCode(indent) + ';';
    }
}

class ClassDecl extends Expr{
    constructor(name, extendsClassName){
        super()
        this.name = name;
        this.extendsClassName = extendsClassName;
    }

    toCode(indent){
        return `${this.indent(indent)}class ${this.name} extends ${this.extendsClassName} {\n${this.childrenCode(indent)}${this.indent(indent)}}`;
    }
}

class FunctionDeclStmt extends ExpressionStmt{
    constructor(name, args){
        super(new FunctionDeclExpr(name, args))
    }
}

FunctionDeclStmt.fromStatements = function(name, statements){
    let r = new FunctionDeclStmt(name);
    r.children = statements;
    return r;
}

class FunctionDeclExpr extends Expr{
    constructor(name, args, statements){
        super()
        this.name = name || '';
        this.args = args || '';
        this.children = statements || [];
    }

    toCode(indent){
        return `function ${this.name}(${this.args}) {\n${this.childrenCode(indent)}${this.indent(indent)}}`;
    }
}

FunctionDeclExpr.fromStatements = function(name, statements){
    let r = new FunctionDeclExpr(name);
    r.children = statements;
    return r;
}

class MethodDecl extends Statement{
    constructor(name, args, statements){
        super()
        this.name = name || '';
        this.args = args || '';
        this.children = statements || [];
    }

    toCode(indent){
        return `${this.indent(indent)}${this.name}(${this.args || ''}) {\n${this.childrenCode(indent)}${this.indent(indent)}}`;
    }
}

class ConstructorDecl extends Statement{
    constructor(){
        super()
    }

    toCode(indent){
        return `${this.indent(indent)}constructor() {\n${this.childrenCode(indent)}${this.indent(indent)}}`;
    }
}

class LineStmt extends Statement{
    constructor(code){
        super()
        this.code = code;
    }

    toCode(indent){
        return this.indent(indent) + this.code + ';';
    }
}

class PropAssignExprStmt extends Statement{
    constructor(elementName, propName, expr, isCustomProp){
        super()
        this.elementName = elementName
        this.propName = propName;
        this.expr = expr;
        this.isCustomProp = isCustomProp;
    }
    toCode(indent){
        if(this.isCustomProp){
            //return `${this.indent(indent)}${this.elementName}.setAttribute(${JSON.stringify(this.propName)}, ${this.expr.toCode()});`
            return `${this.indent(indent)}this.prop(${JSON.stringify(this.propName)}, ${this.expr.toCode(indent)});`
        } else {
            return `${this.indent(indent)}${this.elementName}.${this.propName} = ${this.expr.toCode(indent)};`
        }
    }
}

class AttachEventExprStmt extends Statement{
    constructor(elementName, propName, expr, isCustomProp){
        super()
        this.elementName = elementName;   
        this.propName = propName.substr(2); // bypass 'on'
        this.expr = expr;
        this.isCustomProp = isCustomProp;
    }

    toCode(indent){
        if(! this.isCustomProp){            
            return `${this.indent(indent)}${this.elementName}.addEventListener(${JSON.stringify(this.propName)}, ${this.expr.toCode(indent)});`
        } else {        // TODO
            return `${this.indent(indent)}jQuery(${this.elementName}).on(${JSON.stringify(this.propName)}, ${this.expr.toCode(indent)});`
        }
    }
}

class VarDeclStmt extends Statement{
    constructor(name, initExpr){
        super()
        this.name = name;
        this.initExpr = initExpr;        
    }

    toCode(indent){
        return `${this.indent(indent)}var ${this.name} = ${this.initExpr.toCode(indent)}`
    }
}

class MethodInvokeExpr extends Expr{
    constructor(instance, methodName, args ){
        super()
        this.instance = instance;
        this.methodName = methodName;
        this.args = args;        
    }

    toCode(indent){
        let s = Expr.toCode(this.instance, indent, false);
        if(this.args instanceof ArrayLiteralExpr){
            return `${s}.${this.methodName}(${this.args.toCode(indent)})`
        } else {
            return `${s}.${this.methodName}(${this.args.map(a => Expr.toCode(a, indent)).join()})`;
        }
    }
}

class MethodInvokeStmt extends ExpressionStmt{
    constructor(instance, methodName, args ){
        super(new MethodInvokeExpr(instance, methodName, args));
    }
}

class FunctionInvokeExpr extends Expr{
    constructor(fun, args){
        super()
        this.fun = fun;
        this.args = args;        
    }

    toCode(indent){
        let s = Expr.toCode(this.fun, indent, false);
        if(this.args instanceof ArrayLiteralExpr){
            return `${s}(${this.args.toCode(indent)})`
        } else {
            return `${s}(${this.args.map(a => Expr.toCode(a, indent)).join()})`;
        }
    }
}

class FunctionInvokeStmt extends ExpressionStmt{
    constructor(fun, args){
        super(new FunctionDeclExpr(fun, args))
    }
}

class BracketExpr extends Expr{
    constructor(expr){
        super();
        this.expr = expr;
    }
    toCode(indent){
        return `(${this.expr.toCode(indent)})`
    }
}

class LtEqExpr extends Expr{
    constructor(left, right){
        super();
        this.left = left;
        this.right = right;
    }
    toCode(indent){
        return Expr.toCode(this.left, indent) + '<=' + Expr.toCode(this.right, indent);
    }
}

class ReturnStmt extends Statement{
    constructor(expr){
        super()
        this.expr = expr;
    }

    toCode(indent){
        return `${this.indent(indent)}return ${Expr.toCode(this.expr, indent)};`
    }
}

class NewInstanceExpr extends Expr{
    constructor(className, constructArgs){
        super();
        this.className = className;
        this.constructArgs = constructArgs;
    }

    toCode(indent){
        return `new ${this.className}(${this.constructArgs.map(a => Expr.toCode(a, indent)).join()})`
    }
}

class DefaultPropExpr extends NewInstanceExpr{
    // constructor(expression, type, isRuntime, isNative, echo)
    constructor(propName, type, isCustomProp, isExpr, isRuntime, isEcho, expr){
        super('Prop', [expr,  type, isRuntime ? true : false, (!isCustomProp) ? true : false, isEcho?true:false]);
    }
}

class ArrayLiteralExpr extends Expr{
    constructor(){
        super();
        this.array = [];
    }

    push(element){
        this.array.push(element);
    }

    isEmpty(){
        return this.array.length == 0
    }

    extends(anotherArray){
        if(anotherArray instanceof ArrayLiteralExpr){
            Array.prototype.push.apply(this.array, anotherArray.array); 
        } else if(Array.isArray(anotherArray)){
            Array.prototype.push.apply(this.array, anotherArray);
        } else {
            throw new Error('type mismatch');
        }
    }

    toCode(indent){
        return `[${this.array.map(a => Expr.toCode(a, indent)).join()}]`;
    }
}

class ExpandIteratorExpr extends Expr{
    constructor(expr){
        super();
        this.expr = expr;
    }

    toCode(indent){
        return '... ' + Expr.toCode(this.expr, indent, false);
    }
}

class IfStmt extends Statement{

    constructor(branches){
        super();
        this.branches = branches;
    }

    toCode(indent){
        var s = ''
        var inIf = true;
        for (const branch of this.branches) {
            if(inIf){
                s += `${this.indent(indent)}if(${branch.cond.toCode(indent)}){\n`;
                inIf = false;
            } else if(branch.cond) {
                s += ` else if(${branch.cond.toCode(indent)}){\n`;
            }  else {
                s += ` else {\n`;
            }
            for(let stmt of branch.then){
                s += stmt.toCode(indent + 1) + '\n';
            }
            s += `${this.indent(indent)}}`
        }
        return s + '\n';
    }
}

class ConstDeclStmt extends Statement{
    constructor(name, initExpr){
        super()
        this.name = name;
        this.initExpr = initExpr;        
    }

    toCode(indent){
        return `${this.indent(indent)}const ${this.name} = ${this.initExpr.toCode(indent)};`
    }
}

class LambdaExpr extends Expr{
    constructor(args, statements){
        super()
        this.args = args || '';
        this.children = statements;
    }

    toCode(indent){
        return `(${this.args}) => {\n${this.childrenCode(indent)}${this.indent(indent)}}`;
    }
}

class ForIteratorStmt extends Statement{
    
    constructor(iterator, container, body){
        super();
        this.iterator = iterator;
        this.container = container;
        this.children = body;
    }

    toCode(indent){
        const it = this.iterator.toCode(indent);

        return `${this.indent(indent)}for(${it.indexOf('.') == -1 ? 'const ' : ''}${this.iterator.toCode(indent)} of ${this.container.toCode(indent)}){\n${this.childrenCode(indent)}${this.indent(indent)}}`
    }
}

class ForLoopStmt extends Statement{
    
    constructor(init, cond, step, body){
        super();
        this.init = init;
        this.cond = cond;
        this.step = step;
        this.children = body;
    }

    toCode(indent){
        return `${this.indent(indent)}for(${this.init ? this.init.toCode(indent) : ''};${this.cond ? this.cond.toCode(indent): ''}; ${this.step ? this.step.toCode(indent): ''}){\n${this.childrenCode(indent)}\n${this.indent(indent)}}\n`
    }
}

class ConcatStringExpr extends Expr{

    constructor(...items){
        super()
        this.children = items;
    }

    extends(...items){
        return new ConcatStringExpr(...this.children.concat(items));
    }

    toCode(indent){
        let arr = [];
        var s = '';
        for(let c of this.children){
            if(c instanceof Expr){
                if(c instanceof LiteralExpr){
                    if(c.type == 's'){
                        s += c.value;
                    } else {
                        s += c.toCode(indent);
                    }
                } else {
                    if(s) arr.push(JSON.stringify(s));
                    s = '';
                    arr.push(c.toCode(indent));
                }
            } else {
                s += new String(c);
            }
        }
        if(s) arr.push(JSON.stringify(s));
        return arr.join('+');
        //return this.children.map(item => Expr.toCode(item, indent)).join('+');
    }
}

class SwitchStmt extends Statement{

    constructor(cond, branches){
        super();
        this.cond = cond;
        this.branches = branches;
    }

    toCode(indent){
        var s = `${this.indent(indent)}switch(${Expr.toCode(this.cond, indent)}){\n`
        for (const branch of this.branches) {
            s += `${this.indent(indent)}case ${Expr.toCode(branch.cond, indent)}:\n`;
            for(let stmt of branch.then){
                s += stmt.toCode(indent + 1) + '\n';
            }
            s += `${this.indent(indent + 1)}break;\n`;
        }
        return s + `${this.indent(indent)}}`;
    }
}
