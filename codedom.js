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

class Expr extends Statement{
    constructor(code){
        super()
        this.code = code;
    }
    toCode(indent){
        return this.code;
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


class AssignStmt extends Statement{
    constructor(left, right){
        super()
        this.left = left;
        this.right = right;     // right must be expr
    }
    
    toCode(indent){
        return this.indent(indent) + this.left + ' = ' + this.right.toCode() + ';';
    }
}

class ClassDecl extends Statement{
    constructor(name, extendsClassName){
        super()
        this.name = name;
        this.extendsClassName = extendsClassName;
    }

    toCode(indent){
        return `${this.indent(indent)}class ${this.name} extends ${this.extendsClassName} {\n${this.childrenCode(indent)}${this.indent(indent)}}`;
    }
}

class FunctionDecl extends Statement{
    constructor(name, args){
        super()
        this.name = name;
        this.args = args;
    }

    toCode(indent){
        return `${this.indent(indent)}function ${name} (${this.args}) {\n${this.childrenCode(indent)}${this.indent(indent)}}`;
    }
}

class MethodDecl extends Statement{
    constructor(name, args){
        super()
        this.name = name;
        this.args = args;
    }

    toCode(indent){
        return `${this.indent(indent)}${this.name} (${this.args}) {\n${this.childrenCode(indent)}${this.indent(indent)}}`;
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

class AttrAssignExprStmt extends Statement{
    constructor(elementName, attrName, expr, isProp){
        super()
        this.elementName = elementName
        this.attrName = attrName;
        this.expr = expr;
        this.isProp = isProp;
    }
    toCode(indent){
        return `${this.indent(indent)}${this.elementName}.${this.attrName} = ${this.expr.toCode()};`
    }
}

class AttachEventExprStmt extends Statement{
    constructor(elementName, attrName, expr, isProp){
        super()
        this.elementName = elementName
        this.attrName = attrName;
        this.expr = expr;
        this.isProp = isProp;
    }

    toCode(indent){
        if(this.isHtmlAttr){            
            return `${this.indent(indent)}${this.elementName}.${this.attrName} = ${this.expr.toCode()};`
        } else {        // TODO
            return `${this.indent(indent)}${this.elementName}.${this.attrName} = ${this.expr.toCode()};`
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
        return `${this.indent(indent)}var ${this.name} = ${this.initExpr.toCode()}`
    }
}