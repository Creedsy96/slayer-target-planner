type MeasuredTiming='kills-hour'|'task-minutes';

export function measuredRateLabel(timing:string):string{
  return timing==='kills-hour'?'Kills per hour':timing==='task-minutes'?'Combat minutes per whole task':'Measured rate (selected units)';
}

export async function requestRate(timing:MeasuredTiming):Promise<number|null>{
  const label=measuredRateLabel(timing);
  const title=timing==='kills-hour'?'Measured kills per hour':'Measured combat time';
  const hint=timing==='kills-hour'?'Enter your measured number of kills in one hour.':'Enter combat time for one whole task. Travel and banking are added separately.';
  const dialog=document.createElement('dialog');
  dialog.innerHTML=`<form method="dialog"><h2>${title}</h2><p>${hint}</p><label>${label}<input id="timing-rate" type="number" min="0" max="1000000" step="any" required></label><div class="tools" style="margin-top:20px"><button value="save">Save rate</button><button value="cancel" formnovalidate>Cancel</button></div></form>`;
  const field=dialog.querySelector('input')!;
  field.addEventListener('input',()=>field.setCustomValidity(''));
  dialog.addEventListener('submit',event=>{
    // Cancel must work even when the draft is empty or invalid.
    if((event as SubmitEvent).submitter?.getAttribute('value')==='cancel')return;
    if(!Number.isFinite(field.valueAsNumber)||field.valueAsNumber<=0){
      event.preventDefault();field.setCustomValidity('Enter a rate greater than zero.');field.reportValidity();
    }
  });
  document.body.append(dialog);dialog.showModal();field.focus();
  return new Promise(resolve=>dialog.addEventListener('close',()=>{
    const rate=dialog.returnValue==='save'?field.valueAsNumber:null;
    dialog.remove();resolve(rate);
  },{once:true}));
}
