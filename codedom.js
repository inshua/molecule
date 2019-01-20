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
            result += c.toCode(indent + 1) + '\n'
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
            var exprCode = '';
            if(expr instanceof Expr){
                exprCode = expr.toCode(indent + 3);
            } else{
                exprCode = JSON.stringify(expr);
            } 
            s += `${this.indent(indent + 1)}${k}: ${exprCode},\n`
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

class FunctionDeclStmt extends Statement{
    constructor(name, args){
        super()
        this.name = name || '';
        this.args = args || '';
    }

    toCode(indent){
        return `${this.indent(indent)}function ${name}(${this.args}) {\n${this.childrenCode(indent)}${this.indent(indent)}}`;
    }
}

FunctionDeclStmt.fromStatements = function(name, statements){
    let r = new FunctionDeclStmt(name);
    r.children = statements;
    return r;
}

class FunctionDeclExpr extends Expr{
    constructor(name, args){
        super()
        this.name = name || '';
        this.args = args || '';
    }

    toCode(indent){
        return `function ${name}(${this.args}) {\n${this.childrenCode(indent)}${this.indent(indent)}}`;
    }
}

FunctionDeclExpr.fromStatements = function(name, statements){
    let r = new FunctionDeclExpr(name);
    r.children = statements;
    return r;
}

class MethodDecl extends Statement{
    constructor(name, args){
        super()
        this.name = name || '';
        this.args = args || '';
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
        return this.indent(indent) + this.code;
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
        let s = this.instance instanceof Expr ? this.instance.toCode(indent) : this.instance;
        if(this.args instanceof ArrayLiteralExpr){
            return `${s}.${this.methodName}(${this.args.toCode(indent)})`
        } else {
            return `${s}.${this.methodName}(${this.args.map(a => a instanceof Expr ? a.toCode(indent) : JSON.stringify(a)).join()})`;
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
        let s = this.fun instanceof Expr ? this.fun.toCode(indent) : this.fun;
        if(this.args instanceof ArrayLiteralExpr){
            return `${s}(${this.args.toCode(indent)})`
        } else {
            return `${s}(${this.args.map(a => a instanceof Expr ? a.toCode(indent) : JSON.stringify(a)).join()})`;
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

class ReturnStmt extends Statement{
    constructor(expr){
        super()
        this.expr = expr;
    }

    toCode(indent){
        return `${this.indent(indent)}return ${this.expr.toCode(indent)};`
    }
}

class NewInstanceExpr extends Expr{
    constructor(className, constructArgs){
        super();
        this.className = className;
        this.constructArgs = constructArgs;
    }

    toCode(indent){
        return `new ${this.className}(${this.constructArgs.map(a => a instanceof Expr ? a.toCode(indent) : JSON.stringify(a)).join()})`
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
        return `[${this.array.map(a => a instanceof Expr ? a.toCode(indent) : JSON.stringify(a)).join()}]`;
    }
}

class ExpandIteratorExpr extends Expr{
    constructor(expr){
        super();
        this.expr = expr;
    }

    toCode(indent){
        return '... ' + (this.expr instanceof Expr ? this.expr.toCode(indent) : JSON.stringify(this.expr));
    }
}