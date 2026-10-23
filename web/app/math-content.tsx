'use client';
import React,{useMemo} from 'react';
import katex from 'katex';
import {normalizeFormula,splitMath} from '../lib/math';
export function Formula({value,display=false}:{value:string,display?:boolean}){
 const result=useMemo(()=>{try{return {html:katex.renderToString(normalizeFormula(value),{displayMode:display,throwOnError:true,trust:false,strict:'ignore',maxSize:12,maxExpand:300,output:'htmlAndMathml'})};}catch{return {html:null};}},[value,display]);
 return result.html?<span className={'math-render '+(display?'math-display':'')} dangerouslySetInnerHTML={{__html:result.html}}/>:<span className="math-invalid" title="公式格式有误，请编辑 LaTeX 公式">{value}<small>公式格式有误，请检查括号与命令</small></span>;
}
export function MathText({value}:{value:string}){return <span className="math-text">{splitMath(value).map((part,i)=>part.math?<Formula key={i} value={part.text} display={part.display}/>:<React.Fragment key={i}>{part.text}</React.Fragment>)}</span>;}
