const legacyFormulas:Record<string,string>={
 'D_KL(P ‖ Q) = Σₓ P(x) log[P(x) / Q(x)]':String.raw`D_{\mathrm{KL}}(P\parallel Q)=\sum_x P(x)\log\frac{P(x)}{Q(x)}`,
 'H(P, Q) = −Σₓ P(x) log Q(x)':String.raw`H(P,Q)=-\sum_x P(x)\log Q(x)`,
 'y = xWᵀ + b':String.raw`y=xW^{\mathsf T}+b`,
 'θ_next = θ − η ∇θ L(θ)':String.raw`\theta_{\mathrm{next}}=\theta-\eta\nabla_{\theta}L(\theta)`,
 'student samples → teacher signal → student update':String.raw`\text{student samples}\rightarrow\text{teacher signal}\rightarrow\text{student update}`,
 'encoder → bottleneck → decoder + skip connections':String.raw`\text{encoder}\rightarrow\text{bottleneck}\rightarrow\text{decoder}+\text{skip connections}`,
};
export function normalizeFormula(input:string){
 let value=input.trim();
 if((value.startsWith('\\[')&&value.endsWith('\\]'))||(value.startsWith('\\(')&&value.endsWith('\\)')))value=value.slice(2,-2).trim();
 else if(value.startsWith('$$')&&value.endsWith('$$'))value=value.slice(2,-2).trim();
 else if(value.startsWith('$')&&value.endsWith('$'))value=value.slice(1,-1).trim();
 return legacyFormulas[value]??value;
}
export type MathSegment={text:string,math:boolean,display:boolean};
export function splitMath(input:string):MathSegment[]{
 // Render the existing sample application without rewriting anyone's saved card.
 const text=input.replace('H(P,Q) = H(P) + D_KL(P‖Q)',String.raw`\(H(P,Q)=H(P)+D_{\mathrm{KL}}(P\parallel Q)\)`);
 const pattern=/\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]|\$\$([\s\S]*?)\$\$|\$([^$\n]+)\$/g;
 const parts:MathSegment[]=[];let offset=0;
 for(const match of text.matchAll(pattern)){
  if(match.index!>offset)parts.push({text:text.slice(offset,match.index),math:false,display:false});
  parts.push({text:match[1]??match[2]??match[3]??match[4],math:true,display:match[2]!==undefined||match[3]!==undefined});offset=match.index!+match[0].length;
 }
 if(offset<text.length)parts.push({text:text.slice(offset),math:false,display:false});return parts;
}
