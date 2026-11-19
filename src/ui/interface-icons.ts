const paths:Record<string,string>={
  guide:'<path d="M3 4h6a4 4 0 0 1 3 2 4 4 0 0 1 3-2h6v16h-6a4 4 0 0 0-3 2 4 4 0 0 0-3-2H3Z M12 6v16M6 8h3m-3 4h3m6-4h3m-3 4h3"/>',
  supplies:'<path d="M9 2h6M10 2v7L4 19a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3L14 9V2M7 14h10"/>',
  route:'<circle cx="6" cy="5" r="3"/><circle cx="18" cy="19" r="3"/><path d="M6 8v4a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V8"/>',
  plan:'<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>',
  account:'<circle cx="12" cy="8" r="3"/><path d="M5 21v-3a7 7 0 0 1 14 0v3M4 4l2-2m12 0 2 2"/>',
  tasks:'<path d="M9 6h11M9 12h11M9 18h11M3 6l1 1 2-2m-3 7 1 1 2-2m-3 7 1 1 2-2"/>',
  methods:'<path d="m14 3 7 0 0 7-11 11-7-7L14 3Zm-4 11 4-4M3 21l4-4m-4-4 8 8"/>',
  compare:'<rect x="3" y="4" width="7" height="16" rx="2"/><rect x="14" y="4" width="7" height="16" rx="2"/><path d="M6 9h1m-1 4h1m10-4h1m-1 4h1"/>',
  data:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/>',
};
export function interfaceIcon(name:string):string{return `<svg class="interface-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${paths[name]||paths.plan}</svg>`;}
