/**
 * usage : const {A, B} = await dimport(path);
 * @param {string} path 
 */
async function dimport(path){
    if(path.startsWith('.')){       // relative
        return await import(path);
    } else if(path.startsWith('/')){    // absolute
        return await import(dimport.contextPath + path);
    } else {        // to modules
        return await import(dimport.contextPath + dimport.modulesPath + path);
    }
}

function dpath(path){
    if(path.startsWith('.')){       // relative
        return path;
    } else if(path.startsWith('/')){    // absolute
        return dimport.contextPath + path;
    } else {        // to modules
        return dimport.contextPath + dimport.modulesPath + path;
    }
}

dimport.contextPath = '';       // '/myapp' etc
dimport.modulesPath = 'node_modules';       // '/node_modules/' etc

// html shortcut: <dimport context='' modules=''></dimport>
(function(){
    const el = document.querySelector('dimport');
    if(el){
        if(el.hasAttribute('context')) dimport.contextPath = el.getAttribute('context');
        if(el.hasAttribute('modules')) dimport.modulesPath = el.getAttribute('modules');
    }
})();