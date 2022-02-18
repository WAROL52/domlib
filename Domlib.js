// eslint-disable-next-line no-unused-vars
class Domlib {
  constructor({ el, data = {}, methode = {} }) {}
  static TrapLib = class {
    constructor(target = {}, handler={},listExc = []) {
      if (!target) return target;

      if(target['$isTrapLib']) return target
      if (Domlib.isDomElement(target)) return target;
      if (Domlib.isDomText(target)) return target;
      if (Domlib.isDomFragment(target)) return target;
      if(typeof handler=='object'){
        Object.assign(this,handler)
      }
      this.onSet=(option,t,h)=>{
        handler?.onSet?.(option,t,h)
        if (typeof option.newValue == "object") {
          option.newValue = new this.constructor(option.newValue);
        }
      }
      const trap = target.$isTrap?target:  new Traper(target, this);
      Object.defineProperty(target,'$isTrapLib',{
        value:true,
        writable:false,
        configurable:false,
        enumerable:false
      })
      for (let at in trap) {
        if (typeof trap[at] == "object") {
          const index = listExc.indexOf(at);
          if (index == -1 && !trap[at]?.$isTrapLib) {
            trap[at] = new this.constructor(trap[at]);
          }
        }
      }
      return trap;
    }
  };
  static #Core = class Core{
    constructor() {
      Domlib.#Core.#core ??= this;
      return Domlib.#Core.#core;
    }
    
