'use client';
import {useState} from 'react';
import type {z} from 'zod';
import {criteriaSchema} from '@/lib/contracts';

type Criterion=z.infer<typeof criteriaSchema>[number];
const newCriterion=():Criterion=>({id:`c${crypto.randomUUID().slice(0,8)}`,label:'',kind:'required'});

export default function CriteriaEditor({initial}:{initial?:Criterion[]}){
  const [items,setItems]=useState<Criterion[]>(initial?.length?initial:[newCriterion()]);
  function edit(index:number,change:Partial<Criterion>){setItems(current=>current.map((item,i)=>i===index?{...item,...change}:item));}
  return <fieldset className="criteria-editor"><legend>What should the recruiter check?</legend><p className="field-help">Add job-related criteria. RecruitOS will show source excerpts for each one, then a person reviews them.</p>
    {items.map((item,index)=><div className="criterion-row" key={item.id}><div className="criterion-index">{index+1}</div><label className="criterion-label">Criterion<input required maxLength={200} value={item.label} onChange={event=>edit(index,{label:event.target.value})} placeholder="For example, TypeScript project experience"/></label><label className="criterion-kind">Importance<select value={item.kind} onChange={event=>edit(index,{kind:event.target.value as Criterion['kind']})}><option value="required">Required</option><option value="preferred">Preferred</option><option value="informational">For context</option></select></label><button type="button" className="button-quiet criterion-remove" onClick={()=>setItems(current=>current.filter((_,i)=>i!==index))} disabled={items.length===1} aria-label={`Remove criterion ${index+1}`}>Remove</button></div>)}
    <button type="button" className="button-secondary" onClick={()=>setItems(current=>[...current,newCriterion()])} disabled={items.length>=10}>+ Add criterion</button>
    <input type="hidden" name="criteria" value={JSON.stringify(items)}/>
  </fieldset>;
}
