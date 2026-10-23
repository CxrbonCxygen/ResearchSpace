'use client';
import React,{Component,lazy,Suspense,type ReactNode} from 'react';

const LazyFormula=lazy(()=>import('./math-content').then(m=>({default:m.Formula})));
const LazyMathText=lazy(()=>import('./math-content').then(m=>({default:m.MathText})));

class MathBoundary extends Component<{children:ReactNode,fallback:ReactNode},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?this.props.fallback:this.props.children;}
}
function MathLoader({children,value}:{children:ReactNode,value:string}){
 const fallback=<span className="math-text">{value}</span>;
 return <MathBoundary fallback={fallback}><Suspense fallback={fallback}>{children}</Suspense></MathBoundary>;
}
export function Formula(props:{value:string,display?:boolean}){
 return <MathLoader value={props.value}><LazyFormula {...props}/></MathLoader>;
}
export function MathText(props:{value:string}){
 return <MathLoader value={props.value}><LazyMathText {...props}/></MathLoader>;
}
