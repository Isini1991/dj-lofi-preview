const $=s=>document.querySelector(s);
export function mountArchive({data,selected,onSelect}){
 let tab='shows';const archive=$('#archive');
 const detail=document.createElement('dialog');detail.id='record-detail';detail.setAttribute('aria-label','Record sleeve');document.body.append(detail);
 function showRecord(item){
  detail.replaceChildren();const heading=document.createElement('div');heading.className='record-detail-heading';
  const title=document.createElement('h2');title.textContent=item.title;
  const close=document.createElement('button');close.textContent='×';close.setAttribute('aria-label','Close record sleeve');close.onclick=()=>detail.close();heading.append(title,close);
  const artist=document.createElement('p');artist.textContent=`${item.artist} · ${item.format||'Record'}`;
  const image=new Image();image.src=item.cover;image.alt=`${item.artist} — ${item.title}`;
  const source=document.createElement('a');source.textContent='See the original Instagram post ↗';source.href=item.source;source.target='_blank';source.rel='noopener noreferrer';
  detail.append(heading,artist,image);if(item.source)detail.append(source);detail.showModal();
 }
 function close(){archive.classList.remove('open');archive.inert=true;$('#open-archive').setAttribute('aria-expanded','false');}
 function open(next='shows'){tab=next;$('#archive-search').value='';archive.inert=false;archive.classList.add('open');$('#open-archive').setAttribute('aria-expanded','true');render();}
 function render(){
  const query=$('#archive-search').value.trim().toLocaleLowerCase();
  $('#shows-tab').setAttribute('aria-selected',String(tab==='shows'));$('#collection-tab').setAttribute('aria-selected',String(tab==='collection'));
  $('#shows-panel').hidden=tab!=='shows';$('#collection-panel').hidden=tab!=='collection';
  archive.dataset.tab=tab;
  const items=(tab==='shows'?data.episodes:data.collection).filter(item=>[item.title,item.artist,item.date,item.description,item.provider].filter(Boolean).join(' ').toLocaleLowerCase().includes(query));
  const list=$(tab==='shows'?'#episode-list':'#collection-list');list.replaceChildren();
  const total=(tab==='shows'?data.episodes:data.collection).length;
  $('#archive-count').textContent=`${items.length}${query?` of ${total}`:''} ${tab==='shows'?'radio shows':'records'}`;
  if(!items.length){const p=document.createElement('p');p.className='archive-empty';p.textContent=query?'Nothing found. Try another title or artist.':'The collection is being catalogued.';list.append(p);}
  for(const item of items){
   const row=document.createElement('button');row.className=(tab==='shows'?'episode-choice':'collection-choice')+(tab==='shows'&&item.id===selected()?' active':'');
   if(tab==='shows')row.onclick=()=>{onSelect(item.id);close();};else row.onclick=()=>showRecord(item);
   const cover=new Image();cover.className='mini-cover';cover.loading='lazy';cover.src=item.cover;cover.alt=tab==='collection'?`${item.artist||''} — ${item.title}`:'';
   cover.onerror=()=>{const placeholder=document.createElement('div');placeholder.className='mini-cover cover-unavailable';placeholder.textContent='No image';cover.replaceWith(placeholder);};
   const info=document.createElement('span');info.textContent=item.title;
   const detail=document.createElement('small');detail.textContent=tab==='shows'?`${item.date}${item.duration>0?` · ${Math.round(item.duration/60)} min`:''} · ${item.provider||'Audio'}`:`${item.artist||''}${item.year?` · ${item.year}`:''}`;info.append(detail);
   if(tab==='collection'){
    const art=document.createElement('span');art.className='collection-art';
    if(item.coverRegion){const [x,y,w,h]=item.coverRegion;cover.style.cssText=`width:${100/w}%;height:${100/h}%;left:${-100*x/w}%;top:${-100*y/h}%;object-fit:fill`;}
    art.append(cover);row.append(art,info);
   }else row.append(cover,info);list.append(row);
  }
 }
 $('#shows-tab').onclick=()=>{tab='shows';render();};$('#collection-tab').onclick=()=>{tab='collection';render();};$('#archive-search').oninput=render;
 for(const button of [$('#shows-tab'),$('#collection-tab')])button.onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();tab=tab==='shows'?'collection':'shows';render();$(tab==='shows'?'#shows-tab':'#collection-tab').focus();}};
 $('#close-archive').onclick=close;$('#open-archive').onclick=()=>archive.classList.contains('open')?close():open();$('#open-archive').setAttribute('aria-expanded','false');
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&archive.classList.contains('open')){close();$('#open-archive').focus();}});
 return {open,close,render,setData(next){data=next;render();}};
}
