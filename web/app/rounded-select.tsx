'use client';
import React,{createContext,useContext,useId} from 'react';
import {Select as BaseSelect} from '@base-ui/react/select';
import {Check,ChevronDown} from 'lucide-react';
export const SelectPortalContext=createContext<React.RefObject<HTMLElement|null>|undefined>(undefined);
export type SelectOption={value:string,label:React.ReactNode};
export function RoundedSelect({options,value,defaultValue,onChange,name,label,compact=false}:{options:SelectOption[],value?:string,defaultValue?:string,onChange?:(value:string)=>void,name?:string,label:string,compact?:boolean}){
 const container=useContext(SelectPortalContext);const id=useId();
 return <BaseSelect.Root name={name} value={value} defaultValue={defaultValue} onValueChange={v=>{if(v!==null)onChange?.(v);}} items={options} modal={false}>
  <BaseSelect.Trigger id={id} aria-label={label} className={'rounded-select-trigger '+(compact?'compact':'')}><BaseSelect.Value/><BaseSelect.Icon><ChevronDown size={16}/></BaseSelect.Icon></BaseSelect.Trigger>
  <BaseSelect.Portal container={container}><BaseSelect.Positioner sideOffset={6} align="start" className="rounded-select-positioner" alignItemWithTrigger={false}><BaseSelect.Popup className="rounded-select-popup" onClick={e=>e.stopPropagation()}><BaseSelect.List className="rounded-select-list">{options.map(option=><BaseSelect.Item key={option.value} value={option.value} className="rounded-select-option"><BaseSelect.ItemText>{option.label}</BaseSelect.ItemText><BaseSelect.ItemIndicator><Check size={14}/></BaseSelect.ItemIndicator></BaseSelect.Item>)}</BaseSelect.List></BaseSelect.Popup></BaseSelect.Positioner></BaseSelect.Portal>
 </BaseSelect.Root>;
}