    HTMLText=class HTMLText{
      static #regexIsDataR =/\{\{\s*(\[?\s*[a-zA-Z_]*\w*(\.[a-zA-Z_]*\w*\s*)*\s*\]?)\s*\}\}/gm
      static attachData(htmlText,handler,dico={dynamic:{},static:{}}){
        if (!Domlib.isDomText(htmlText)) return;
        const result = htmlText.data.match(this.#regexIsDataR);
        const el = htmlText.parentElement;
        if (!el) return console.warn("bug");
        if (result) {
          this.#splitTextChild(result, htmlText).forEach((childSplited) =>
            this.#attachTextChild(childSplited, handler,dico.dynamic,dico.static)
          );
        }
      }
      static #splitTextChild(listMatch, child) {
        if (!Domlib.isDomText(child)) return [];
        const listChilds = [];
        listMatch.forEach((item) => {
          const indexToSplit = child.data.indexOf(item);
          var childSplited;
          if (indexToSplit != -1 && indexToSplit < child.data.length) {
            childSplited = child.splitText(indexToSplit);
            child = childSplited.splitText(item.length);
            childSplited.data = childSplited.data.replace(
              this.#regexIsDataR,
              (_corresp, path) => {
                return path;
              }
            );
            listChilds.push(childSplited);
          }
        });
        return listChilds;
      }
      static #attachTextChild(textChild, handlerNode ,dicoD={},dicoS={}) {
        if (!Domlib.isDomText(textChild)) return;
        const {lastState, name}=textChild.data in dicoS
          ?{
            lastState:new Traper(dicoS),
            name:textChild.data
          }
          :handlerNode.$getByPath(
          dicoD?.[textChild.data]||textChild.data
        )
        const data=lastState
        if (!data || !data.$isTrap) {
          textChild.data = `{${textChild.data} undefined\}`;
          return;
        }
        const value = data[name];
        this.#attachRoot({ textChild, data, name, value ,handlerNode});
      }
      static #attachRoot({ textChild, data, name, value ,handlerNode}, addEv = true, opt = {}) {
        if (Array.isArray(value))
          return this.#attachArray(
            { textChild, data, name, handlerArray:value,handlerNode },
            addEv,
            opt
          );
        this.#attachDefault({ textChild, data, name, value,handlerNode }, addEv, opt);
      }
      static rendArray({template,elBefore,array,handler,dico}){
        const listElement=[]
        const regElement={}
        const attachEl=(el,index,h)=>{
          if(template){
            if(handler.$isTrap)(new Core).attachElement(el,h,{
              dynamic:{
                [dico?.array[0]]:`${dico?.path}.${index}`
              },
              static:{
                [dico?.array[1]]:index
              },
              path:dico?.path,
              array:dico?.array
            })
          }else{
            if(handler?.$isTrap)(new Core).attachElement(el,h)
            else return 
          }
        }
        const rendEl=(index,value)=>{
          const _el=Domlib.createElement(template||value)
          
          if(Domlib.isDomText(_el))_el.data+=','
          if(isNaN(Number(index))){
            if(regElement[index]){
              regElement[index].before(_el)
              regElement[index].remove()
            }else{
              textChild.after(_el)
            }
          }else if(index in listElement){
            listElement[index].before(_el)
            listElement[index].remove()
          } else {
            var _key = -1;
            for (
              let i = index, u = index;
              i >= 0 || u < listElement.length;
              i--, u++
            ) {
              if (i >= 0 && listElement[i]) {
                _key = i;
                i = -1;
                break;
              }
              if (u < listElement.length && listElement[u]) {
                _key = u;
                u = listElement.length + 1;
                break;
              }
            }
            if (_key != -1) {
              if (_key < index) {
                listElement[_key].after(_el);
              } else {
                listElement[_key].before(_el);
              }
            } else {
              elBefore.before(_el);
            }
          }
          listElement[index]=_el
          return _el
        }
        array.forEach((val, index) =>{
          const el=rendEl(index,val)
          attachEl(el,index,handler)
        });
        
        const handlerChange = array.$on.change( "*",(handlerEvent) =>{
          console.log('ARRRAY');
          if(template){
            console.log('ARRRAY --verify if true');
            if(handlerEvent.$option.key in listElement) return
            console.log('ARRRAY---no TRUUUUU');
          }
          console.log('mbola mandea va');
          const el=rendEl(handlerEvent.$option.key,handlerEvent.$option.value)
          attachEl(el,handlerEvent.$option.key,handler)
        });
        const handlerDelete = array.$on.delete("*", (handlerEvent) => rendEl(handlerEvent.$option.key,''));
        const toRemoving = () => {
          listElement.forEach((el) => el.remove());
          for(let at in regElement){regElement[at].remove()}
        };
        return{
          handlerChange,handlerDelete,toRemoving
        }
      }
      static #attachArray({ textChild, data, name, handlerArray,handlerNode,template}) {
        if (!Array.isArray(handlerArray)) return;
        if (!Domlib.isDom(textChild)) return;
        if (!Domlib.isDomText(textChild)) textChild = Domlib.createElement("");
        if(!handlerArray?.$isTrap) {
          console.warn("the array must be a Trap")
          throw "the array must be a Trap"
        }
        const {
          handlerChange,handlerDelete,toRemoving
        }=this.rendArray({
          template:template,
          elBefore:textChild,
          array:handlerArray,
          handler:handlerNode
        })
        textChild.data = "";
        const handlerData = data.$on.change(name, (handlerEvent) => {
          toRemoving();
          this.#attachRoot({ textChild, data, name, value: handlerEvent.$option.newValue });
        });
        data.$on.delete(name, (handlerEvent) => {
          toRemoving();
          handlerArray._remove(handlerChange),
          handlerArray._remove(handlerDelete),
          handlerEvent._remove(handlerData);
          textChild.remove();
          Promise.resolve().then(() => {
            handlerEvent._remove(handlerEvent)
          });
        });
      }
      static #attachDefault({ textChild, data,name, value ,handlerNode}, addEv = true, opt) {
        if (!Domlib.isDom(textChild)) return;
        const key=name
        const init = (elText,val) => {
          const text = Domlib.createElement(val);
          if(Domlib.isDomElement(text)){
            (new Core).attachElement(text,handlerNode)
          }
          if(Domlib.isDomFragment(text)){
            (new Core).attachFragment(text)
          }
          elText.after(text);
          elText.remove();
          elText = text;
          return text;
        };
        textChild=init(textChild,value);
        if (opt._el) opt._el = textChild;
        if (!addEv) return;
        // if(Array.isArray(data)) return
        const handlerChange = data.$on.change(
          key,
          (handlerEvent) => {
            console.warn(handlerEvent.$option.key,handlerEvent.$option.newValue,handlerEvent._id);
            console.log(handlerEvent);
            if (Array.isArray(handlerEvent.$option.newValue)) {
              data.$remove(handlerDelete);
              handlerEvent.remove;
              this.#attachArray(
                { textChild, data, name, value: handlerEvent.$option.newValue },
                addEv,
                opt
              );
            } else {
              const newEl=Domlib.createElement(handlerEvent.$option.newValue)
              if(handlerEvent.els.nodeName==newEl.nodeName && newEl.nodeName=="#text"){
                handlerEvent.els.data=handlerEvent.$option.newValue
                return
              }
              handlerEvent.els=init(handlerEvent.els,handlerEvent.$option.newValue);
            }
          },
          {
            els: textChild,
          }
        );

        const handlerDelete = data.$on.delete(name, (handlerEvent) => {
          handlerEvent._remove(handlerChange);
          Promise.resolve().then(() => handlerEvent._remove(handlerEvent));
          init("").remove();
        });
      }
    }
    HTMLComponent = class HTMLComponent {
      constructor(builder, builderType) {
        this.builderType = builderType;
        this.builder = builder;
      }
      name;
      el;
      initChildrens(el, handler) {
        handler.children.push(...el.children);
        handler.children.forEach((child,index) => {
          child=Domlib.createElement(child)
          handler.children[index]=child
          child.remove()
          if (child.slot) {
            if (!handler.slot[child.slot]) handler.slot[child.slot] = [];
            handler.slot[child.slot].push(child);
          }
        });
      }
      initProps(el, handler,props) {
        for (let attr of el.attributes) {
          handler.props[attr.name] = attr.value;
        }
        for(let at in props){
          handler.props[at]=props[at]
        }
      }
    };
    HTMLDirective = class HTMLDirective {
      static Directive=class Directive {
        constructor({directiveName,onInit,regex=directiveName}){
          this.directiveName=directiveName
          this.onInit=onInit
          if(!this.isDirectiveValid({directiveName,onInit,reg:regex})){
            return {}
          }
          HTMLDirective.#directiveCustom.push({
            directiveName,
            reg:regex,
            regex:HTMLDirective.createRegexValid(regex),
            data:{},
            directive:this
          })
        }
      }
      static createRegexValid(regx){
        // eslint-disable-next-line no-useless-escape
        return new RegExp('^'+regx.toString()+`:(\.?([A-z]+[-_]*)+(\.[A-z]+[-_]*)*)?`)
      }
      static #directiveNative=[
        { //directive-model []
          directiveName:'',
          reg:'bind',
          regex:this.createRegexValid('.x.x.'),
          data:{},
          directive:{
            directiveName:'',
            onInit:(el,attr,option)=>{console.log(el,attr,option);},
          }
        },
        { // 1-directive-attr [x]
          directiveName:"directive-attr",
          regex:this.createRegexValid('(bind)?'),
          data:{},
          reg:'bind',
          directive:{
            directiveName:"directive-attr",
            onInit:(el,attr,option)=>{
              var isBind=false
              const {lastState,name}=option.attachment
              if(!lastState){
                console.warn(`In ${el.localName}[${attr.name}='${attr.value}'] : '${attr.value}' is not finded`);
                throw `In ${el.localName}[${attr.name}='${attr.value}'] : '${attr.value}' is not finded `
              }
              const type={
                radio:()=>{
                  const rendEl=(e)=>{
                    var check=el.checked??el.getAttributeNode('checked')
                    if(check || e){
                      if(check?.name)check=check?.value==''?'on':check?.value
                      lastState[name]=el.value??el.getAttribute('value')??check??lastState[name]
                    }
                  }
                  option.opts.slice(1).forEach(ev=>{
                    el.addEventListener(ev,rendEl)
                  })
                  rendEl()
                },
                default:()=>{
                  const rendAttr=()=>{
                    if(Domlib.isDomElement(el)){
                      if(option.opt in el){
                        el[option.opt]=lastState[name]
                      }else{
                        el.setAttribute(option.opt,lastState[name]?.toString())
                      }
                    }
                  }
                  const addEvent=()=>{
                    option.opts.slice(1).forEach(ev=>{
                      el.addEventListener(ev,()=>{
                        console.log('defaultl');
                        lastState[name]=el.value??el.getAttribute('value')??lastState[name]
                      })
                    })
                  }
                  addEvent()
                  rendAttr()
                  if(lastState.$isTrapLib)lastState.$on.change(name,()=>{rendAttr()})
                }
              }
              var tpe=el.type ?? el.getAttribute('type')
              if(tpe){
                if(type[tpe])type[tpe]()
                else type.default();
              }else{
                type.default()
              }
            },                    
          }                    
        },                                                                                      
        { // 4-directive-ref [x]
          directiveName:'directive-ref',
          reg:'ref',
          regex:/^[#]([a-zA-Z]*[a-zA-Z_-]*[a-zA-Z]*)(:(\.[a-zA-Z]+[\w-]*)*)?/,
          data:{},
          directive:{
            directiveName:'directive-ref',
            onInit:(el,attr,option)=>{
              el.setAttribute('id',option.directiveName.slice(1))
              if(option.handler.id[option.directiveName.slice(1)]){
                console.warn(`In ${el.localName}[${attr.name}='${attr.value}'] : '${attr.value}' this id name has already useed`);
                throw `In ${el.localName}[${attr.name}='${attr.value}'] : '${attr.value}' this id name has already useed `
              }
              option.handler.id[option.directiveName.slice(1)]=el
              option.opts.forEach(className=>{
                el.classList.add(className)
                if(!Array.isArray(option.handler.className[className]))option.handler.className[className]=[]
                option.handler.className[className].push(el)
              })
            },
          }
        },
        { // 2-directive-event [x]
          directiveName:'directive-event',
          reg:'on',
          regex:this.createRegexValid('on'),
          data:{},
          directive:{
            directiveName:'directive-event',
            onInit:(el,attr,option)=>{
              if(!Domlib.isDomElement(el)){
                return console.warn('Erreur grave [Interne] , ceci n\'est pas un element HTML',el);
              }
              const {lastState,name}=option.attachment
              if(!lastState){
                console.warn(`In ${el.localName}[${attr.name}='${attr.value}'] : '${attr.value}' is not finded `);
                throw `In ${el.localName}[${attr.name}='${attr.value}'] : '${attr.value}' is not finded `
              }
              if(typeof lastState[name]!='function'){
                console.warn(`In ${el.localName}[${attr.name}='${attr.value}'] : '${attr.value}' is not a function `);
                throw `In ${el.localName}[${attr.name}='${attr.value}'] : '${attr.value}' is not a function `
              }
              const getOption=()=>{
                if(option.opts.includes('true')) return true
                if(option.opts.includes('false')) return false
                return {
                  capture:option.opts.includes('capture'),
                  once:option.opts.includes('once'),
                  passive:option.opts.includes('passive'),
                  useCapture:option.opts.includes('useCapture'),
                }
              }
              const opt=option.opt;
              const removeEvent=()=>{
                el.removeEventListener(opt,rendEv,getOption())
                  return true
              }
              const createEvent=()=>{
                el.addEventListener(opt,rendEv,getOption())
                return true
              }
              const rendEv=(e)=>{
                e.removeEvent=removeEvent
                e.recreateEvent=createEvent
                if(option.opts.includes('prevent'))e.preventDefault()
                return (lastState[name]).bind(el)(e)
              }
              createEvent()
              lastState.$on.change(name,(option)=>{
                removeEvent()
                if(typeof option.value=='function')createEvent()
              })
              lastState.$on.delete(name,()=>removeEvent())
            },
          }
        },
        { // 3-directive-emit [x]
          directiveName:'directive-emit',
          reg:'emit',
          regex:this.createRegexValid('emit'),
          data:{},
          directive:{
            directiveName:'directive-emit',
            onInit:(el,attr,option)=>{
              if(!Domlib.isDomElement(el)){
                return console.warn('Erreur grave [Interne] , ceci n\'est pas un element HTML',el);
              }
              const getOption=()=>{
                if(option.opts.includes('true')) return true
                if(option.opts.includes('false')) return false
                return {
                  capture:option.opts.includes('capture'),
                  once:option.opts.includes('once'),
                  passive:option.opts.includes('passive'),
                  useCapture:option.opts.includes('useCapture'),
                }
              }
              const opt=option.opt;
              const removeEvent=()=>{
                el.removeEventListener(opt,rendEv,getOption())
                  return true
              }
              const createEvent=()=>{
                el.addEventListener(opt,rendEv,getOption())
                return true
              }
              const rendEv=(e)=>{
                e.removeEvent=removeEvent
                e.recreateEvent=createEvent
                if(option.opts.includes('prevent'))e.preventDefault()
                option.handler.$emitEvent(attr.value,e)
                return option.handler.el.dispatchEvent(new CustomEvent(attr.value, {
                  detail:e,
                  bubbles:option.opts.includes('bubbles'),
                  cancelable:option.opts.includes('cancelable'),
                  composed:option.opts.includes('composed'),
                }))
              }
              createEvent()
            },
          }
        },
        { // 5-directive-if [x]
          directiveName:'directive-if',
          reg:'if',
          regex:this.createRegexValid('if'),
          data:{},
          directive:{
            directiveName:'directive-if',
            onInit:(el,attr,option)=>{
              const {lastState,name}=option.attachment
              if(!(['true','false',undefined].includes(option.opt))){
                console.warn(`In ${el.localName}[${attr.name}='${attr.value}'] : '${option.opt}' is not valid listValid=>[.true,.false,'']`);
                throw `In ${el.localName}[${attr.name}='${attr.value}'] : '${option.opt}' is not valid listValid=>[.true,.false,''] `
              }
              if(!option.attachment.hasFinded){
                console.log('bug',option);
                console.warn(`In ${el.localName}[${attr.name}='${attr.value}'] : '${attr.value}' is not finded in handler`);
                throw `In ${el.localName}[${attr.name}='${attr.value}'] : '${attr.value}' is not finded in handler`
              }
              const comment=document.createComment(` ${el.localName}[${attr.name}='${attr.value}']:=>is-${!(option.opt=='true')} `)
              el.after(comment)
              const rendComment=()=>(el.after(comment),el.remove())
              const rendEl=()=>(comment.after(el),comment.remove())
              const init=()=>{
                if(option.opt=='false'){
                  if(lastState[name])return rendComment()
                }else{
                  if(!lastState[name]) return rendComment()
                }
                rendEl()
              }
              init()
              lastState.$on.change(name,()=>init())
              lastState.$on.delete(name,()=>init())
            },
          }
        },
        { // 6-directive-mode []
          directiveName:'',
          reg:'...',
          regex:this.createRegexValid('.x.x.'),
          data:{},
          directive:{
            directiveName:'',
            onInit:(el,attr,option)=>{console.log(el,attr,option);},
          }
        },
        { // 7-directive-style [x]
          directiveName:'directive-style',
          reg:'style',
          regex:this.createRegexValid('style'),
          data:{},
          directive:{
            directiveName:'directive-style',
            onInit:(el,attr,option)=>{
              const {lastState,name}=option.attachment
              var handler=lastState[name]
              var listHev=[]
              const removeEv=(obj=handler)=>{
                for (const [key, value] of Object.entries(obj)) {
                  el.style[key]=""
                }
                listHev.forEach(h=>obj.$handlerEvent.remove(h))
                listHev=[]
              }
              const iniEv=(obj=handler)=>{
                removeEv(obj===handler?{}:handler)
                handler=obj
                Object.assign(el.style,obj)
                listHev=[
                obj.$on.change('*',(option)=>{
                  el.style[option.$option.key]=option.$option.value
                }),
                obj.$on.delete('*',(option)=>{
                  el.style[option.$option.key]=""
                })
                ]
              }
              iniEv(handler)
              var isRemoved=false
              const hEv=lastState.$on.change(name,(option)=>{
                if(isRemoved) return
                if(typeof option.$option.value=='object'){
                  iniEv(option.$option.value)
                }
              })
              lastState.$on.delete(name,()=>{
                const result=lastState.$handlerEvent.remove(hEv)
                removeEv()
                isRemoved=true
              })
            },
          }
        },
        { // 8-directive-mode []
          directiveName:'',
          reg:'...',
          regex:this.createRegexValid('.x.x.'),
          data:{},
          directive:{
            directiveName:'',
            onInit:(el,attr,option)=>{console.log(el,attr,option);},
          }
        },
        { // 9-directive-for []
          directiveName:'directive-for',
          reg:'for',
          regex:this.createRegexValid('for'),
          data:{},
          directive:{
            directiveName:'directive-for',
            onInit:(el,attr,option)=>{
              const dico={}
              const dicoConstante={}
              const rendLoup=(el,data,path,attr)=>{
                el.removeAttributeNode(attr)

                var {outerHTML:template}=el
                const opts=attr.name.slice(attr.name.indexOf(':')+1).split('.').filter(e=>e)
                const core=new Core
                // template=template.replace(/\{\{\s*(\[?\s*[a-zA-Z_]*\w*(\.[a-zA-Z_]*\w*\s*)*\s*\]?)\s*\}\}/g,(chaine,corresp)=>{
                //   console.log(chaine);
                //   console.log(corresp);
                //   if(corresp==opts[0]) return `{{${path}}}`
                //   return "Rolio"
                // })
                core.HTMLText.rendArray({
                  elBefore:el,
                  template,
                  array:data,
                  handler:option.handler,
                  dico:{
                    array:opts,
                    path
                  }
                })
                el.remove()
                // for(let [key,value] of Object.entries(data)){
                //   dico[opts[0]]=`${path}.${key}`
                //   dicoConstante[opts[1]]=key
                //   console.log(opts[1],key);
                //   const _el=Domlib.createElement(outerHTML)
                //   core.attachElement(_el,option.handler,{
                //     dynamic:dico,
                //     static:dicoConstante
                //   })
                //   el.before(_el)
                // }
                // el.remove()
              }
              rendLoup(el,option.attachment.value,option.attachment.path,attr)
            },
          }
        },
        { // 10-directive-call [x]
          directiveName:'directive-call',
          reg:'call',
          regex:this.createRegexValid('call'),
          data:{},
          directive:{
            directiveName:'directive-call',
            onInit:(el,attr,option)=>{
              console.log(el,attr,option);
              const {value:func} =option.attachment
              if(!func){
                console.warn(`In ${el.localName}[${attr.name}='${attr.value}'] : '${attr.value}' is not finded`);
                throw `In ${el.localName}[${attr.name}='${attr.value}'] : '${attr.value}' is not finded `
              }
              if(option.opt=='class'){
                if(typeof func!='function'){
                  console.warn(`In ${el.localName}[${attr.name}='${attr.value}'] : '${attr.value}' must be a constructor `);
                  throw `In ${el.localName}[${attr.name}='${attr.value}'] : '${attr.value}' must be a constructor `
                }
                try{
                  new func({el,handler:option.handler,opt:'class'})
                }catch(e){
                  console.warn(`In ${el.localName}[${attr.name}='${attr.value}'] : '${attr.value}' is not a constructor`);
                  throw `In ${el.localName}[${attr.name}='${attr.value}'] : '${attr.value}' is not a constructor `
                }
              }else if(option.opt=='function' || option.opt=='func'||option.opt==undefined){
                if(typeof func!='function'){
                  console.warn(`In ${el.localName}[${attr.name}='${attr.value}'] : '${attr.value}' must be a function`);
                  throw `In ${el.localName}[${attr.name}='${attr.value}'] : '${attr.value}' must be a function `
                }
                try{
                  func({el,handler:option.handler,opt:'function'})
                }catch(e){
                  console.warn(`In ${el.localName}[${attr.name}='${attr.value}'] : '${attr.value}' ${e.message}`);
                  throw `In ${el.localName}[${attr.name}='${attr.value}'] : '${attr.value}' ${e.message} `
                }
              }
            },
          }
        },
      ]
      static #directiveCustom=[]
      static getByName=function(directiveName){
        return this.#directiveNative.find(corresp=>corresp.directiveName==directiveName)
                ||this.#directiveCustom.find(corresp=>corresp.directiveName==directiveName)
      }
      static getByRegex=function(stringExpression){
        return this.#directiveNative.find(corresp=>corresp.regex.test(stringExpression))
              || this.#directiveCustom.find(corresp=>corresp.regex.test(stringExpression))
      }
      static hasRegex=function(reg){
        if(!reg)return false
        return this.#directiveNative.find(corresp=>corresp.reg==reg)
        || this.#directiveCustom.find(corresp=>corresp.reg==reg)
      }

      static isDirectiveValid=function({directiveName,onInit,reg}){
        if (!reg)
            return console.warn("directive.reg is not defined");
        if (!directiveName)
            return console.warn("directive.directiveName is not defined");
        if (typeof onInit != "function")
            return console.warn(
              "directive.func is not defined or not a function"
            );
        if (this.getByName(directiveName))
            return console.warn("directive.directiveName is already exist");
        if (this.hasRegex(reg))
            return console.warn("directive.regex is already exist");
        return true
      }
    }
    attachFragment(htmlElement,handler,dico={dynamic:{},static:{}}){
      if (Domlib.isDomElement(htmlElement)&&htmlElement.getAttributeNode("no:rend")) return;
      [...htmlElement.childNodes].filter(child=>{
          if(Domlib.isDomText(child)){
            this.HTMLText.attachData(child, handler,dico)
            return false
          }
          const option=this.attachDirective(child, handler,dico)
          if(option.rendChild)this.attachFragment(child,handler,dico)
          return true
        })
    }
    attachDirective(htmlElement,handler,dico={dynamic:{},static:{}}){
      const attrs=[...htmlElement.attributes]
      var rendChild=true
      attrs.forEach(attr=>{
        const directiveHandler=this.HTMLDirective.getByRegex(attr.name)
        if(directiveHandler){
          const directiveName=attr.name.slice(0,attr.name.indexOf(':') != -1?attr.name.indexOf(':'):undefined)
          const opts=attr.name.slice(attr.name.indexOf(':')+1).split('.').filter(e=>e)
          const {data,directive }=directiveHandler
          var attachment={}
          if(attr.value in dico.static){
            let value=dico.static?.[attr.value]
            attachment={
              hasFinded:true,
              path:attr.value,
              args:[],
              name:attr.value,
              value,
              firstState:dico.static,
              lastState:dico.static
            }
          }else{
            
            attachment=handler.$getByPath( 
              dico.dynamic?.[attr.value]||attr.value
              )
          }
          directive.onInit(htmlElement,attr,{
            handler,
            opt:opts[0],
            directiveName,
            opts,
            data,
            attachment,
          })
          Object.assign(directiveHandler.data,data)
          if(directiveName=='for'){
            rendChild=false
          }
        }
      })
      return {
        rendChild
      }
    }
    attachElement(htmlElement,handler,dico={dynamic:{},static:{}}){
    if(!handler.$isTrap){
      console.warn('the handler must an instance of Domlib.TrapLib or Traper');
      throw 'the handler must an instance of Domlib.TrapLib or Traper'
    }
    if(!Domlib.isDomElement(htmlElement) && !Domlib.isDomFragment(htmlElement)) return
    this.attachFragment(htmlElement,handler,dico);
    
    if(Domlib.isDomElement(htmlElement)) {
      if (htmlElement.attributes.length) {
        this.attachDirective(htmlElement,handler,dico);
      }
    }
    return handler

    }
    static #core = null;
    
    registre = {};
    defineElement(builder, builderType = "class") {
      const component = new this.HTMLComponent(builder, builderType);
      const core=new Domlib.#Core
      var HTMLextends = HTMLElement;
      HTMLextends =builder.extend? document.createElement(builder.extend).constructor:HTMLextends
      const defElement = class extends HTMLextends {
        #handler;
        constructor(props,...children) {
          super();
          Domlib.__el= this;
          this.#handler = new component.builder();
          this.#handler.children.push(...children)
          this.#handler.el = this;
          this.#handler.localName = this.localName;
          this.#handler.elementName=builder.localName
          this.dataPublic = {};

          component.initChildrens(this, this.#handler);
          component.initProps(this, this.#handler,props);

          const rend = this.#handler.render(this.#handler);

          this.#handler.template = component.builder.useShadowRoot
            ? this.attachShadow({ mode: "open" })
            : this;
          if (Domlib.isDom(rend)) {
            this.#handler.template.append(rend);
          } else {
            this.#handler.template.innerHTML = rend;
          }
          core.attachFragment(this.#handler.template,this.#handler)
        }
      };
      customElements.define(builder.localName, defElement, {
        extends: builder.extend || undefined,
      });
      return defElement
    }
  };
  static isDom = function (el) {
    if (Domlib.isDomElement(el)) return true;
    if (Domlib.isDomFragment(el)) return true;
    if (Domlib.isDomText(el)) return true;
    return false;
  };
  static isDomFragment = function (docFrag) {
    try {
      if (
        docFrag.nodeType == 11 &&
        docFrag.querySelector &&
        docFrag.appendChild
      ) {
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  };
  static isDomText = function (element) {
    if (element && element.nodeName == "#text" && element.nodeType == 3)
      return true;
    return false;
  };
  static isDomElement = function (element) {
    if (!element) return false;
    try {
      if (element.tagName && element.localName && element.nodeType) {
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  };
  static Element = class Element {
    static localName = "";
    static extend = "";
    static useShadowRoot = false;
    constructor() {
      const el = Domlib.__el;
      delete Domlib.__el;
      this.props = new Domlib.TrapLib({},{
        onChange: (option, _target, targProxy) => {
          Object.defineProperty(
            targProxy,
            option.key,
            Object.getOwnPropertyDescriptor(_target, option.key)
          );
          el.setAttribute(option.key, option.value);
        },
        onDelete: (option) => {
          el.removeAttribute(option.key);
        },
      })
      return new Domlib.TrapLib(this,{

      })
    }
    children=[]
    props = {};
    slot = {};
    dataStatic = {};
    id = {};
    className = {};
  };
  static appendChild = function (elementAppend, elementContainer = null) {
    try {
      return elementContainer.appendChild(elementAppend);
    } catch (e) {
      return document.body.appendChild(elementAppend);
    }
  };
  static createElement = function (
    HTMLString = ""
  ) {
    const strToHTMLElement = (str) => {
      const doc=document.createRange().createContextualFragment(str)
      return doc.children.length>1?doc:doc.firstElementChild
    };
    if (Domlib.isDom(HTMLString)) return HTMLString;
    if (typeof HTMLString == "function")
      return Domlib.createElement(HTMLString());
    if (Array.isArray(HTMLString)) {
      return HTMLString.map((str) => Domlib.createElement(str));
    }
    if (typeof HTMLString == "object") return Domlib.convertDataToSpan(HTMLString);
    return strToHTMLElement(HTMLString) || new Text(HTMLString);
  };
  static createDirective = function () {};
  static build = function (func) {
    if (Object.getPrototypeOf(func) !== Domlib.Element) {
      console.warn(`the class ${func.name} must extends Domlib.Element`);
      throw `the class ${func.name} must extends Domlib.Element`;
    }
    if (func.localName.search(/^[a-z]+-[a-z]+$/) === -1) {
      console.warn("localName `" + func.localName + "` is not valid ");
      console.log('([a-z]-[a-z]) Ex : "my-el" ');
      throw "localName `" + func.localName + "` is not valid ";
    }
    return new this.#Core().defineElement(func);
  };
  static el(localName, func, extend = "", useShadowRoot = false) {
    return this.build(
      class extends Domlib.Element {
        static localName = localName;
        static extend = extend;
        static useShadowRoot = useShadowRoot;
        render = func;
      }
    );
  }
  static convertDataToSpan = function (data) {
    function triangleVertical() {
      return "&#9656";
    }
    function triangleHorizontale() {
      return "&#9662";
    }
    function boutton(obj, span, tab = 20) {
      const tabContainer=tab+50
      const list = [];
      var limiter="__{"
      var symb="{...}"
      const prepare=(data)=>{
        if(Array.isArray(data)){
          symb =  `[ length: ${data.length} ]`
          limiter="__["
        }else{
          limiter="__{"
          symb="{...}"
        }
      }
      const change = function () {
        prepare(obj)
        if (this.dataset.position == "vert") {
          list.push(
            Domlib.createElement(`<span style="padding-left:${tab}px">${limiter}</span>`),
            Domlib.createElement("<br>")
          );
          this.innerHTML = triangleHorizontale();
          this.dataset.position = "hori";
          for (let at in obj) {
            prepare(obj[at])
            if (typeof obj[at] == "object" && obj[at]) {
              var minSpan = Domlib.createElement('<span></span>');
              var spn = Domlib.createElement(`<span style="padding-left:${tabContainer}px"></span>`);
              spn.append(
                boutton(obj[at], minSpan, tabContainer),
                `${at}: ${
                  obj[at] && obj[at].constructor
                    ? obj[at].constructor.name
                    : "Object"
                } ${symb}`
              );
              list.push(spn, Domlib.createElement('<br>'), minSpan);
            } else if (typeof obj[at] == "function") {
              list.push(
                Domlib.createElement(
                  `<span style="padding-left:${
                    tabContainer
                  }px">${at}:function()</span>`
                ),
                Domlib.createElement("<br>")
              );
            } else {
              list.push(
                Domlib.createElement(
                  `<span style="padding-left:${tabContainer}px">${at}: ${
                    obj[at]
                  } </span>`
                ),
                Domlib.createElement('<br>')
              );
            }
          }
          prepare(obj)
          list.push(
            Domlib.createElement(`<span style="padding-left:${tab}px">${limiter}</span>`),
            Domlib.createElement("<br>")
          );
          span.append(...list);
        } else {
          this.innerHTML = triangleVertical();
          this.dataset.position = "vert";
          span.innerHTML = "";
          list.splice(0, list.length);
        }
      };
      const btn = Domlib.createElement(`
      <span >${triangleVertical()}</span>
      `);
      btn.dataset.position = "vert";
      btn.onclick = change;
      return btn;
    }
    if (typeof data == "object") {
      const toSpan = (obj) => {
        let spanMain = Domlib.createElement('<span></span>');
        let span1 = Domlib.createElement('<span></span>');

        const stringMap = ["{"];
        var compteur = 0;
        for (let at in obj) {
          compteur++;
          if (compteur < 3) {
            stringMap.push(
              `${at}: ${
                typeof obj[at] == "object"
                  ? Array.isArray(obj[at])
                    ? `[${obj[at].toString()}]`
                    : "{...}"
                  : obj[at]
              }`
            );
          }
        }
        stringMap.push("...}");
        const span2 = Domlib.createElement('<span></span>');
        spanMain.append(
          boutton(obj, span2),
          obj.constructor.name,
          span1,
          Domlib.createElement('<br>'),
          span2
        );
        span1.append(stringMap);
        return spanMain;
      };
      return toSpan(data);
    } else if (typeof data == "function") {
      return Domlib.createElement(`<span>${data.name}: function()</span>`);
    } else {
      return Domlib.createElement(`<span>${data.constructor.name}: ${data}</span>`);
    }
  }
}

// Domlib.el('r-func',()=>`<h1> salu les gens </h1>`)
