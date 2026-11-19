const KEY='slayer-target-planner-show-unavailable';
export function loadShowUnavailable():boolean{
  try{return localStorage.getItem(KEY)!=='false';}catch{return true;}
}
export function saveShowUnavailable(value:boolean):boolean{
  try{localStorage.setItem(KEY,String(value));return true;}catch{return false;}
}
